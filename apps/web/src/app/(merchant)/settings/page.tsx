"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Image, Loader2, Plus, Save, Store, Bell, Shield, Palette, Sun, Moon, Monitor, Trash2, Zap } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type NotifyPrefs = {
  orderNotify: boolean;
  verifyNotify: boolean;
  dailySummary: boolean;
};

const NOTIFY_KEY = "merchant:notify_prefs";

function loadNotifyPrefs(): NotifyPrefs {
  if (typeof window === "undefined") {
    return { orderNotify: true, verifyNotify: true, dailySummary: true };
  }
  try {
    const raw = localStorage.getItem(NOTIFY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { orderNotify: true, verifyNotify: true, dailySummary: true };
}

function saveNotifyPrefs(prefs: NotifyPrefs) {
  localStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
}

const themeOptions = [
  { value: "light", label: "浅色", icon: Sun, description: "明亮的浅色界面" },
  { value: "dark", label: "深色", icon: Moon, description: "护眼的暗色界面" },
  {
    value: "system",
    label: "跟随系统",
    icon: Monitor,
    description: "自动跟随操作系统设置",
  },
] as const;

function IncentiveTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery(trpc.admin.getIncentiveConfig.queryOptions());
  const saveMutation = useMutation(trpc.admin.updateIncentiveConfig.mutationOptions());

  const initialForm = useMemo(
    () => ({
      newUserBonusPoints: config?.newUserBonusPoints ?? 500,
      newUserBonusDays: config?.newUserBonusDays ?? 7,
      newUserCheckinMulti: config?.newUserCheckinMulti ?? 2.0,
      oldUserCheckinMulti: config?.oldUserCheckinMulti ?? 1.0,
      referralReward: config?.referralReward ?? 1000,
      refereeReward: config?.refereeReward ?? 500,
    }),
    [config],
  );
  const [form, setForm] = useState(initialForm);
  const [dirty, setDirty] = useState(false);
  const configId = config && "id" in config ? config.id : null;
  const lastSyncedRef = useRef<string | null>(null);
  if (configId !== lastSyncedRef.current) {
    lastSyncedRef.current = configId;
    if (!dirty) setForm(initialForm);
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await saveMutation.mutateAsync(form);
      await queryClient.invalidateQueries();
      setDirty(false);
      toast.success("激励策略已更新");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-foreground">新用户激励</h3>
          <p className="mt-1 text-xs text-muted-foreground">配置新注册用户的专属激励策略</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>新用户注册赠送积分</Label>
            <Input
              type="number"
              value={form.newUserBonusPoints}
              onChange={(e) => update("newUserBonusPoints", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>新用户优惠有效天数</Label>
            <Input
              type="number"
              value={form.newUserBonusDays}
              onChange={(e) => update("newUserBonusDays", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>新用户签到倍率</Label>
            <Input
              type="number"
              step="0.1"
              value={form.newUserCheckinMulti}
              onChange={(e) => update("newUserCheckinMulti", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">新用户期间签到奖励 × 此倍率</p>
          </div>
          <div className="space-y-2">
            <Label>老用户签到倍率</Label>
            <Input
              type="number"
              step="0.1"
              value={form.oldUserCheckinMulti}
              onChange={(e) => update("oldUserCheckinMulti", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">超过新用户期后的签到奖励倍率</p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-foreground">邀请奖励</h3>
          <p className="mt-1 text-xs text-muted-foreground">配置邀请人和被邀请人的积分奖励</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>邀请人获得积分</Label>
            <Input
              type="number"
              value={form.referralReward}
              onChange={(e) => update("referralReward", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>被邀请人获得积分</Label>
            <Input
              type="number"
              value={form.refereeReward}
              onChange={(e) => update("refereeReward", Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存策略
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-foreground">主题模式</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            选择界面的颜色主题
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {themeOptions.map((opt) => {
            const active = theme === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value);
                  toast.success(`已切换为${opt.label}模式`);
                }}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-lg border p-5 text-center transition-all",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-secondary/50",
                )}
              >
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    active ? "bg-primary/10" : "bg-secondary",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <div
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-primary" : "text-foreground",
                    )}
                  >
                    {opt.label}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {opt.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskTemplateTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery(trpc.admin.listTaskTemplates.queryOptions());
  const upsertMutation = useMutation(trpc.admin.upsertTaskTemplate.mutationOptions());
  const deleteMutation = useMutation(trpc.admin.deleteTaskTemplate.mutationOptions());

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    taskId: "", title: "", description: "", type: "BASIC" as "BASIC" | "CUMULATIVE",
    targetCount: 1, reward: 100, icon: "star", isActive: true, sortOrder: 0,
  });

  function startEdit(t?: typeof templates extends (infer U)[] | undefined ? U : never) {
    if (t) {
      setEditing(t.id);
      setForm({ taskId: t.taskId, title: t.title, description: t.description, type: t.type, targetCount: t.targetCount, reward: t.reward, icon: t.icon, isActive: t.isActive, sortOrder: t.sortOrder });
    } else {
      setEditing("new");
      setForm({ taskId: "", title: "", description: "", type: "BASIC", targetCount: 1, reward: 100, icon: "star", isActive: true, sortOrder: (templates?.length ?? 0) * 10 });
    }
  }

  async function handleSave() {
    try {
      await upsertMutation.mutateAsync({ ...form, id: editing === "new" ? undefined : editing! });
      await queryClient.invalidateQueries();
      setEditing(null);
      toast.success("任务模板已保存");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync({ id });
      await queryClient.invalidateQueries();
      toast.success("已删除");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (isLoading) return <Card className="border-border"><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">任务模板库</h3>
            <p className="text-xs text-muted-foreground mt-1">配置前端显示的日常任务，支持基础任务和累积任务</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => startEdit()}>
            <Plus className="h-4 w-4 mr-1" />新建
          </Button>
        </div>

        {editing && (
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">任务 ID</Label>
                <Input value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })} placeholder="如 browse, purchase" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">标题</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="浏览商品" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">描述</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="每日浏览 3 件商品" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">类型</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "BASIC" | "CUMULATIVE" })}
                >
                  <option value="BASIC">基础</option>
                  <option value="CUMULATIVE">累积</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">目标数</Label>
                <Input type="number" min={1} value={form.targetCount} onChange={(e) => setForm({ ...form, targetCount: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">积分奖励</Label>
                <Input type="number" min={0} value={form.reward} onChange={(e) => setForm({ ...form, reward: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">排序</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label className="text-xs">启用</Label>
              </div>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>取消</Button>
                <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending || !form.taskId || !form.title}>
                  {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {templates?.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{t.title}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded", t.type === "CUMULATIVE" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500")}>
                    {t.type === "CUMULATIVE" ? "累积" : "基础"}
                  </span>
                  {!t.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">停用</span>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t.taskId} · 目标 {t.targetCount} · +{t.reward} 积分
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(t)}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!templates || templates.length === 0) && (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              暂无任务模板，点击上方「新建」按钮添加
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdSlotTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: slots, isLoading } = useQuery(trpc.admin.listAdSlots.queryOptions());
  const upsertMutation = useMutation(trpc.admin.upsertAdSlot.mutationOptions());
  const deleteMutation = useMutation(trpc.admin.deleteAdSlot.mutationOptions());

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", placement: "banner", imageUrls: {} as Record<string, string>,
    linkUrl: "", isActive: true, sortOrder: 0, startAt: "", endAt: "",
  });
  const [newSizeKey, setNewSizeKey] = useState("");
  const [newSizeUrl, setNewSizeUrl] = useState("");

  const PLACEMENTS = [
    { value: "banner", label: "首页横幅" },
    { value: "sidebar", label: "侧边栏" },
    { value: "popup", label: "弹窗" },
    { value: "inline", label: "信息流" },
  ];

  function startEditSlot(s?: typeof slots extends (infer U)[] | undefined ? U : never) {
    if (s) {
      setEditing(s.id);
      setForm({
        name: s.name, placement: s.placement,
        imageUrls: (s.imageUrls ?? {}) as Record<string, string>,
        linkUrl: s.linkUrl, isActive: s.isActive, sortOrder: s.sortOrder,
        startAt: s.startAt ? new Date(s.startAt).toISOString().slice(0, 16) : "",
        endAt: s.endAt ? new Date(s.endAt).toISOString().slice(0, 16) : "",
      });
    } else {
      setEditing("new");
      setForm({ name: "", placement: "banner", imageUrls: {}, linkUrl: "", isActive: true, sortOrder: (slots?.length ?? 0) * 10, startAt: "", endAt: "" });
    }
  }

  function addSize() {
    if (!newSizeKey || !newSizeUrl) return;
    setForm({ ...form, imageUrls: { ...form.imageUrls, [newSizeKey]: newSizeUrl } });
    setNewSizeKey("");
    setNewSizeUrl("");
  }

  function removeSize(key: string) {
    const next = { ...form.imageUrls };
    delete next[key];
    setForm({ ...form, imageUrls: next });
  }

  async function handleSave() {
    try {
      await upsertMutation.mutateAsync({
        ...form, id: editing === "new" ? undefined : editing!,
        startAt: form.startAt || null, endAt: form.endAt || null,
      });
      await queryClient.invalidateQueries();
      setEditing(null);
      toast.success("广告位已保存");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync({ id });
      await queryClient.invalidateQueries();
      toast.success("已删除");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (isLoading) return <Card className="border-border"><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>;

  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">广告位管理</h3>
            <p className="text-xs text-muted-foreground mt-1">为每个广告配置多种尺寸图片，前端自动适配投放</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => startEditSlot()}>
            <Plus className="h-4 w-4 mr-1" />新建
          </Button>
        </div>

        {editing && (
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">广告名称</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="春季促销" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">投放位置</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={form.placement}
                  onChange={(e) => setForm({ ...form, placement: e.target.value })}
                >
                  {PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">跳转链接</Label>
              <Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">开始时间</Label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">结束时间</Label>
                <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">多尺寸图片</Label>
              {Object.entries(form.imageUrls).map(([size, url]) => (
                <div key={size} className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-secondary px-2 py-1 rounded min-w-[80px] text-center">{size}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1">{url}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeSize(size)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input className="w-28" value={newSizeKey} onChange={(e) => setNewSizeKey(e.target.value)} placeholder="尺寸 (如 720x280)" />
                <Input className="flex-1" value={newSizeUrl} onChange={(e) => setNewSizeUrl(e.target.value)} placeholder="图片 URL" />
                <Button size="sm" variant="outline" onClick={addSize} disabled={!newSizeKey || !newSizeUrl}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label className="text-xs">启用</Label>
              </div>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>取消</Button>
                <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending || !form.name}>
                  {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {slots?.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                    {PLACEMENTS.find((p) => p.value === s.placement)?.label ?? s.placement}
                  </span>
                  {!s.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">停用</span>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {Object.keys(s.imageUrls as Record<string, string>).length} 种尺寸
                  {s.linkUrl && <span> · {s.linkUrl.slice(0, 40)}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEditSlot(s)}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!slots || slots.length === 0) && (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              暂无广告位，点击上方「新建」按钮添加
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery(trpc.user.me.queryOptions());
  const profileMutation = useMutation(trpc.user.updateProfile.mutationOptions());

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyPrefs, setNotifyPrefs] = useState<NotifyPrefs>(loadNotifyPrefs);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const nameChanged = (name ?? "") !== (user.name ?? "");
      const phoneChanged = (phone ?? "") !== (user.phone ?? "");
      setProfileDirty(nameChanged || phoneChanged);
    }
  }, [name, phone, user]);

  async function handleSaveProfile() {
    try {
      await profileMutation.mutateAsync({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      await queryClient.invalidateQueries();
      toast.success("个人信息已保存");
      setProfileDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  function updateNotify(key: keyof NotifyPrefs, value: boolean) {
    setNotifyPrefs((prev) => {
      const next = { ...prev, [key]: value };
      saveNotifyPrefs(next);
      return next;
    });
    toast.success("通知偏好已更新");
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      toast.error("请填写当前密码和新密码");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("新密码至少 8 个字符");
      return;
    }
    setChangingPassword(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (result.error) {
        toast.error(result.error.message ?? "密码修改失败");
      } else {
        toast.success("密码已更新");
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "密码修改失败");
    } finally {
      setChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">设置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理个人信息与系统偏好
          </p>
        </div>
      </div>

      <Tabs defaultValue="store">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="store" className="gap-2">
            <Store className="h-4 w-4" />
            个人信息
          </TabsTrigger>
          {isAdmin ? (
          <TabsTrigger value="incentive" className="gap-2">
            <Zap className="h-4 w-4" />
            激励策略
          </TabsTrigger>
          ) : null}
          <TabsTrigger value="notification" className="gap-2">
            <Bell className="h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            安全
          </TabsTrigger>
          {isAdmin ? (
          <TabsTrigger value="tasks" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            任务模板
          </TabsTrigger>
          ) : null}
          {isAdmin ? (
          <TabsTrigger value="ads" className="gap-2">
            <Image className="h-4 w-4" />
            广告位
          </TabsTrigger>
          ) : null}
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            外观
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入名称"
                />
              </div>

              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="输入联系电话"
                  type="tel"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  邮箱为登录账号，暂不支持修改
                </p>
              </div>

              <div className="space-y-2">
                <Label>角色</Label>
                <Input
                  value={
                    user?.role === "ADMIN"
                      ? "管理员"
                      : user?.role === "MERCHANT"
                        ? "商家"
                        : user?.role === "AGENT"
                          ? "代理商"
                          : (user?.role ?? "—")
                  }
                  disabled
                  className="opacity-60"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={!profileDirty || profileMutation.isPending}
                  className="bg-[var(--gradient-primary)] hover:brightness-110 text-white gap-2"
                  style={{ boxShadow: profileDirty ? "var(--shadow-glow)" : undefined }}
                >
                  {profileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin ? (
        <TabsContent value="incentive">
          <IncentiveTab />
        </TabsContent>
        ) : null}

        <TabsContent value="notification">
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    订单通知
                  </div>
                  <div className="text-xs text-muted-foreground">
                    有新订单时发送通知
                  </div>
                </div>
                <Switch
                  checked={notifyPrefs.orderNotify}
                  onCheckedChange={(v) => updateNotify("orderNotify", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    核销提醒
                  </div>
                  <div className="text-xs text-muted-foreground">
                    券码核销时发送提醒
                  </div>
                </div>
                <Switch
                  checked={notifyPrefs.verifyNotify}
                  onCheckedChange={(v) => updateNotify("verifyNotify", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    每日汇总
                  </div>
                  <div className="text-xs text-muted-foreground">
                    每日经营数据汇总邮件
                  </div>
                </div>
                <Switch
                  checked={notifyPrefs.dailySummary}
                  onCheckedChange={(v) => updateNotify("dailySummary", v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">修改密码</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>当前密码</Label>
                    <Input
                      type="password"
                      placeholder="输入当前密码"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>新密码</Label>
                    <Input
                      type="password"
                      placeholder="输入新密码（至少 8 位）"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || !newPassword}
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      "更新密码"
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">账号信息</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>注册时间：{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("zh-CN") : "—"}</p>
                  <p>账号 ID：{user?.id ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin ? (
        <TabsContent value="tasks">
          <TaskTemplateTab />
        </TabsContent>
        ) : null}

        {isAdmin ? (
        <TabsContent value="ads">
          <AdSlotTab />
        </TabsContent>
        ) : null}

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
