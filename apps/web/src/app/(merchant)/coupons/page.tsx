"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CouponsPayload = RouterOutputs["admin"]["listCoupons"];
type CouponItem = CouponsPayload["coupons"][number];
type CouponStatusFilter = "all" | "ACTIVE" | "USED" | "EXPIRED";

function couponStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-400/30">
          有效
        </Badge>
      );
    case "USED":
      return (
        <Badge className="bg-blue-500/10 text-blue-300 border-blue-400/30">
          已使用
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge className="bg-slate-500/10 text-slate-300 border-slate-400/30">
          已失效
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function CouponsPage() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CouponStatusFilter>("all");
  const pageSize = 20;

  const { data, isLoading } = useQuery(
    trpc.admin.listCoupons.queryOptions({
      page,
      pageSize,
      status: statusFilter,
      search: search.trim() || undefined,
    }),
  );

  const payload = data as CouponsPayload | undefined;
  const coupons = useMemo(() => payload?.coupons ?? [], [payload]);
  const totalPages = payload
    ? Math.max(1, Math.ceil(payload.total / payload.pageSize))
    : 1;

  const summary = useMemo(() => {
    const active = coupons.filter((c) => c.status === "ACTIVE").length;
    const used = coupons.filter((c) => c.status === "USED").length;
    const expired = coupons.filter((c) => c.status === "EXPIRED").length;

    return [
      { label: "当前页券码", value: String(coupons.length) },
      { label: "有效", value: String(active) },
      { label: "已使用", value: String(used) },
      { label: "已失效", value: String(expired) },
    ];
  }, [coupons]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">券码管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看所有发放的券码及使用状态
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as CouponStatusFilter);
                setPage(1);
              }}
            >
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="ACTIVE">有效</TabsTrigger>
                <TabsTrigger value="USED">已使用</TabsTrigger>
                <TabsTrigger value="EXPIRED">已失效</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索券码 / 用户 / 商品"
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="mt-4 text-sm font-medium text-foreground">
                没有找到匹配的券码
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                试试清空搜索词或换个状态筛选。
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>券码</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>使用时间</TableHead>
                    <TableHead>发放时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c) => (
                    <TableRow key={c.id} className="border-border">
                      <TableCell className="font-mono text-xs text-foreground">
                        {c.code}
                      </TableCell>
                      <TableCell>
                        <div className="text-foreground">
                          {c.user.name ?? c.user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-foreground">{c.product.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.product.app}
                        </div>
                      </TableCell>
                      <TableCell>{couponStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.expiresAt).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.usedAt
                          ? new Date(c.usedAt).toLocaleString("zh-CN")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString("zh-CN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted-foreground">
            <span>
              第 {payload?.page ?? page} / {totalPages} 页（共{" "}
              {payload?.total ?? 0} 条）
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
