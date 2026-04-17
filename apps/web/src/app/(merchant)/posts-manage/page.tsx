"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageSquare, Search, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type PendingDelete =
  | { kind: "post"; id: string; title: string }
  | { kind: "comment"; id: string; preview: string; postId: string };

export default function PostsManagePage() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [reason, setReason] = useState("");
  const pageSize = 10;

  const listQuery = useQuery(
    trpc.post.adminList.queryOptions({
      page,
      pageSize,
      search: search.trim() || undefined,
    }),
  );

  const detailQuery = useQuery({
    ...trpc.post.byId.queryOptions({ id: expandedId ?? "" }),
    enabled: !!expandedId,
  });

  const deletePostMut = useMutation(trpc.post.adminDeletePost.mutationOptions());
  const deleteCommentMut = useMutation(
    trpc.post.adminDeleteComment.mutationOptions(),
  );

  const posts = useMemo(() => listQuery.data?.posts ?? [], [listQuery.data]);
  const totalPages = listQuery.data
    ? Math.max(1, Math.ceil(listQuery.data.total / listQuery.data.pageSize))
    : 1;

  async function confirmDelete() {
    if (!pending) return;
    try {
      if (pending.kind === "post") {
        await deletePostMut.mutateAsync({ id: pending.id, reason: reason.trim() || undefined });
        toast.success("帖子已删除");
        if (expandedId === pending.id) setExpandedId(null);
      } else {
        await deleteCommentMut.mutateAsync({
          id: pending.id,
          reason: reason.trim() || undefined,
        });
        toast.success("评论已删除");
      }
      setPending(null);
      setReason("");
      await qc.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">内容审核</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理用户发布的帖子与评论
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="搜索标题 / 内容 / 作者"
              className="pl-9"
            />
          </div>

          {listQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              暂无帖子
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => {
                const expanded = expandedId === p.id;
                return (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border bg-card/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{p.title}</span>
                          {p.app ? (
                            <Badge variant="outline" className="text-[11px]">
                              {p.app}
                            </Badge>
                          ) : null}
                          <Badge variant="secondary" className="text-[11px]">
                            {p._count.comments} 评论
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {p.user.name ?? p.user.email} ·{" "}
                          {new Date(p.createdAt).toLocaleString("zh-CN")}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {p.content}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedId(expanded ? null : p.id)}
                        >
                          <MessageSquare className="mr-1 h-3.5 w-3.5" />
                          {expanded ? "收起" : "查看评论"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setPending({ kind: "post", id: p.id, title: p.title })
                          }
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          删除帖子
                        </Button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="mt-4 border-t border-border pt-3">
                        {detailQuery.isLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : detailQuery.data?.comments.length ? (
                          <ul className="space-y-2">
                            {detailQuery.data.comments.map((c) => (
                              <li
                                key={c.id}
                                className="flex items-start justify-between gap-3 rounded-md bg-secondary/40 p-3 text-sm"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs text-muted-foreground">
                                    {c.user.name ?? "匿名"} ·{" "}
                                    {new Date(c.createdAt).toLocaleString("zh-CN")}
                                  </div>
                                  <p className="mt-1 text-foreground">{c.content}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="shrink-0 text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    setPending({
                                      kind: "comment",
                                      id: c.id,
                                      preview: c.content.slice(0, 60),
                                      postId: p.id,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="py-4 text-center text-xs text-muted-foreground">
                            暂无评论
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted-foreground">
            <span>
              第 {listQuery.data?.page ?? page} / {totalPages} 页（共{" "}
              {listQuery.data?.total ?? 0} 条）
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

      <Dialog
        open={!!pending}
        onOpenChange={(o) => {
          if (!o) {
            setPending(null);
            setReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pending?.kind === "post" ? "删除帖子" : "删除评论"}
            </DialogTitle>
            <DialogDescription>
              {pending?.kind === "post"
                ? `此操作将同时删除帖子「${pending.title}」下的所有评论，且不可撤销。`
                : `确认删除该评论？${pending?.preview ? `「${pending.preview}…」` : ""}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">删除原因（将写入审计日志）</div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="如：违规内容 / 垃圾信息 …"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePostMut.isPending || deleteCommentMut.isPending}
            >
              {(deletePostMut.isPending || deleteCommentMut.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
