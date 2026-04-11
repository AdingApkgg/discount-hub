"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, ShoppingBag, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OrderRecord = RouterOutputs["order"]["myOrders"][number];
type StatusFilter = "all" | "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";

const surfaceClassName =
  "gap-0 rounded-[28px] border border-[var(--app-card-border)] bg-[var(--app-card)] py-0 shadow-[var(--app-card-shadow)]";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "待付款", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PAID: { label: "已付款", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  CANCELLED: { label: "已取消", cls: "bg-slate-100 text-slate-500 border-slate-200" },
  REFUNDED: { label: "已退款", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

export default function MyOrdersPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);

  const { data: ordersData, isLoading } = useQuery(trpc.order.myOrders.queryOptions());
  const cancelMutation = useMutation(trpc.order.cancel.mutationOptions());

  const orders = useMemo(() => (ordersData ?? []) as OrderRecord[], [ordersData]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const summary = useMemo(() => {
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const paid = orders.filter((o) => o.status === "PAID").length;
    const cancelled = orders.filter((o) => o.status === "CANCELLED" || o.status === "REFUNDED").length;
    return [
      { label: "全部", value: orders.length },
      { label: "待付款", value: pending },
      { label: "已付款", value: paid },
      { label: "已取消/退款", value: cancelled },
    ];
  }, [orders]);

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

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
      <section className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
            My Orders
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
            我的订单
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/")}
          className="rounded-full border-[var(--app-card-border)] bg-[var(--app-card)] px-4 text-[var(--app-strong)] shadow-sm hover:bg-[var(--app-soft)]"
        >
          继续兑换
        </Button>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className={surfaceClassName}>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={surfaceClassName}>
        <CardContent className="p-5 space-y-4">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="PENDING">待付款</TabsTrigger>
              <TabsTrigger value="PAID">已付款</TabsTrigger>
              <TabsTrigger value="CANCELLED">已取消</TabsTrigger>
              <TabsTrigger value="REFUNDED">已退款</TabsTrigger>
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
              <div className="mt-4 text-sm font-medium text-slate-700">暂无订单</div>
              <div className="mt-1 text-xs text-slate-500">
                {statusFilter === "all"
                  ? "快去首页兑换权益吧"
                  : "当前筛选下没有匹配的订单"}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const s = STATUS_MAP[order.status] ?? {
                  label: order.status,
                  cls: "bg-slate-50 text-slate-500 border-slate-200",
                };
                const createdAt =
                  order.createdAt instanceof Date
                    ? order.createdAt
                    : new Date(order.createdAt);

                return (
                  <div
                    key={order.id}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                          <Package className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {order.product.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {order.product.app} · {createdAt.toLocaleString("zh-CN")}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 rounded-full ${s.cls}`}
                      >
                        {s.label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {order.pointsPaid} 积分 + ¥{Number(order.cashPaid).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2">
                        {order.coupon && (
                          <span className="font-mono text-slate-700">
                            券码: {order.coupon.code}
                          </span>
                        )}
                        {order.status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 rounded-full border-slate-200 px-2.5 text-xs text-rose-500 hover:border-rose-300 hover:text-rose-600"
                            onClick={() => setCancelTarget(order)}
                          >
                            <X className="h-3 w-3" />
                            取消
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="max-w-md rounded-[28px] border border-[var(--app-card-border)] bg-[var(--app-card)] shadow-[var(--app-card-shadow)]">
          <DialogHeader>
            <DialogTitle>确认取消订单</DialogTitle>
            <DialogDescription>
              取消后已支付的金额和积分将退回，券码将失效。
            </DialogDescription>
          </DialogHeader>
          {cancelTarget && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">商品</span>
                <span className="text-slate-900">{cancelTarget.product.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">金额</span>
                <span className="text-slate-900">
                  {cancelTarget.pointsPaid} 积分 + ¥{Number(cancelTarget.cashPaid).toFixed(2)}
                </span>
              </div>
            </div>
          )}
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
                  处理中...
                </>
              ) : (
                "确认取消"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
