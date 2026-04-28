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
    const downline = await ctx.prisma.user.findMany({
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

    // Per-downline contribution: sum of commissions where this user is the buyer
    const contributions = await ctx.prisma.agentCommission.groupBy({
      by: ["buyerId"],
      where: {
        agentId: ctx.user.id,
        buyerId: { in: downline.map((u) => u.id) },
      },
      _sum: { amount: true },
      _count: true,
    });
    const contribByBuyer = new Map(
      contributions.map((c) => [c.buyerId, {
        amount: Number(c._sum.amount ?? 0),
        count: c._count,
      }] as const),
    );

    return downline.map((u) => {
      const stat = contribByBuyer.get(u.id);
      return {
        ...u,
        contributedAmount: stat?.amount ?? 0,
        contributedCount: stat?.count ?? 0,
      };
    });
  }),

  /**
   * Daily commission earnings for the last `days` calendar days, bucketed by date.
   * Returns ascending-date series; missing days are 0.
   */
  commissionTrend: agentProcedure
    .input(z.object({ days: z.number().int().min(7).max(90).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));

      const rows = await ctx.prisma.agentCommission.findMany({
        where: {
          agentId: ctx.user.id,
          createdAt: { gte: start },
          status: { in: ["PENDING", "PAID"] },
        },
        select: { amount: true, createdAt: true, status: true },
      });

      const buckets: { date: string; amount: number; count: number }[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        buckets.push({ date: d.toISOString().slice(0, 10), amount: 0, count: 0 });
      }
      const indexByDate = new Map(buckets.map((b, i) => [b.date, i]));
      for (const r of rows) {
        const key = r.createdAt.toISOString().slice(0, 10);
        const idx = indexByDate.get(key);
        if (idx === undefined) continue;
        buckets[idx].amount += Number(r.amount);
        buckets[idx].count += 1;
      }
      return buckets;
    }),

  /**
   * Available balance = sum(commissions, status in [PENDING,PAID])
   *                   − sum(withdrawals, status in [PENDING,APPROVED,PAID])
   *
   * "PENDING" commissions are included to give the agent a forward-looking view;
   * but they cannot withdraw more than the cleared (PAID-status) total.
   */
  withdrawalSummary: agentProcedure.query(async ({ ctx }) => {
    const [pending, paid, withdrawnLocked, withdrawnPaid] = await Promise.all([
      ctx.prisma.agentCommission.aggregate({
        where: { agentId: ctx.user.id, status: "PENDING" },
        _sum: { amount: true },
      }),
      ctx.prisma.agentCommission.aggregate({
        where: { agentId: ctx.user.id, status: "PAID" },
        _sum: { amount: true },
      }),
      ctx.prisma.commissionWithdrawal.aggregate({
        where: { agentId: ctx.user.id, status: { in: ["PENDING", "APPROVED"] } },
        _sum: { amount: true },
      }),
      ctx.prisma.commissionWithdrawal.aggregate({
        where: { agentId: ctx.user.id, status: "PAID" },
        _sum: { amount: true },
      }),
    ]);

    const totalEarned = Number(pending._sum.amount ?? 0) + Number(paid._sum.amount ?? 0);
    const cleared = Number(paid._sum.amount ?? 0);
    const lockedInWithdrawals = Number(withdrawnLocked._sum.amount ?? 0);
    const totalWithdrawn = Number(withdrawnPaid._sum.amount ?? 0);
    const available = Math.max(0, cleared - lockedInWithdrawals - totalWithdrawn);

    return {
      totalEarned,
      cleared,
      pendingClearance: Number(pending._sum.amount ?? 0),
      lockedInWithdrawals,
      totalWithdrawn,
      available,
    };
  }),

  requestWithdrawal: agentProcedure
    .input(z.object({
      amount: z.number().min(1).max(10_000_000),
      method: z.enum(["ALIPAY", "WECHAT", "BANK"]),
      account: z.string().min(1).max(120),
      realName: z.string().min(1).max(60),
      bankName: z.string().max(60).optional(),
      branch: z.string().max(120).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Re-compute available inside transaction to prevent race
      return ctx.prisma.$transaction(async (tx) => {
        const [paid, withdrawnLocked, withdrawnPaid] = await Promise.all([
          tx.agentCommission.aggregate({
            where: { agentId: ctx.user.id, status: "PAID" },
            _sum: { amount: true },
          }),
          tx.commissionWithdrawal.aggregate({
            where: { agentId: ctx.user.id, status: { in: ["PENDING", "APPROVED"] } },
            _sum: { amount: true },
          }),
          tx.commissionWithdrawal.aggregate({
            where: { agentId: ctx.user.id, status: "PAID" },
            _sum: { amount: true },
          }),
        ]);
        const available =
          Number(paid._sum.amount ?? 0) -
          Number(withdrawnLocked._sum.amount ?? 0) -
          Number(withdrawnPaid._sum.amount ?? 0);

        if (input.amount > available) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `可提现余额不足，当前可提现 ¥${available.toFixed(2)}`,
          });
        }

        return tx.commissionWithdrawal.create({
          data: {
            agentId: ctx.user.id,
            amount: input.amount,
            method: input.method,
            accountInfo: {
              account: input.account,
              realName: input.realName,
              bankName: input.bankName ?? null,
              branch: input.branch ?? null,
            },
          },
        });
      });
    }),

  myWithdrawals: agentProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.commissionWithdrawal.findMany({
        where: { agentId: ctx.user.id },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  cancelWithdrawal: agentProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const w = await ctx.prisma.commissionWithdrawal.findUnique({
        where: { id: input.id },
      });
      if (!w || w.agentId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "提现记录不存在" });
      }
      if (w.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已在审核中或已处理，不能撤回" });
      }
      return ctx.prisma.commissionWithdrawal.update({
        where: { id: input.id },
        data: { status: "REJECTED", reviewNote: "用户撤回" },
      });
    }),
});
