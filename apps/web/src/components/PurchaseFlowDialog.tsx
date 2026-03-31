"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  QrCode,
  ShieldCheck,
  Loader2,
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
import FakeQr from "./FakeQr";
import { toast } from "sonner";
import type { ScrollItem, PayMethod } from "@discount-hub/shared";
import {
  PAY_METHODS,
  clampInt,
  formatDateTime,
  formatExpires,
  formatMoney,
  createOrderId,
  createSerial,
  createCouponCode,
} from "@discount-hub/shared";
import { cn } from "@/lib/utils";

type Step = "offer" | "pay" | "success";

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
  const [paying, setPaying] = useState(false);
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
    setPaying(false);
    setOrder(null);
  }, [open, scroll.id]);

  const summary = useMemo(() => {
    const cash = scroll.cashPrice * qty;
    const points = scroll.pointsPrice * qty;
    return { cash, points };
  }, [qty, scroll]);

  const payNow = async () => {
    if (paying) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 900));
    const now = new Date();
    const orderId = createOrderId();
    const serial = createSerial();
    const couponCode = createCouponCode(scroll.id);
    setOrder({ orderId, serial, paidAt: formatDateTime(now), couponCode });
    setPaying(false);
    setStep("success");
    toast.success("支付成功！券码已生成");

    window.dispatchEvent(
      new CustomEvent("jz:purchaseSuccess", {
        detail: {
          scrollId: scroll.id,
          app: scroll.app,
          title: scroll.title,
          couponCode,
          paidAt: now.toISOString(),
        },
      }),
    );
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>
            {step === "offer"
              ? "去兑换"
              : step === "pay"
                ? "支付订单"
                : "支付成功"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-5 py-5">
          {step === "offer" && (
            <div className="space-y-4">
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm text-muted-foreground">{scroll.app}</div>
                      <div className="mt-1 text-lg font-semibold text-foreground truncate">
                        {scroll.title}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {scroll.subtitle}
                      </div>
                    </div>
                    <Card className="border-border bg-secondary/50">
                      <CardContent className="p-3 text-right">
                        <div className="text-xs text-muted-foreground">失效时间</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {formatExpires(scroll.expiresAt)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {scroll.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[11px] border-border">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    {scroll.description}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div className="text-sm text-muted-foreground">兑换价格</div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-2">
                        <div className="text-lg font-semibold text-foreground">
                          {scroll.pointsPrice} 积分 + {formatMoney(scroll.cashPrice)}
                        </div>
                        {typeof scroll.originalCashPrice === "number" && (
                          <div className="text-sm text-muted-foreground line-through">
                            {formatMoney(scroll.originalCashPrice)}
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {scroll.availableCountText}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="text-sm font-semibold text-foreground">规则说明</div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {[
                      "购买方式：选择任一支付方式完成支付。",
                      "兑换核销：成功后生成券码与二维码，用于核销。",
                      "限购一张：本原型限制为 1 张。",
                    ].map((text, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[var(--accent)]">{i + 1}</span>
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
                      <div className="text-sm text-muted-foreground">{scroll.app}</div>
                      <div className="mt-1 text-lg font-semibold text-foreground truncate">
                        {scroll.title}
                      </div>
                    </div>
                    <Card className="border-border bg-secondary/50">
                      <CardContent className="p-3 text-right">
                        <div className="text-xs text-muted-foreground">订单价格</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {formatMoney(summary.cash)}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          消耗 {summary.points} 积分
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2">
                    <div className="text-sm text-muted-foreground">购买数量</div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty((v) => clampInt(v - 1, 1, 1))}
                      >
                        -
                      </Button>
                      <div className="w-10 text-center font-mono text-foreground">
                        {qty}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty((v) => clampInt(v + 1, 1, 1))}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-foreground">
                      选择支付方式
                    </div>
                    <div className="text-xs text-muted-foreground">
                      共 {PAY_METHODS.length} 种
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PAY_METHODS.map((m) => (
                      <Card
                        key={m.id}
                        className={cn(
                          "cursor-pointer transition border-border",
                          method === m.id
                            ? "ring-2 ring-primary/50 bg-primary/5"
                            : "hover:bg-secondary/50",
                        )}
                        onClick={() => setMethod(m.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-foreground">
                              {m.name}
                            </div>
                            <Badge variant="outline" className="text-[11px] border-border">
                              {m.hint}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "success" && order && (
            <div className="space-y-4">
              <Card className="border-emerald-400/30 bg-emerald-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        支付成功
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        券码已生成，请及时兑换核销
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold text-foreground mb-3">
                      支付结果
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        { label: "实付", value: formatMoney(summary.cash) },
                        { label: "消耗积分", value: String(summary.points) },
                        { label: "数量", value: String(qty) },
                        { label: "订单时间", value: order.paidAt, mono: true },
                      ].map((item) => (
                        <Card key={item.label} className="border-border bg-secondary/50">
                          <CardContent className="p-3">
                            <div className="text-xs text-muted-foreground">{item.label}</div>
                            <div
                              className={cn(
                                "mt-1 font-semibold text-foreground",
                                item.mono && "font-mono text-xs",
                              )}
                            >
                              {item.value}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="mt-4 border-border bg-secondary/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">券码</div>
                            <div className="mt-1 font-mono text-sm text-foreground">
                              {order.couponCode}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyText(order.couponCode)}
                            className="gap-2 border-border"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            复制
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>订单号：{order.orderId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        <span>流水号：{order.serial}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        <span>有效期：{formatExpires(scroll.expiresAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold text-foreground">
                      二维码（示意）
                    </div>
                    <div className="mt-3 flex justify-center">
                      <FakeQr value={order.couponCode} />
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground text-center">
                      核销时出示券码或二维码
                    </div>
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
              <Button
                onClick={() => setStep("pay")}
                className="bg-[var(--gradient-primary)] hover:brightness-110 text-white"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                立即购买
              </Button>
            </div>
          )}
          {step === "pay" && (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("offer")}
                disabled={paying}
              >
                返回
              </Button>
              <Button
                onClick={payNow}
                className="bg-[var(--gradient-primary)] hover:brightness-110 text-white"
                style={{ boxShadow: "var(--shadow-glow)" }}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    支付中…
                  </>
                ) : (
                  `确认支付 ${formatMoney(summary.cash)}`
                )}
              </Button>
            </div>
          )}
          {step === "success" && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                继续逛
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onGoMy();
                }}
                className="bg-[var(--gradient-primary)] hover:brightness-110 text-white"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                查看我的
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
