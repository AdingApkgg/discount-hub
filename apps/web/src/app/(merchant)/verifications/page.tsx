"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function isoOrNull(v: string | undefined) {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function VerificationsPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery(
    trpc.verify.listRecords.queryOptions({
      page,
      pageSize,
      search: search.trim() || undefined,
      fromDate: isoOrNull(from),
      toDate: isoOrNull(to),
    }),
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const records = useMemo(() => data?.records ?? [], [data]);

  function handleExport() {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    const url = `/api/export/verifications${params.size ? `?${params.toString()}` : ""}`;
    window.location.href = url;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">核销记录</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查询券码核销明细，可按时间、核销人、关键词筛选
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          导出 CSV
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs">关键词</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="券码 / 商品 / 用户 / 核销人"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">起始时间</Label>
              <Input
                type="datetime-local"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">结束时间</Label>
              <Input
                type="datetime-local"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              没有匹配的核销记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>核销时间</TableHead>
                    <TableHead>券码</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>核销人</TableHead>
                    <TableHead>备注</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id} className="border-border">
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(r.verifiedAt).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        {r.coupon.code}
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="text-foreground">{r.coupon.product.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.coupon.product.app}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="text-foreground">
                          {r.coupon.user.name ?? r.coupon.user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.coupon.user.email}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[140px] text-foreground">
                        {r.verifier.name ?? r.verifier.email}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted-foreground">
            <span>
              第 {data?.page ?? page} / {totalPages} 页（共 {data?.total ?? 0} 条）
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
