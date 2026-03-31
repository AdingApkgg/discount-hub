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
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
            <div className="h-48 rounded-lg border border-border bg-secondary/30 flex items-center justify-center text-muted-foreground text-sm">
              暂无核销记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-medium">券码</th>
                    <th className="pb-2 font-medium">商品</th>
                    <th className="pb-2 font-medium">用户</th>
                    <th className="pb-2 font-medium">核销人</th>
                    <th className="pb-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 20).map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{r.coupon.code}</td>
                      <td className="py-2">{r.coupon.product.title}</td>
                      <td className="py-2">{r.coupon.user.name ?? r.coupon.user.email}</td>
                      <td className="py-2">{r.verifier.name ?? r.verifier.email}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(r.verifiedAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
