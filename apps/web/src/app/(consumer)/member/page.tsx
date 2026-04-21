"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Check,
  Gift,
  Loader2,
  Play,
  Users,
} from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { openApp } from "@discount-hub/shared";
import { earnContents } from "@/data/mock";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  motion,
  AnimatedItem,
  AnimatedSection,
  PageTransition,
  StaggerList,
} from "@/components/motion";

type PointsStatus = RouterOutputs["points"]["getStatus"];
type UserProfile = RouterOutputs["user"]["me"];
type OrderRecord = RouterOutputs["order"]["myOrders"][number];
type ReferralRecord = RouterOutputs["user"]["referrals"][number];

const VIP_BENEFITS: Record<number, string[]> = {
  0: ["基础兑换权益"],
  1: ["每日签到奖励 +5%", "基础兑换权益"],
  2: ["每日签到奖励 +10%", "限时折扣", "基础兑换权益"],
  3: ["每日签到奖励 +15%", "优先购资格", "限时折扣", "专属折扣"],
  4: ["每日签到奖励 +20%", "抢先看特权", "双倍积分日", "所有 VIP3 权益"],
};

const DAILY_TASKS = [
  { id: "checkin", title: "每日签到", desc: "享受 0.5 折特惠", reward: 200 },
  { id: "browse", title: "完成一次兑换", desc: "去完成", reward: 100 },
  { id: "purchase", title: "浏览 60 秒抖音", desc: "去完成", reward: 100 },
  { id: "share", title: "分享 APP 给好友", desc: "去完成", reward: 80 },
] as const;

function buildVipTiers(pointsPerLevel: number) {
  return [0, 1, 2, 3].map((level) => ({
    level,
    name: level === 0 ? "VIP" : `VIP${level}`,
    minPoints: level * pointsPerLevel,
    benefits: VIP_BENEFITS[level] ?? [`所有 VIP${level - 1} 权益`, "更多特权"],
  }));
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
    <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-full" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/* ---------- 顶部用户信息 ---------- */
function MemberTopBar({ profile }: { profile: UserProfile | undefined }) {
  const name = profile?.name ?? "游客";
  const points = profile?.points ?? 0;
  const vipLabel =
    (profile?.vipLevel ?? 0) <= 0 ? "普通会员" : `VIP${profile?.vipLevel}`;
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
        {name.slice(0, 1)}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded bg-[var(--brand-red-soft)] px-1.5 py-0.5 font-semibold text-[var(--brand-red)]">
            {vipLabel}
          </span>
          <span>{points.toLocaleString("zh-CN")} 积分</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================== */
export default function MemberPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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

  const checkinRewards =
    status?.checkinRewards ?? [200, 3000, 300, 500, 800, 1200, 10000];
  const checkinCycle = status?.checkinCycle ?? 7;

  const vipTiers = useMemo(
    () => buildVipTiers(status?.vipPointsPerLevel ?? 500),
    [status?.vipPointsPerLevel],
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
      toast.success(`任务完成！+${result.reward} 积分`);
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

  async function handleTask(taskId: (typeof DAILY_TASKS)[number]["id"]) {
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
      <div className="space-y-4 px-4 py-4 md:space-y-5 md:px-6 md:py-5">
        <AnimatedItem>
          <MemberTopBar profile={profile} />
        </AnimatedItem>

        {/* VIP 等级 Tab 切换器 */}
        <AnimatedItem>
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-[var(--app-card-border)]">
              {vipTiers.map((tier) => {
                const isActive = tier.level === shownTierLevel;
                const isCurrent = tier.level === currentLevel;
                return (
                  <button
                    key={tier.level}
                    type="button"
                    onClick={() => setActiveTier(tier.level)}
                    className={cn(
                      "relative px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "font-bold text-foreground"
                        : "font-medium text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {tier.name}
                      {isCurrent && (
                        <span className="rounded bg-[var(--brand-red)] px-1 py-0 text-[9px] font-bold text-white">
                          当前
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="vip-tab-underline"
                        className="absolute bottom-[-1px] left-2 right-2 h-[3px] rounded-full bg-[var(--brand-red)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card)] p-4 shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {shownTier.name} 权益
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    达到 {shownTier.minPoints.toLocaleString("zh-CN")} 积分
                  </div>
                </div>
                {shownTier.level > currentLevel && (
                  <div className="text-xs text-muted-foreground">
                    还差{" "}
                    <span className="font-semibold text-[var(--brand-red)]">
                      {Math.max(0, shownTier.minPoints - points).toLocaleString("zh-CN")}
                    </span>{" "}
                    积分
                  </div>
                )}
              </div>
              <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {shownTier.benefits.map((b, i) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {i + 1}.
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </AnimatedItem>

        {/* 签到日历 */}
        <AnimatedSection>
          <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card)] p-4 shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-foreground">连续签到</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {completedCheckinDays >= checkinCycle
                    ? "已完成本轮 · 明天开始新周期"
                    : `已连续 ${completedCheckinDays} 天 · 第 ${checkinCycle} 天奖励 ${checkinRewards[
                        checkinCycle - 1
                      ].toLocaleString("zh-CN")} 积分`}
                </div>
              </div>
              <Button
                onClick={handleCheckin}
                disabled={checkedIn || busyTaskId === "checkin"}
                size="sm"
                className="h-8 rounded-full bg-[var(--brand-red)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-red-hover)] disabled:opacity-60"
              >
                {busyTaskId === "checkin" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : checkedIn ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <CalendarCheck className="h-3.5 w-3.5" />
                )}
                {checkedIn ? "已签到" : "立即签到"}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {checkinRewards.map((reward, i) => {
                const done = i < completedCheckinDays;
                const isSpecial = i === checkinCycle - 1;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border py-2 text-center text-[11px] transition-all",
                      done
                        ? "border-[var(--brand-red)] bg-[var(--brand-red-soft)] text-[var(--brand-red)]"
                        : isSpecial
                          ? "border-[var(--brand-red)]/40 bg-[var(--app-card)] text-foreground"
                          : "border-[var(--app-card-border)] bg-secondary/40 text-muted-foreground",
                    )}
                  >
                    <span className="text-[10px]">第 {i + 1} 天</span>
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        isSpecial && !done && "text-[var(--brand-red)]",
                      )}
                    >
                      {reward >= 1000
                        ? `${(reward / 1000).toFixed(reward % 1000 === 0 ? 0 : 1)}k`
                        : `+${reward}`}
                    </span>
                    {done && <Check className="h-3 w-3" />}
                  </div>
                );
              })}
            </div>
          </Card>
        </AnimatedSection>

        {/* 任务列表 */}
        <AnimatedSection>
          <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card)] p-0 shadow-none">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-bold text-foreground">日常任务</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  完成任务即可获得积分奖励
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {[...todayTasks, checkedIn ? "checkin" : ""].filter(Boolean).length}
                /{DAILY_TASKS.length}
              </span>
            </div>
            <div className="divide-y divide-[var(--app-card-border)] border-t border-[var(--app-card-border)]">
              {DAILY_TASKS.map((task) => {
                const done =
                  task.id === "checkin" ? checkedIn : todayTasks.has(task.id);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {task.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          +<span className="font-semibold text-[var(--brand-red)]">{task.reward}</span> 积分
                        </span>
                        <span>·</span>
                        <span>{task.desc}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={done || busyTaskId === task.id}
                      onClick={() => handleTask(task.id)}
                      className={cn(
                        "h-8 min-w-[68px] rounded-full text-xs font-semibold",
                        done
                          ? "bg-secondary text-muted-foreground hover:bg-secondary"
                          : "bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-hover)]",
                      )}
                    >
                      {busyTaskId === task.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : done ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          已完成
                        </>
                      ) : (
                        "去完成"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </AnimatedSection>

        {/* 看内容赚积分 */}
        <AnimatedSection className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">看内容赚积分</h2>
          </div>
          <StaggerList className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {earnContents.slice(0, 4).map((content) => {
              const done = todayTasks.has(content.id);
              return (
                <AnimatedItem key={content.id}>
                  <Card
                    onClick={() => handleEarn(content.id, content.app)}
                    className={cn(
                      "flex h-full cursor-pointer gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card)] p-0 shadow-none transition-colors",
                      done && "opacity-60",
                    )}
                  >
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-secondary">
                      <Play className="h-8 w-8 text-muted-foreground" />
                      <div className="absolute right-1.5 top-1.5 rounded bg-[var(--brand-red)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {done ? "已领" : `+${content.rewardPoints}`}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <div className="line-clamp-2 min-h-[36px] text-[12px] font-medium leading-[18px] text-foreground">
                        {content.title}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {content.subtitle}
                      </div>
                    </div>
                  </Card>
                </AnimatedItem>
              );
            })}
          </StaggerList>
        </AnimatedSection>

        {/* 邀请好友 */}
        <AnimatedSection>
          <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-[var(--app-card)] p-4 shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-red-soft)]">
                  <Gift className="h-4 w-4 text-[var(--brand-red)]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">邀请好友</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    已邀请 {referrals.length} 位好友 · 拉新最高返 100 积分
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => router.push("/invite")}
                className="h-8 rounded-full bg-[var(--brand-red)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-red-hover)]"
              >
                去邀请
              </Button>
            </div>
            {referrals.length > 0 && (
              <div className="mt-3 border-t border-[var(--app-card-border)] pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  最近邀请
                </div>
                <div className="space-y-1.5">
                  {referrals.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between text-xs"
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
          </Card>
        </AnimatedSection>
      </div>

      {/* 签到成功弹窗 */}
      <Dialog
        open={!!checkinResult}
        onOpenChange={(open) => !open && setCheckinResult(null)}
      >
        <DialogContent className="max-w-xs rounded-2xl border-[var(--app-card-border)] bg-[var(--app-card)] p-0">
          <div className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-red-soft)]">
              <CalendarCheck className="h-7 w-7 text-[var(--brand-red)]" />
            </div>
            <div className="mt-3 text-lg font-bold text-foreground">
              签到成功
            </div>
            <div className="mt-1 text-3xl font-extrabold text-[var(--brand-red)]">
              +{checkinResult?.reward ?? 0}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">积分已到账</div>

            <div className="mt-4 rounded-xl bg-secondary/50 px-3 py-2.5 text-xs text-foreground">
              连续签到第{" "}
              <span className="font-bold text-[var(--brand-red)]">
                {checkinResult?.dayIndex ?? 1}
              </span>{" "}
              / {checkinResult?.cycle ?? checkinCycle} 天
              {(checkinResult?.dayIndex ?? 0) < checkinCycle && (
                <div className="mt-1 text-muted-foreground">
                  明日奖励：
                  <span className="font-semibold text-[var(--brand-red)]">
                    +{checkinRewards[checkinResult?.dayIndex ?? 0] ?? 200} 积分
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={() => {
                  setCheckinResult(null);
                  router.push("/");
                }}
                className="h-9 w-full rounded-full bg-[var(--brand-red)] text-sm font-semibold text-white hover:bg-[var(--brand-red-hover)]"
              >
                逛好物兑换
              </Button>
              <Button
                variant="outline"
                onClick={() => setCheckinResult(null)}
                className="h-9 w-full rounded-full border-[var(--app-card-border)] text-sm"
              >
                去做任务
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
