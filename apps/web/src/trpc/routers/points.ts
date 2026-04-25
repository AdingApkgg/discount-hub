import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/generated/prisma";
import { createTRPCRouter, protectedProcedure, sensitiveProcedure } from "../init";

export const VIP_POINTS_PER_LEVEL = 500;
export const VIP_MAX_LEVEL = 10;

function computeVipLevel(points: number) {
  return Math.min(VIP_MAX_LEVEL, Math.floor(points / VIP_POINTS_PER_LEVEL));
}

const CHECKIN_REWARDS = [200, 3000, 300, 500, 800, 1200, 10000];
const CHECKIN_CYCLE = CHECKIN_REWARDS.length;

const VIP_CHECKIN_BONUS: Record<number, number> = {
  0: 0,
  1: 0.05,
  2: 0.10,
  3: 0.15,
  4: 0.20,
};

type IncentiveValues = {
  newUserBonusPoints: number;
  newUserBonusDays: number;
  newUserCheckinMulti: number;
  oldUserCheckinMulti: number;
  referralReward: number;
  refereeReward: number;
  streakBonusThreshold: number;
};

const DEFAULT_INCENTIVE: IncentiveValues = {
  newUserBonusPoints: 500,
  newUserBonusDays: 7,
  newUserCheckinMulti: 2.0,
  oldUserCheckinMulti: 1.0,
  referralReward: 1000,
  refereeReward: 500,
  streakBonusThreshold: 3,
};

type PrismaLike = Pick<PrismaClient, "incentiveConfig">;

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
  };
}

export function isNewUser(createdAt: Date, newUserBonusDays: number): boolean {
  const ageMs = Date.now() - createdAt.getTime();
  return ageMs < newUserBonusDays * 24 * 60 * 60 * 1000;
}

/** Server-authoritative task reward map – clients may NOT specify reward values */
const TASK_REWARDS: Record<string, number> = {
  browse: 100,
  purchase: 100,
  share: 80,
  c1: 30,
  c2: 30,
  c3: 40,
  c4: 50,
};

function checkinReward(dayIndex: number, vipLevel = 0, tierMulti = 1) {
  const base = CHECKIN_REWARDS[
    Math.max(0, Math.min(CHECKIN_REWARDS.length - 1, dayIndex - 1))
  ];
  const bonus = VIP_CHECKIN_BONUS[Math.min(vipLevel, 4)] ?? 0.25;
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
  getStatus: protectedProcedure.query(async ({ ctx }) => {
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
        nextDayIndex = lastCheckin.dayIndex >= CHECKIN_CYCLE
          ? 1
          : lastCheckin.dayIndex + 1;
      }
    }

    const currentPoints = user?.points ?? 0;
    const currentVip = user?.vipLevel ?? 0;
    const nextLevelPoints = (currentVip + 1) * VIP_POINTS_PER_LEVEL;

    return {
      points: currentPoints,
      vipLevel: currentVip,
      vipPointsPerLevel: VIP_POINTS_PER_LEVEL,
      vipMaxLevel: VIP_MAX_LEVEL,
      checkinCycle: CHECKIN_CYCLE,
      checkinRewards: CHECKIN_REWARDS,
      vipCheckinBonus: VIP_CHECKIN_BONUS,
      nextLevelPoints,
      checkedInToday: !!todayCheckin,
      nextDayIndex,
      todayTasks: Object.keys(todayTaskCounts),
      todayTaskCounts,
    };
  }),

  checkin: sensitiveProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.$transaction(async (tx) => {
      // Check inside transaction to prevent race conditions
      const existing = await tx.checkin.findFirst({
        where: { userId: ctx.user.id, checkedAt: { gte: todayStart() } },
      });

      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "今日已签到" });
      }

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
          dayIndex = lastCheckin.dayIndex >= CHECKIN_CYCLE
            ? 1
            : lastCheckin.dayIndex + 1;
        }
      }

      const currentUser = await tx.user.findUnique({
        where: { id: ctx.user.id },
        select: { vipLevel: true, points: true, createdAt: true },
      });
      const incentive = await getActiveIncentive(tx);
      const userIsNew = currentUser
        ? isNewUser(currentUser.createdAt, incentive.newUserBonusDays)
        : false;
      const tierMulti = userIsNew
        ? incentive.newUserCheckinMulti
        : incentive.oldUserCheckinMulti;
      const reward =
        userIsNew && !lastCheckin
          ? incentive.newUserBonusPoints
          : checkinReward(dayIndex, currentUser?.vipLevel ?? 0, tierMulti);

      await tx.checkin.create({
        data: { userId: ctx.user.id, dayIndex, reward },
      });

      const newPoints = (currentUser?.points ?? 0) + reward;
      let newVipLevel = computeVipLevel(newPoints);

      const streakThreshold = incentive.streakBonusThreshold;
      if (streakThreshold > 0 && dayIndex >= streakThreshold) {
        const streakBonus = Math.floor(dayIndex / streakThreshold);
        newVipLevel = Math.min(VIP_MAX_LEVEL, Math.max(newVipLevel, (currentUser?.vipLevel ?? 0) + streakBonus));
      }

      const user = await tx.user.update({
        where: { id: ctx.user.id },
        data: {
          points: { increment: reward },
          vipLevel: { set: newVipLevel },
        },
      });

      const leveledUp = newVipLevel > (currentUser?.vipLevel ?? 0);

      return { dayIndex, reward, points: user.points, cycle: CHECKIN_CYCLE, leveledUp, newVipLevel };
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
      const fullReward = template?.reward ?? TASK_REWARDS[input.taskId];
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
              vipLevel: { set: computeVipLevel(ctx.user.points + rewardThisCall) },
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
