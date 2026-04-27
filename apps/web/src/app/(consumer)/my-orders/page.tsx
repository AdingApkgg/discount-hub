"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Copy,
  Gift,
  Loader2,
  Package,
  RotateCcw,
  ShoppingCart,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { openApp } from "@discount-hub/shared";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  motion,
  AnimatePresence,
  AnimatedItem,
  PageTransition,
  StaggerList,
} from "@/components/motion";
import {
  BurstBadge,
  HotSticker,
  StampMark,
} from "@/components/consumer-visual";

type OrderRecord = RouterOutputs["order"]["myOrders"][number];

const TABS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待付款" },
  { value: "unused", label: "待核销" },
  { value: "used", label: "已结束" },
] as const;
type TabValue = (typeof TABS)[number]["value"];

const STATUS_META: Record<
  string,
  {
    label: string;
    tone: "amber" | "red" | "muted";
    Icon: LucideIcon;
  }
> = {
  PENDING: { label: "待付款", tone: "amber", Icon: Wallet },
  PAID: { label: "待核销", tone: "red", Icon: Gift },
  CANCELLED: { label: "已取消", tone: "muted", Icon: XCircle },
  REFUNDED: { label: "已退款", tone: "muted", Icon: RotateCcw },
};

function formatDateTime(value: Date | string) {
  const d = value instanceof Date ? value : new Date(String(value));
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

/* ==============================
 * 顶部统计卡
 * ============================== */
function OrdersHero({ orders }: { orders: OrderRecord[] }) {
  const counts = useMemo(() => {
    return {
      pending: orders.filter((o) => o.status === "PENDING").length,
      paid: orders.filter((o) => o.status === "PAID").length,
      total: orders.length,
    };
  }, [orders]);
  const totalSpent = useMemo(() => {
    return orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + Number(o.cashPaid ?? 0), 0);
  }, [orders]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)] px-4 py-3 text-white shadow-[0_10px_24px_rgba(254,44,85,0.22)]">
      <div className="stripe-urgent pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-[var(--brand-gold)]/30 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <BurstBadge tone="gold" size={56}>
          {counts.paid}
        </BurstBadge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black drop-shadow-sm">
              我的订单
            </span>
            <HotSticker tone="gold" rotate={-5}>
              拿券走人
            </HotSticker>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1.5 text-center text-[10px] font-semibold">
            <div className="rounded-lg bg-white/20 py-1 backdrop-blur">
              <div className="text-white/85">总订单</div>
              <div className="text-sm font-black tabular-nums">
                {counts.total}
              </div>
            </div>
            <div className="rounded-lg bg-white/20 py-1 backdrop-blur">
              <div className="text-white/85">待付款</div>
              <div className="text-sm font-black tabular-nums">
                {counts.pending}
              </div>
            </div>
            <div className="rounded-lg bg-white/20 py-1 backdrop-blur">
              <div className="text-white/85">总消费</div>
              <div className="text-sm font-black tabular-nums">
                ¥{totalSpent.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==============================
 * 状态分段
 * ============================== */
function OrderTabs({
  tab,
  setTab,
  counts,
}: {
  tab: TabValue;
  setTab: (v: TabValue) => void;
  counts: Record<TabValue, number>;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {TABS.map((t) => {
        const isActive = tab === t.value;
        const c = counts[t.value];
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "relative shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black transition-all active:scale-95",
              isActive
                ? "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-white shadow-[0_3px_8px_rgba(254,44,85,0.3)]"
                : "bg-[var(--app-card)] text-muted-foreground shadow-[inset_0_0_0_1px_rgba(193,122,60,0.2)]",
            )}
          >
            {t.label}
            {c > 0 && (
              <span
                className={cn(
                  "ml-1 rounded px-1 py-0 text-[9px] font-black",
                  isActive
                    ? "bg-white/30 text-white"
                    : "bg-[var(--brand-red-soft)] text-[var(--brand-red)]",
                )}
              >
                {c}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ==============================
 * 状态时间线
 * ============================== */
function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: "ORDER", label: "下单" },
    { key: "PAY", label: "支付" },
    { key: "COUPON", label: "出券" },
    { key: "DONE", label: "核销" },
  ];
  const reachedIndex = (() => {
    if (status === "CANCELLED" || status === "REFUNDED") return 0;
    if (status === "PENDING") return 0;
    if (status === "PAID") return 2; // 已付款 + 已出券
    return 3;
  })();

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const reached = i <= reachedIndex;
        const isLast = i === steps.length - 1;
        return (
          <div key={step.key} className="flex flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black",
                  reached
                    ? "bg-[var(--brand-red)] text-white shadow-[0_2px_4px_rgba(254,44,85,0.32)]"
                    : "bg-[var(--app-soft-strong)] text-muted-foreground",
                )}
              >
                {reached ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[9px] font-black leading-none",
                  reached
                    ? "text-[var(--brand-red)]"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-[2px] flex-1 rounded-full",
                  i < reachedIndex
                    ? "bg-[linear-gradient(90deg,#FE2C55_0%,#FF6E37_100%)]"
                    : "bg-[var(--app-soft-strong)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ==============================
 * 订单卡
 * ============================== */
function OrderCard({
  order,
  onClickProduct,
  onCancel,
  onCopyCode,
  onUseCoupon,
}: {
  order: OrderRecord;
  onClickProduct: () => void;
  onCancel: () => void;
  onCopyCode: () => void;
  onUseCoupon: () => void;
}) {
  const meta = STATUS_META[order.status] ?? {
    label: order.status,
    tone: "muted" as const,
    Icon: Clock,
  };
  const StatusIcon = meta.Icon;
  const cash = Number(order.cashPaid ?? 0);
  const points = Number(order.pointsPaid ?? 0);
  const code = order.coupon?.code;
  const isPending = order.status === "PENDING";
  const isPaid = order.status === "PAID";
  const isClosed = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_6px_18px_rgba(122,60,30,0.08)]",
        isClosed && "opacity-75",
      )}
    >
      {/* 顶部状态条 */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {order.product.app}
          </span>
          <span className="text-[10px] text-muted-foreground/60">·</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(order.createdAt)}
          </span>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
            meta.tone === "amber" &&
              "bg-[var(--brand-orange-soft)] text-[var(--brand-orange)]",
            meta.tone === "red" &&
              "bg-[var(--brand-red)] text-white shadow-[0_2px_4px_rgba(254,44,85,0.28)]",
            meta.tone === "muted" &&
              "bg-[var(--app-soft-strong)] text-muted-foreground",
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </div>
      </div>

      <div className="h-px bg-[var(--app-card-border)] mx-3.5" />

      {/* 商品行 */}
      <button
        type="button"
        onClick={onClickProduct}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left active:bg-[var(--app-soft)]"
      >
        {/* 商品图/缩略 */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--app-soft)] shadow-[inset_0_0_0_1px_var(--app-card-border)]">
          {order.product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.product.imageUrl}
              alt={order.product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Gift className="h-7 w-7" strokeWidth={1.5} />
            </div>
          )}
          {isClosed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
              <StampMark
                size={42}
                tone={order.status === "REFUNDED" ? "gold" : "red"}
              >
                {order.status === "REFUNDED" ? "退" : "取消"}
              </StampMark>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-[13px] font-black text-foreground">
            {order.product.title}
          </div>
          {order.product.subtitle && (
            <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-muted-foreground">
              {order.product.subtitle}
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-1.5">
            {/* 价格 */}
            <div className="flex items-baseline gap-0.5">
              {points > 0 && (
                <span className="text-[12px] font-black text-[var(--brand-red)] tabular-nums">
                  {points}
                  <span className="text-[10px] font-bold">积分</span>
                </span>
              )}
              {points > 0 && cash > 0 && (
                <span className="text-[10px] font-black text-foreground">
                  +
                </span>
              )}
              {cash > 0 && (
                <span className="text-[12px] font-black text-[var(--brand-red)] tabular-nums">
                  <span className="text-[10px]">¥</span>
                  {cash.toFixed(cash % 1 === 0 ? 0 : 2)}
                </span>
              )}
              {points === 0 && cash === 0 && (
                <span className="text-[12px] font-black italic text-[var(--brand-red)]">
                  免费!
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* 状态时间线（已付款/已结束才显示） */}
      {!isPending && !isClosed && (
        <div className="px-3.5 pb-2.5">
          <StatusTimeline status={order.status} />
        </div>
      )}

      {/* 券码/动作区 */}
      <div className="border-t border-dashed border-[var(--app-card-border)] px-3.5 py-2.5">
        {isPaid && code ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-lg bg-[var(--app-soft)] px-2 py-1.5 shadow-[inset_0_0_0_1px_var(--app-card-border)]">
              <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                券码
              </div>
              <div className="mt-0.5 truncate font-mono text-[12px] font-black tabular-nums text-foreground">
                {code}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopyCode();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red-soft)] text-[var(--brand-red)] active:scale-95"
              aria-label="复制券码"
            >
              <Copy className="h-4 w-4" />
            </button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUseCoupon();
              }}
              className="h-9 shrink-0 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-3.5 text-[12px] font-black text-white shadow-[0_3px_8px_rgba(254,44,85,0.32)] hover:brightness-110"
            >
              立即核销 ›
            </Button>
          </div>
        ) : isPending ? (
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-orange)]">
              <Clock className="h-3 w-3" />
              订单未支付，及时完成支付
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="h-7 gap-1 rounded-full px-2.5 text-[11px] font-black text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3 w-3" />
              取消订单
            </Button>
          </div>
        ) : (
          <div className="text-center text-[11px] font-semibold text-muted-foreground">
            {order.status === "CANCELLED"
              ? "订单已取消 · 积分与现金已退回"
              : order.status === "REFUNDED"
                ? "订单已退款"
                : "订单完成"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==============================
 * 空状态
 * ============================== */
function OrdersEmpty({
  tab,
  onGoHome,
}: {
  tab: TabValue;
  onGoHome: () => void;
}) {
  const text =
    tab === "pending"
      ? "暂无待付款订单"
      : tab === "unused"
        ? "暂无待核销订单"
        : tab === "used"
          ? "暂无已结束订单"
          : "还没下过单，去首页看看";
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] px-5 py-8 text-center shadow-[inset_0_0_0_1px_var(--app-card-border)]">
      <div className="dotted-warm pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative">
        <Package
          className="mx-auto mb-2 h-12 w-12 text-[var(--brand-red)]"
          strokeWidth={1.5}
        />
        <div className="text-[14px] font-black text-[var(--brand-red)]">
          {text}
        </div>
        <div className="mt-1 text-[11px] font-semibold text-[#8B4513]">
          每天爆款限时折扣，下手要快
        </div>
        {tab === "all" && (
          <Button
            onClick={onGoHome}
            className="mt-4 h-9 gap-1 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-5 text-[12px] font-black text-white shadow-[0_4px_10px_rgba(254,44,85,0.32)] hover:brightness-110"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            去首页抢券 ›
          </Button>
        )}
      </div>
    </div>
  );
}

/* ============================================================= */
export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") ?? "all") as TabValue;
  const [tab, setTab] = useState<TabValue>(initialTab);
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: ordersData, isLoading } = useQuery(
    trpc.order.myOrders.queryOptions(),
  );
  const cancelMutation = useMutation(trpc.order.cancel.mutationOptions());
  const orders = useMemo(
    () => (ordersData ?? []) as OrderRecord[],
    [ordersData],
  );

  const counts = useMemo<Record<TabValue, number>>(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === "PENDING").length,
      unused: orders.filter((o) => o.status === "PAID").length,
      used: orders.filter(
        (o) => o.status === "CANCELLED" || o.status === "REFUNDED",
      ).length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    if (tab === "pending") return orders.filter((o) => o.status === "PENDING");
    if (tab === "unused") return orders.filter((o) => o.status === "PAID");
    if (tab === "used")
      return orders.filter(
        (o) => o.status === "CANCELLED" || o.status === "REFUNDED",
      );
    return orders;
  }, [orders, tab]);

  async function handleCancel() {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({ orderId: cancelTarget.id });
      toast.success("订单已取消");
      setCancelTarget(null);
      await queryClient.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "取消失败");
    }
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("券码已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  async function handleUseCoupon(order: OrderRecord) {
    const code = order.coupon?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("券码已复制 · 即将跳转核销");
    } catch {
      toast.error("复制失败");
    }
    openApp(order.product.app);
  }

  return (
    <PageTransition>
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
        <AnimatedItem>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-card)] text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)] active:scale-95"
              aria-label="返回"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <OrdersHero orders={orders} />
        </AnimatedItem>

        <AnimatedItem>
          <OrderTabs tab={tab} setTab={setTab} counts={counts} />
        </AnimatedItem>

        <div>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <OrdersEmpty tab={tab} onGoHome={() => router.push("/")} />
            </motion.div>
          ) : (
            <StaggerList className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 28,
                    }}
                  >
                    <OrderCard
                      order={order}
                      onClickProduct={() =>
                        router.push(`/scroll/${order.product.id}`)
                      }
                      onCancel={() => setCancelTarget(order)}
                      onCopyCode={() => {
                        const code = order.coupon?.code;
                        if (code) handleCopyCode(code);
                      }}
                      onUseCoupon={() => handleUseCoupon(order)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </StaggerList>
          )}
        </div>
      </div>

      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>确认取消订单</DialogTitle>
            <DialogDescription>
              取消后已支付的金额和积分将退回。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              className="rounded-full"
            >
              返回
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="rounded-full"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中
                </>
              ) : (
                "确认取消"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
