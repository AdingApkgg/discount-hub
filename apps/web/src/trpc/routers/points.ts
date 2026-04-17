import { z } from "zod";
import { TRPCError } from "@trpc/server";
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

function checkinReward(dayIndex: number, vipLevel = 0) {
  const base = CHECKIN_REWARDS[
    Math.max(0, Math.min(CHECKIN_REWARDS.length - 1, dayIndex - 1))
  ];
  const bonus = VIP_CHECKIN_BONUS[Math.min(vipLevel, 4)] ?? 0.25;
  return Math.round(base * (1 + bonus));
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
    });

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
      todayTasks: todayTasks.map((t) => t.taskId),
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
        select: { vipLevel: true, points: true },
      });
      const reward = checkinReward(dayIndex, currentUser?.vipLevel ?? 0);

      await tx.checkin.create({
        data: { userId: ctx.user.id, dayIndex, reward },
      });

      const newPoints = (currentUser?.points ?? 0) + reward;
      let newVipLevel = computeVipLevel(newPoints);

      const STREAK_BONUS_THRESHOLD = 3;
      if (dayIndex >= STREAK_BONUS_THRESHOLD) {
        const streakBonus = Math.floor(dayIndex / STREAK_BONUS_THRESHOLD);
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

  completeTask: sensitiveProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reward = TASK_REWARDS[input.taskId];
      if (reward === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `未知任务: ${input.taskId}`,
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        const existing = await tx.taskCompletion.findFirst({
          where: {
            userId: ctx.user.id,
            taskId: input.taskId,
            doneAt: { gte: todayStart() },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "今日已完成该任务",
          });
        }

        await tx.taskCompletion.create({
          data: {
            userId: ctx.user.id,
            taskId: input.taskId,
            reward,
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: ctx.user.id },
          data: {
            points: { increment: reward },
            vipLevel: { set: computeVipLevel(ctx.user.points + reward) },
          },
        });

        return { taskId: input.taskId, reward, points: updatedUser.points };
      });
    }),
});
