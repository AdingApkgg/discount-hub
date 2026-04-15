"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  Copy,
  Crown,
  Eye,
  Gift,
  Heart,
  Info,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Phone,
  Save,
  Settings,
  Star,
  Sun,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { inviteBenefits } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  StatCard,
} from "@/components/shared";
import {
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
  const { theme, setTheme } = useTheme();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ name: "", phone: "" });
  const [hasDraft, setHasDraft] = useState(false);

  const { data: profileData, isLoading } = useQuery(trpc.user.me.queryOptions());
  const { data: referralsData } = useQuery(trpc.user.referrals.queryOptions());
  const updateProfileMutation = useMutation(trpc.user.updateProfile.mutationOptions());

  const profile = profileData as UserProfile | undefined;
  const referrals = (referralsData ?? []) as ReferralRecord[];
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

  const vipExpiresAt = (profile as { vipExpiresAt?: string | Date | null } | undefined)?.vipExpiresAt;
  const vipExpiresLabel = vipExpiresAt
    ? `${new Date(vipExpiresAt).toLocaleDateString("zh-CN")} 到期`
    : null;

  const quickGrid = [
    { icon: Star, label: "我的收藏", href: "/favorites" },
    { icon: Heart, label: "我的推广", href: "/promotions" },
    { icon: Eye, label: "我的足迹", href: "/footprints" },
  ];

  const orderTabs = [
    { label: "待付款", href: "/my-orders?tab=pending" },
    { label: "待使用", href: "/my-orders?tab=unused" },
    { label: "已完成", href: "/my-orders?tab=used" },
  ];

  const menuItems = [
    { icon: Settings, label: "设置", href: undefined as string | undefined },
    { icon: Info, label: "关于我们", href: "/about" },
    { icon: MessageCircle, label: "联系客服", href: "/contact" },
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
                      <Crown className="mr-1 h-3 w-3" />{vipLabel}
                    </Badge>
                    <span>{(profile?.points ?? 0).toLocaleString("zh-CN")} 积分</span>
                    {vipExpiresLabel && (
                      <span className="text-xs text-white/50">{vipExpiresLabel}</span>
                    )}
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

      <AnimatedSection>
        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <div className="grid grid-cols-3 gap-3">
              {quickGrid.map((item) => {
                const Icon = item.icon;
                return (
                  <HoverScale key={item.label}>
                    <Button
                      variant="ghost"
                      className="flex h-auto w-full flex-col items-center gap-2 rounded-2xl py-4"
                      onClick={() => router.push(item.href)}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                    </Button>
                  </HoverScale>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>

      <AnimatedSection>
        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="我的订单"
              subtitle="按状态快速查看"
              action={
                <Button variant="link" size="sm" onClick={() => router.push("/my-orders")} className="text-xs text-muted-foreground">
                  查看全部 →
                </Button>
              }
            />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {orderTabs.map((tab) => (
                <HoverScale key={tab.label}>
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl border-border bg-secondary/50 py-6 text-sm font-medium text-foreground hover:bg-secondary"
                    onClick={() => router.push(tab.href)}
                  >
                    {tab.label}
                  </Button>
                </HoverScale>
              ))}
            </div>
          </CardContent>
        </Card>
      </AnimatedSection>

      <AnimatedSection>
        <HoverScale scale={1.01}>
          <Card className={`${appCardClassName} cursor-pointer`} onClick={() => router.push("/apply-agent")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">申请代理</div>
                    <div className="text-xs text-muted-foreground">成为官方代理商，享受专属权益</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </HoverScale>
      </AnimatedSection>

      <AnimatedSection>
        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="邀请好友"
              subtitle={`已邀请 ${referrals.length} 位好友`}
              action={<Gift className="h-5 w-5 text-muted-foreground" />}
            />
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {inviteBenefits.map((benefit) => (
                  <Badge key={benefit} variant="outline" className="rounded-full border-border bg-background text-muted-foreground">
                    {benefit}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push("/invite")} className="rounded-full">
                  邀请详情
                </Button>
                <Button onClick={handleCopyInvite} className="rounded-full">
                  <Copy className="h-4 w-4" />
                  复制邀请码
                </Button>
              </div>
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
            <div className="py-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isFirst = index === 0;
              const isLast = index === menuItems.length - 1;
              return (
                <Button
                  key={item.label}
                  variant="ghost"
                  onClick={() => item.href && router.push(item.href)}
                  className={cn(
                    "h-auto w-full justify-start gap-3 rounded-none px-5 py-4",
                    isFirst && "rounded-t-[28px]",
                    isLast && "rounded-b-[28px]",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-foreground">
                    {item.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              );
            })}
            </div>
          </Card>
        </div>
      </AnimatedSection>

      <AnimatedSection>
        <Button
          variant="outline"
          className="w-full rounded-2xl border-border bg-background py-6"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        </Button>
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
