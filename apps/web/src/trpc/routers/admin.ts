import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateApiKey } from "@/lib/api-key";
import {
  createTRPCRouter,
  adminProcedure,
  merchantProcedure,
  publicProcedure,
} from "../init";
import { writeAuditLog } from "@/lib/audit";

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
        role: z.enum(["all", "CONSUMER", "MERCHANT", "AGENT", "ADMIN"]).default("all"),
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
        role: z.enum(["CONSUMER", "MERCHANT", "AGENT", "ADMIN"]),
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
        select: { id: true, role: true },
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      }

      const updated = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: { id: true, role: true },
      });

      await writeAuditLog({
        actorId: ctx.user.id,
        action: "user.role.update",
        targetType: "User",
        targetId: input.userId,
        summary: `角色 ${target.role} → ${input.role}`,
        metadata: { from: target.role, to: input.role },
        headers: ctx.headers,
      });

      return updated;
    }),

  userDetail: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          points: true,
          vipLevel: true,
          vipExpiresAt: true,
          inviteCode: true,
          invitedById: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              coupons: true,
              referrals: true,
              posts: true,
              comments: true,
              favorites: true,
              checkins: true,
            },
          },
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });

      const [recentOrders, recentCheckins, recentAudits] = await Promise.all([
        ctx.prisma.order.findMany({
          where: { userId: input.userId },
          include: { product: { select: { id: true, title: true, app: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        ctx.prisma.checkin.findMany({
          where: { userId: input.userId },
          orderBy: { checkedAt: "desc" },
          take: 10,
        }),
        ctx.prisma.auditLog.findMany({
          where: { targetType: "User", targetId: input.userId },
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ]);

      return { user, recentOrders, recentCheckins, recentAudits };
    }),

  adjustUserPoints: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        delta: z.number().int().min(-1_000_000).max(1_000_000),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, points: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });

      const nextPoints = Math.max(0, target.points + input.delta);
      const effectiveDelta = nextPoints - target.points;

      const user = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { points: nextPoints },
        select: { id: true, points: true },
      });

      await writeAuditLog({
        actorId: ctx.user.id,
        action: "user.points.adjust",
        targetType: "User",
        targetId: input.userId,
        summary: `${effectiveDelta >= 0 ? "+" : ""}${effectiveDelta} 积分 · ${input.reason}`,
        metadata: {
          requested: input.delta,
          applied: effectiveDelta,
          before: target.points,
          after: nextPoints,
          reason: input.reason,
        },
        headers: ctx.headers,
      });

      return user;
    }),

  setUserVip: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        vipLevel: z.number().int().min(0).max(10),
        vipExpiresAt: z.string().datetime().nullable().optional(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, vipLevel: true, vipExpiresAt: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });

      const user = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: {
          vipLevel: input.vipLevel,
          vipExpiresAt:
            input.vipExpiresAt === undefined
              ? target.vipExpiresAt
              : input.vipExpiresAt === null
                ? null
                : new Date(input.vipExpiresAt),
        },
        select: { id: true, vipLevel: true, vipExpiresAt: true },
      });

      await writeAuditLog({
        actorId: ctx.user.id,
        action: "user.vip.set",
        targetType: "User",
        targetId: input.userId,
        summary: `VIP Lv.${target.vipLevel} → Lv.${input.vipLevel}`,
        metadata: {
          reason: input.reason,
          fromLevel: target.vipLevel,
          toLevel: input.vipLevel,
          fromExpiry: target.vipExpiresAt,
          toExpiry: user.vipExpiresAt,
        },
        headers: ctx.headers,
      });

      return user;
    }),

  setUserBanned: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        banned: z.boolean(),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能封禁自己",
        });
      }

      const target = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, isBanned: true, role: true },
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });

      if (target.role === "ADMIN" && input.banned) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无法封禁管理员，请先撤销角色",
        });
      }

      const user = await ctx.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: input.userId },
          data: {
            isBanned: input.banned,
            banReason: input.banned ? (input.reason ?? null) : null,
            bannedAt: input.banned ? new Date() : null,
          },
          select: { id: true, isBanned: true, banReason: true, bannedAt: true },
        });
        if (input.banned) {
          await tx.session.deleteMany({ where: { userId: input.userId } });
        }
        return updated;
      });

      await writeAuditLog({
        actorId: ctx.user.id,
        action: input.banned ? "user.ban" : "user.unban",
        targetType: "User",
        targetId: input.userId,
        summary: input.banned ? `封禁用户` : `解除封禁`,
        metadata: { reason: input.reason },
        headers: ctx.headers,
      });

      return user;
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
      streakBonusThreshold: 3,
      checkinRewards: [200, 3000, 300, 500, 800, 1200, 10000],
      vipCheckinBonusByLevel: { "0": 0, "1": 0.05, "2": 0.10, "3": 0.15, "4": 0.20 },
      vipPointsPerLevel: 500,
      vipMaxLevel: 10,
      taskRewards: { browse: 100, purchase: 100, share: 80, c1: 30, c2: 30, c3: 40, c4: 50 },
      inviteVipBonusByLevel: { "1": 300, "2": 200, "3": 200, "4": 100, "5": 100 },
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
      streakBonusThreshold: z.number().int().min(0).max(30),
      checkinRewards: z.array(z.number().int().min(0).max(1_000_000)).min(1).max(31),
      vipCheckinBonusByLevel: z.record(z.string(), z.number().min(0).max(5)),
      vipPointsPerLevel: z.number().int().min(1).max(1_000_000),
      vipMaxLevel: z.number().int().min(1).max(100),
      taskRewards: z.record(z.string(), z.number().int().min(0).max(1_000_000)),
      inviteVipBonusByLevel: z.record(z.string(), z.number().int().min(0).max(1_000_000)),
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

  listTaskTemplates: merchantProcedure.query(async ({ ctx }) => {
    return ctx.prisma.taskTemplate.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }),

  upsertTaskTemplate: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      taskId: z.string().min(1),
      title: z.string().min(1),
      description: z.string().default(""),
      type: z.enum(["BASIC", "CUMULATIVE"]),
      targetCount: z.number().int().min(1).max(100),
      reward: z.number().int().min(0).max(50000),
      icon: z.string().default("star"),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        return ctx.prisma.taskTemplate.update({ where: { id }, data });
      }
      return ctx.prisma.taskTemplate.create({ data });
    }),

  deleteTaskTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.taskTemplate.delete({ where: { id: input.id } });
    }),

  getSupportConfig: merchantProcedure.query(async ({ ctx }) => {
    const cfg = await ctx.prisma.supportConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    return cfg ?? {
      id: "",
      systemPrompt: "",
      modelName: "claude-haiku-4-5-20251001",
      maxTokens: 512,
      transferWaitSeconds: 30,
      isActive: true,
    };
  }),

  upsertSupportConfig: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      systemPrompt: z.string().min(1).max(8000),
      modelName: z.string().min(1).max(100),
      maxTokens: z.number().int().min(64).max(4096),
      transferWaitSeconds: z.number().int().min(5).max(600),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        return ctx.prisma.supportConfig.update({ where: { id }, data });
      }
      return ctx.prisma.supportConfig.create({ data });
    }),

  listSupportFaqs: merchantProcedure.query(async ({ ctx }) => {
    return ctx.prisma.supportFaq.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }),

  upsertSupportFaq: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      question: z.string().min(1).max(200),
      keywords: z.array(z.string().min(1).max(50)).min(1).max(20),
      answer: z.string().min(1).max(2000),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        return ctx.prisma.supportFaq.update({ where: { id }, data });
      }
      return ctx.prisma.supportFaq.create({ data });
    }),

  deleteSupportFaq: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.supportFaq.delete({ where: { id: input.id } });
    }),

  listPosterTemplates: merchantProcedure.query(async ({ ctx }) => {
    return ctx.prisma.posterTemplate.findMany({
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    });
  }),

  upsertPosterTemplate: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      kind: z.string().min(1).max(40),
      name: z.string().min(1).max(80),
      headline: z.string().min(1).max(120),
      subline: z.string().max(200).default(""),
      ctaText: z.string().max(40).default(""),
      bgGradient: z.string().max(200).default("from-primary/5 via-background to-accent/5"),
      accentColor: z.string().max(40).default("#0EA5E9"),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        return ctx.prisma.posterTemplate.update({ where: { id }, data });
      }
      return ctx.prisma.posterTemplate.create({ data });
    }),

  deletePosterTemplate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.posterTemplate.delete({ where: { id: input.id } });
    }),

  listRedemptionGuides: merchantProcedure.query(async ({ ctx }) => {
    return ctx.prisma.redemptionGuide.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }),

  upsertRedemptionGuide: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().min(1).max(80),
      headline: z.string().min(1).max(120),
      subline: z.string().max(200).default(""),
      ctaText: z.string().min(1).max(40),
      minPoints: z.number().int().min(0).max(1_000_000),
      cooldownHours: z.number().int().min(0).max(720),
      showFab: z.boolean().default(true),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        return ctx.prisma.redemptionGuide.update({ where: { id }, data });
      }
      return ctx.prisma.redemptionGuide.create({ data });
    }),

  deleteRedemptionGuide: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.redemptionGuide.delete({ where: { id: input.id } });
    }),

  getAgentCommissionConfig: merchantProcedure.query(async ({ ctx }) => {
    const cfg = await ctx.prisma.agentCommissionConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    return cfg ?? {
      id: "",
      level1Rate: 0.1,
      level2Rate: 0.05,
      level3Rate: 0,
      maxLevels: 2,
      isActive: true,
    };
  }),

  upsertAgentCommissionConfig: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      level1Rate: z.number().min(0).max(1),
      level2Rate: z.number().min(0).max(1),
      level3Rate: z.number().min(0).max(1),
      maxLevels: z.number().int().min(1).max(3),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        return ctx.prisma.agentCommissionConfig.update({ where: { id }, data });
      }
      return ctx.prisma.agentCommissionConfig.create({ data });
    }),

  listAgents: merchantProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const [agents, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where: { role: "AGENT" },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            parentAgentId: true,
            _count: { select: { downline: true, agentCommissions: true } },
          },
        }),
        ctx.prisma.user.count({ where: { role: "AGENT" } }),
      ]);

      const agentIds = agents.map((a) => a.id);
      const sums = agentIds.length
        ? await ctx.prisma.agentCommission.groupBy({
            by: ["agentId", "status"],
            where: { agentId: { in: agentIds } },
            _sum: { amount: true },
          })
        : [];

      const totalsByAgent = new Map<
        string,
        { pending: number; paid: number }
      >();
      for (const s of sums) {
        const cur = totalsByAgent.get(s.agentId) ?? { pending: 0, paid: 0 };
        if (s.status === "PENDING") cur.pending = Number(s._sum.amount ?? 0);
        if (s.status === "PAID") cur.paid = Number(s._sum.amount ?? 0);
        totalsByAgent.set(s.agentId, cur);
      }

      return {
        agents: agents.map((a) => ({
          ...a,
          pendingAmount: totalsByAgent.get(a.id)?.pending ?? 0,
          paidAmount: totalsByAgent.get(a.id)?.paid ?? 0,
        })),
        total,
        page,
        pageSize,
      };
    }),

  listAgentCommissions: merchantProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "PAID", "REVOKED"]).optional(),
          agentId: z.string().optional(),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(30),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 30;
      const where = {
        ...(input?.status ? { status: input.status } : {}),
        ...(input?.agentId ? { agentId: input.agentId } : {}),
      };
      const [rows, total] = await Promise.all([
        ctx.prisma.agentCommission.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            agent: { select: { id: true, name: true, email: true } },
            order: { select: { id: true, productId: true, cashPaid: true } },
          },
        }),
        ctx.prisma.agentCommission.count({ where }),
      ]);
      return { rows, total, page, pageSize };
    }),

  markAgentCommissionPaid: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.agentCommission.update({
        where: { id: input.id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }),

  setUserParentAgent: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        parentAgentId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.parentAgentId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能将自己设为上级代理",
        });
      }
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { parentAgentId: input.parentAgentId },
      });
    }),

  listDeviceFingerprints: merchantProcedure
    .input(
      z
        .object({
          filter: z.enum(["all", "suspicious", "blocked"]).default("suspicious"),
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(30),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filter = input?.filter ?? "suspicious";
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 30;
      const where =
        filter === "blocked"
          ? { blockedAt: { not: null } }
          : filter === "suspicious"
            ? { suspicious: true }
            : {};
      const [rows, total] = await Promise.all([
        ctx.prisma.deviceFingerprint.findMany({
          where,
          orderBy: { lastSeenAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.prisma.deviceFingerprint.count({ where }),
      ]);
      return { rows, total, page, pageSize };
    }),

  blockDeviceFingerprint: adminProcedure
    .input(
      z.object({
        visitorId: z.string().min(1),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.deviceFingerprint.updateMany({
        where: { visitorId: input.visitorId },
        data: {
          blockedAt: new Date(),
          blockedBy: ctx.user.id,
          blockReason: input.reason ?? null,
        },
      });
    }),

  unblockDeviceFingerprint: adminProcedure
    .input(z.object({ visitorId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.deviceFingerprint.updateMany({
        where: { visitorId: input.visitorId },
        data: {
          blockedAt: null,
          blockedBy: null,
          blockReason: null,
          suspicious: false,
        },
      });
    }),

  listApiKeys: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    });
    // Never include hashedKey in responses.
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      scopes: r.scopes,
      description: r.description,
      isActive: r.isActive,
      expiresAt: r.expiresAt,
      lastUsedAt: r.lastUsedAt,
      lastUsedIp: r.lastUsedIp,
      createdAt: r.createdAt,
      owner: {
        name: r.user.name,
        email: r.user.email,
        role: r.user.role,
      },
    }));
  }),

  createApiKey: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(500).optional(),
        scopes: z.array(z.string().min(1).max(40)).max(20).default([]),
        expiresInDays: z.number().int().min(1).max(3650).optional(),
        ownerId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ownerId = input.ownerId ?? ctx.user.id;

      const owner = await ctx.prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, role: true, isBanned: true },
      });
      if (!owner) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "未找到指定的所有者用户",
        });
      }
      if (owner.isBanned) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "无法为已封禁用户签发 API Key",
        });
      }

      const { key, prefix, hashedKey } = generateApiKey();
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const created = await ctx.prisma.apiKey.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          scopes: input.scopes,
          prefix,
          hashedKey,
          userId: ownerId,
          expiresAt,
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          scopes: true,
          description: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      // Plain key returned exactly once; the caller must store it now.
      return { ...created, plainKey: key };
    }),

  revokeApiKey: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.apiKey.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  reactivateApiKey: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.apiKey.update({
        where: { id: input.id },
        data: { isActive: true },
      });
    }),

  listAdSlots: merchantProcedure.query(async ({ ctx }) => {
    return ctx.prisma.adSlot.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }),

  /** C 端首页/侧栏等：已启用的广告位，按时间窗过滤 */
  listPublicAdSlots: publicProcedure
    .input(
      z
        .object({
          placement: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const placement = input?.placement?.trim();
      return ctx.prisma.adSlot.findMany({
        where: {
          isActive: true,
          ...(placement ? { placement } : {}),
          AND: [
            { OR: [{ startAt: null }, { startAt: { lte: now } }] },
            { OR: [{ endAt: null }, { endAt: { gte: now } }] },
          ],
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }),

  upsertAdSlot: adminProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      placement: z.string().min(1),
      imageUrls: z.record(z.string(), z.string()),
      linkUrl: z.string().default(""),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
      startAt: z.string().nullable().optional(),
      endAt: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, startAt, endAt, ...rest } = input;
      const data = {
        ...rest,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
      };
      if (id) {
        return ctx.prisma.adSlot.update({ where: { id }, data });
      }
      return ctx.prisma.adSlot.create({ data });
    }),

  deleteAdSlot: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.adSlot.delete({ where: { id: input.id } });
    }),

  retentionStats: merchantProcedure.query(async ({ ctx }) => {
    const days = 14;
    const daily: {
      date: string;
      newUsers: number;
      activeUsers: number;
      d1: number;
      d3: number;
      d7: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = daysAgo(i);
      const end = daysAgo(i - 1);

      const newUsers = await ctx.prisma.user.count({
        where: { createdAt: { gte: start, lt: end } },
      });

      const activeUsers = await ctx.prisma.session.groupBy({
        by: ["userId"],
        where: { updatedAt: { gte: start, lt: end } },
      });

      let d1 = 0;
      let d3 = 0;
      let d7 = 0;

      if (i >= 1) {
        const d1Start = daysAgo(i - 1);
        const d1End = daysAgo(i - 2);
        const cohort = await ctx.prisma.user.findMany({
          where: { createdAt: { gte: start, lt: end } },
          select: { id: true },
        });
        const cohortIds = cohort.map((u) => u.id);

        if (cohortIds.length > 0) {
          const d1Active = await ctx.prisma.session.groupBy({
            by: ["userId"],
            where: { userId: { in: cohortIds }, updatedAt: { gte: d1Start, lt: d1End } },
          });
          d1 = cohortIds.length > 0 ? Math.round((d1Active.length / cohortIds.length) * 100) : 0;
        }
      }

      if (i >= 3) {
        const d3Start = daysAgo(i - 3);
        const d3End = daysAgo(i - 4);
        const cohort = await ctx.prisma.user.findMany({
          where: { createdAt: { gte: start, lt: end } },
          select: { id: true },
        });
        const cohortIds = cohort.map((u) => u.id);

        if (cohortIds.length > 0) {
          const d3Active = await ctx.prisma.session.groupBy({
            by: ["userId"],
            where: { userId: { in: cohortIds }, updatedAt: { gte: d3Start, lt: d3End } },
          });
          d3 = cohortIds.length > 0 ? Math.round((d3Active.length / cohortIds.length) * 100) : 0;
        }
      }

      if (i >= 7) {
        const d7Start = daysAgo(i - 7);
        const d7End = daysAgo(i - 8);
        const cohort = await ctx.prisma.user.findMany({
          where: { createdAt: { gte: start, lt: end } },
          select: { id: true },
        });
        const cohortIds = cohort.map((u) => u.id);

        if (cohortIds.length > 0) {
          const d7Active = await ctx.prisma.session.groupBy({
            by: ["userId"],
            where: { userId: { in: cohortIds }, updatedAt: { gte: d7Start, lt: d7End } },
          });
          d7 = cohortIds.length > 0 ? Math.round((d7Active.length / cohortIds.length) * 100) : 0;
        }
      }

      daily.push({
        date: start.toISOString().slice(0, 10),
        newUsers,
        activeUsers: activeUsers.length,
        d1,
        d3,
        d7,
      });
    }

    return daily;
  }),

  inviteFunnel: merchantProcedure.query(async ({ ctx }) => {
    const [
      totalUsers,
      usersWithCode,
      shareLinkEvents,
      shareImageEvents,
      linkVisitEvents,
      registerEvents,
      orderGuests,
    ] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.user.count({ where: { inviteCode: { not: null } } }),
      ctx.prisma.inviteEvent.count({ where: { eventType: "SHARE_LINK" } }),
      ctx.prisma.inviteEvent.count({ where: { eventType: "SHARE_IMAGE" } }),
      ctx.prisma.inviteEvent.count({ where: { eventType: "LINK_VISIT" } }),
      ctx.prisma.inviteEvent.count({ where: { eventType: "REGISTER" } }),
      ctx.prisma.inviteEvent.findMany({
        where: { eventType: "ORDER", guestId: { not: null } },
        distinct: ["guestId"],
        select: { guestId: true },
      }),
    ]);

    const shareEvents = shareLinkEvents + shareImageEvents;
    const invitedWithOrders = orderGuests.length;

    return {
      totalUsers,
      usersWithCode,
      shareEvents,
      shareLinkEvents,
      shareImageEvents,
      linkVisitEvents,
      registerEvents,
      invitedWithOrders,
      // Backwards-compat aliases the dashboard previously read.
      usersWhoInvited: registerEvents,
      invitedUsers: registerEvents,
      steps: [
        { label: "生成邀请码", value: usersWithCode },
        { label: "分享次数", value: shareEvents },
        { label: "链接访问", value: linkVisitEvents },
        { label: "被邀请注册", value: registerEvents },
        { label: "被邀请下单", value: invitedWithOrders },
      ],
    };
  }),

  // ── Audit logs ──

  listAuditLogs: adminProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(30),
          action: z.string().optional(),
          targetType: z.string().optional(),
          actorId: z.string().optional(),
          search: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 30;
      const where: Record<string, unknown> = {};
      if (input?.action) where.action = input.action;
      if (input?.targetType) where.targetType = input.targetType;
      if (input?.actorId) where.actorId = input.actorId;
      if (input?.search?.trim()) {
        const k = input.search.trim();
        where.OR = [
          { summary: { contains: k, mode: "insensitive" } },
          { targetId: { contains: k } },
          { actor: { email: { contains: k, mode: "insensitive" } } },
          { actor: { name: { contains: k, mode: "insensitive" } } },
        ];
      }

      const [logs, total, distinctActions] = await Promise.all([
        ctx.prisma.auditLog.findMany({
          where,
          include: {
            actor: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.auditLog.count({ where }),
        ctx.prisma.auditLog.findMany({
          distinct: ["action"],
          select: { action: true },
          orderBy: { action: "asc" },
        }),
      ]);

      return {
        logs,
        total,
        page,
        pageSize,
        actions: distinctActions.map((a) => a.action),
      };
    }),

  // ── System notices (公告) CRUD ──

  listNotices: adminProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          includeInactive: z.boolean().default(true),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const where: Record<string, unknown> = {};
      if (input && !input.includeInactive) where.isActive = true;

      const [notices, total] = await Promise.all([
        ctx.prisma.systemNotice.findMany({
          where,
          include: { _count: { select: { reads: true } } },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.systemNotice.count({ where }),
      ]);

      return { notices, total, page, pageSize };
    }),

  upsertNotice: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(120),
        content: z.string().min(1).max(5000),
        level: z.enum(["INFO", "WARNING", "SUCCESS", "CRITICAL"]).default("INFO"),
        audience: z
          .enum(["ALL", "CONSUMER", "MERCHANT", "AGENT", "ADMIN"])
          .default("ALL"),
        pinned: z.boolean().default(false),
        isActive: z.boolean().default(true),
        startAt: z.string().datetime().nullable().optional(),
        endAt: z.string().datetime().nullable().optional(),
        linkUrl: z.string().url().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, startAt, endAt, linkUrl, ...rest } = input;
      const data = {
        ...rest,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        linkUrl: linkUrl ?? null,
      };

      let saved;
      if (id) {
        saved = await ctx.prisma.systemNotice.update({ where: { id }, data });
        await writeAuditLog({
          actorId: ctx.user.id,
          action: "notice.update",
          targetType: "SystemNotice",
          targetId: id,
          summary: `更新公告「${input.title}」`,
          headers: ctx.headers,
        });
      } else {
        saved = await ctx.prisma.systemNotice.create({
          data: { ...data, createdBy: ctx.user.id },
        });
        await writeAuditLog({
          actorId: ctx.user.id,
          action: "notice.create",
          targetType: "SystemNotice",
          targetId: saved.id,
          summary: `创建公告「${input.title}」`,
          headers: ctx.headers,
        });
      }
      return saved;
    }),

  deleteNotice: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.systemNotice.delete({ where: { id: input.id } });
      await writeAuditLog({
        actorId: ctx.user.id,
        action: "notice.delete",
        targetType: "SystemNotice",
        targetId: input.id,
        summary: "删除公告",
        headers: ctx.headers,
      });
      return { success: true };
    }),

  listSiteContents: adminProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { SITE_CONTENT_DEFAULTS, SITE_CONTENT_CATEGORIES } = await import(
        "@/lib/site-content-defaults"
      );

      const dbRows = await ctx.prisma.siteContent.findMany({
        where: input?.category ? { category: input.category } : undefined,
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { key: "asc" }],
      });
      const dbByKey = new Map(dbRows.map((r) => [r.key, r] as const));

      // Merge: every default key is returned with either DB value or default value;
      // unknown DB-only keys are also returned at the end.
      const items = SITE_CONTENT_DEFAULTS
        .filter((d) => !input?.category || d.category === input.category)
        .map((d) => {
          const row = dbByKey.get(d.key);
          dbByKey.delete(d.key);
          return {
            id: row?.id ?? null,
            key: d.key,
            value: row ? row.value : d.default,
            category: d.category,
            label: d.label,
            description: d.description ?? "",
            valueType: d.valueType,
            sortOrder: d.sortOrder ?? 0,
            isOverridden: !!row,
          };
        });

      // Append any orphan DB rows that aren't in the defaults catalog.
      for (const row of dbByKey.values()) {
        items.push({
          id: row.id,
          key: row.key,
          value: row.value,
          category: row.category,
          label: row.label,
          description: row.description,
          valueType: (row.valueType ?? "string") as "string" | "text" | "number" | "boolean" | "array" | "object",
          sortOrder: row.sortOrder,
          isOverridden: true,
        });
      }

      return {
        items,
        categories: SITE_CONTENT_CATEGORIES.filter(
          (c) => !input?.category || c.id === input.category,
        ),
      };
    }),

  upsertSiteContent: adminProcedure
    .input(z.object({
      key: z.string().min(1).max(120),
      value: z.unknown(),
      category: z.string().min(1).max(60).default("general"),
      label: z.string().max(120).default(""),
      description: z.string().max(500).default(""),
      valueType: z.enum(["string", "text", "number", "boolean", "array", "object"]).default("string"),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const saved = await ctx.prisma.siteContent.upsert({
        where: { key: input.key },
        update: {
          value: input.value as never,
          category: input.category,
          label: input.label,
          description: input.description,
          valueType: input.valueType,
          sortOrder: input.sortOrder,
        },
        create: {
          key: input.key,
          value: input.value as never,
          category: input.category,
          label: input.label,
          description: input.description,
          valueType: input.valueType,
          sortOrder: input.sortOrder,
        },
      });
      await writeAuditLog({
        actorId: ctx.user.id,
        action: "site_content.upsert",
        targetType: "SiteContent",
        targetId: saved.id,
        summary: `更新站点文案「${input.key}」`,
        headers: ctx.headers,
      });
      return saved;
    }),

  bulkUpsertSiteContent: adminProcedure
    .input(z.object({
      items: z.array(z.object({
        key: z.string().min(1).max(120),
        value: z.unknown(),
      })).min(1).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getSiteContentDefault } = await import("@/lib/site-content-defaults");
      const results = await ctx.prisma.$transaction(
        input.items.map((item) => {
          const def = getSiteContentDefault(item.key);
          return ctx.prisma.siteContent.upsert({
            where: { key: item.key },
            update: { value: item.value as never },
            create: {
              key: item.key,
              value: item.value as never,
              category: def?.category ?? "general",
              label: def?.label ?? item.key,
              description: def?.description ?? "",
              valueType: def?.valueType ?? "string",
              sortOrder: def?.sortOrder ?? 0,
            },
          });
        }),
      );
      await writeAuditLog({
        actorId: ctx.user.id,
        action: "site_content.bulk_update",
        targetType: "SiteContent",
        targetId: null,
        summary: `批量更新 ${input.items.length} 项站点文案`,
        headers: ctx.headers,
      });
      return { count: results.length };
    }),

  deleteSiteContent: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.siteContent.delete({ where: { key: input.key } });
      await writeAuditLog({
        actorId: ctx.user.id,
        action: "site_content.delete",
        targetType: "SiteContent",
        targetId: input.key,
        summary: `删除站点文案「${input.key}」`,
        headers: ctx.headers,
      });
      return { success: true };
    }),

  listWithdrawals: adminProcedure
    .input(z.object({
      status: z.enum(["all", "PENDING", "APPROVED", "REJECTED", "PAID"]).default("all"),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const where: Record<string, unknown> = {};
      if (input?.status && input.status !== "all") {
        where.status = input.status;
      }

      const [items, total] = await Promise.all([
        ctx.prisma.commissionWithdrawal.findMany({
          where,
          include: {
            agent: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.commissionWithdrawal.count({ where }),
      ]);
      return { items, total, page, pageSize };
    }),

  reviewWithdrawal: adminProcedure
    .input(z.object({
      id: z.string(),
      action: z.enum(["approve", "reject", "markPaid"]),
      reviewNote: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const w = await ctx.prisma.commissionWithdrawal.findUnique({
        where: { id: input.id },
      });
      if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "提现记录不存在" });

      if (input.action === "approve") {
        if (w.status !== "PENDING") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "仅待审核状态可审批" });
        }
      } else if (input.action === "reject") {
        if (w.status !== "PENDING" && w.status !== "APPROVED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "已支付或已驳回的不能再驳回" });
        }
      } else if (input.action === "markPaid") {
        if (w.status !== "APPROVED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "仅已批准的可标记为已支付" });
        }
      }

      const newStatus =
        input.action === "approve" ? "APPROVED"
        : input.action === "reject" ? "REJECTED"
        : "PAID";

      const updated = await ctx.prisma.commissionWithdrawal.update({
        where: { id: input.id },
        data: {
          status: newStatus,
          reviewNote: input.reviewNote ?? null,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          paidAt: input.action === "markPaid" ? new Date() : w.paidAt,
        },
      });

      await writeAuditLog({
        actorId: ctx.user.id,
        action: `withdrawal.${input.action}`,
        targetType: "CommissionWithdrawal",
        targetId: input.id,
        summary: `提现 ¥${Number(w.amount).toFixed(2)} → ${newStatus}`,
        headers: ctx.headers,
      });
      return updated;
    }),
});
