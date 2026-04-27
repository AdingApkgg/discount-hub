import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/generated/prisma";
import { createTRPCRouter, protectedProcedure, publicProcedure, sensitiveProcedure } from "../init";
import { assertNotBlocked, recordFingerprint } from "@/lib/device-risk";

const FALLBACK_VIP_POINTS_PER_LEVEL = 500;
const FALLBACK_VIP_MAX_LEVEL = 10;
const FALLBACK_CHECKIN_REWARDS = [200, 3000, 300, 500, 800, 1200, 10000];
const FALLBACK_VIP_CHECKIN_BONUS: Record<string, number> = {
  "0": 0,
  "1": 0.05,
  "2": 0.10,
  "3": 0.15,
  "4": 0.20,
};
const FALLBACK_TASK_REWARDS: Record<string, number> = {
  browse: 100,
  purchase: 100,
  share: 80,
  c1: 30,
  c2: 30,
  c3: 40,
  c4: 50,
};
const FALLBACK_INVITE_VIP_BONUS: Record<string, number> = {
  "1": 300,
  "2": 200,
  "3": 200,
  "4": 100,
  "5": 100,
};

type IncentiveValues = {
  newUserBonusPoints: number;
  newUserBonusDays: number;
  newUserCheckinMulti: number;
  oldUserCheckinMulti: number;
  referralReward: number;
  refereeReward: number;
  streakBonusThreshold: number;
  checkinRewards: number[];
  vipCheckinBonusByLevel: Record<string, number>;
  vipPointsPerLevel: number;
  vipMaxLevel: number;
  taskRewards: Record<string, number>;
  inviteVipBonusByLevel: Record<string, number>;
};

const DEFAULT_INCENTIVE: IncentiveValues = {
  newUserBonusPoints: 500,
  newUserBonusDays: 7,
  newUserCheckinMulti: 2.0,
  oldUserCheckinMulti: 1.0,
  referralReward: 1000,
  refereeReward: 500,
  streakBonusThreshold: 3,
  checkinRewards: FALLBACK_CHECKIN_REWARDS,
  vipCheckinBonusByLevel: FALLBACK_VIP_CHECKIN_BONUS,
  vipPointsPerLevel: FALLBACK_VIP_POINTS_PER_LEVEL,
  vipMaxLevel: FALLBACK_VIP_MAX_LEVEL,
  taskRewards: FALLBACK_TASK_REWARDS,
  inviteVipBonusByLevel: FALLBACK_INVITE_VIP_BONUS,
};

type PrismaLike = Pick<PrismaClient, "incentiveConfig">;

function toIntArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const result = value
    .map((v) => (typeof v === "number" ? Math.round(v) : Number.NaN))
    .filter((v) => Number.isFinite(v) && v >= 0);
  return result.length ? result : fallback;
}

function toNumberMap(value: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : fallback;
}

export async function getActiveIncentive(
  db: PrismaLike,
): Promise<IncentiveValues> {
  const cfg = await db.incentiveConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!cfg) return DEFAULT_INCENTIVE;
  return {
    newUserBonusPoints: cfg.newUserBonusPoints,
    newUserBonusDays: cfg.newUserBonusDays,
    newUserCheckinMulti: cfg.newUserCheckinMulti,
    oldUserCheckinMulti: cfg.oldUserCheckinMulti,
    referralReward: cfg.referralReward,
    refereeReward: cfg.refereeReward,
    streakBonusThreshold: cfg.streakBonusThreshold,
    checkinRewards: toIntArray(cfg.checkinRewards, FALLBACK_CHECKIN_REWARDS),
    vipCheckinBonusByLevel: toNumberMap(cfg.vipCheckinBonusByLevel, FALLBACK_VIP_CHECKIN_BONUS),
    vipPointsPerLevel: cfg.vipPointsPerLevel ?? FALLBACK_VIP_POINTS_PER_LEVEL,
    vipMaxLevel: cfg.vipMaxLevel ?? FALLBACK_VIP_MAX_LEVEL,
    taskRewards: toNumberMap(cfg.taskRewards, FALLBACK_TASK_REWARDS),
    inviteVipBonusByLevel: toNumberMap(cfg.inviteVipBonusByLevel, FALLBACK_INVITE_VIP_BONUS),
  };
}

export function isNewUser(createdAt: Date, newUserBonusDays: number): boolean {
  const ageMs = Date.now() - createdAt.getTime();
  return ageMs < newUserBonusDays * 24 * 60 * 60 * 1000;
}

function computeVipLevel(points: number, pointsPerLevel: number, maxLevel: number) {
  return Math.min(maxLevel, Math.floor(points / Math.max(1, pointsPerLevel)));
}

function checkinReward(
  dayIndex: number,
  vipLevel: number,
  tierMulti: number,
  rewards: number[],
  bonusMap: Record<string, number>,
) {
  const idx = Math.max(0, Math.min(rewards.length - 1, dayIndex - 1));
  const base = rewards[idx];
  const bonusKey = String(vipLevel);
  const fallbackBonus = bonusMap[String(Math.max(0, ...Object.keys(bonusMap).map(Number)))] ?? 0;
  const bonus = bonusMap[bonusKey] ?? fallbackBonus;
  return Math.round(base * (1 + bonus) * tierMulti);
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function yesterdayStart() {
  const d = todayStart();
  d.setDate(d.getDate() - 1);
  return d;
}

export const pointsRouter = createTRPCRouter({
  /**
   * Public endpoint for invite-page tier display.
   * Returns the configured VIP-bonus tiers as a sorted array { level, label, bonus }.
   */
  getPublicInviteRewards: publicProcedure.query(async ({ ctx }) => {
    const incentive = await getActiveIncentive(ctx.prisma);
    return Object.entries(incentive.inviteVipBonusByLevel)
      .map(([level, bonus]) => ({
        level: Number(level),
        label: `VIP${level}`,
        bonus,
      }))
      .filter((t) => Number.isFinite(t.level) && t.level > 0)
      .sort((a, b) => a.level - b.level);
  }),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const incentive = await getActiveIncentive(ctx.prisma);
    const cycle = incentive.checkinRewards.length;

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { points: true, vipLevel: true },
    });

    const todayCheckin = await ctx.prisma.checkin.findFirst({
      where: { userId: ctx.user.id, checkedAt: { gte: todayStart() } },
    });

    const todayTasks = await ctx.prisma.taskCompletion.findMany({
      where: { userId: ctx.user.id, doneAt: { gte: todayStart() } },
      select: { taskId: true },
    });
    const todayTaskCounts: Record<string, number> = {};
    for (const t of todayTasks) {
      todayTaskCounts[t.taskId] = (todayTaskCounts[t.taskId] ?? 0) + 1;
    }

    const lastCheckin = await ctx.prisma.checkin.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { checkedAt: "desc" },
    });

    let nextDayIndex = 1;
    if (lastCheckin) {
      const wasYesterday =
        lastCheckin.checkedAt >= yesterdayStart() &&
        lastCheckin.checkedAt < todayStart();
      const wasToday = lastCheckin.checkedAt >= todayStart();
      if (wasToday) nextDayIndex = lastCheckin.dayIndex;
      else if (wasYesterday) {
        nextDayIndex = lastCheckin.dayIndex >= cycle
          ? 1
          : lastCheckin.dayIndex + 1;
      }
    }

    const currentPoints = user?.points ?? 0;
    const currentVip = user?.vipLevel ?? 0;
    const nextLevelPoints = (currentVip + 1) * incentive.vipPointsPerLevel;

    return {
      points: currentPoints,
      vipLevel: currentVip,
      vipPointsPerLevel: incentive.vipPointsPerLevel,
      vipMaxLevel: incentive.vipMaxLevel,
      checkinCycle: cycle,
      checkinRewards: incentive.checkinRewards,
      vipCheckinBonus: incentive.vipCheckinBonusByLevel,
      nextLevelPoints,
      checkedInToday: !!todayCheckin,
      nextDayIndex,
      todayTasks: Object.keys(todayTaskCounts),
      todayTaskCounts,
    };
  }),

  checkin: sensitiveProcedure.mutation(async ({ ctx }) => {
    await assertNotBlocked(ctx.prisma, ctx.risk);
    await recordFingerprint(ctx.prisma, ctx.user.id, ctx.risk);

    return ctx.prisma.$transaction(async (tx) => {
      const existing = await tx.checkin.findFirst({
        where: { userId: ctx.user.id, checkedAt: { gte: todayStart() } },
      });

      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "今日已签到" });
      }

      const incentive = await getActiveIncentive(tx);
      const cycle = incentive.checkinRewards.length;

      const lastCheckin = await tx.checkin.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { checkedAt: "desc" },
      });

      let dayIndex = 1;
      if (lastCheckin) {
        const wasYesterday =
          lastCheckin.checkedAt >= yesterdayStart() &&
          lastCheckin.checkedAt < todayStart();
        if (wasYesterday) {
          dayIndex = lastCheckin.dayIndex >= cycle
            ? 1
            : lastCheckin.dayIndex + 1;
        }
      }

      const currentUser = await tx.user.findUnique({
        where: { id: ctx.user.id },
        select: { vipLevel: true, points: true, createdAt: true },
      });
      const userIsNew = currentUser
        ? isNewUser(currentUser.createdAt, incentive.newUserBonusDays)
        : false;
      const tierMulti = userIsNew
        ? incentive.newUserCheckinMulti
        : incentive.oldUserCheckinMulti;
      const reward =
        userIsNew && !lastCheckin
          ? incentive.newUserBonusPoints
          : checkinReward(
              dayIndex,
              currentUser?.vipLevel ?? 0,
              tierMulti,
              incentive.checkinRewards,
              incentive.vipCheckinBonusByLevel,
            );

      await tx.checkin.create({
        data: { userId: ctx.user.id, dayIndex, reward },
      });

      const newPoints = (currentUser?.points ?? 0) + reward;
      let newVipLevel = computeVipLevel(newPoints, incentive.vipPointsPerLevel, incentive.vipMaxLevel);

      const streakThreshold = incentive.streakBonusThreshold;
      if (streakThreshold > 0 && dayIndex >= streakThreshold) {
        const streakBonus = Math.floor(dayIndex / streakThreshold);
        newVipLevel = Math.min(
          incentive.vipMaxLevel,
          Math.max(newVipLevel, (currentUser?.vipLevel ?? 0) + streakBonus),
        );
      }

      const user = await tx.user.update({
        where: { id: ctx.user.id },
        data: {
          points: { increment: reward },
          vipLevel: { set: newVipLevel },
        },
      });

      const leveledUp = newVipLevel > (currentUser?.vipLevel ?? 0);

      return { dayIndex, reward, points: user.points, cycle, leveledUp, newVipLevel };
    });
  }),

  listActiveTasks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.taskTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        taskId: true,
        title: true,
        description: true,
        type: true,
        targetCount: true,
        reward: true,
        icon: true,
      },
    });
  }),

  completeTask: sensitiveProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const incentive = await getActiveIncentive(ctx.prisma);
      const template = await ctx.prisma.taskTemplate.findUnique({
        where: { taskId: input.taskId },
        select: { reward: true, isActive: true, type: true, targetCount: true },
      });
      if (template && !template.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `任务已下线: ${input.taskId}`,
        });
      }
      const fullReward = template?.reward ?? incentive.taskRewards[input.taskId];
      if (fullReward === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `未知任务: ${input.taskId}`,
        });
      }
      const isCumulative = template?.type === "CUMULATIVE";
      const targetCount = isCumulative ? Math.max(1, template?.targetCount ?? 1) : 1;

      return ctx.prisma.$transaction(async (tx) => {
        const todayCount = await tx.taskCompletion.count({
          where: {
            userId: ctx.user.id,
            taskId: input.taskId,
            doneAt: { gte: todayStart() },
          },
        });

        if (todayCount >= targetCount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "今日已完成该任务",
          });
        }

        const newCount = todayCount + 1;
        const isFinalStep = newCount >= targetCount;
        const rewardThisCall = isFinalStep ? fullReward : 0;

        await tx.taskCompletion.create({
          data: {
            userId: ctx.user.id,
            taskId: input.taskId,
            reward: rewardThisCall,
          },
        });

        let resultPoints = ctx.user.points;
        if (rewardThisCall > 0) {
          const updatedUser = await tx.user.update({
            where: { id: ctx.user.id },
            data: {
              points: { increment: rewardThisCall },
              vipLevel: { set: computeVipLevel(
                ctx.user.points + rewardThisCall,
                incentive.vipPointsPerLevel,
                incentive.vipMaxLevel,
              ) },
            },
          });
          resultPoints = updatedUser.points;
        }

        return {
          taskId: input.taskId,
          reward: rewardThisCall,
          points: resultPoints,
          progress: newCount,
          target: targetCount,
          done: isFinalStep,
        };
      });
    }),
});
