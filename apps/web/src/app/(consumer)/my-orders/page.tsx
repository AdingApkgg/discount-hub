"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  AnimatedItem,
  PageTransition,
} from "@/components/motion";

type OrderRecord = RouterOutputs["order"]["myOrders"][number];

const TABS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待付款" },
  { value: "unused", label: "待使用" },
  { value: "used", label: "已结束" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "待付款", className: "text-amber-600" },
  PAID: { label: "待核销", className: "text-[var(--brand-red)]" },
  CANCELLED: { label: "已取消", className: "text-muted-foreground" },
  REFUNDED: { label: "已退款", className: "text-stone-500" },
};

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

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-5 md:px-6 md:py-5">
        <AnimatedItem>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--app-card-border)] bg-[var(--app-card)] text-foreground transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="text-base font-semibold text-foreground">
              我的订单
            </div>
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <div className="relative flex items-center gap-1 border-b border-[var(--app-card-border)]">
            {TABS.map((t) => {
              const isActive = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "relative px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  {isActive && (
                    <motion.span
                      layoutId="orders-tab"
                      className="absolute bottom-[-1px] left-2 right-2 h-[3px] rounded-full bg-[var(--brand-red)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <Card className="gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card)] p-0 shadow-none">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {tab === "all" ? "暂无订单，快去首页兑换权益吧" : "当前筛选下没有订单"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--app-card-border)] bg-secondary/50 text-left text-[11px] font-medium text-muted-foreground">
                      <th className="px-4 py-2.5">平台</th>
                      <th className="px-3 py-2.5">券码</th>
                      <th className="px-3 py-2.5">价格</th>
                      <th className="px-3 py-2.5">下单时间</th>
                      <th className="px-4 py-2.5 text-right">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-card-border)]">
                    {filtered.map((order) => {
                      const s =
                        STATUS_MAP[order.status] ?? {
                          label: order.status,
                          className: "text-muted-foreground",
                        };
                      const createdAt =
                        order.createdAt instanceof Date
                          ? order.createdAt
                          : new Date(order.createdAt);
                      const couponCode = order.coupon?.code;
                      return (
                        <tr
                          key={order.id}
                          className="cursor-pointer transition-colors hover:bg-secondary/40"
                          onClick={() =>
                            router.push(`/scroll/${order.product.id}`)
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground">
                              {order.product.app}
                            </div>
                            <div className="mt-0.5 line-clamp-1 max-w-[200px] text-sm font-medium text-foreground">
                              {order.product.title}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {couponCode ? (
                              <span className="font-mono text-xs text-foreground">
                                {couponCode}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-xs font-semibold text-foreground">
                              {order.pointsPaid > 0 && (
                                <span>{order.pointsPaid} 积分</span>
                              )}
                              {order.pointsPaid > 0 &&
                                Number(order.cashPaid) > 0 && (
                                  <span className="mx-0.5 text-muted-foreground">
                                    +
                                  </span>
                                )}
                              {Number(order.cashPaid) > 0 && (
                                <span>
                                  ¥{Number(order.cashPaid).toFixed(0)}
                                </span>
                              )}
                              {order.pointsPaid === 0 &&
                                Number(order.cashPaid) === 0 && (
                                  <span>免费</span>
                                )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {createdAt.toLocaleDateString("zh-CN")}
                            <div className="text-[10px] text-muted-foreground">
                              {createdAt.toLocaleTimeString("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className={cn(
                                "text-xs font-semibold",
                                s.className,
                              )}
                            >
                              {s.label}
                            </div>
                            {order.status === "PENDING" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelTarget(order);
                                }}
                                className="mt-1 h-6 gap-1 px-2 text-[11px] text-destructive hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                                取消
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </AnimatedItem>

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
      </div>
    </PageTransition>
  );
}
