"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  ClipboardList,
  FileText,
  Footprints,
  HelpCircle,
  Heart,
  Info,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Ticket,
  UserCog,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import {
  AnimatedItem,
  AnimatedSection,
  HoverScale,
  PageTransition,
} from "@/components/motion";

type UserProfile = RouterOutputs["user"]["me"];

function ProfileSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

/* ---------- 顶部用户卡片 ---------- */
function ProfileHeader({
  profile,
  onCopyInvite,
}: {
  profile: UserProfile | undefined;
  onCopyInvite: () => void;
}) {
  const name = profile?.name ?? "游客";
  const email = profile?.email ?? "";
  const vipLabel =
    (profile?.vipLevel ?? 0) <= 0 ? "普通会员" : `VIP${profile?.vipLevel}`;
  const points = profile?.points ?? 0;
  return (
    <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-white p-4 shadow-none">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-base font-semibold text-foreground">
          {name.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-base font-bold text-foreground">
              {name}
            </div>
            <span className="rounded bg-[var(--brand-red-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-red)]">
              {vipLabel}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{points.toLocaleString("zh-CN")} 积分</span>
            {email && (
              <>
                <span>·</span>
                <span className="truncate">{email}</span>
              </>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onCopyInvite}
          className="h-8 shrink-0 rounded-full border-[var(--app-card-border)] text-xs"
        >
          邀请好友
        </Button>
      </div>
    </Card>
  );
}

/* ---------- 四宫格入口 ---------- */
const QUICK_ACTIONS = [
  { id: "orders", icon: ClipboardList, label: "我的订单", path: "/my-orders" },
  { id: "coupons", icon: Ticket, label: "我的券包", path: "/coupons" },
  { id: "favorites", icon: Heart, label: "我的收藏", path: "/favorites" },
  { id: "footprints", icon: Footprints, label: "我的足迹", path: "/footprints" },
] as const;

function QuickActionsGrid({ onGo }: { onGo: (path: string) => void }) {
  return (
    <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-white p-3 shadow-none">
      <div className="grid grid-cols-4 gap-1">
        {QUICK_ACTIONS.map((a, i) => {
          const Icon = a.icon;
          return (
            <HoverScale key={a.id} scale={1.04}>
              <button
                type="button"
                onClick={() => onGo(a.path)}
                className="flex w-full flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary/60"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    i === 0 && "bg-red-50 text-[var(--brand-red)]",
                    i === 1 && "bg-orange-50 text-[var(--brand-orange)]",
                    i === 2 && "bg-pink-50 text-[var(--brand-pink)]",
                    i === 3 && "bg-purple-50 text-[var(--brand-purple)]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className="text-[11px] font-medium text-foreground">
                  {a.label}
                </span>
              </button>
            </HoverScale>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- 申请代理 强提示入口 ---------- */
function ApplyAgentBanner({
  onGo,
  isAgent,
}: {
  onGo: () => void;
  isAgent: boolean;
}) {
  return (
    <HoverScale scale={1.005}>
      <button
        type="button"
        onClick={onGo}
        className="relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-[var(--brand-red)]/30 bg-gradient-to-r from-[var(--brand-red-soft)] via-white to-[var(--brand-orange-soft)] px-4 py-3.5 text-left transition-all hover:border-[var(--brand-red)]/60"
      >
        <span className="absolute -right-2 -top-2 h-20 w-20 rounded-full bg-[var(--brand-red)]/10 blur-2xl" />
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red)] text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {isAgent ? "代理商中心" : "申请成为官方代理"}
            </span>
            {!isAgent && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-red)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-red)]" />
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {isAgent
              ? "进入代理商品列表和订单管理"
              : "获取代理价、批量拿货、独家权益"}
          </div>
        </div>
        <span className="relative rounded-full bg-[var(--brand-red)] px-3 py-1 text-[11px] font-semibold text-white">
          {isAgent ? "进入" : "去申请"}
        </span>
      </button>
    </HoverScale>
  );
}

/* ---------- 账户信息卡 ---------- */
function AccountInfoCard({ profile }: { profile: UserProfile | undefined }) {
  return (
    <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-white p-0 shadow-none">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--app-card-border)]">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm text-muted-foreground">邮箱</span>
        <span className="text-sm text-foreground">
          {profile?.email ?? "未设置"}
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-sm text-muted-foreground">手机号</span>
        <span className="text-sm text-foreground">
          {profile?.phone || "未设置"}
        </span>
      </div>
    </Card>
  );
}

/* ---------- 设置列表 ---------- */
const SETTING_ITEMS = [
  { id: "account", icon: UserCog, label: "账户设置" },
  { id: "notify", icon: Bell, label: "消息通知" },
  { id: "help", icon: HelpCircle, label: "帮助中心" },
  { id: "terms", icon: FileText, label: "服务条款" },
  { id: "about", icon: Info, label: "关于我们" },
] as const;

function SettingsList({ onGo }: { onGo?: (id: string) => void }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-white p-0 shadow-none">
      {SETTING_ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onGo?.(item.id)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60",
              i !== SETTING_ITEMS.length - 1 &&
                "border-b border-[var(--app-card-border)]",
            )}
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">
              {item.label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        );
      })}
    </Card>
  );
}

/* =========================================================== */
export default function ProfilePage() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: profileData, isLoading } = useQuery(
    trpc.user.me.queryOptions(),
  );
  const profile = profileData as UserProfile | undefined;

  const inviteCode = profile?.inviteCode ?? "";
  const inviteLink =
    typeof window === "undefined" || !inviteCode
      ? ""
      : `${window.location.origin}/login?inviteCode=${encodeURIComponent(inviteCode)}`;

  const role = (profile as { role?: string } | undefined)?.role;
  const isAgent = role === "AGENT";

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink || inviteCode);
      toast.success("邀请链接已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  async function handleLogout() {
    await signOut();
    router.push("/login");
    toast.success("已退出登录");
  }

  if (isLoading) return <ProfileSkeleton />;

  return (
    <PageTransition>
      <div className="space-y-3 px-4 py-4 md:space-y-4 md:px-6 md:py-5">
        <AnimatedItem>
          <ProfileHeader profile={profile} onCopyInvite={handleCopyInvite} />
        </AnimatedItem>

        <AnimatedItem>
          <QuickActionsGrid onGo={(p) => router.push(p)} />
        </AnimatedItem>

        <AnimatedItem>
          <ApplyAgentBanner
            isAgent={isAgent}
            onGo={() => router.push(isAgent ? "/agent" : "/apply-agent")}
          />
        </AnimatedItem>

        <AnimatedSection className="space-y-3">
          <div className="px-1 text-xs font-semibold text-muted-foreground">
            账户信息
          </div>
          <AccountInfoCard profile={profile} />
        </AnimatedSection>

        <AnimatedSection className="space-y-3">
          <div className="px-1 text-xs font-semibold text-muted-foreground">
            其他
          </div>
          <SettingsList />
        </AnimatedSection>

        <AnimatedSection>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full rounded-xl border-[var(--app-danger-border)] bg-white py-5 text-sm font-semibold text-[var(--app-danger-text)] hover:bg-[var(--app-danger-hover)] hover:text-[var(--app-danger-text)]"
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
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleLogout}
                >
                  确认退出
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </AnimatedSection>

        <div className="pb-2 text-center text-[11px] text-muted-foreground">
          版本 1.0.0
        </div>
      </div>
    </PageTransition>
  );
}
