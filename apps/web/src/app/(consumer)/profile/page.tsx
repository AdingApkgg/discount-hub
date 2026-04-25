"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  LogOut,
  UserCog,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
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
  PageTransition,
} from "@/components/motion";
import {
  BurstBadge,
  CoinBadge,
  EmojiShortcut,
  FloorHeader,
  HotSticker,
  StampMark,
} from "@/components/consumer-visual";

type UserProfile = RouterOutputs["user"]["me"];

function ProfileSkeleton() {
  return (
    <div className="space-y-3 px-3 py-3 md:px-6 md:py-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

/* ============ 顶部用户头卡 ============ */
function ProfileHeader({
  profile,
  onCopyInvite,
}: {
  profile: UserProfile | undefined;
  onCopyInvite: () => void;
}) {
  const name = profile?.name ?? "游客";
  const email = profile?.email ?? "";
  const vipLevel = profile?.vipLevel ?? 0;
  const vipLabel = vipLevel <= 0 ? "普通会员" : `VIP${vipLevel}`;
  const points = profile?.points ?? 0;
  const savingsCents = profile?.totalSavingsCents ?? 0;
  const savingsYuan = savingsCents / 100;
  const savingsPts = profile?.totalSavingsPoints ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)] px-4 pb-3 pt-4 text-white shadow-[0_10px_24px_rgba(254,44,85,0.22)]">
      <div className="stripe-urgent pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-[var(--brand-gold)]/25 blur-2xl" />

      <div className="relative flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-black text-[var(--brand-red)] shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
            {name.slice(0, 1)}
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,#F5B800_0%,#FF6E37_100%)] px-1.5 py-0.5 text-[9px] font-black leading-none text-white shadow ring-2 ring-white">
            {vipLabel}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-base font-black leading-tight drop-shadow-sm">
              {name}
            </span>
            <HotSticker tone="gold" rotate={-5}>
              大佬
            </HotSticker>
          </div>
          {email && (
            <div className="mt-0.5 truncate text-[10px] font-semibold text-white/80">
              {email}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <CoinBadge value={points.toLocaleString("zh-CN")} size="sm" />
            <div className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black backdrop-blur">
              🛡️ 已省 ¥{savingsYuan.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Link
            href="/invite"
            className="inline-flex items-center gap-0.5 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[var(--brand-red)] shadow active:scale-95"
          >
            邀请详情 ›
          </Link>
          <button
            type="button"
            onClick={onCopyInvite}
            className="text-[10px] font-semibold text-white/85 underline-offset-2 hover:underline"
          >
            复制邀请链接
          </button>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl bg-white/18 py-1.5 backdrop-blur">
          <div className="text-[10px] font-semibold text-white/90">可用积分</div>
          <div className="mt-0.5 text-sm font-black tabular-nums">
            {points.toLocaleString("zh-CN")}
          </div>
        </div>
        <div className="rounded-xl bg-white/18 py-1.5 backdrop-blur">
          <div className="text-[10px] font-semibold text-white/90">累计抵扣</div>
          <div className="mt-0.5 text-sm font-black tabular-nums">
            {savingsPts.toLocaleString("zh-CN")}
          </div>
        </div>
        <div className="rounded-xl bg-white/18 py-1.5 backdrop-blur">
          <div className="text-[10px] font-semibold text-white/90">会员等级</div>
          <div className="mt-0.5 text-sm font-black">{vipLabel}</div>
        </div>
      </div>
    </div>
  );
}

/* ============ 四宫格入口 ============ */
const QUICK_ACTIONS = [
  { id: "orders", emoji: "📦", label: "我的订单", path: "/my-orders", tone: "red" as const },
  { id: "coupons", emoji: "🎟️", label: "券包", path: "/coupons", tone: "orange" as const, badge: "NEW" },
  { id: "favorites", emoji: "❤️", label: "收藏", path: "/favorites", tone: "pink" as const },
  { id: "footprints", emoji: "👣", label: "足迹", path: "/footprints", tone: "gold" as const },
];

function QuickActionsGrid({ onGo }: { onGo: (path: string) => void }) {
  return (
    <div className="rounded-2xl bg-[var(--app-card)] p-3 shadow-[0_4px_14px_rgba(122,60,30,0.08)]">
      <div className="grid grid-cols-4 gap-1">
        {QUICK_ACTIONS.map((a) => (
          <EmojiShortcut
            key={a.id}
            emoji={a.emoji}
            label={a.label}
            tone={a.tone}
            badge={a.badge}
            onClick={() => onGo(a.path)}
          />
        ))}
      </div>
    </div>
  );
}

/* ============ 代理入口 ============ */
function ApplyAgentBanner({
  onGo,
  isAgent,
}: {
  onGo: () => void;
  isAgent: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onGo}
      className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] px-3 py-3 text-left shadow-[0_4px_14px_rgba(245,184,0,0.2)] active:scale-[0.99]"
    >
      <span className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[var(--brand-red)]/12 blur-2xl" />
      <span className="absolute -bottom-6 left-10 h-20 w-20 rounded-full bg-[var(--brand-gold)]/20 blur-2xl" />

      <BurstBadge tone="gold" size={56}>
        {isAgent ? "进" : "赚"}
      </BurstBadge>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-black text-[var(--brand-red)]">
            {isAgent ? "代理商中心" : "成为官方代理"}
          </span>
          <HotSticker tone="red" rotate={-4}>
            月入过万
          </HotSticker>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-semibold text-[#8B4513]">
          <span className="rounded bg-white/70 px-1.5 py-0.5 font-black text-[var(--brand-red)]">
            代理价
          </span>
          <span className="rounded bg-white/70 px-1.5 py-0.5 font-black text-[var(--brand-orange)]">
            批量拿货
          </span>
          <span className="rounded bg-white/70 px-1.5 py-0.5 font-black text-[#8B6A00]">
            独家权益
          </span>
        </div>
      </div>

      <span className="relative inline-flex items-center gap-0.5 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-3 py-1.5 text-[12px] font-black text-white shadow-[0_4px_10px_rgba(254,44,85,0.38)]">
        {isAgent ? "进入" : "去申请"}
        <ChevronRight className="h-3 w-3" strokeWidth={3} />
      </span>
    </button>
  );
}

/* ============ 账户信息卡 ============ */
function AccountInfoCard({ profile }: { profile: UserProfile | undefined }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_4px_14px_rgba(122,60,30,0.06)]">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="text-base">📧</span>
        <span className="flex-1 text-[12px] font-semibold text-muted-foreground">
          邮箱
        </span>
        <span className="text-[12px] font-bold text-foreground">
          {profile?.email ?? "未设置"}
        </span>
      </div>
      <div className="h-px bg-[var(--app-card-border)] mx-3.5" />
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className="text-base">📱</span>
        <span className="flex-1 text-[12px] font-semibold text-muted-foreground">
          手机号
        </span>
        <span className="text-[12px] font-bold text-foreground">
          {profile?.phone || "未设置"}
        </span>
      </div>
    </div>
  );
}

/* ============ 设置列表 ============ */
const SETTING_ITEMS = [
  { id: "account", emoji: "⚙️", icon: UserCog, label: "账户设置" },
  { id: "notify", emoji: "🔔", icon: Bell, label: "消息通知" },
  { id: "notices", emoji: "📢", icon: Bell, label: "公告中心", path: "/notices-center" },
  { id: "help", emoji: "💡", icon: HelpCircle, label: "帮助中心" },
  { id: "terms", emoji: "📄", icon: FileText, label: "服务条款" },
  { id: "about", emoji: "ℹ️", icon: Info, label: "关于我们" },
] as const;

function SettingsList({ onGo }: { onGo?: (id: string) => void }) {
  const router = useRouter();
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_4px_14px_rgba(122,60,30,0.06)]">
      {SETTING_ITEMS.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            const path = (item as { path?: string }).path;
            if (path) router.push(path);
            else onGo?.(item.id);
          }}
          className={cn(
            "flex w-full items-center gap-2.5 px-3.5 py-3 text-left active:bg-[var(--app-soft)]",
            i !== SETTING_ITEMS.length - 1 &&
              "border-b border-dashed border-[var(--app-card-border)]",
          )}
        >
          <span className="text-base">{item.emoji}</span>
          <span className="flex-1 text-[13px] font-bold text-foreground">
            {item.label}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

/* ============================================================= */
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
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
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

        <AnimatedSection className="space-y-2">
          <FloorHeader emoji="📇" title="账户信息" tone="pink" />
          <AccountInfoCard profile={profile} />
        </AnimatedSection>

        <AnimatedSection className="space-y-2">
          <FloorHeader emoji="🔧" title="其他" tone="gold" />
          <SettingsList />
        </AnimatedSection>

        <AnimatedSection>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full rounded-2xl border-0 bg-[var(--app-card)] py-5 text-sm font-black text-[var(--app-danger-text)] shadow-[inset_0_0_0_1.5px_var(--app-danger-border)] hover:bg-[var(--app-danger-hover)] hover:text-[var(--app-danger-text)]"
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

        <div className="flex items-center justify-center gap-1.5 pb-2 pt-1">
          <StampMark size={32} tone="gold">
            V1
          </StampMark>
          <span className="text-[10px] font-bold text-muted-foreground">
            版本 1.0.0 · 官方正版
          </span>
        </div>
      </div>
    </PageTransition>
  );
}
