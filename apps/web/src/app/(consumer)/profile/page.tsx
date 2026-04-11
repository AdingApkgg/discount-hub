"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Copy,
  FileText,
  Gift,
  HelpCircle,
  Loader2,
  LogOut,
  Mail,
  Package,
  Phone,
  Save,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { inviteBenefits } from "@/data/mock";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  appCardClassName,
  SectionHeading,
  PageHeading,
  EmptyStateDashed,
  StatCard,
} from "@/components/shared";
import {
  motion,
  AnimatedSection,
  AnimatedItem,
  PageTransition,
  StaggerList,
  HoverScale,
} from "@/components/motion";

type UserProfile = RouterOutputs["user"]["me"];
type ReferralRecord = RouterOutputs["user"]["referrals"][number];

function ProfileSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-20" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_320px]">
        <Skeleton className="h-48 rounded-[30px]" />
        <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[28px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ name: "", phone: "" });
  const [hasDraft, setHasDraft] = useState(false);

  const { data: profileData, isLoading } = useQuery(trpc.user.me.queryOptions());
  const { data: referralsData } = useQuery(trpc.user.referrals.queryOptions());
  const { data: ordersData } = useQuery(trpc.order.myOrders.queryOptions());
  const updateProfileMutation = useMutation(trpc.user.updateProfile.mutationOptions());

  const profile = profileData as UserProfile | undefined;
  const referrals = (referralsData ?? []) as ReferralRecord[];
  const orders = ordersData ?? [];
  const draftName = hasDraft ? draft.name : (profile?.name ?? "");
  const draftPhone = hasDraft ? draft.phone : (profile?.phone ?? "");

  const inviteCode = profile?.inviteCode ?? "暂未生成";
  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/login?inviteCode=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode]);

  async function refreshAll() {
    await queryClient.invalidateQueries();
  }

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink || inviteCode);
      toast.success("邀请链接已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  async function handleSaveProfile() {
    try {
      await updateProfileMutation.mutateAsync({
        name: draftName.trim() || undefined,
        phone: draftPhone.trim() || undefined,
      });
      await refreshAll();
      setHasDraft(false);
      toast.success("资料已更新");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "资料更新失败");
    }
  }

  async function handleLogout() {
    await signOut();
    router.push("/login");
    toast.success("已退出登录");
  }

  if (isLoading) return <ProfileSkeleton />;

  const userName = profile?.name ?? "演示用户";
  const vipLabel = (profile?.vipLevel ?? 0) <= 0 ? "普通会员" : `VIP${profile?.vipLevel}`;

  const menuItems = [
    { icon: Settings, label: "账户设置" },
    { icon: Bell, label: "消息通知" },
    { icon: HelpCircle, label: "帮助中心" },
    { icon: FileText, label: "服务条款" },
  ];

  return (
    <PageTransition>
    <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
      <AnimatedItem>
      <PageHeading
        label="Profile"
        title="我的"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyInvite}
            className="rounded-full border-[var(--app-card-border)] bg-[var(--app-card)] px-4 text-foreground shadow-sm hover:bg-secondary"
          >
            <Copy className="h-4 w-4" />
            复制邀请
          </Button>
        }
      />
      </AnimatedItem>

      <AnimatedItem>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <Card className="overflow-hidden rounded-[30px] border border-[var(--app-hero-border)] bg-[var(--app-hero-bg)] py-0 text-white shadow-[var(--app-hero-shadow)]">
          <CardContent className="relative p-5 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,45,85,0.2),transparent_36%)]" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-white/15 md:h-20 md:w-20">
                  <AvatarFallback className="bg-white/10 text-xl text-white md:text-2xl">
                    {userName.slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-2xl font-semibold text-white md:text-3xl">
                    {userName}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
                    <Badge className="bg-white/10 text-xs text-white hover:bg-white/10">
                      {vipLabel}
                    </Badge>
                    <span>{(profile?.points ?? 0).toLocaleString("zh-CN")} 积分</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/member")}
                className="w-fit rounded-full border-white/15 bg-white/10 px-4 text-white hover:bg-white/15 hover:text-white"
              >
                去赚积分
              </Button>
            </div>
          </CardContent>
        </Card>

        <StaggerList className="grid grid-cols-3 gap-3 xl:grid-cols-1">
          <AnimatedItem><StatCard label="累计邀请" value={profile?._count.referrals ?? 0} /></AnimatedItem>
          <AnimatedItem><StatCard label="累计订单" value={profile?._count.orders ?? 0} /></AnimatedItem>
          <AnimatedItem><StatCard label="我的券包" value={profile?._count.coupons ?? 0} /></AnimatedItem>
        </StaggerList>
      </section>
      </AnimatedItem>

      <AnimatedSection className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="邀请好友"
              subtitle="复制专属邀请码或注册链接，后续可以继续扩展拉新奖励。"
              action={<Gift className="h-5 w-5 text-muted-foreground" />}
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Card className="gap-0 rounded-[22px] border-border bg-secondary/50 py-0">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">邀请码</div>
                  <div className="mt-2 font-mono text-sm text-foreground">{inviteCode}</div>
                </CardContent>
              </Card>
              <Card className="gap-0 rounded-[22px] border-border bg-secondary/50 py-0">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">邀请链接</div>
                  <div className="mt-2 break-all font-mono text-xs leading-5 text-foreground">
                    {inviteLink || "当前环境暂不可生成链接"}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {inviteBenefits.map((benefit) => (
                <Badge key={benefit} variant="outline" className="rounded-full border-border bg-background text-muted-foreground">
                  {benefit}
                </Badge>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs leading-5 text-muted-foreground">
                已邀请 {referrals.length} 位好友，注册链接可以直接复制使用。
              </div>
              <Button onClick={handleCopyInvite} className="w-full rounded-full px-4 md:w-auto">
                立即邀请
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="邀请记录"
              subtitle="当前展示注册成功的好友列表。"
              action={<Users className="h-4 w-4 text-muted-foreground" />}
            />
            <div className="mt-5">
              {referrals.length === 0 ? (
                <EmptyStateDashed text="还没有邀请记录，复制邀请码后就可以开始拉新。" />
              ) : (
                <div className="space-y-3">
                  {referrals.map((record) => (
                    <Card key={record.id} className="gap-0 rounded-[22px] border-border bg-secondary/50 py-0">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground">
                              {record.name ?? record.email}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-muted-foreground">
                              注册时间：{new Date(record.createdAt).toLocaleString("zh-CN")}
                            </div>
                          </div>
                          <Badge variant="outline" className="rounded-full border-border bg-background text-muted-foreground">
                            已注册
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>

      <AnimatedSection>
        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="订单记录"
              subtitle="最近的购买订单和兑换记录。"
              action={<ShoppingBag className="h-5 w-5 text-muted-foreground" />}
            />
            <div className="mt-5">
              {orders.length === 0 ? (
                <EmptyStateDashed text="还没有订单记录，快去首页兑换权益吧。" />
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      PENDING: { label: "待付款", cls: "bg-amber-50 text-amber-700 border-amber-200" },
                      PAID: { label: "已付款", cls: "bg-blue-50 text-blue-700 border-blue-200" },
                      COMPLETED: { label: "已完成", cls: "bg-green-50 text-green-700 border-green-200" },
                      CANCELLED: { label: "已取消", cls: "bg-secondary text-muted-foreground border-border" },
                    };
                    const s = statusMap[order.status] ?? { label: order.status, cls: "bg-secondary text-muted-foreground border-border" };
                    const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);

                    return (
                      <Card key={order.id} className="gap-0 rounded-[22px] border-border bg-secondary/50 py-0">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {order.product.title}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {order.product.app} · {createdAt.toLocaleString("zh-CN")}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className={`shrink-0 rounded-full ${s.cls}`}>
                              {s.label}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{order.pointsPaid} 积分 + ¥{Number(order.cashPaid).toFixed(2)}</span>
                            {order.coupon && (
                              <span className="font-mono text-foreground">券码: {order.coupon.code}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {orders.length > 5 && (
                    <Button
                      variant="link"
                      onClick={() => router.push("/my-orders")}
                      className="w-full text-xs text-muted-foreground"
                    >
                      查看全部 {orders.length} 条订单 →
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>

      <AnimatedSection className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading title="资料编辑" subtitle="完善昵称和手机号，方便商家或客服联系。" />
            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">昵称</Label>
                <Input
                  value={draftName}
                  onChange={(event) => {
                    setHasDraft(true);
                    setDraft((current) => ({ ...current, name: event.target.value }));
                  }}
                  placeholder="输入你的昵称"
                  className="h-11 rounded-2xl border-border bg-secondary/50 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">手机号</Label>
                <Input
                  value={draftPhone}
                  onChange={(event) => {
                    setHasDraft(true);
                    setDraft((current) => ({ ...current, phone: event.target.value }));
                  }}
                  placeholder="输入手机号"
                  className="h-11 rounded-2xl border-border bg-secondary/50 shadow-none"
                />
              </div>
            </div>
            <div className="mt-5">
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="w-full rounded-2xl py-6"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                保存资料
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={appCardClassName}>
            <CardContent className="p-5 md:p-6">
              <SectionHeading title="账户信息" subtitle="当前登录账号绑定的信息。" />
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <Card className="gap-0 rounded-[22px] border-border bg-secondary/50 py-0">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">邮箱</div>
                      <div className="mt-1 text-sm text-foreground">{profile?.email ?? "未设置"}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="gap-0 rounded-[22px] border-border bg-secondary/50 py-0">
                  <CardContent className="flex items-start gap-3 p-4">
                    <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">手机号</div>
                      <div className="mt-1 text-sm text-foreground">{profile?.phone || "未设置"}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card className={appCardClassName}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  {index === 2 && <Separator />}
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 rounded-none px-5 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </Card>
        </div>
      </AnimatedSection>

      <AnimatedSection>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full rounded-2xl border-destructive/35 bg-background py-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出</AlertDialogTitle>
            <AlertDialogDescription>
              退出后需要重新登录才能使用会员功能。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleLogout}>
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </AnimatedSection>

      <div className="pb-1 text-center text-xs text-muted-foreground">版本 1.0.0</div>
    </div>
    </PageTransition>
  );
}
