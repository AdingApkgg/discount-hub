import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../init";

type NoticeAudience = "ALL" | "CONSUMER" | "MERCHANT" | "AGENT" | "ADMIN";

function audienceFor(role: string | undefined): NoticeAudience[] {
  const base: NoticeAudience[] = ["ALL"];
  if (role === "CONSUMER") return [...base, "CONSUMER"];
  if (role === "MERCHANT") return [...base, "MERCHANT"];
  if (role === "AGENT") return [...base, "AGENT"];
  if (role === "ADMIN") return [...base, "ADMIN", "MERCHANT", "AGENT", "CONSUMER"];
  return base;
}

function activeWindow() {
  const now = new Date();
  return {
    isActive: true,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };
}

export const noticeRouter = createTRPCRouter({
  /** 活跃公告（匿名与登录用户都可看，但受众过滤角色） */
  listActive: publicProcedure.query(async ({ ctx }) => {
    const role = (ctx.user as { role?: string } | null)?.role;
    const audience = audienceFor(role);
    const notices = await ctx.prisma.systemNotice.findMany({
      where: {
        ...activeWindow(),
        audience: { in: audience },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    // 已读信息只在登录时返回
    if (!ctx.user) {
      return notices.map((n) => ({ ...n, read: false }));
    }

    const reads = await ctx.prisma.noticeRead.findMany({
      where: { userId: ctx.user.id, noticeId: { in: notices.map((n) => n.id) } },
      select: { noticeId: true },
    });
    const readSet = new Set(reads.map((r) => r.noticeId));
    return notices.map((n) => ({ ...n, read: readSet.has(n.id) }));
  }),

  /** 未读数（tab 角标使用） */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const role = (ctx.user as { role?: string }).role;
    const audience = audienceFor(role);
    const activeIds = await ctx.prisma.systemNotice.findMany({
      where: { ...activeWindow(), audience: { in: audience } },
      select: { id: true },
    });
    if (activeIds.length === 0) return { unread: 0 };
    const reads = await ctx.prisma.noticeRead.count({
      where: { userId: ctx.user.id, noticeId: { in: activeIds.map((a) => a.id) } },
    });
    return { unread: Math.max(0, activeIds.length - reads) };
  }),

  markRead: protectedProcedure
    .input(z.object({ noticeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notice = await ctx.prisma.systemNotice.findUnique({
        where: { id: input.noticeId },
        select: { id: true },
      });
      if (!notice)
        throw new TRPCError({ code: "NOT_FOUND", message: "公告不存在" });

      await ctx.prisma.noticeRead.upsert({
        where: {
          userId_noticeId: { userId: ctx.user.id, noticeId: input.noticeId },
        },
        create: { userId: ctx.user.id, noticeId: input.noticeId },
        update: { readAt: new Date() },
      });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const role = (ctx.user as { role?: string }).role;
    const audience = audienceFor(role);
    const activeNotices = await ctx.prisma.systemNotice.findMany({
      where: { ...activeWindow(), audience: { in: audience } },
      select: { id: true },
    });
    if (activeNotices.length === 0) return { success: true };

    await ctx.prisma.noticeRead.createMany({
      data: activeNotices.map((n) => ({
        userId: ctx.user.id,
        noticeId: n.id,
      })),
      skipDuplicates: true,
    });
    return { success: true };
  }),
});
