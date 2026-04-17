"use client";

import { useMemo, useState } from "react";
import { Loader2, ScrollText, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AuditLogsPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 30;

  const { data, isLoading } = useQuery(
    trpc.admin.listAuditLogs.queryOptions({
      page,
      pageSize,
      action: action === "all" ? undefined : action,
      search: search.trim() || undefined,
    }),
  );

  const logs = useMemo(() => data?.logs ?? [], [data]);
  const actions = useMemo(() => data?.actions ?? [], [data]);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">操作审计</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理员关键操作留痕，保障可追溯
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
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
                  placeholder="摘要 / 目标ID / 操作人"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">操作类型</Label>
              <Select
                value={action}
                onValueChange={(v) => {
                  setAction(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              暂无审计记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>时间</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead>目标</TableHead>
                    <TableHead>摘要</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id} className="border-border">
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="text-foreground">
                          {l.actor.name ?? l.actor.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {l.actor.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {l.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <div className="text-xs">{l.targetType}</div>
                        {l.targetId ? (
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {l.targetId}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[320px] text-sm text-foreground">
                        {l.summary}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.ip ?? "—"}
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
