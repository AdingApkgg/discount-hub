import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, merchantProcedure } from "../init";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        image: true,
        role: true,
        points: true,
        vipLevel: true,
        vipExpiresAt: true,
        inviteCode: true,
        createdAt: true,
        _count: { select: { referrals: true, orders: true, coupons: true } },
      },
    });
    if (!user) return null;

    const paidOrders = await ctx.prisma.order.findMany({
      where: { userId: ctx.user.id, status: "PAID" },
      select: {
        qty: true,
        cashPaid: true,
        pointsPaid: true,
        product: { select: { originalCashPrice: true, cashPrice: true } },
      },
    });

    let totalSavingsCents = 0;
    let totalPointsPaid = 0;
    for (const o of paidOrders) {
      totalPointsPaid += o.pointsPaid;
      const original = o.product.originalCashPrice ?? o.product.cashPrice;
      const originalTotal = Number(original) * o.qty;
      const saved = originalTotal - Number(o.cashPaid);
      if (saved > 0) totalSavingsCents += Math.round(saved * 100);
    }

    return {
      ...user,
      totalSavingsCents,
      totalSavingsPoints: totalPointsPaid,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      });
    }),

  myCoupons: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.coupon.findMany({
      where: { userId: ctx.user.id },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  referrals: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { invitedById: ctx.user.id },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  myFavorites: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.favorite.findMany({
      where: { userId: ctx.user.id },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  myFootprints: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.footprint.findMany({
      where: { userId: ctx.user.id },
      include: { product: true },
      orderBy: { viewedAt: "desc" },
      take: 100,
    });
  }),

  bindInviteCode: protectedProcedure
    .input(z.object({ inviteCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { invitedById: true },
      });

      if (currentUser?.invitedById) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已绑定邀请人" });
      }

      const inviter = await ctx.prisma.user.findFirst({
        where: { inviteCode: input.inviteCode },
        select: { id: true },
      });

      if (!inviter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "邀请码无效" });
      }

      if (inviter.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能邀请自己" });
      }

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { invitedById: inviter.id },
      });

      return { success: true };
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.favorite.findUnique({
        where: { userId_productId: { userId: ctx.user.id, productId: input.productId } },
      });
      if (existing) {
        await ctx.prisma.favorite.delete({ where: { id: existing.id } });
        return { favorited: false };
      }
      await ctx.prisma.favorite.create({
        data: { userId: ctx.user.id, productId: input.productId },
      });
      return { favorited: true };
    }),

  recordFootprint: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.footprint.create({
        data: { userId: ctx.user.id, productId: input.productId },
      });
    }),

  dashboardStats: merchantProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayVerifications, todayOrders, activeUsers, activeProducts] =
      await Promise.all([
        ctx.prisma.verificationRecord.count({
          where: { verifiedAt: { gte: today } },
        }),
        ctx.prisma.order.aggregate({
          where: { paidAt: { gte: today }, status: "PAID" },
          _sum: { cashPaid: true },
          _count: true,
        }),
        ctx.prisma.user.count({
          where: { updatedAt: { gte: today } },
        }),
        ctx.prisma.product.count({
          where: { status: "ACTIVE" },
        }),
      ]);

    return {
      todayVerifications,
      todayRevenue: todayOrders._sum.cashPaid != null ? Number(todayOrders._sum.cashPaid) : 0,
      todayOrderCount: todayOrders._count,
      activeUsers,
      activeProducts,
    };
  }),
});
