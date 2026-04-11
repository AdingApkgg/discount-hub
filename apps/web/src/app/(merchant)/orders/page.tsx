"use client";

import { useMemo, useState } from "react";
import { Loader2, Receipt, Search, Undo2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { getPayMethodDefinition, type PayMethod } from "@discount-hub/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrdersPayload = RouterOutputs["order"]["allOrders"];
type MerchantOrder = OrdersPayload["orders"][number];
type OrderStatusFilter = "all" | "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";

function payMethodLabel(payMethod: string) {
  return getPayMethodDefinition(payMethod as PayMethod)?.name ?? payMethod;
}

function orderStatusLabel(order: MerchantOrder) {
  if (order.status === "CANCELLED") return "已取消";
  if (order.status === "REFUNDED") return "已退款";
  if (order.status !== "PAID") return "待支付";
  if (order.coupon?.status === "USED") return "已核销";
  if (order.coupon?.status === "EXPIRED") return "已失效";
  return "待核销";
}

function statusBadge(order: MerchantOrder) {
  const label = orderStatusLabel(order);

  switch (label) {
    case "已核销":
      return (
        <Badge className="bg-blue-500/10 text-blue-300 border-blue-400/30">
          {label}
        </Badge>
      );
    case "待核销":
      return (
        <Badge className="bg-amber-500/10 text-amber-300 border-amber-400/30">
          {label}
        </Badge>
      );
    case "已取消":
      return (
        <Badge className="bg-rose-500/10 text-rose-300 border-rose-400/30">
          {label}
        </Badge>
      );
    case "已退款":
      return (
        <Badge className="bg-violet-500/10 text-violet-300 border-violet-400/30">
          {label}
        </Badge>
      );
    case "已失效":
      return (
        <Badge className="bg-slate-500/10 text-slate-300 border-slate-400/30">
          {label}
        </Badge>
      );
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

function canRefund(order: MerchantOrder) {
  return order.status === "PAID" && order.coupon?.status !== "USED";
}

export default function OrdersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [refundTarget, setRefundTarget] = useState<MerchantOrder | null>(null);
  const pageSize = 12;

  const { data, isLoading } = useQuery(
    trpc.order.allOrders.queryOptions({ page, pageSize, status: statusFilter }),
  );

  const refundMutation = useMutation(trpc.order.refund.mutationOptions());

  const payload = data as OrdersPayload | undefined;
  const orders = useMemo(() => payload?.orders ?? [], [payload]);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) => {
      const userName = (order.user.name ?? order.user.email).toLowerCase();
      const productTitle = order.product.title.toLowerCase();
      const orderId = order.id.toLowerCase();
      const couponCode = order.coupon?.code.toLowerCase() ?? "";

      return (
        userName.includes(keyword) ||
        productTitle.includes(keyword) ||
        orderId.includes(keyword) ||
        couponCode.includes(keyword)
      );
    });
  }, [orders, search]);

  const summary = useMemo(() => {
    const pendingPayment = orders.filter((order) => order.status === "PENDING").length;
    const paidOrders = orders.filter((order) => order.status === "PAID");
    const pendingVerify = paidOrders.filter(
      (order) => order.coupon?.status === "ACTIVE",
    ).length;
    const verified = paidOrders.filter(
      (order) => order.coupon?.status === "USED",
    ).length;
    const totalRevenue = paidOrders
      .reduce((sum, order) => sum + (order.cashPaid as number), 0)
      .toFixed(2);

    return [
      { label: "当前页订单", value: String(orders.length) },
      { label: "待支付", value: String(pendingPayment) },
      { label: "待核销", value: String(pendingVerify) },
      { label: "已核销", value: String(verified) },
      { label: "现金收入", value: `¥${totalRevenue}` },
    ];
  }, [orders]);

  const totalPages = payload ? Math.max(1, Math.ceil(payload.total / payload.pageSize)) : 1;

  async function handleRefund() {
    if (!refundTarget) return;
    try {
      await refundMutation.mutateAsync({ orderId: refundTarget.id });
      toast.success("退款成功，库存和积分已恢复");
      setRefundTarget(null);
      await queryClient.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "退款失败");
    }
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value as OrderStatusFilter);
    setPage(1);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">订单管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看订单、券码状态和交易收入，支持退款操作。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((item) => (
          <Card key={item.label} className="border-border">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={statusFilter} onValueChange={handleStatusChange}>
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="PENDING">待支付</TabsTrigger>
                <TabsTrigger value="PAID">已支付</TabsTrigger>
                <TabsTrigger value="REFUNDED">已退款</TabsTrigger>
                <TabsTrigger value="CANCELLED">已取消</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索订单号 / 用户 / 商品 / 券码"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="mt-4 text-sm font-medium text-foreground">
                当前没有匹配的订单
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                试试清空搜索词，或者换个状态筛选看看。
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>订单号</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>券码</TableHead>
                    <TableHead>支付方式</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead className="text-right">积分</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>支付时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="border-border">
                      <TableCell className="font-mono text-xs text-foreground">
                        {order.id}
                      </TableCell>
                      <TableCell>
                        <div className="text-foreground">
                          {order.user.name ?? order.user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-foreground">{order.product.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.product.app}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {order.coupon?.code ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payMethodLabel(order.payMethod)}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        ¥{Number(order.cashPaid).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {order.pointsPaid}
                      </TableCell>
                      <TableCell>{statusBadge(order)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {order.paidAt
                          ? new Date(order.paidAt).toLocaleString("zh-CN")
                          : "未支付"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canRefund(order) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-rose-400 hover:text-rose-300 hover:border-rose-400/50"
                            onClick={() => setRefundTarget(order)}
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            退款
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted-foreground">
            <span>
              第 {payload?.page ?? page} / {totalPages} 页（共 {payload?.total ?? 0} 条）
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>确认退款</DialogTitle>
            <DialogDescription>
              退款后将恢复商品库存和用户积分，券码将失效。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          {refundTarget && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">订单号</span>
                <span className="font-mono text-foreground">{refundTarget.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">用户</span>
                <span className="text-foreground">{refundTarget.user.name ?? refundTarget.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品</span>
                <span className="text-foreground">{refundTarget.product.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">退款金额</span>
                <span className="text-foreground font-semibold">¥{Number(refundTarget.cashPaid).toFixed(2)}</span>
              </div>
              {refundTarget.pointsPaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">退还积分</span>
                  <span className="text-foreground">{refundTarget.pointsPaid}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认退款"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
