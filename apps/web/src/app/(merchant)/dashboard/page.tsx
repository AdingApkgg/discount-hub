"use client";

import {
  CheckCircle2,
  DollarSign,
  Users,
  Package,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const trpc = useTRPC();

  const { data: stats, isLoading } = useQuery(
    trpc.user.dashboardStats.queryOptions(),
  );

  const { data: records } = useQuery(
    trpc.verify.recentRecords.queryOptions(),
  );

  const statCards = [
    {
      label: "今日核销",
      value: stats ? String(stats.todayVerifications) : "—",
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    {
      label: "今日收入",
      value: stats ? `¥${stats.todayRevenue.toFixed(2)}` : "—",
      icon: DollarSign,
      color: "text-blue-400",
    },
    {
      label: "今日订单",
      value: stats ? String(stats.todayOrderCount) : "—",
      icon: TrendingUp,
      color: "text-violet-400",
    },
    {
      label: "活跃用户",
      value: stats ? String(stats.activeUsers) : "—",
      icon: Users,
      color: "text-amber-400",
    },
    {
      label: "在架商品",
      value: stats ? String(stats.activeProducts) : "—",
      icon: Package,
      color: "text-rose-400",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">数据看板</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          今日经营数据概览
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    {s.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold text-foreground">
                最近核销记录
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                最近 50 条核销记录
              </div>
            </div>
            <Badge variant="outline" className="border-border">
              实时更新
            </Badge>
          </div>

          {!records || records.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 text-sm text-muted-foreground">
              暂无核销记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>券码</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>核销人</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 20).map((r) => (
                    <TableRow key={r.id} className="border-border">
                      <TableCell className="font-mono text-xs">{r.coupon.code}</TableCell>
                      <TableCell>{r.coupon.product.title}</TableCell>
                      <TableCell>{r.coupon.user.name ?? r.coupon.user.email}</TableCell>
                      <TableCell>{r.verifier.name ?? r.verifier.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.verifiedAt).toLocaleString("zh-CN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
