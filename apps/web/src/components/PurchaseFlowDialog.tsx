"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import FakeQr from "./FakeQr";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import type { PaymentSession, ScrollItem, PayMethod } from "@discount-hub/shared";
import {
  PAY_METHODS,
  clampInt,
  formatDateTime,
  formatExpires,
  formatMoney,
} from "@discount-hub/shared";
import { cn } from "@/lib/utils";

type Step = "offer" | "pay" | "pending" | "success";
type PurchasePayload = RouterOutputs["order"]["purchase"];
type CompletePaymentPayload = RouterOutputs["order"]["completePayment"];
type PaymentPayload = PurchasePayload | CompletePaymentPayload;

const PRIMARY_PAY_METHODS: PayMethod[] = [
  "alipay",
  "wechat",
  "unionpay",
  "paypal",
];

const PAY_METHOD_VISUAL: Record<
  PayMethod,
  { glyph: string; bg: string; fg: string }
> = {
  alipay:    { glyph: "支", bg: "#1677FF", fg: "#FFFFFF" },
  wechat:    { glyph: "微", bg: "#09BB07", fg: "#FFFFFF" },
  unionpay:  { glyph: "银", bg: "#E23D3D", fg: "#FFFFFF" },
  paypal:    { glyph: "P",  bg: "#003087", fg: "#FFB800" },
  visa:      { glyph: "V",  bg: "#1A1F71", fg: "#F5B800" },
  usdt_trc20:{ glyph: "T",  bg: "#26A17B", fg: "#FFFFFF" },
};

export default function PurchaseFlowDialog({
  open,
  scroll,
  onOpenChange,
  onGoMy,
}: {
  open: boolean;
  scroll: ScrollItem;
  onOpenChange: (v: boolean) => void;
  onGoMy: () => void;
}) {
  const [step, setStep] = useState<Step>("offer");
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<PayMethod>("alipay");
  const [showMoreMethods, setShowMoreMethods] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [order, setOrder] = useState<{
    orderId: string;
    serial: string;
    paidAt: string;
    couponCode: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("offer");
    setQty(1);
    setMethod("alipay");
    setShowMoreMethods(false);
    setPaying(false);
    setConfirming(false);
    setPendingOrderId(null);
    setPaymentSession(null);
    setOrder(null);
  }, [open, scroll.id]);

  const summary = useMemo(() => {
    const cash = scroll.cashPrice * qty;
    const points = scroll.pointsPrice * qty;
    return { cash, points };
  }, [qty, scroll]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const purchaseMutation = useMutation(trpc.order.purchase.mutationOptions());
  const completePaymentMutation = useMutation(trpc.order.completePayment.mutationOptions());

  const applySuccess = async (result: PaymentPayload) => {
    if (!result.coupon) {
      toast.error("支付完成，但券码尚未生成");
      return;
    }
    const paidAt = result.order.paidAt ? new Date(result.order.paidAt) : new Date();
    setPaymentSession(result.paymentSession);
    setPendingOrderId(result.order.id);
    setOrder({
      orderId: result.order.id,
      serial: result.order.id.slice(-8).toUpperCase(),
      paidAt: formatDateTime(paidAt),
      couponCode: result.coupon.code,
    });
    setStep("success");
    await queryClient.invalidateQueries();
    toast.success(
      result.taskReward > 0
        ? `支付成功！券码已生成，额外奖励 +${result.taskReward} 积分`
        : "支付成功！券码已生成",
    );
    window.dispatchEvent(
      new CustomEvent("jz:purchaseSuccess", {
        detail: {
          scrollId: scroll.id,
          app: scroll.app,
          title: scroll.title,
          couponCode: result.coupon.code,
          paidAt: paidAt.toISOString(),
        },
      }),
    );
  };

  const payNow = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const result = await purchaseMutation.mutateAsync({
        productId: scroll.id,
        qty,
        payMethod: method,
      });
      if (result.completed) {
        await applySuccess(result);
        return;
      }
      setPendingOrderId(result.order.id);
      setPaymentSession(result.paymentSession);
      setStep("pending");
      await queryClient.invalidateQueries();
      toast.success("订单已创建，请按页面指引完成支付");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "支付失败，请稍后重试");
    } finally {
      setPaying(false);
    }
  };

  const confirmPayment = async () => {
    if (!pendingOrderId || confirming) return;
    setConfirming(true);
    try {
      const result = await completePaymentMutation.mutateAsync({ orderId: pendingOrderId });
      await applySuccess(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "确认支付失败，请稍后重试");
    } finally {
      setConfirming(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  const pendingQrValue = paymentSession?.qrCodeText ?? paymentSession?.walletAddress ?? pendingOrderId ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col border-border bg-background p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>
            {step === "offer" ? "去兑换" : step === "pay" ? "支付订单" : step === "pending" ? "等待支付" : "支付成功"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-5 py-5">
          {step === "offer" && (
            <div className="space-y-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Badge variant="secondary">{scroll.app}</Badge>
                      <div className="mt-2 truncate text-lg font-semibold text-foreground">{scroll.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{scroll.subtitle}</div>
                    </div>
                    <Card className="border-border bg-secondary/50">
                      <CardContent className="p-3 text-right">
                        <div className="text-xs text-muted-foreground">失效时间</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{formatExpires(scroll.expiresAt)}</div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {scroll.tags.map((t) => (
                      <Badge key={t} variant="outline" className="border-border text-[11px]">{t}</Badge>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="text-sm text-muted-foreground">{scroll.description}</div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div className="text-sm text-muted-foreground">兑换价格</div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-foreground">
                        {scroll.pointsPrice} 积分 + {formatMoney(scroll.cashPrice)}
                      </div>
                      {typeof scroll.originalCashPrice === "number" && (
                        <div className="mt-0.5 text-sm text-muted-foreground line-through">
                          {formatMoney(scroll.originalCashPrice)}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">{scroll.availableCountText}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-sm font-semibold text-foreground">规则说明</div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {[
                      "购买流程：先创建订单与支付会话，再由模拟确认或未来真实网关回调完成入账。",
                      "兑换核销：支付成功后生成券码与二维码，用于核销。",
                      "限购一张：本原型限制为 1 张。",
                    ].map((text, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-primary">{i + 1}</span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "pay" && (
            <div className="space-y-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Badge variant="secondary">{scroll.app}</Badge>
                      <div className="mt-2 truncate text-lg font-semibold text-foreground">{scroll.title}</div>
                    </div>
                    <Card className="border-border bg-secondary/50">
                      <CardContent className="p-3 text-right">
                        <div className="text-xs text-muted-foreground">订单价格</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{formatMoney(summary.cash)}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">消耗 {summary.points} 积分</div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2">
                    <div className="text-sm text-muted-foreground">购买数量</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty((v) => clampInt(v - 1, 1, 1))}>-</Button>
                      <div className="w-10 text-center font-mono text-foreground">{qty}</div>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQty((v) => clampInt(v + 1, 1, 1))}>+</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">
                      选择支付方式
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {PRIMARY_PAY_METHODS.map((id) => {
                      const m = PAY_METHODS.find((x) => x.id === id);
                      if (!m) return null;
                      const v = PAY_METHOD_VISUAL[m.id];
                      const active = method === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id)}
                          className={cn(
                            "relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                            active
                              ? "border-[var(--brand-red)] bg-[var(--brand-red-soft)] ring-2 ring-[var(--brand-red)]/20"
                              : "border-border bg-[var(--app-card)] hover:border-[var(--brand-red)]/40",
                          )}
                          aria-pressed={active}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black"
                            style={{ background: v.bg, color: v.fg }}
                            aria-hidden
                          >
                            {v.glyph}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {m.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {m.hint}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                              active
                                ? "border-[var(--brand-red)]"
                                : "border-muted-foreground/40",
                            )}
                          >
                            {active && (
                              <span className="h-2 w-2 rounded-full bg-[var(--brand-red)]" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMoreMethods((v) => !v)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showMoreMethods ? "收起" : "更多支付方式"}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        showMoreMethods && "rotate-180",
                      )}
                    />
                  </button>

                  {showMoreMethods && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {PAY_METHODS.filter(
                        (m) => !PRIMARY_PAY_METHODS.includes(m.id),
                      ).map((m) => {
                        const v = PAY_METHOD_VISUAL[m.id];
                        const active = method === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMethod(m.id)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                              active
                                ? "border-[var(--brand-red)] bg-[var(--brand-red-soft)] ring-2 ring-[var(--brand-red)]/20"
                                : "border-border bg-[var(--app-card)] hover:border-[var(--brand-red)]/40",
                            )}
                            aria-pressed={active}
                          >
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black"
                              style={{ background: v.bg, color: v.fg }}
                              aria-hidden
                            >
                              {v.glyph}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {m.name}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                {m.providerLabel}
                              </span>
                            </span>
                            <Badge
                              variant="outline"
                              className="border-border text-[11px]"
                            >
                              {m.hint}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {step === "pending" && paymentSession && pendingOrderId && (
            <div className="space-y-4">
              <Card className={cn(paymentSession.productionReady ? "border-sky-400/30 bg-sky-500/10" : "border-amber-400/30 bg-amber-500/10")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{paymentSession.methodLabel}</div>
                      <div className="mt-1 text-xs text-muted-foreground">网关：{paymentSession.providerLabel}</div>
                    </div>
                    <Badge variant="outline" className="border-current text-[11px]">
                      {paymentSession.productionReady ? "已预留实单接口" : "占位联调模式"}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    {paymentSession.productionReady
                      ? "支付会话已按未来生产接入结构生成，当前仍保留模拟完成入口方便联调。"
                      : "接口层、回调地址和订单标识都已预留好，后续只需在对应 provider 文件补真实网关调用。"}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="mb-3 text-sm font-semibold text-foreground">支付信息</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: "应付金额", value: paymentSession.amountText },
                        { label: "到期时间", value: formatDateTime(new Date(paymentSession.expiresAt)) },
                        { label: "订单号", value: pendingOrderId, mono: true },
                        { label: "支付方式", value: paymentSession.methodLabel },
                      ].map((item) => (
                        <Card key={item.label} className="border-border bg-secondary/50">
                          <CardContent className="p-3">
                            <div className="text-xs text-muted-foreground">{item.label}</div>
                            <div className={cn("mt-1 font-semibold text-foreground", item.mono && "font-mono text-xs")}>{item.value}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2">
                      {paymentSession.fields.map((field) => (
                        <Card key={`${field.label}-${field.value}`} className="border-border bg-secondary/50">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs text-muted-foreground">{field.label}</div>
                                <div className={cn("mt-1 break-all text-sm text-foreground", field.emphasized && "font-mono font-semibold")}>{field.value}</div>
                              </div>
                              {field.copyable && (
                                <Button variant="outline" size="sm" onClick={() => copyText(field.value)} className="gap-2">
                                  <Copy className="h-3.5 w-3.5" />复制
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                      {paymentSession.instructions.map((text, index) => (
                        <div key={index} className="flex gap-2">
                          <span className="text-primary">{index + 1}</span>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold text-foreground">支付二维码</div>
                    <div className="mt-3 flex justify-center"><FakeQr value={pendingQrValue} /></div>
                    <div className="mt-3 text-center text-xs text-muted-foreground">当前为示意二维码</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === "success" && order && (
            <div className="space-y-4">
              <Card className="border-emerald-400/30 bg-emerald-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">支付成功</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">券码已生成，请及时兑换核销</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="mb-3 text-sm font-semibold text-foreground">支付结果</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: "实付", value: paymentSession?.amountText ?? formatMoney(summary.cash) },
                        { label: "消耗积分", value: String(summary.points) },
                        { label: "数量", value: String(qty) },
                        { label: "订单时间", value: order.paidAt, mono: true },
                      ].map((item) => (
                        <Card key={item.label} className="border-border bg-secondary/50">
                          <CardContent className="p-3">
                            <div className="text-xs text-muted-foreground">{item.label}</div>
                            <div className={cn("mt-1 font-semibold text-foreground", item.mono && "font-mono text-xs")}>{item.value}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <Card className="mt-4 border-border bg-secondary/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">券码</div>
                            <div className="mt-1 font-mono text-sm text-foreground">{order.couponCode}</div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => copyText(order.couponCode)} className="gap-2">
                            <Copy className="h-3.5 w-3.5" />复制
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    <Separator className="my-4" />
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span>订单号：{order.orderId}</span></div>
                      <div className="flex items-center gap-2"><QrCode className="h-4 w-4" /><span>流水号：{order.serial}</span></div>
                      <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><span>有效期：{formatExpires(scroll.expiresAt)}</span></div>
                      {paymentSession && (
                        <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span>渠道：{paymentSession.methodLabel} / {paymentSession.providerLabel}</span></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold text-foreground">二维码（示意）</div>
                    <div className="mt-3 flex justify-center"><FakeQr value={order.couponCode} /></div>
                    <div className="mt-3 text-center text-xs text-muted-foreground">核销时出示券码或二维码</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          {step === "offer" && (
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">限购 1 张</div>
              <Button onClick={() => setStep("pay")} className="bg-transparent text-white [background-image:var(--gradient-primary)] hover:brightness-110" style={{ boxShadow: "var(--shadow-glow)" }}>
                立即购买
              </Button>
            </div>
          )}
          {step === "pay" && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("offer")} disabled={paying}>返回</Button>
              <Button onClick={payNow} className="bg-transparent text-white [background-image:var(--gradient-primary)] hover:brightness-110" style={{ boxShadow: "var(--shadow-glow)" }} disabled={paying}>
                {paying ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />创建订单中…</>) : summary.cash > 0 ? `创建支付订单 ${formatMoney(summary.cash)}` : `确认兑换 ${summary.points} 积分`}
              </Button>
            </div>
          )}
          {step === "pending" && paymentSession && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>稍后支付</Button>
              <Button onClick={confirmPayment} className="bg-transparent text-white [background-image:var(--gradient-primary)] hover:brightness-110" style={{ boxShadow: "var(--shadow-glow)" }} disabled={confirming || !paymentSession.demoActionEnabled}>
                {confirming ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />确认中…</>) : paymentSession.demoActionEnabled ? "模拟支付完成" : "等待支付回调"}
              </Button>
            </div>
          )}
          {step === "success" && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>继续逛</Button>
              <Button onClick={() => { onOpenChange(false); onGoMy(); }} className="bg-transparent text-white [background-image:var(--gradient-primary)] hover:brightness-110" style={{ boxShadow: "var(--shadow-glow)" }}>
                查看我的
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
