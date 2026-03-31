import { z } from "zod";
import { createTRPCRouter, protectedProcedure, merchantProcedure } from "../init";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
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
        inviteCode: true,
        createdAt: true,
        _count: { select: { referrals: true, orders: true, coupons: true } },
      },
    });
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
      todayRevenue: todayOrders._sum.cashPaid?.toNumber() ?? 0,
      todayOrderCount: todayOrders._count,
      activeUsers,
      activeProducts,
    };
  }),
});
