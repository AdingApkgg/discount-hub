"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { openApp } from "@discount-hub/shared";
import { useTRPC } from "@/trpc/client";
import { useSiteContent, asString, asArray } from "@/hooks/use-site-content";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AnimatedItem,
  AnimatedSection,
  PageTransition,
  StaggerList,
} from "@/components/motion";
import {
  BurstBadge,
  CoinBadge,
  FloorHeader,
  HotSticker,
  StampMark,
} from "@/components/consumer-visual";

type PointsStatus = RouterOutputs["points"]["getStatus"];
type UserProfile = RouterOutputs["user"]["me"];
type OrderRecord = RouterOutputs["order"]["myOrders"][number];
type ReferralRecord = RouterOutputs["user"]["referrals"][number];

const FALLBACK_VIP_BENEFITS: Record<string, string[]> = {
  "0": ["基础兑换权益"],
  "1": ["每日签到奖励 +5%", "基础兑换权益"],
  "2": ["每日签到奖励 +10%", "限时折扣", "基础兑换权益"],
  "3": ["每日签到奖励 +15%", "优先购资格", "限时折扣", "专属折扣"],
  "4": ["每日签到奖励 +20%", "抢先看特权", "双倍积分日", "所有 VIP3 权益"],
};

type DailyTask = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  reward: number;
  type: "BASIC" | "CUMULATIVE";
  targetCount: number;
};

const FALLBACK_DAILY_TASKS: DailyTask[] = [
  { id: "checkin", emoji: "📅", title: "每日签到", desc: "享受 0.5 折特惠", reward: 200, type: "BASIC", targetCount: 1 },
  { id: "browse", emoji: "🛒", title: "完成一次兑换", desc: "去完成", reward: 100, type: "BASIC", targetCount: 1 },
  { id: "purchase", emoji: "📺", title: "浏览 60 秒抖音", desc: "去完成", reward: 100, type: "BASIC", targetCount: 1 },
  { id: "share", emoji: "💌", title: "分享 APP 给好友", desc: "去完成", reward: 80, type: "BASIC", targetCount: 1 },
];

function buildVipTiers(
  pointsPerLevel: number,
  benefitsByLevel: Record<string, unknown>,
) {
  return [0, 1, 2, 3].map((level) => {
    const fromContent = benefitsByLevel[String(level)];
    const benefits = Array.isArray(fromContent)
      ? (fromContent as string[]).filter((s) => typeof s === "string")
      : (FALLBACK_VIP_BENEFITS[String(level)] ?? [`所有 VIP${level - 1} 权益`, "更多特权"]);
    return {
      level,
      name: level === 0 ? "VIP" : `VIP${level}`,
      minPoints: level * pointsPerLevel,
      benefits,
    };
  });
}

function isToday(value: string | Date | null | undefined) {
  if (!value) return false;
  const date = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function MemberSkeleton() {
  return (
    <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}

/* ============ 顶部会员头卡 ============ */
function MemberTopCard({
  profile,
  regularLabel,
  tagline,
}: {
  profile: UserProfile | undefined;
  regularLabel: string;
  tagline: string;
}) {
  const name = profile?.name ?? "游客";
  const points = profile?.points ?? 0;
  const vipLevel = profile?.vipLevel ?? 0;
  const vipLabel = vipLevel <= 0 ? regularLabel : `VIP${vipLevel}`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#7A1E2E_0%,#B8252F_55%,#F5B800_120%)] px-4 py-3.5 text-white shadow-[0_10px_24px_rgba(122,30,46,0.28)]">
      <div className="stripe-urgent pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/18 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-[var(--brand-gold)]/30 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-[var(--brand-red)] shadow-[0_4px_12px_rgba(0,0,0,0.22)]">
          {name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-base font-black drop-shadow-sm">
              {name}
            </span>
            <HotSticker tone="gold" rotate={-5}>
              {vipLabel}
            </HotSticker>
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-white/85">
            {tagline}
          </div>
        </div>
        <CoinBadge value={points.toLocaleString("zh-CN")} size="md" />
      </div>
    </div>
  );
}

/* ============================================================= */
export default function MemberPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const memberContent = useSiteContent("member");
  const earnContent = useSiteContent("earn");
  const tagline = asString(memberContent["member.tagline"], "刷任务、签到、邀请 · 积分当钱花");
  const regularLabel = asString(memberContent["member.regular_label"], "普通会员");
  const benefitsTitle = asString(memberContent["member.benefits_title"], "会员权益");
  const checkinTitle = asString(memberContent["member.checkin_title"], "连续签到");
  const vipBenefitsByLevel = useMemo(
    () => (memberContent["member.vip_benefits_by_level"] as Record<string, unknown>) ?? {},
    [memberContent],
  );
  const earnContents = asArray<{
    id: string;
    title: string;
    subtitle: string;
    app: string;
    rewardPoints: number;
    gradient?: string;
  }>(earnContent["earn.contents"]);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [checkinResult, setCheckinResult] = useState<{
    reward: number;
    dayIndex: number;
    cycle: number;
  } | null>(null);
  const [activeTier, setActiveTier] = useState<number | null>(null);

  const { data: statusData, isLoading: loadingStatus } = useQuery(
    trpc.points.getStatus.queryOptions(),
  );
  const { data: profileData, isLoading: loadingProfile } = useQuery(
    trpc.user.me.queryOptions(),
  );
  const { data: ordersData } = useQuery(trpc.order.myOrders.queryOptions());
  const { data: referralsData } = useQuery(trpc.user.referrals.queryOptions());
  const { data: activeTasksData } = useQuery(
    trpc.points.listActiveTasks.queryOptions(),
  );

  const dailyTasks = useMemo<DailyTask[]>(() => {
    if (!activeTasksData || activeTasksData.length === 0) {
      return FALLBACK_DAILY_TASKS;
    }
    return activeTasksData.map((t) => ({
      id: t.taskId,
      emoji: t.icon || "⭐",
      title: t.title,
      desc: t.description || "去完成",
      reward: t.reward,
      type: t.type,
      targetCount: t.targetCount,
    }));
  }, [activeTasksData]);

  const checkinMutation = useMutation(trpc.points.checkin.mutationOptions());
  const completeTaskMutation = useMutation(
    trpc.points.completeTask.mutationOptions(),
  );

  const status = statusData as PointsStatus | undefined;
  const profile = profileData as UserProfile | undefined;
  const orders = useMemo(
    () => (ordersData ?? []) as OrderRecord[],
    [ordersData],
  );
  const referrals = (referralsData ?? []) as ReferralRecord[];
  const todayTasks = new Set(status?.todayTasks ?? []);
  const todayTaskCounts = status?.todayTaskCounts ?? {};

  const checkinRewards =
    status?.checkinRewards ?? [200, 3000, 300, 500, 800, 1200, 10000];
  const checkinCycle = status?.checkinCycle ?? 7;

  const vipTiers = useMemo(
    () => buildVipTiers(status?.vipPointsPerLevel ?? 500, vipBenefitsByLevel),
    [status?.vipPointsPerLevel, vipBenefitsByLevel],
  );
  const currentLevel = profile?.vipLevel ?? 0;
  const shownTierLevel = activeTier ?? Math.min(currentLevel, 3);
  const shownTier = vipTiers[shownTierLevel] ?? vipTiers[0];

  const checkedIn = status?.checkedInToday ?? false;
  const nextDayIndex = status?.nextDayIndex ?? 1;
  const completedCheckinDays = checkedIn
    ? nextDayIndex
    : Math.max(0, nextDayIndex - 1);
  const points = profile?.points ?? status?.points ?? 0;
  const hasPaidOrderToday = useMemo(
    () =>
      orders.some(
        (order) =>
          order.status === "PAID" && isToday(order.paidAt ?? order.createdAt),
      ),
    [orders],
  );
  const isLoading = loadingStatus || loadingProfile;

  async function refreshAll() {
    await queryClient.invalidateQueries();
  }

  async function runTask(taskId: string) {
    setBusyTaskId(taskId);
    try {
      const result = await completeTaskMutation.mutateAsync({ taskId });
      await refreshAll();
      if (result.done && result.reward > 0) {
        toast.success(`任务完成！+${result.reward} 积分`);
      } else if (result.target > 1) {
        toast.success(`进度 ${result.progress}/${result.target}`);
      } else {
        toast.success("任务完成");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "任务提交失败");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleCheckin() {
    if (checkedIn || checkinMutation.isPending) return;
    setBusyTaskId("checkin");
    try {
      const result = await checkinMutation.mutateAsync();
      await refreshAll();
      setCheckinResult({
        reward: result.reward,
        dayIndex: result.dayIndex,
        cycle: result.cycle,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "签到失败");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleTask(taskId: string) {
    if (taskId === "checkin") {
      await handleCheckin();
      return;
    }
    if (taskId === "browse") {
      openApp("抖音");
      await runTask(taskId);
      return;
    }
    if (taskId === "share") {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        toast.error("复制分享链接失败");
        return;
      }
      await runTask(taskId);
      return;
    }
    if (taskId === "purchase") {
      if (todayTasks.has("purchase")) return;
      if (!hasPaidOrderToday) {
        toast.info("今天还没有完成兑换，先去首页挑个商品吧");
        router.push("/");
        return;
      }
      await runTask(taskId);
    }
  }

  async function handleEarn(id: string, app: string) {
    if (todayTasks.has(id) || busyTaskId === id) return;
    openApp(app);
    await runTask(id);
  }

  if (isLoading) return <MemberSkeleton />;

  return (
    <PageTransition>
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
        <AnimatedItem>
          <MemberTopCard profile={profile} regularLabel={regularLabel} tagline={tagline} />
        </AnimatedItem>

        {/* VIP 等级 */}
        <AnimatedItem>
          <div className="space-y-2">
            <FloorHeader emoji="👑" title={benefitsTitle} subtitle="积分越多权益越香" tone="gold" />
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {vipTiers.map((tier) => {
                const isActive = tier.level === shownTierLevel;
                const isCurrent = tier.level === currentLevel;
                return (
                  <button
                    key={tier.level}
                    type="button"
                    onClick={() => setActiveTier(tier.level)}
                    className={cn(
                      "relative shrink-0 rounded-full px-3 py-1 text-[12px] font-black transition-all active:scale-95",
                      isActive
                        ? "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-white shadow-[0_3px_8px_rgba(254,44,85,0.3)]"
                        : "bg-[var(--app-card)] text-muted-foreground shadow-[inset_0_0_0_1px_rgba(193,122,60,0.2)]",
                    )}
                  >
                    {tier.name}
                    {isCurrent && (
                      <span className="ml-1 rounded bg-[var(--brand-gold)] px-1 py-0 text-[9px] font-black text-[#5C3A00]">
                        当前
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[var(--app-card)] p-3 shadow-[0_4px_14px_rgba(122,60,30,0.08)]">
              <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[var(--brand-gold-soft)] blur-xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-black text-[var(--brand-red)]">
                      {shownTier.name}
                    </span>
                    <HotSticker tone="gold" rotate={-4}>
                      尊享权益
                    </HotSticker>
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    达成 {shownTier.minPoints.toLocaleString("zh-CN")} 积分解锁
                  </div>
                </div>
                {shownTier.level > currentLevel && (
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      还差
                    </div>
                    <div className="text-sm font-black text-[var(--brand-red)] tabular-nums">
                      {Math.max(0, shownTier.minPoints - points).toLocaleString("zh-CN")}
                    </div>
                  </div>
                )}
              </div>
              <ul className="relative mt-2.5 grid gap-1.5">
                {shownTier.benefits.map((b, i) => (
                  <li
                    key={b}
                    className="flex items-start gap-1.5 text-[12px] font-semibold text-foreground"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red-soft)] text-[9px] font-black text-[var(--brand-red)]">
                      {i + 1}
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </AnimatedItem>

        {/* 签到日历 */}
        <AnimatedSection className="space-y-2">
          <FloorHeader emoji="📅" title={checkinTitle} subtitle={
            completedCheckinDays >= checkinCycle
              ? "本轮已满 · 明天新周期"
              : `已连 ${completedCheckinDays} 天 · 第 ${checkinCycle} 天爆奖 ${checkinRewards[checkinCycle - 1]?.toLocaleString("zh-CN")}`
          } tone="red" />
          <div className="relative overflow-hidden rounded-2xl bg-[var(--festive-dialog-bg)] p-3 shadow-[0_4px_14px_rgba(122,60,30,0.08)]">
            <div className="dotted-warm pointer-events-none absolute inset-0 opacity-60" />

            <div className="relative grid grid-cols-7 gap-1.5">
              {checkinRewards.map((reward, i) => {
                const done = i < completedCheckinDays;
                const isSpecial = i === checkinCycle - 1;
                const isNext = !done && i === completedCheckinDays;
                return (
                  <div
                    key={i}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-center text-[10px] font-bold",
                      done
                        ? "bg-[var(--checkin-done-bg)] text-[var(--brand-red)] shadow-[inset_0_0_0_1px_rgba(254,44,85,0.35)]"
                        : isSpecial
                          ? "bg-[linear-gradient(180deg,#FFE37A_0%,#FFB84D_100%)] text-[#5C3A00] shadow-[0_3px_8px_rgba(245,184,0,0.4)]"
                          : "bg-[var(--app-card)] text-muted-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)]",
                    )}
                  >
                    {done && (
                      <StampMark
                        size={26}
                        className="absolute -top-1 right-0 scale-75"
                      >
                        ✓
                      </StampMark>
                    )}
                    {isNext && (
                      <span className="pulse-red absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--brand-red)]" />
                    )}
                    <span className="text-[9px] leading-none">
                      第{i + 1}天
                    </span>
                    <span
                      className={cn(
                        "text-[12px] font-black leading-none tabular-nums",
                        isSpecial && "text-[#8B4513]",
                      )}
                    >
                      {reward >= 1000
                        ? `${(reward / 1000).toFixed(reward % 1000 === 0 ? 0 : 1)}k`
                        : `+${reward}`}
                    </span>
                    {isSpecial && !done && (
                      <span className="text-[9px] font-black leading-none text-[#8B4513]">
                        🎁大奖
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              onClick={handleCheckin}
              disabled={checkedIn || busyTaskId === "checkin"}
              className={cn(
                "relative mt-3 h-10 w-full rounded-full text-sm font-black text-white",
                checkedIn
                  ? "bg-[var(--app-soft-strong)] text-muted-foreground"
                  : "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] shadow-[0_6px_16px_rgba(254,44,85,0.32)] hover:brightness-110",
              )}
            >
              {busyTaskId === "checkin" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : checkedIn ? (
                <>✓ 今日已签</>
              ) : (
                <>🚀 立即签到 · 赢 {checkinRewards[completedCheckinDays] ?? 200} 积分</>
              )}
            </Button>
          </div>
        </AnimatedSection>

        {/* 日常任务 */}
        <AnimatedSection className="space-y-2">
          <FloorHeader emoji="🎯" title="日常任务" subtitle={`${dailyTasks.filter((t) => t.id === "checkin" ? checkedIn : (todayTaskCounts[t.id] ?? 0) >= t.targetCount).length}/${dailyTasks.length} 已完成`} tone="pink" />
          <div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_4px_14px_rgba(122,60,30,0.08)]">
            {dailyTasks.map((task, i) => {
              const progress = task.id === "checkin"
                ? (checkedIn ? 1 : 0)
                : (todayTaskCounts[task.id] ?? 0);
              const done = progress >= task.targetCount;
              const isCumulative = task.type === "CUMULATIVE" && task.targetCount > 1;
              const inProgress = isCumulative && progress > 0 && !done;
              const pct = Math.min(100, (progress / task.targetCount) * 100);
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2.5",
                    i !== dailyTasks.length - 1 &&
                      "border-b border-dashed border-[var(--app-card-border)]",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="text-2xl leading-none">{task.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-black text-foreground">
                        {task.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--brand-gold-soft)] px-1.5 py-0.5 font-black text-[#8B6A00]">
                          +{task.reward} 积分
                        </span>
                        <span className="text-muted-foreground">· {task.desc}</span>
                      </div>
                      {isCumulative && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--app-soft-strong)]">
                            <div
                              className={cn(
                                "h-full transition-all",
                                done
                                  ? "bg-emerald-500"
                                  : progress > 0
                                    ? "bg-amber-400"
                                    : "bg-transparent",
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={cn(
                            "text-[10px] font-black tabular-nums",
                            done ? "text-emerald-600" : inProgress ? "text-amber-600" : "text-muted-foreground",
                          )}>
                            {progress}/{task.targetCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={done || busyTaskId === task.id}
                    onClick={() => handleTask(task.id)}
                    className={cn(
                      "h-8 min-w-[72px] rounded-full text-[12px] font-black",
                      done
                        ? "bg-[var(--app-soft-strong)] text-muted-foreground hover:bg-[var(--app-soft-strong)]"
                        : "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-white shadow-[0_3px_8px_rgba(254,44,85,0.28)] hover:brightness-110",
                    )}
                  >
                    {busyTaskId === task.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : done ? (
                      <>✓ 已完成</>
                    ) : inProgress ? (
                      <>继续 ›</>
                    ) : (
                      <>去完成 ›</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </AnimatedSection>

        {/* 刷内容赚积分 */}
        <AnimatedSection className="space-y-2">
          <FloorHeader emoji="📺" title="刷内容赚积分" subtitle="秒变金币达人" tone="gold" />
          <StaggerList className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {earnContents.slice(0, 4).map((content) => {
              const done = todayTasks.has(content.id);
              return (
                <AnimatedItem key={content.id}>
                  <button
                    type="button"
                    onClick={() => handleEarn(content.id, content.app)}
                    disabled={done}
                    className={cn(
                      "flex h-full w-full flex-col overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_4px_12px_rgba(122,60,30,0.08)] transition-transform active:scale-[0.98]",
                      done && "opacity-60",
                    )}
                  >
                    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)]">
                      <span className="text-3xl">▶️</span>
                      <BurstBadge
                        tone="gold"
                        size={42}
                        className="absolute right-1 top-1"
                      >
                        {done ? "领" : `+${content.rewardPoints}`}
                      </BurstBadge>
                    </div>
                    <div className="flex flex-1 flex-col p-2 text-left">
                      <div className="line-clamp-2 min-h-[36px] text-[12px] font-black leading-[18px] text-foreground">
                        {content.title}
                      </div>
                      <div className="mt-1 inline-flex w-fit items-center gap-0.5 rounded-full bg-[var(--brand-red-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--brand-red)]">
                        {content.subtitle} ›
                      </div>
                    </div>
                  </button>
                </AnimatedItem>
              );
            })}
          </StaggerList>
        </AnimatedSection>

        {/* 邀请好友 */}
        <AnimatedSection className="space-y-2">
          <FloorHeader emoji="🎁" title="邀请好友" subtitle="拉新最高返 100 积分" tone="red" />
          <div className="relative overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] p-3 shadow-[0_4px_14px_rgba(245,184,0,0.2)]">
            <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[var(--brand-red)]/12 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <BurstBadge tone="red" size={56}>
                +100
              </BurstBadge>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-black text-[var(--brand-red)]">
                    邀请好友
                  </span>
                  <HotSticker tone="gold" rotate={-4}>
                    拉新必选
                  </HotSticker>
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-[#8B4513]">
                  已邀请 <span className="font-black text-[var(--brand-red)]">{referrals.length}</span> 位好友
                </div>
              </div>
              <Button
                onClick={() => router.push("/invite")}
                className="h-9 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-4 text-[12px] font-black text-white shadow-[0_3px_8px_rgba(254,44,85,0.32)] hover:brightness-110"
              >
                去邀请 ›
              </Button>
            </div>

            {referrals.length > 0 && (
              <div className="relative mt-2.5 border-t border-dashed border-[#C17A3C]/30 pt-2.5">
                <div className="mb-1.5 flex items-center gap-1 text-[10px] font-black text-[#8B4513]">
                  <Users className="h-3 w-3" />
                  最近邀请
                </div>
                <div className="space-y-1">
                  {referrals.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-[11px] font-semibold"
                    >
                      <span className="truncate text-foreground">
                        {r.name ?? r.email}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>

      {/* 签到成功弹窗 */}
      <Dialog
        open={!!checkinResult}
        onOpenChange={(open) => !open && setCheckinResult(null)}
      >
        <DialogContent className="max-w-xs overflow-hidden rounded-3xl border-0 bg-[var(--festive-dialog-bg)] p-0 shadow-[0_20px_60px_rgba(254,44,85,0.3)]">
          <div className="relative p-6 text-center">
            <div className="dotted-warm pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative mx-auto">
              <BurstBadge tone="red" size={72}>
                +{checkinResult?.reward ?? 0}
              </BurstBadge>
            </div>
            <div className="relative mt-3 text-lg font-black text-[var(--brand-red)]">
              🎉 签到成功
            </div>
            <div className="relative mt-0.5 text-[11px] font-semibold text-muted-foreground">
              积分已到账 · 继续签到拿大奖
            </div>

            <div className="relative mt-4 rounded-2xl bg-[var(--app-card)] px-3 py-2.5 text-[12px] font-bold text-foreground shadow-[inset_0_0_0_1.5px_rgba(254,44,85,0.18)]">
              连续签到第{" "}
              <span className="font-black text-[var(--brand-red)]">
                {checkinResult?.dayIndex ?? 1}
              </span>{" "}
              / {checkinResult?.cycle ?? checkinCycle} 天
              {(checkinResult?.dayIndex ?? 0) < checkinCycle && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  明日奖励：
                  <span className="font-black text-[var(--brand-red)]">
                    +{checkinRewards[checkinResult?.dayIndex ?? 0] ?? 200} 积分
                  </span>
                </div>
              )}
            </div>

            <div className="relative mt-4 flex flex-col gap-2">
              <Button
                onClick={() => {
                  setCheckinResult(null);
                  router.push("/");
                }}
                className="h-10 w-full rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-sm font-black text-white shadow-[0_6px_14px_rgba(254,44,85,0.35)] hover:brightness-110"
              >
                🛒 逛好物兑换
              </Button>
              <Button
                variant="outline"
                onClick={() => setCheckinResult(null)}
                className="h-10 w-full rounded-full border-0 bg-[var(--app-card)] text-sm font-bold shadow-[inset_0_0_0_1px_var(--app-card-border)]"
              >
                继续做任务
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
