"use client";

import Link from "next/link";
import { BellRing, Check, Loader2, Megaphone } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  INFO: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  WARNING: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  SUCCESS: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  CRITICAL: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
};

const LEVEL_LABEL: Record<string, string> = {
  INFO: "信息",
  WARNING: "警告",
  SUCCESS: "成功",
  CRITICAL: "重要",
};

export default function NoticesCenterPage() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(trpc.notice.listActive.queryOptions());
  const markRead = useMutation(trpc.notice.markRead.mutationOptions());
  const markAllRead = useMutation(trpc.notice.markAllRead.mutationOptions());

  const notices = data ?? [];
  const unreadCount = notices.filter((n) => !n.read).length;

  async function handleMarkAll() {
    try {
      await markAllRead.mutateAsync();
      toast.success("已全部标记为已读");
      await qc.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">公告中心</h1>
          {unreadCount > 0 ? (
            <Badge variant="secondary">{unreadCount} 未读</Badge>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            disabled={markAllRead.isPending}
            className="gap-1 rounded-full"
          >
            {markAllRead.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            全部已读
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
            <Megaphone className="h-10 w-10 opacity-50" />
            暂无公告
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "border border-border transition-colors",
                !n.read && "bg-secondary/30",
              )}
              onClick={async () => {
                if (!n.read) {
                  try {
                    await markRead.mutateAsync({ noticeId: n.id });
                    await qc.invalidateQueries();
                  } catch {}
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[11px]", LEVEL_STYLES[n.level])}
                  >
                    {LEVEL_LABEL[n.level] ?? n.level}
                  </Badge>
                  <span className="font-medium text-foreground">{n.title}</span>
                  {!n.read ? (
                    <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {n.content}
                </p>
                {n.linkUrl ? (
                  <Link
                    href={n.linkUrl}
                    className="mt-2 inline-block text-xs text-primary underline-offset-2 hover:underline"
                  >
                    查看详情 →
                  </Link>
                ) : null}
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("zh-CN")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
