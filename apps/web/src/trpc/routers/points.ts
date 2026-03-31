import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";

const CHECKIN_REWARDS = [200, 3000, 300, 500];

function checkinReward(dayIndex: number) {
  return CHECKIN_REWARDS[
    Math.max(0, Math.min(CHECKIN_REWARDS.length - 1, dayIndex - 1))
  ];
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
      else if (wasYesterday)
        nextDayIndex = Math.min(4, lastCheckin.dayIndex + 1);
    }

    return {
      points: user?.points ?? 0,
      vipLevel: user?.vipLevel ?? 0,
      checkedInToday: !!todayCheckin,
      nextDayIndex,
      todayTasks: todayTasks.map((t) => t.taskId),
    };
  }),

  checkin: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.prisma.checkin.findFirst({
      where: { userId: ctx.user.id, checkedAt: { gte: todayStart() } },
    });

    if (existing) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "今日已签到" });
    }

    const lastCheckin = await ctx.prisma.checkin.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { checkedAt: "desc" },
    });

    let dayIndex = 1;
    if (lastCheckin) {
      const wasYesterday =
        lastCheckin.checkedAt >= yesterdayStart() &&
        lastCheckin.checkedAt < todayStart();
      if (wasYesterday) dayIndex = Math.min(4, lastCheckin.dayIndex + 1);
    }

    const reward = checkinReward(dayIndex);

    await ctx.prisma.$transaction([
      ctx.prisma.checkin.create({
        data: { userId: ctx.user.id, dayIndex, reward },
      }),
      ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          points: { increment: reward },
          vipLevel: {
            set: Math.min(
              10,
              Math.floor((ctx.user.points + reward) / 500),
            ),
          },
        },
      }),
    ]);

    return { dayIndex, reward };
  }),

  completeTask: protectedProcedure
    .input(z.object({ taskId: z.string(), reward: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.taskCompletion.findFirst({
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

      await ctx.prisma.$transaction([
        ctx.prisma.taskCompletion.create({
          data: {
            userId: ctx.user.id,
            taskId: input.taskId,
            reward: input.reward,
          },
        }),
        ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: { points: { increment: input.reward } },
        }),
      ]);

      return { taskId: input.taskId, reward: input.reward };
    }),
});
