"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Store, Bell, Shield, Palette, Sun, Moon, Monitor } from "lucide-react";
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

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
          <TabsTrigger value="notification" className="gap-2">
            <Bell className="h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            安全
          </TabsTrigger>
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
                  value={user?.role === "ADMIN" ? "管理员" : "商家"}
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

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
