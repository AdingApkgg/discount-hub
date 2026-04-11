"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Check,
  Crown,
  Eye,
  Loader2,
  Play,
  Share2,
  ShoppingCart,
  Sparkles,
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

type PointsStatus = RouterOutputs["points"]["getStatus"];
type UserProfile = RouterOutputs["user"]["me"];
type OrderRecord = RouterOutputs["order"]["myOrders"][number];

const surfaceClassName =
  "gap-0 rounded-[28px] border border-[var(--app-card-border)] bg-[var(--app-card)] py-0 shadow-[var(--app-card-shadow)]";

const CHECKIN_REWARDS = [200, 3000, 300, 500];
const VIP_BENEFITS: Record<number, string[]> = {
  0: ["基础兑换"],
  1: ["基础兑换", "每日签到奖励"],
  2: ["全部 VIP1", "限时折扣"],
  3: ["全部 VIP2", "优先购资格", "专属折扣"],
  4: ["全部 VIP3", "抢先看", "双倍积分日"],
};

function buildVipTiers(pointsPerLevel: number, maxLevel: number) {
  const tiers = [];
  const displayMax = Math.min(maxLevel, Math.max(4, maxLevel));
  for (let i = 0; i <= displayMax; i++) {
    tiers.push({
      level: i,
      name: i === 0 ? "普通会员" : `VIP${i}`,
      minPoints: i * pointsPerLevel,
      benefits: VIP_BENEFITS[i] ?? [`全部 VIP${i - 1}`, "更多特权"],
    });
  }
  return tiers;
}

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

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 md:items-center">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
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

export default function MemberPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

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

  const vipTiers = useMemo(
    () => buildVipTiers(status?.vipPointsPerLevel ?? 500, status?.vipMaxLevel ?? 10),
    [status?.vipPointsPerLevel, status?.vipMaxLevel],
  );

  const checkedIn = status?.checkedInToday ?? false;
  const nextDayIndex = status?.nextDayIndex ?? 1;
  const completedCheckinDays = checkedIn
    ? nextDayIndex
    : Math.max(0, nextDayIndex - 1);
  const currentTier = getCurrentTier(profile, vipTiers);
  const nextTier = getNextTier(profile, vipTiers);
  const points = profile?.points ?? status?.points ?? 0;
  const remainingPoints = Math.max(0, nextTier.minPoints - points);
  const progressPct =
    nextTier.level === currentTier.level
      ? 100
      : Math.min(
          100,
          ((points - currentTier.minPoints) /
            (nextTier.minPoints - currentTier.minPoints)) *
            100,
        );
  const completedTaskCount = DAILY_TASKS.filter((task) =>
    task.id === "checkin" ? checkedIn : todayTasks.has(task.id),
  ).length;
  const hasPaidOrderToday = useMemo(
    () =>
      orders.some(
        (order) => order.status === "PAID" && isToday(order.paidAt ?? order.createdAt),
      ),
    [orders],
  );
  const isLoading = loadingStatus || loadingProfile;

  async function refreshAll() {
    await queryClient.invalidateQueries();
  }

  async function runTask(taskId: string, displayReward: number) {
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
      toast.success(`签到成功！+${result.reward} 积分`, {
        description: `连续签到第 ${result.dayIndex} 天`,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "签到失败");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleTask(taskId: (typeof DAILY_TASKS)[number]["id"], reward: number) {
    if (taskId === "checkin") {
      await handleCheckin();
      return;
    }

    if (taskId === "browse") {
      openApp("抖音");
      await runTask(taskId, reward);
      return;
    }

    if (taskId === "share") {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        toast.error("复制分享链接失败");
        return;
      }
      await runTask(taskId, reward);
      return;
    }

    if (taskId === "purchase") {
      if (todayTasks.has("purchase")) return;

      if (!hasPaidOrderToday) {
        toast.info("今天还没有完成兑换，先去首页挑个商品吧");
        router.push("/");
        return;
      }

      await runTask(taskId, reward);
    }
  }

  async function handleEarn(id: string, app: string, rewardPoints: number) {
    if (todayTasks.has(id) || busyTaskId === id) return;
    openApp(app);
    await runTask(id, rewardPoints);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
      <section className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
            Member Center
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
            会员中心
          </h1>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-[var(--app-card-border)] bg-[var(--app-card)] px-4 text-[var(--app-strong)] shadow-sm hover:bg-[var(--app-soft)]"
            >
              <Crown className="h-4 w-4" />
              VIP 等级
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-[28px] border border-[var(--app-card-border)] bg-[var(--app-card)] p-0 text-[var(--app-heading)] shadow-[var(--app-card-shadow)]">
            <DialogHeader className="border-b border-slate-200 px-6 py-5">
              <DialogTitle>VIP 等级体系</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 px-6 py-5">
              {vipTiers.map((tier) => (
                <Card
                  key={tier.level}
                  className={`gap-0 rounded-3xl border py-0 ${
                    tier.level === (profile?.vipLevel ?? 0)
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{tier.name}</div>
                        <div
                          className={`mt-1 text-xs ${
                            tier.level === (profile?.vipLevel ?? 0)
                              ? "text-white/70"
                              : "text-slate-500"
                          }`}
                        >
                          需要 {tier.minPoints} 积分
                        </div>
                      </div>
                      {tier.level === (profile?.vipLevel ?? 0) ? (
                        <Badge className="bg-white text-slate-900 hover:bg-white">
                          当前等级
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tier.benefits.map((benefit) => (
                        <Badge
                          key={benefit}
                          variant="outline"
                          className={`rounded-full ${
                            tier.level === (profile?.vipLevel ?? 0)
                              ? "border-white/20 bg-white/10 text-white"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </section>

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
                <Progress value={progressPct} className="mt-3 h-2 bg-white/15" />
                <div className="mt-4 flex flex-wrap gap-2">
                  {currentTier.benefits.map((benefit) => (
                    <Badge
                      key={benefit}
                      variant="outline"
                      className="rounded-full border-white/15 bg-white/10 text-white"
                    >
                      {benefit}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {[
            {
              label: "连续签到",
              value: `${completedCheckinDays} 天`,
              hint: "第 2 天奖励 3000 积分",
            },
            {
              label: "今日任务",
              value: `${completedTaskCount}/${DAILY_TASKS.length}`,
              hint: "做完可稳定攒积分",
            },
            {
              label: "当前等级",
              value: currentTier.name,
              hint: "会员等级越高权益越多",
            },
            {
              label: "距离升级",
              value: `${remainingPoints.toLocaleString("zh-CN")} 分`,
              hint: `下一档 ${nextTier.name}`,
            },
          ].map((item) => (
            <Card key={item.label} className={surfaceClassName}>
              <CardContent className="p-4">
                <div className="text-xs text-slate-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">
                  {item.value}
                </div>
                <div className="mt-1 text-xs text-slate-400">{item.hint}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className={surfaceClassName}>
        <CardContent className="p-5 md:p-6">
          <SectionHeading
            title="连续签到"
            subtitle="连续签到奖励递增，签到越稳，兑换越轻松。"
            action={
              <Button
                onClick={handleCheckin}
                disabled={checkedIn || busyTaskId === "checkin"}
                className="rounded-full px-4"
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

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {CHECKIN_REWARDS.map((reward, index) => {
              const done = index < completedCheckinDays;

              return (
                <div
                  key={reward}
                  className={`rounded-[22px] border px-3 py-4 text-center ${
                    done
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                >
                  <div className={`text-xs ${done ? "text-white/60" : "text-slate-500"}`}>
                    第 {index + 1} 天
                  </div>
                  <div className="mt-2 text-base font-semibold">+{reward}</div>
                  <div className="mt-2 flex justify-center">
                    {done ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className={surfaceClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="日常积分任务"
              subtitle="保持轻量，围绕签到、浏览、分享和购买四个动作。"
            />
            <div className="mt-5 grid gap-3">
              {DAILY_TASKS.map((task) => {
                const done =
                  task.id === "checkin" ? checkedIn : todayTasks.has(task.id);
                const Icon = task.icon;

                return (
                  <div
                    key={task.id}
                    className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                        <Icon className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {task.title}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {task.desc} · +{task.reward} 积分
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={done ? "secondary" : "default"}
                      disabled={done || busyTaskId === task.id}
                      onClick={() => handleTask(task.id, task.reward)}
                      className={
                        done
                          ? "rounded-full bg-slate-200 text-slate-500 hover:bg-slate-200"
                          : "rounded-full"
                      }
                    >
                      {busyTaskId === task.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          提交中
                        </>
                      ) : done ? (
                        <>
                          <Check className="h-4 w-4" />
                          已完成
                        </>
                      ) : task.id === "purchase" && !hasPaidOrderToday ? (
                        "去兑换"
                      ) : (
                        "去完成"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className={surfaceClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="看内容赚积分"
              subtitle="桌面端改成独立侧栏卡片，更适合横屏浏览。"
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {earnContents.map((content) => {
                const done = todayTasks.has(content.id);

                return (
                  <button
                    key={content.id}
                    type="button"
                    onClick={() =>
                      handleEarn(content.id, content.app, content.rewardPoints)
                    }
                    className="overflow-hidden rounded-[24px] border border-[var(--app-card-border)] bg-[var(--app-card)] text-left shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:bg-[var(--app-soft)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex h-24 items-center justify-center bg-[linear-gradient(135deg,#111827_0%,#374151_100%)]">
                      <Play className="h-8 w-8 text-white/60" />
                    </div>
                    <div className="p-4">
                      <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {content.title}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                          {content.subtitle}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            done
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {busyTaskId === content.id
                            ? "领取中"
                            : done
                              ? "已领"
                              : `+${content.rewardPoints}`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
