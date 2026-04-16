import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, merchantProcedure } from "../init";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const adminRouter = createTRPCRouter({
  listUsers: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        role: z.enum(["all", "CONSUMER", "MERCHANT", "ADMIN"]).default("all"),
        search: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const where: Record<string, unknown> = {};

      if (input?.role && input.role !== "all") {
        where.role = input.role;
      }

      if (input?.search?.trim()) {
        const keyword = input.search.trim();
        where.OR = [
          { name: { contains: keyword, mode: "insensitive" } },
          { email: { contains: keyword, mode: "insensitive" } },
          { phone: { contains: keyword, mode: "insensitive" } },
        ];
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            points: true,
            vipLevel: true,
            createdAt: true,
            _count: { select: { orders: true, coupons: true, referrals: true } },
          },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return { users, total, page, pageSize };
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["CONSUMER", "MERCHANT", "ADMIN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能修改自己的角色",
        });
      }

      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      }

      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: { id: true, role: true },
      });
    }),

  platformStats: adminProcedure.query(async ({ ctx }) => {
    const [totalUsers, totalOrders, totalProducts, totalRevenue] =
      await Promise.all([
        ctx.prisma.user.count(),
        ctx.prisma.order.count({ where: { status: "PAID" } }),
        ctx.prisma.product.count(),
        ctx.prisma.order.aggregate({
          where: { status: "PAID" },
          _sum: { cashPaid: true },
        }),
      ]);

    return {
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue:
        totalRevenue._sum.cashPaid != null
          ? Number(totalRevenue._sum.cashPaid)
          : 0,
    };
  }),

  trendStats: merchantProcedure.query(async ({ ctx }) => {
    const days = 7;
    const result: {
      date: string;
      orders: number;
      revenue: number;
      verifications: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = daysAgo(i);
      const end = daysAgo(i - 1);

      const [orders, verifications] = await Promise.all([
        ctx.prisma.order.aggregate({
          where: { paidAt: { gte: start, lt: end }, status: "PAID" },
          _count: true,
          _sum: { cashPaid: true },
        }),
        ctx.prisma.verificationRecord.count({
          where: { verifiedAt: { gte: start, lt: end } },
        }),
      ]);

      result.push({
        date: start.toISOString().slice(0, 10),
        orders: orders._count,
        revenue:
          orders._sum.cashPaid != null ? Number(orders._sum.cashPaid) : 0,
        verifications,
      });
    }

    return result;
  }),

  getIncentiveConfig: adminProcedure.query(async ({ ctx }) => {
    const config = await ctx.prisma.incentiveConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    return config ?? {
      id: null,
      newUserBonusPoints: 500,
      newUserBonusDays: 7,
      newUserCheckinMulti: 2.0,
      oldUserCheckinMulti: 1.0,
      referralReward: 1000,
      refereeReward: 500,
      isActive: true,
    };
  }),

  updateIncentiveConfig: adminProcedure
    .input(z.object({
      newUserBonusPoints: z.number().int().min(0).max(50000),
      newUserBonusDays: z.number().int().min(1).max(90),
      newUserCheckinMulti: z.number().min(1).max(10),
      oldUserCheckinMulti: z.number().min(0.5).max(5),
      referralReward: z.number().int().min(0).max(50000),
      refereeReward: z.number().int().min(0).max(50000),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.incentiveConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      return ctx.prisma.incentiveConfig.create({
        data: {
          ...input,
          isActive: true,
        },
      });
    }),

  listCoupons: merchantProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z.enum(["all", "ACTIVE", "USED", "EXPIRED"]).default("all"),
        search: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const where: Record<string, unknown> = {};

      if (input?.status && input.status !== "all") {
        where.status = input.status;
      }

      if (input?.search?.trim()) {
        const keyword = input.search.trim();
        where.OR = [
          { code: { contains: keyword, mode: "insensitive" } },
          { user: { name: { contains: keyword, mode: "insensitive" } } },
          { user: { email: { contains: keyword, mode: "insensitive" } } },
          { product: { title: { contains: keyword, mode: "insensitive" } } },
        ];
      }

      const [coupons, total] = await Promise.all([
        ctx.prisma.coupon.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } },
            product: { select: { id: true, title: true, app: true } },
          },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.coupon.count({ where }),
      ]);

      return { coupons, total, page, pageSize };
    }),
});
