"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Package, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  appCardClassName, PageHeading, EmptyStateDashed,
} from "@/components/shared";
import { PageTransition, AnimatedItem, StaggerList, HoverScale } from "@/components/motion";

type OrderRecord = RouterOutputs["order"]["myOrders"][number];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "待付款", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PAID: { label: "已付款", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  CANCELLED: { label: "已取消", cls: "bg-secondary text-muted-foreground border-border" },
  REFUNDED: { label: "已退款", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "all";
  const [tab, setTab] = useState(initialTab);
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: ordersData, isLoading } = useQuery(trpc.order.myOrders.queryOptions());
  const cancelMutation = useMutation(trpc.order.cancel.mutationOptions());
  const orders = useMemo(() => (ordersData ?? []) as OrderRecord[], [ordersData]);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    if (tab === "pending") return orders.filter((o) => o.status === "PENDING");
    if (tab === "unused") return orders.filter((o) => o.status === "PAID");
    if (tab === "used") return orders.filter((o) => o.status === "CANCELLED" || o.status === "REFUNDED");
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
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
        </AnimatedItem>

        <AnimatedItem>
          <PageHeading label="My Orders" title="我的订单" />
        </AnimatedItem>

        <AnimatedItem>
          <Card className={appCardClassName}>
            <CardContent className="space-y-4 p-5">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="h-auto w-full rounded-[22px] bg-secondary p-1">
                  {[
                    { value: "all", label: "全部" },
                    { value: "pending", label: "待付款" },
                    { value: "unused", label: "待使用" },
                    { value: "used", label: "已结束" },
                  ].map((t) => (
                    <TabsTrigger key={t.value} value={t.value} className="rounded-[18px] data-[state=active]:bg-background data-[state=active]:text-foreground">
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <EmptyStateDashed text={tab === "all" ? "暂无订单，快去首页兑换权益吧" : "当前筛选下没有订单"} />
              ) : (
                <StaggerList className="space-y-3">
                  {filtered.map((order) => {
                    const s = STATUS_MAP[order.status] ?? { label: order.status, cls: "bg-secondary text-muted-foreground border-border" };
                    const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
                    return (
                      <AnimatedItem key={order.id}>
                        <HoverScale scale={1.01}>
                          <div className="rounded-[22px] border border-border bg-secondary/50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-foreground">{order.product.title}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">{order.product.app} · {createdAt.toLocaleString("zh-CN")}</div>
                                </div>
                              </div>
                              <Badge variant="outline" className={`shrink-0 rounded-full ${s.cls}`}>{s.label}</Badge>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{order.pointsPaid} 积分 + ¥{Number(order.cashPaid).toFixed(2)}</span>
                              <div className="flex items-center gap-2">
                                {order.coupon && <span className="font-mono text-foreground">券码: {order.coupon.code}</span>}
                                {order.status === "PENDING" && (
                                  <Button variant="outline" size="sm" className="h-7 gap-1 rounded-full px-2.5 text-xs text-destructive hover:text-destructive" onClick={() => setCancelTarget(order)}>
                                    <X className="h-3 w-3" /> 取消
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </HoverScale>
                      </AnimatedItem>
                    );
                  })}
                </StaggerList>
              )}
            </CardContent>
          </Card>
        </AnimatedItem>

        <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
          <DialogContent className="max-w-md rounded-[28px]">
            <DialogHeader>
              <DialogTitle>确认取消订单</DialogTitle>
              <DialogDescription>取消后已支付的金额和积分将退回。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelTarget(null)} className="rounded-full">返回</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending} className="rounded-full">
                {cancelMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />处理中</> : "确认取消"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
