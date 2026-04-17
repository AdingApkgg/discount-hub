"use client";

import { useMemo, useState } from "react";
import { Loader2, Megaphone, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Level = "INFO" | "WARNING" | "SUCCESS" | "CRITICAL";
type Audience = "ALL" | "CONSUMER" | "MERCHANT" | "AGENT" | "ADMIN";

type FormState = {
  id?: string;
  title: string;
  content: string;
  level: Level;
  audience: Audience;
  pinned: boolean;
  isActive: boolean;
  startAt: string;
  endAt: string;
  linkUrl: string;
};

const DEFAULT: FormState = {
  title: "",
  content: "",
  level: "INFO",
  audience: "ALL",
  pinned: false,
  isActive: true,
  startAt: "",
  endAt: "",
  linkUrl: "",
};

const LEVEL_LABELS: Record<Level, { label: string; cls: string }> = {
  INFO: { label: "信息", cls: "bg-blue-500/10 text-blue-300 border-blue-400/30" },
  WARNING: {
    label: "警告",
    cls: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  },
  SUCCESS: {
    label: "成功",
    cls: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
  },
  CRITICAL: {
    label: "严重",
    cls: "bg-red-500/10 text-red-300 border-red-400/30",
  },
};

const AUDIENCE_LABELS: Record<Audience, string> = {
  ALL: "全部用户",
  CONSUMER: "消费者",
  MERCHANT: "商家",
  AGENT: "代理商",
  ADMIN: "管理员",
};

function toLocalInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(v: string) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function NoticesPage() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQuery = useQuery(trpc.admin.listNotices.queryOptions());
  const upsertMut = useMutation(trpc.admin.upsertNotice.mutationOptions());
  const deleteMut = useMutation(trpc.admin.deleteNotice.mutationOptions());

  const notices = useMemo(() => listQuery.data?.notices ?? [], [listQuery.data]);

  function openCreate() {
    setForm({ ...DEFAULT });
  }

  function openEdit(n: (typeof notices)[number]) {
    setForm({
      id: n.id,
      title: n.title,
      content: n.content,
      level: n.level as Level,
      audience: n.audience as Audience,
      pinned: n.pinned,
      isActive: n.isActive,
      startAt: toLocalInput(n.startAt),
      endAt: toLocalInput(n.endAt),
      linkUrl: n.linkUrl ?? "",
    });
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("请填写标题和内容");
      return;
    }
    try {
      await upsertMut.mutateAsync({
        id: form.id,
        title: form.title.trim(),
        content: form.content.trim(),
        level: form.level,
        audience: form.audience,
        pinned: form.pinned,
        isActive: form.isActive,
        startAt: localToIso(form.startAt),
        endAt: localToIso(form.endAt),
        linkUrl: form.linkUrl.trim() ? form.linkUrl.trim() : null,
      });
      toast.success(form.id ? "公告已更新" : "公告已创建");
      setForm(null);
      await qc.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync({ id: deleteId });
      toast.success("公告已删除");
      setDeleteId(null);
      await qc.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">公告管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            创建全站或分角色的系统公告，可设置时间窗口
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          新建公告
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notices.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Megaphone className="h-10 w-10 opacity-50" />
            暂无公告，点击右上角“新建公告”
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <Card key={n.id} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.pinned ? (
                        <Pin className="h-4 w-4 text-amber-400" />
                      ) : null}
                      <span className="font-medium text-foreground">{n.title}</span>
                      <Badge
                        variant="outline"
                        className={LEVEL_LABELS[n.level as Level].cls}
                      >
                        {LEVEL_LABELS[n.level as Level].label}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        {AUDIENCE_LABELS[n.audience as Audience]}
                      </Badge>
                      {!n.isActive ? (
                        <Badge variant="outline" className="text-[11px]">
                          已停用
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="text-[11px]">
                        已读 {n._count.reads}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {n.content}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      创建 {new Date(n.createdAt).toLocaleString("zh-CN")}
                      {n.startAt
                        ? ` · 开始 ${new Date(n.startAt).toLocaleString("zh-CN")}`
                        : null}
                      {n.endAt
                        ? ` · 结束 ${new Date(n.endAt).toLocaleString("zh-CN")}`
                        : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(n)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(n.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 编辑对话框 */}
      <Dialog
        open={!!form}
        onOpenChange={(o) => {
          if (!o) setForm(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "编辑公告" : "新建公告"}</DialogTitle>
            <DialogDescription>支持全站或分角色投放</DialogDescription>
          </DialogHeader>
          {form ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">标题</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={120}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">内容</Label>
                <Textarea
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  maxLength={5000}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">级别</Label>
                  <Select
                    value={form.level}
                    onValueChange={(v) => setForm({ ...form, level: v as Level })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INFO">信息</SelectItem>
                      <SelectItem value="WARNING">警告</SelectItem>
                      <SelectItem value="SUCCESS">成功</SelectItem>
                      <SelectItem value="CRITICAL">严重</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">受众</Label>
                  <Select
                    value={form.audience}
                    onValueChange={(v) =>
                      setForm({ ...form, audience: v as Audience })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">全部</SelectItem>
                      <SelectItem value="CONSUMER">消费者</SelectItem>
                      <SelectItem value="MERCHANT">商家</SelectItem>
                      <SelectItem value="AGENT">代理商</SelectItem>
                      <SelectItem value="ADMIN">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">开始时间（可选）</Label>
                  <Input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) =>
                      setForm({ ...form, startAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">结束时间（可选）</Label>
                  <Input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">跳转链接（可选）</Label>
                <Input
                  placeholder="https://…"
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <div className="text-sm">置顶</div>
                  <div className="text-xs text-muted-foreground">在 C 端顶部优先展示</div>
                </div>
                <Switch
                  checked={form.pinned}
                  onCheckedChange={(v) => setForm({ ...form, pinned: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <div className="text-sm">启用</div>
                  <div className="text-xs text-muted-foreground">关闭后用户看不到</div>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              取消
            </Button>
            <Button onClick={save} disabled={upsertMut.isPending}>
              {upsertMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除公告？</DialogTitle>
            <DialogDescription>此操作将同时删除所有用户的已读标记。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? (
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
