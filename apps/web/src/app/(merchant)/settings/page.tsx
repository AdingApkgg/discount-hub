"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, ClipboardList, Gift, Headphones, Image, Loader2, Lock, Plus, Save, Share2, ShieldAlert, Store, Bell, Shield, Palette, Sun, Moon, Monitor, Trash2, Unlock, Users, Zap } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
      streakBonusThreshold: config?.streakBonusThreshold ?? 3,
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

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-foreground">签到权重</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            连续签到达到阈值时自动给用户加会员等级。例如设为 3，则连续 3 天签到 = +1 级，6 天 = +2 级。设为 0 可关闭此机制。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>连续签到加级阈值（天）</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={form.streakBonusThreshold}
              onChange={(e) => update("streakBonusThreshold", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              0 = 关闭；签到天数 ≥ 此值后每多此值天 +1 级
            </p>
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

function SupportTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: cfg, isLoading: cfgLoading } = useQuery(
    trpc.admin.getSupportConfig.queryOptions(),
  );
  const { data: faqs, isLoading: faqsLoading } = useQuery(
    trpc.admin.listSupportFaqs.queryOptions(),
  );
  const upsertConfig = useMutation(trpc.admin.upsertSupportConfig.mutationOptions());
  const upsertFaq = useMutation(trpc.admin.upsertSupportFaq.mutationOptions());
  const deleteFaq = useMutation(trpc.admin.deleteSupportFaq.mutationOptions());

  const [configForm, setConfigForm] = useState({
    systemPrompt: "",
    modelName: "claude-haiku-4-5-20251001",
    maxTokens: 512,
    transferWaitSeconds: 30,
    isActive: true,
  });

  useEffect(() => {
    if (cfg) {
      setConfigForm({
        systemPrompt: cfg.systemPrompt,
        modelName: cfg.modelName,
        maxTokens: cfg.maxTokens,
        transferWaitSeconds: cfg.transferWaitSeconds,
        isActive: cfg.isActive,
      });
    }
  }, [cfg]);

  const [editingFaq, setEditingFaq] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState({
    question: "",
    keywords: "",
    answer: "",
    isActive: true,
    sortOrder: 0,
  });

  async function handleSaveConfig() {
    try {
      await upsertConfig.mutateAsync({
        ...configForm,
        id: cfg?.id || undefined,
      });
      await queryClient.invalidateQueries();
      toast.success("客服配置已保存");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  function startEditFaq(f?: NonNullable<typeof faqs>[number]) {
    if (f) {
      setEditingFaq(f.id);
      setFaqForm({
        question: f.question,
        keywords: f.keywords.join(", "),
        answer: f.answer,
        isActive: f.isActive,
        sortOrder: f.sortOrder,
      });
    } else {
      setEditingFaq("new");
      setFaqForm({
        question: "",
        keywords: "",
        answer: "",
        isActive: true,
        sortOrder: (faqs?.length ?? 0) * 10,
      });
    }
  }

  async function handleSaveFaq() {
    const keywords = faqForm.keywords
      .split(/[,，]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (keywords.length === 0) {
      toast.error("请至少填写一个关键词");
      return;
    }
    try {
      await upsertFaq.mutateAsync({
        id: editingFaq === "new" ? undefined : editingFaq!,
        question: faqForm.question,
        keywords,
        answer: faqForm.answer,
        isActive: faqForm.isActive,
        sortOrder: faqForm.sortOrder,
      });
      await queryClient.invalidateQueries();
      setEditingFaq(null);
      toast.success("FAQ 已保存");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleDeleteFaq(id: string) {
    try {
      await deleteFaq.mutateAsync({ id });
      await queryClient.invalidateQueries();
      toast.success("已删除");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (cfgLoading || faqsLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">AI 助手配置</h3>
            <p className="text-xs text-muted-foreground mt-1">
              系统提示词、模型、转人工等待时间。需配置 ANTHROPIC_API_KEY 才会调用 Claude API；未配置时降级到 FAQ 关键词匹配
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">系统提示词（system prompt）</Label>
            <Textarea
              rows={6}
              value={configForm.systemPrompt}
              onChange={(e) => setConfigForm({ ...configForm, systemPrompt: e.target.value })}
              placeholder="你是「折扣购物 APP」的 AI 客服助手..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">模型</Label>
              <Input
                value={configForm.modelName}
                onChange={(e) => setConfigForm({ ...configForm, modelName: e.target.value })}
                placeholder="claude-haiku-4-5-20251001"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">最大输出 tokens</Label>
              <Input
                type="number"
                min={64}
                max={4096}
                value={configForm.maxTokens}
                onChange={(e) => setConfigForm({ ...configForm, maxTokens: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">转人工等待秒数</Label>
              <Input
                type="number"
                min={5}
                max={600}
                value={configForm.transferWaitSeconds}
                onChange={(e) =>
                  setConfigForm({ ...configForm, transferWaitSeconds: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={configForm.isActive}
                onCheckedChange={(v) => setConfigForm({ ...configForm, isActive: v })}
              />
              <Label className="text-xs">启用此配置</Label>
            </div>
            <Button
              size="sm"
              className="ml-auto"
              onClick={handleSaveConfig}
              disabled={upsertConfig.isPending || !configForm.systemPrompt.trim()}
            >
              {upsertConfig.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground">FAQ 知识库</h3>
              <p className="text-xs text-muted-foreground mt-1">
                关键词命中时直接返回预设答案。AI 失败时也会回落到这里
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => startEditFaq()}>
              <Plus className="h-4 w-4 mr-1" />
              新建 FAQ
            </Button>
          </div>

          {editingFaq && (
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">问题（展示用）</Label>
                <Input
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  placeholder="积分怎么获取？"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">命中关键词（逗号分隔）</Label>
                <Input
                  value={faqForm.keywords}
                  onChange={(e) => setFaqForm({ ...faqForm, keywords: e.target.value })}
                  placeholder="积分, 获取, 签到, 怎么得"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">答案</Label>
                <Textarea
                  rows={4}
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  placeholder="您可以通过每日签到..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">排序</Label>
                  <Input
                    type="number"
                    value={faqForm.sortOrder}
                    onChange={(e) => setFaqForm({ ...faqForm, sortOrder: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch
                    checked={faqForm.isActive}
                    onCheckedChange={(v) => setFaqForm({ ...faqForm, isActive: v })}
                  />
                  <Label className="text-xs">启用</Label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEditingFaq(null)}>
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveFaq}
                  disabled={
                    upsertFaq.isPending || !faqForm.question.trim() || !faqForm.answer.trim()
                  }
                >
                  {upsertFaq.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  保存
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {faqs?.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{f.question}</span>
                    {!f.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        停用
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    关键词: {f.keywords.join(", ")}
                  </div>
                  <div className="mt-1 text-xs text-foreground/80 line-clamp-2">{f.answer}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => startEditFaq(f)}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteFaq(f.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {(!faqs || faqs.length === 0) && (
              <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
                暂无 FAQ，点击上方「新建 FAQ」添加
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PosterTemplateTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery(
    trpc.admin.listPosterTemplates.queryOptions(),
  );
  const upsert = useMutation(trpc.admin.upsertPosterTemplate.mutationOptions());
  const remove = useMutation(trpc.admin.deletePosterTemplate.mutationOptions());

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: "invite",
    name: "",
    headline: "",
    subline: "",
    ctaText: "",
    bgGradient: "from-primary/5 via-background to-accent/5",
    accentColor: "#0EA5E9",
    isActive: true,
    sortOrder: 0,
  });

  function startEdit(t?: NonNullable<typeof templates>[number]) {
    if (t) {
      setEditing(t.id);
      setForm({
        kind: t.kind,
        name: t.name,
        headline: t.headline,
        subline: t.subline,
        ctaText: t.ctaText,
        bgGradient: t.bgGradient,
        accentColor: t.accentColor,
        isActive: t.isActive,
        sortOrder: t.sortOrder,
      });
    } else {
      setEditing("new");
      setForm({
        kind: "invite",
        name: "",
        headline: "",
        subline: "",
        ctaText: "",
        bgGradient: "from-primary/5 via-background to-accent/5",
        accentColor: "#0EA5E9",
        isActive: true,
        sortOrder: (templates?.length ?? 0) * 10,
      });
    }
  }

  async function handleSave() {
    try {
      await upsert.mutateAsync({
        ...form,
        id: editing === "new" ? undefined : editing!,
      });
      await queryClient.invalidateQueries();
      setEditing(null);
      toast.success("海报模板已保存");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync({ id });
      await queryClient.invalidateQueries();
      toast.success("已删除");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">海报模板</h3>
            <p className="text-xs text-muted-foreground mt-1">
              邀请页/分享页生成的海报使用的文案与配色，按 kind 分类（invite / product...）
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => startEdit()}>
            <Plus className="h-4 w-4 mr-1" />
            新建
          </Button>
        </div>

        {editing && (
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">类型 (kind)</Label>
                <Input
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  placeholder="invite, product..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">名称（后台标识用）</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="春节邀请活动"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">主标题</Label>
              <Input
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="邀请好友，一起省"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">副标题</Label>
              <Input
                value={form.subline}
                onChange={(e) => setForm({ ...form, subline: e.target.value })}
                placeholder="使用邀请码注册，双方各得 10000 积分"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CTA 按钮文案</Label>
                <Input
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  placeholder="立即领取"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">主色（hex）</Label>
                <Input
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  placeholder="#0EA5E9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">背景渐变（Tailwind classes）</Label>
              <Input
                value={form.bgGradient}
                onChange={(e) => setForm({ ...form, bgGradient: e.target.value })}
                placeholder="from-primary/5 via-background to-accent/5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">排序</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label className="text-xs">启用</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={upsert.isPending || !form.name.trim() || !form.headline.trim()}
              >
                {upsert.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                保存
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {templates?.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{t.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                    {t.kind}
                  </span>
                  {!t.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      停用
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-foreground/80">{t.headline}</div>
                {t.subline && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{t.subline}</div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => startEdit(t)}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!templates || templates.length === 0) && (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              暂无海报模板，点击上方「新建」添加
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RedemptionGuideTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: guides, isLoading } = useQuery(
    trpc.admin.listRedemptionGuides.queryOptions(),
  );
  const upsert = useMutation(trpc.admin.upsertRedemptionGuide.mutationOptions());
  const remove = useMutation(trpc.admin.deleteRedemptionGuide.mutationOptions());

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    headline: "积分可兑换好礼",
    subline: "",
    ctaText: "立即兑换",
    minPoints: 100,
    cooldownHours: 24,
    showFab: true,
    isActive: true,
  });

  function startEdit(g?: NonNullable<typeof guides>[number]) {
    if (g) {
      setEditing(g.id);
      setForm({
        name: g.name,
        headline: g.headline,
        subline: g.subline,
        ctaText: g.ctaText,
        minPoints: g.minPoints,
        cooldownHours: g.cooldownHours,
        showFab: g.showFab,
        isActive: g.isActive,
      });
    } else {
      setEditing("new");
      setForm({
        name: "",
        headline: "积分可兑换好礼",
        subline: "",
        ctaText: "立即兑换",
        minPoints: 100,
        cooldownHours: 24,
        showFab: true,
        isActive: true,
      });
    }
  }

  async function handleSave() {
    try {
      await upsert.mutateAsync({
        ...form,
        id: editing === "new" ? undefined : editing!,
      });
      await queryClient.invalidateQueries();
      setEditing(null);
      toast.success("兑换引导已保存");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync({ id });
      await queryClient.invalidateQueries();
      toast.success("已删除");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">兑换引导</h3>
            <p className="text-xs text-muted-foreground mt-1">
              用户积分达到阈值后弹窗提示，并可在底部固定「立即兑换」按钮。同时只有最新的 active 配置生效。
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => startEdit()}>
            <Plus className="h-4 w-4 mr-1" />
            新建
          </Button>
        </div>

        {editing && (
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">名称（后台标识用）</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="春节兑换活动"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">主标题</Label>
              <Input
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="积分可兑换好礼"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">副标题</Label>
              <Input
                value={form.subline}
                onChange={(e) => setForm({ ...form, subline: e.target.value })}
                placeholder="你已积累 N 积分，立即看看可兑换什么"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CTA 按钮文案</Label>
                <Input
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">触发积分阈值</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minPoints}
                  onChange={(e) => setForm({ ...form, minPoints: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">弹窗冷却（小时）</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.cooldownHours}
                  onChange={(e) => setForm({ ...form, cooldownHours: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.showFab}
                  onCheckedChange={(v) => setForm({ ...form, showFab: v })}
                />
                <Label className="text-xs">底部固定按钮</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <Label className="text-xs">启用</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={upsert.isPending || !form.name.trim() || !form.headline.trim() || !form.ctaText.trim()}
              >
                {upsert.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                保存
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {guides?.map((g) => (
            <div
              key={g.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{g.name}</span>
                  {g.isActive ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                      active
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      停用
                    </span>
                  )}
                  {g.showFab && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                      FAB
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-foreground/80">{g.headline}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  阈值 {g.minPoints} 积分 · 冷却 {g.cooldownHours} 小时
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => startEdit(g)}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(g.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!guides || guides.length === 0) && (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              暂无兑换引导，点击上方「新建」添加
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceRiskTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"suspicious" | "blocked" | "all">(
    "suspicious",
  );
  const { data: resp, isLoading } = useQuery(
    trpc.admin.listDeviceFingerprints.queryOptions({
      filter,
      page: 1,
      pageSize: 50,
    }),
  );
  const blockMutation = useMutation(trpc.admin.blockDeviceFingerprint.mutationOptions());
  const unblockMutation = useMutation(trpc.admin.unblockDeviceFingerprint.mutationOptions());

  async function handleBlock(visitorId: string) {
    const reason =
      typeof window !== "undefined"
        ? window.prompt("封禁原因（可选）：") ?? ""
        : "";
    try {
      await blockMutation.mutateAsync({ visitorId, reason: reason || undefined });
      await queryClient.invalidateQueries();
      toast.success("已封禁设备");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleUnblock(visitorId: string) {
    try {
      await unblockMutation.mutateAsync({ visitorId });
      await queryClient.invalidateQueries();
      toast.success("已解除封禁");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  type FpRow = NonNullable<typeof resp>["rows"][number];
  const grouped = (resp?.rows ?? []).reduce<Record<string, FpRow[]>>(
    (acc, r) => {
      acc[r.visitorId] = acc[r.visitorId] ?? [];
      acc[r.visitorId].push(r);
      return acc;
    },
    {},
  );

  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              设备风控
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              基于 FingerprintJS 浏览器指纹聚合。同一 visitorId 在 1 小时内出现 ≥ 4 个不同账号会自动标记为可疑。封禁后该 visitorId 无法再签到、绑定邀请码等。
            </p>
          </div>
          <div className="flex gap-1">
            {(["suspicious", "blocked", "all"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f === "suspicious" ? "可疑" : f === "blocked" ? "已封禁" : "全部"}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        ) : !resp || Object.keys(grouped).length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
            暂无{filter === "suspicious" ? "可疑" : filter === "blocked" ? "已封禁" : ""}设备
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([visitorId, rows]) => {
              const blocked = rows.some((r) => r.blockedAt);
              const userIds = Array.from(
                new Set(rows.map((r) => r.userId).filter(Boolean)),
              );
              return (
                <div
                  key={visitorId}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono text-foreground">
                          {visitorId.slice(0, 16)}...
                        </code>
                        {blocked ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                            已封禁
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                            可疑
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          关联 {userIds.length} 个账号
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        {rows[0].ipAddress ?? "未知 IP"} · 最近活动{" "}
                        {new Date(rows[0].lastSeenAt).toLocaleString("zh-CN")}
                      </div>
                      {rows[0].blockReason && (
                        <div className="mt-1 text-xs text-destructive">
                          原因: {rows[0].blockReason}
                        </div>
                      )}
                    </div>
                    <div>
                      {blocked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnblock(visitorId)}
                          disabled={unblockMutation.isPending}
                        >
                          <Unlock className="h-3.5 w-3.5 mr-1" />
                          解除
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleBlock(visitorId)}
                          disabled={blockMutation.isPending}
                        >
                          <Lock className="h-3.5 w-3.5 mr-1" />
                          封禁
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgentCommissionTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: cfg, isLoading: cfgLoading } = useQuery(
    trpc.admin.getAgentCommissionConfig.queryOptions(),
  );
  const { data: agentsResp, isLoading: agentsLoading } = useQuery(
    trpc.admin.listAgents.queryOptions(),
  );
  const { data: pendingResp, isLoading: pendingLoading } = useQuery(
    trpc.admin.listAgentCommissions.queryOptions({
      status: "PENDING",
      page: 1,
      pageSize: 30,
    }),
  );
  const upsertConfig = useMutation(trpc.admin.upsertAgentCommissionConfig.mutationOptions());
  const markPaid = useMutation(trpc.admin.markAgentCommissionPaid.mutationOptions());

  const [form, setForm] = useState({
    level1Rate: 0.1,
    level2Rate: 0.05,
    level3Rate: 0,
    maxLevels: 2,
    isActive: true,
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        level1Rate: cfg.level1Rate,
        level2Rate: cfg.level2Rate,
        level3Rate: cfg.level3Rate,
        maxLevels: cfg.maxLevels,
        isActive: cfg.isActive,
      });
    }
  }, [cfg]);

  async function handleSaveConfig() {
    try {
      await upsertConfig.mutateAsync({
        ...form,
        id: cfg?.id || undefined,
      });
      await queryClient.invalidateQueries();
      toast.success("佣金规则已保存");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await markPaid.mutateAsync({ id });
      await queryClient.invalidateQueries();
      toast.success("已标记为已支付");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground">佣金规则</h3>
            <p className="text-xs text-muted-foreground mt-1">
              订单支付完成时按下方比例计算各级代理佣金。比例 0–1，例如 0.1 = 10%。基数为订单现金支付额。
            </p>
          </div>
          {cfgLoading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">一级佣金率</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={form.level1Rate}
                    onChange={(e) => setForm({ ...form, level1Rate: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">二级佣金率</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={form.level2Rate}
                    onChange={(e) => setForm({ ...form, level2Rate: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">三级佣金率</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={form.level3Rate}
                    onChange={(e) => setForm({ ...form, level3Rate: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">最大分润层级</Label>
                  <Input
                    type="number"
                    min={1}
                    max={3}
                    value={form.maxLevels}
                    onChange={(e) => setForm({ ...form, maxLevels: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                  <Label className="text-xs">启用</Label>
                </div>
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={handleSaveConfig}
                  disabled={upsertConfig.isPending}
                >
                  {upsertConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存规则
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">代理商列表</h3>
            {agentsResp && (
              <span className="text-xs text-muted-foreground">
                共 {agentsResp.total} 人
              </span>
            )}
          </div>
          {agentsLoading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : !agentsResp || agentsResp.agents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              暂无代理商
            </div>
          ) : (
            <div className="space-y-2">
              {agentsResp.agents.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {a.name ?? a.email}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      下级 {a._count.downline} 人 · 总佣金条数 {a._count.agentCommissions}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-amber-500">
                      待支付 ¥{a.pendingAmount.toFixed(2)}
                    </div>
                    <div className="text-emerald-500 mt-0.5">
                      已支付 ¥{a.paidAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">待支付佣金</h3>
            {pendingResp && (
              <span className="text-xs text-muted-foreground">
                共 {pendingResp.total} 条
              </span>
            )}
          </div>
          {pendingLoading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : !pendingResp || pendingResp.rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-8 text-center text-sm text-muted-foreground">
              暂无待支付佣金
            </div>
          ) : (
            <div className="space-y-2">
              {pendingResp.rows.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {c.agent.name ?? c.agent.email}
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                        L{c.level}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      订单 {c.orderId.slice(-8)} · 比例 {Math.round(c.rate * 100)}% · {new Date(c.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-amber-600">
                      ¥{Number(c.amount).toFixed(2)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkPaid(c.id)}
                      disabled={markPaid.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      标记已付
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
          {isAdmin ? (
          <TabsTrigger value="support" className="gap-2">
            <Headphones className="h-4 w-4" />
            客服
          </TabsTrigger>
          ) : null}
          {isAdmin ? (
          <TabsTrigger value="poster" className="gap-2">
            <Share2 className="h-4 w-4" />
            海报模板
          </TabsTrigger>
          ) : null}
          {isAdmin ? (
          <TabsTrigger value="redemption" className="gap-2">
            <Gift className="h-4 w-4" />
            兑换引导
          </TabsTrigger>
          ) : null}
          {isAdmin ? (
          <TabsTrigger value="agent-commission" className="gap-2">
            <Users className="h-4 w-4" />
            代理佣金
          </TabsTrigger>
          ) : null}
          {isAdmin ? (
          <TabsTrigger value="device-risk" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            设备风控
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
                  className="bg-transparent text-white [background-image:var(--gradient-primary)] hover:brightness-110 gap-2"
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

        {isAdmin ? (
        <TabsContent value="support">
          <SupportTab />
        </TabsContent>
        ) : null}

        {isAdmin ? (
        <TabsContent value="poster">
          <PosterTemplateTab />
        </TabsContent>
        ) : null}

        {isAdmin ? (
        <TabsContent value="redemption">
          <RedemptionGuideTab />
        </TabsContent>
        ) : null}

        {isAdmin ? (
        <TabsContent value="agent-commission">
          <AgentCommissionTab />
        </TabsContent>
        ) : null}

        {isAdmin ? (
        <TabsContent value="device-risk">
          <DeviceRiskTab />
        </TabsContent>
        ) : null}

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
