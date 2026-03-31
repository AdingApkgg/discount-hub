"use client";

import {
  CheckCircle2,
  DollarSign,
  Users,
  Package,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = [
  {
    label: "今日核销",
    value: "23",
    change: "+12%",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
  {
    label: "今日收入",
    value: "¥1,280",
    change: "+8%",
    icon: DollarSign,
    color: "text-blue-400",
  },
  {
    label: "活跃用户",
    value: "156",
    change: "+5%",
    icon: Users,
    color: "text-violet-400",
  },
  {
    label: "在架商品",
    value: "12",
    change: "—",
    icon: Package,
    color: "text-amber-400",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">数据看板</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          今日经营数据概览
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
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
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">{s.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold text-foreground">
                最近核销记录
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                今日核销趋势
              </div>
            </div>
            <Badge variant="outline" className="border-border">
              实时更新
            </Badge>
          </div>
          <div className="h-48 rounded-lg border border-border bg-secondary/30 flex items-center justify-center text-muted-foreground text-sm">
            接入 tRPC 后自动展示实时数据图表
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
