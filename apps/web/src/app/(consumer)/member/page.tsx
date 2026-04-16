"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Check,
  ChevronRight,
  Crown,
  Eye,
  Gift,
  Loader2,
  Play,
  Share2,
  ShoppingCart,
  Sparkles,
  Trophy,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  appCardClassName,
  SectionHeading,
  PageHeading,
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

type PointsStatus = RouterOutputs["points"]["getStatus"];
type UserProfile = RouterOutputs["user"]["me"];
type OrderRecord = RouterOutputs["order"]["myOrders"][number];

const VIP_BENEFITS: Record<number, string[]> = {
  0: ["基础兑换"],
  1: ["基础兑换", "每日签到奖励 +5%"],
  2: ["全部 VIP1", "签到奖励 +10%", "限时折扣"],
  3: ["全部 VIP2", "签到奖励 +15%", "优先购资格", "专属折扣"],
  4: ["全部 VIP3", "签到奖励 +20%", "抢先看", "双倍积分日"],
};

const DAILY_TASKS = [
  { id: "checkin", title: "每日签到", desc: "每日首次签到", reward: 200, icon: CalendarCheck },
  { id: "browse", title: "浏览抖音 50 秒", desc: "去 APP 浏览 50 秒", reward: 100, icon: Eye },
  {
    id: "purchase",
    title: "完成一次兑换",
    desc: "完成任意商品购买",
    reward: 100,
    icon: ShoppingCart,
  },
  {
    id: "share",
    title: "分享权益到好友",
    desc: "复制当前页面给好友",
    reward: 80,
    icon: Share2,
  },
] as const;

function buildVipTiers(pointsPerLevel: number, maxLevel: number) {
  const tiers = [];
  const displayMax = Math.min(maxLevel, Math.max(4, maxLevel));
  for (let i = 0; i <= displayMax; i++) {
    tiers.push({
      level: i,
      name: i === 0 ? "普通会员" : `VIP${i}`,
      minPoints: i * pointsPerLevel,
      benefits: VIP_BENEFITS[i] ?? [`全部 VIP${i - 1}`, `签到奖励 +${Math.min(i * 5, 25)}%`, "更多特权"],
    });
  }
  return tiers;
}

function getCurrentTier(profile: UserProfile | undefined, vipTiers: ReturnType<typeof buildVipTiers>) {
  const level = Math.min(profile?.vipLevel ?? 0, vipTiers.length - 1);
  return vipTiers[level] ?? vipTiers[0];
}

function getNextTier(profile: UserProfile | undefined, vipTiers: ReturnType<typeof buildVipTiers>) {
  const level = Math.min((profile?.vipLevel ?? 0) + 1, vipTiers.length - 1);
  return vipTiers[level] ?? vipTiers[vipTiers.length - 1];
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
    <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Skeleton className="h-64 rounded-[30px]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[28px]" />
          ))}
        </div>
      </div>
      <Skeleton className="h-48 rounded-[28px]" />
    </div>
  );
}

export default function MemberPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [checkinResult, setCheckinResult] = useState<{ reward: number; dayIndex: number; cycle: number } | null>(null);

  const { data: statusData, isLoading: loadingStatus } = useQuery(
    trpc.points.getStatus.queryOptions(),
  );
  const { data: profileData, isLoading: loadingProfile } = useQuery(
    trpc.user.me.queryOptions(),
  );
  const { data: ordersData } = useQuery(trpc.order.myOrders.queryOptions());

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
  const todayTasks = new Set(status?.todayTasks ?? []);

  const checkinRewards = status?.checkinRewards ?? [200, 3000, 300, 500, 800, 1200, 10000];
  const checkinCycle = status?.checkinCycle ?? 7;

  const vipTiers = useMemo(
    () => buildVipTiers(status?.vipPointsPerLevel ?? 500, status?.vipMaxLevel ?? 10),
    [status?.vipPointsPerLevel, status?.vipMaxLevel],
  );

  const checkedIn = status?.checkedInToday ?? false;
  const nextDayIndex = status?.nextDayIndex ?? 1;
  const completedCheckinDays = checkedIn ? nextDayIndex : Math.max(0, nextDayIndex - 1);
  const currentTier = getCurrentTier(profile, vipTiers);
  const nextTier = getNextTier(profile, vipTiers);
  const points = profile?.points ?? status?.points ?? 0;
  const remainingPoints = Math.max(0, nextTier.minPoints - points);
  const progressPct =
    nextTier.level === currentTier.level
      ? 100
      : Math.min(100, ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100);
  const completedTaskCount = DAILY_TASKS.filter((task) =>
    task.id === "checkin" ? checkedIn : todayTasks.has(task.id),
  ).length;
  const taskProgressPct = Math.round((completedTaskCount / DAILY_TASKS.length) * 100);
  const hasPaidOrderToday = useMemo(
    () => orders.some((order) => order.status === "PAID" && isToday(order.paidAt ?? order.createdAt)),
    [orders],
  );
  const totalCheckinCycleReward = checkinRewards.reduce((a, b) => a + b, 0);
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
      setCheckinResult({ reward: result.reward, dayIndex: result.dayIndex, cycle: result.cycle });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "签到失败");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleTask(taskId: (typeof DAILY_TASKS)[number]["id"]) {
    if (taskId === "checkin") { await handleCheckin(); return; }
    if (taskId === "browse") { openApp("抖音"); await runTask(taskId); return; }
    if (taskId === "share") {
      try { await navigator.clipboard.writeText(window.location.href); } catch { toast.error("复制分享链接失败"); return; }
      await runTask(taskId);
      return;
    }
    if (taskId === "purchase") {
      if (todayTasks.has("purchase")) return;
      if (!hasPaidOrderToday) { toast.info("今天还没有完成兑换，先去首页挑个商品吧"); router.push("/"); return; }
      await runTask(taskId);
    }
  }

  async function handleEarn(id: string, app: string) {
    if (todayTasks.has(id) || busyTaskId === id) return;
    openApp(app);
    await runTask(id);
  }

  if (isLoading) return <MemberSkeleton />;

  const vipBonusPct = status?.vipCheckinBonus
    ? Math.round((status.vipCheckinBonus[Math.min(profile?.vipLevel ?? 0, 4)] ?? 0) * 100)
    : 0;

  return (
    <PageTransition>
    <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
      <AnimatedItem>
      <PageHeading
        label="Member Center"
        title={<>会员中心 · <span className="text-primary">{points.toLocaleString("zh-CN")} 积分</span></>}
        action={
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-[var(--app-card-border)] bg-[var(--app-card)] px-4 text-foreground shadow-sm hover:bg-secondary"
              >
                <Crown className="h-4 w-4" />
                VIP 等级
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[28px] border-border bg-background p-0">
              <DialogHeader className="border-b border-border px-6 py-5">
                <DialogTitle>VIP 等级体系</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">签到奖励权重 &gt; 会员等级加成，签到是积分的核心来源</p>
              </DialogHeader>
              <div className="space-y-3 px-6 py-5">
                {vipTiers.map((tier) => {
                  const isCurrent = tier.level === (profile?.vipLevel ?? 0);
                  return (
                    <Card
                      key={tier.level}
                      className={`gap-0 rounded-3xl border py-0 ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/50 text-foreground"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">{tier.name}</div>
                            <div className={`mt-1 text-xs ${isCurrent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              需要 {tier.minPoints} 积分
                            </div>
                          </div>
                          {isCurrent && (
                            <Badge className="bg-background text-foreground hover:bg-background">
                              当前等级
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tier.benefits.map((benefit) => (
                            <Badge
                              key={benefit}
                              variant="outline"
                              className={`rounded-full ${
                                isCurrent
                                  ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground"
                              }`}
                            >
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      </AnimatedItem>

      <AnimatedItem>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <Card className="overflow-hidden rounded-[30px] border border-[var(--app-hero-border)] bg-[var(--app-hero-bg)] py-0 text-white shadow-[var(--app-hero-shadow)]">
          <CardContent className="relative p-5 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,45,85,0.2),transparent_36%)]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-white/60">当前等级</div>
                  <div className="mt-2 text-[30px] font-semibold leading-none md:text-[40px]">
                    {currentTier.name}
                  </div>
                  {vipBonusPct > 0 && (
                    <Badge className="mt-2 bg-white/12 text-xs text-white hover:bg-white/12">
                      签到奖励 +{vipBonusPct}%
                    </Badge>
                  )}
                </div>
                <div className="rounded-[22px] bg-white/10 px-4 py-3 text-right backdrop-blur">
                  <div className="text-xs text-white/60">当前积分</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {points.toLocaleString("zh-CN")}
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-[24px] bg-white/8 p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-3 text-xs text-white/70">
                  <span>距离 {nextTier.name}</span>
                  <span>还差 {remainingPoints.toLocaleString("zh-CN")} 积分</span>
                </div>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                  style={{ transformOrigin: "left" }}
                >
                <Progress value={progressPct} className="mt-3 h-2 bg-white/15" />
                </motion.div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {currentTier.benefits.map((benefit) => (
                    <Badge key={benefit} variant="outline" className="rounded-full border-white/15 bg-white/10 text-white">
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <StaggerList className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <AnimatedItem><StatCard label="连续签到" value={`${completedCheckinDays} / ${checkinCycle} 天`} hint={completedCheckinDays >= checkinCycle ? "恭喜完成一轮！明天开始新周期" : `第 ${checkinCycle} 天奖励 ${checkinRewards[checkinCycle - 1].toLocaleString("zh-CN")} 积分`} /></AnimatedItem>
          <AnimatedItem>
            <Card className={appCardClassName}>
              <CardContent className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">今日任务</div>
                  <div className="text-lg font-semibold text-foreground">{completedTaskCount}/{DAILY_TASKS.length}</div>
                </div>
                <Progress value={taskProgressPct} className="mt-2 h-1.5" />
                <div className="mt-2 text-xs text-muted-foreground">
                  {completedTaskCount >= DAILY_TASKS.length ? "全部完成，明天继续！" : "做完可稳定攒积分"}
                </div>
              </CardContent>
            </Card>
          </AnimatedItem>
          <AnimatedItem><StatCard label="当前等级" value={currentTier.name} hint="会员等级越高，签到奖励加成越多" /></AnimatedItem>
          <AnimatedItem><StatCard label="距离升级" value={`${remainingPoints.toLocaleString("zh-CN")} 分`} hint={`下一档 ${nextTier.name}`} /></AnimatedItem>
        </StaggerList>
      </section>
      </AnimatedItem>

      {/* 兑换引导入口 */}
      <AnimatedItem>
        <Card className={`${appCardClassName} cursor-pointer`} onClick={() => router.push("/")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    用积分去兑换 · <span className="text-primary">{points.toLocaleString("zh-CN")} 积分可用</span>
                  </div>
                  <div className="text-xs text-muted-foreground">浏览 0 元兑专区和限时神券，积分即刻抵现</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </AnimatedItem>

      <AnimatedSection>
      <Card className={appCardClassName}>
        <CardContent className="p-5 md:p-6">
          <SectionHeading
            title={<>连续签到 · <span className="text-primary">7 天可得 {totalCheckinCycleReward.toLocaleString("zh-CN")} 积分</span></>}
            subtitle="连续签到奖励递增，第 7 天获得 10,000 积分大奖！签到是最核心的积分来源。"
            action={
              <Button
                onClick={handleCheckin}
                disabled={checkedIn || busyTaskId === "checkin"}
                className="rounded-full px-5"
              >
                {busyTaskId === "checkin" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : checkedIn ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <CalendarCheck className="h-4 w-4" />
                )}
                {checkedIn ? "今日已签到" : "立即签到"}
              </Button>
            }
          />
          <StaggerList className="mt-5 grid grid-cols-4 gap-2.5 sm:grid-cols-7">
            {checkinRewards.map((reward, index) => {
              const done = index < completedCheckinDays;
              const isSpecial = index === checkinCycle - 1;
              return (
                <AnimatedItem key={index}>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Card
                  className={`gap-0 rounded-[22px] border py-0 text-center ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : isSpecial
                        ? "border-primary/50 bg-primary/5 text-foreground"
                        : "border-border bg-secondary/50 text-foreground"
                  }`}
                >
                  <CardContent className="px-2 py-4">
                    <div className={`text-xs ${done ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      第 {index + 1} 天
                    </div>
                    <div className={`mt-2 text-sm font-semibold ${isSpecial && !done ? "text-primary" : ""}`}>
                      {reward >= 1000 ? `${(reward / 1000).toFixed(reward % 1000 === 0 ? 0 : 1)}k` : `+${reward}`}
                    </div>
                    <div className="mt-2 flex justify-center">
                      {done ? (
                        <Check className="h-4 w-4" />
                      ) : isSpecial ? (
                        <Trophy className="h-4 w-4 text-primary" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
                </AnimatedItem>
              );
            })}
          </StaggerList>
        </CardContent>
      </Card>
      </AnimatedSection>

      <AnimatedSection className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="日常积分任务"
              subtitle={`完成进度 ${completedTaskCount}/${DAILY_TASKS.length} — 保持轻量，围绕签到、浏览、分享和购买四个动作。`}
            />
            <Progress value={taskProgressPct} className="mt-3 mb-5 h-1.5" />
            <StaggerList className="grid gap-3">
              {DAILY_TASKS.map((task) => {
                const done = task.id === "checkin" ? checkedIn : todayTasks.has(task.id);
                const Icon = task.icon;
                return (
                  <AnimatedItem key={task.id}>
                  <motion.div
                    className="flex flex-col gap-3 rounded-[24px] border border-border bg-secondary/50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                    whileHover={{ scale: 1.01, y: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${done ? "bg-primary/10" : "bg-background"}`}>
                        <Icon className={`h-5 w-5 ${done ? "text-primary" : "text-foreground"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {task.title}
                          {done && <Check className="ml-1.5 inline h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {task.desc} · <span className="font-medium text-primary">+{task.reward} 积分</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={done ? "secondary" : "default"}
                      disabled={done || busyTaskId === task.id}
                      onClick={() => handleTask(task.id)}
                      className="rounded-full"
                    >
                      {busyTaskId === task.id ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />提交中</>
                      ) : done ? (
                        <><Check className="h-4 w-4" />已完成</>
                      ) : task.id === "purchase" && !hasPaidOrderToday ? (
                        "去兑换"
                      ) : (
                        "去完成"
                      )}
                    </Button>
                  </motion.div>
                  </AnimatedItem>
                );
              })}
            </StaggerList>
          </CardContent>
        </Card>

        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading title="看内容赚积分" subtitle="浏览指定内容即可获得额外积分奖励。" />
            <StaggerList className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {earnContents.map((content) => {
                const done = todayTasks.has(content.id);
                return (
                  <AnimatedItem key={content.id}>
                  <HoverScale>
                  <Card
                    className="cursor-pointer gap-0 overflow-hidden rounded-[24px] border-[var(--app-card-border)] py-0 shadow-sm"
                    onClick={() => handleEarn(content.id, content.app)}
                  >
                    <div className="flex aspect-square items-center justify-center bg-[linear-gradient(135deg,#111827_0%,#374151_100%)]">
                      <Play className="h-10 w-10 text-white/60" />
                    </div>
                    <CardContent className="p-4">
                      <div className="line-clamp-2 text-sm font-semibold text-foreground">
                        {content.title}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="rounded-full text-[11px]">
                          {content.subtitle}
                        </Badge>
                        <Badge
                          className={`rounded-full text-[11px] ${
                            done
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {busyTaskId === content.id ? "领取中" : done ? "已领" : `+${content.rewardPoints}`}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  </HoverScale>
                  </AnimatedItem>
                );
              })}
            </StaggerList>
          </CardContent>
        </Card>
      </AnimatedSection>
    </div>

    <Dialog open={!!checkinResult} onOpenChange={(open) => !open && setCheckinResult(null)}>
      <DialogContent className="max-w-sm rounded-[28px] border-border bg-background p-0">
        <div className="p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CalendarCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="mt-4 text-xl font-bold text-foreground">签到成功！</div>
          <div className="mt-2 text-3xl font-bold text-primary">+{checkinResult?.reward ?? 0}</div>
          <div className="text-sm text-muted-foreground">积分已到账</div>
          {vipBonusPct > 0 && (
            <div className="mt-1 text-xs text-primary/70">含 VIP{profile?.vipLevel} 签到加成 +{vipBonusPct}%</div>
          )}
          <div className="mt-3 rounded-2xl bg-secondary/50 px-4 py-3">
            <div className="text-sm text-foreground">
              连续签到第 <span className="font-bold text-primary">{checkinResult?.dayIndex ?? 1}</span> / {checkinResult?.cycle ?? checkinCycle} 天
            </div>
            {(checkinResult?.dayIndex ?? 0) < checkinCycle && (
              <div className="mt-1 text-xs text-muted-foreground">
                明日签到奖励：+{checkinRewards[checkinResult?.dayIndex ?? 0] ?? 200} 积分
              </div>
            )}
            {(checkinResult?.dayIndex ?? 0) >= checkinCycle && (
              <div className="mt-1 text-xs text-primary font-medium">
                恭喜完成 {checkinCycle} 天连续签到！明天开始新一轮
              </div>
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setCheckinResult(null)}
            >
              知道了
            </Button>
            <Button
              className="flex-1 rounded-full"
              onClick={() => {
                setCheckinResult(null);
                window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
              }}
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
