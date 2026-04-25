import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";

const agentProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "AGENT" && ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅代理商可访问" });
  }
  return next({ ctx });
});

export const agentRouter = createTRPCRouter({
  submitApplication: protectedProcedure
    .input(
      z.object({
        realName: z.string().min(1),
        region: z.string().min(1),
        platforms: z.array(z.string()).min(1),
        qualificationUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.agentApplication.findUnique({
        where: { userId: ctx.user.id },
      });
      if (existing) {
        if (existing.status === "REJECTED") {
          return ctx.prisma.agentApplication.update({
            where: { userId: ctx.user.id },
            data: {
              realName: input.realName,
              region: input.region,
              platforms: input.platforms,
              qualificationUrl: input.qualificationUrl ?? null,
              status: "PENDING",
              reviewNote: null,
              reviewedAt: null,
            },
          });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message: "已提交过申请" });
      }
      return ctx.prisma.agentApplication.create({
        data: { ...input, userId: ctx.user.id },
      });
    }),

  myApplication: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agentApplication.findUnique({
      where: { userId: ctx.user.id },
    });
  }),

  products: agentProcedure.query(async ({ ctx }) => {
    const products = await ctx.prisma.product.findMany({
      where: { status: "ACTIVE", agentPrice: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    return products;
  }),

  myOrders: agentProcedure.query(async ({ ctx }) => {
    return ctx.prisma.order.findMany({
      where: { userId: ctx.user.id },
      include: {
        product: true,
        coupons: { select: { id: true, code: true, status: true, expiresAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  pendingApplications: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.agentApplication.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  reviewApplication: adminProcedure
    .input(
      z.object({
        id: z.string(),
        approve: z.boolean(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.agentApplication.findUnique({
        where: { id: input.id },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "申请不存在" });

      const newStatus = input.approve ? "APPROVED" : "REJECTED";

      const application = await ctx.prisma.agentApplication.update({
        where: { id: input.id },
        data: { status: newStatus, reviewNote: input.note, reviewedAt: new Date() },
      });

      if (input.approve) {
        await ctx.prisma.user.update({
          where: { id: app.userId },
          data: { role: "AGENT" },
        });
      }

      return application;
    }),

  myCommissions: agentProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "PAID", "REVOKED"]).optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.agentCommission.findMany({
        where: {
          agentId: ctx.user.id,
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
        include: {
          order: { select: { id: true, productId: true, cashPaid: true } },
        },
      });
    }),

  commissionSummary: agentProcedure.query(async ({ ctx }) => {
    const [pending, paid, downlineCount] = await Promise.all([
      ctx.prisma.agentCommission.aggregate({
        where: { agentId: ctx.user.id, status: "PENDING" },
        _sum: { amount: true },
        _count: true,
      }),
      ctx.prisma.agentCommission.aggregate({
        where: { agentId: ctx.user.id, status: "PAID" },
        _sum: { amount: true },
        _count: true,
      }),
      ctx.prisma.user.count({
        where: { parentAgentId: ctx.user.id },
      }),
    ]);

    return {
      pendingAmount: Number(pending._sum.amount ?? 0),
      pendingCount: pending._count,
      paidAmount: Number(paid._sum.amount ?? 0),
      paidCount: paid._count,
      downlineCount,
    };
  }),

  myDownline: agentProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findMany({
      where: { parentAgentId: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }),
});
