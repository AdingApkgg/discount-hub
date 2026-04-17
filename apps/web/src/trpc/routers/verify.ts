import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { verifyCodeSchema } from "@discount-hub/shared";
import { createTRPCRouter, merchantProcedure } from "../init";

export const verifyRouter = createTRPCRouter({
  verifyCoupon: merchantProcedure
    .input(verifyCodeSchema)
    .mutation(async ({ ctx, input }) => {
      const lockKey = `verify:lock:${input.code}`;

      if (ctx.redis) {
        const locked = await ctx.redis.set(lockKey, "1", "EX", 10, "NX");
        if (!locked) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "该券码正在核销中，请勿重复操作",
          });
        }
      }

      try {
        const coupon = await ctx.prisma.coupon.findUnique({
          where: { code: input.code },
          include: { product: true, user: true },
        });

        if (!coupon) {
          throw new TRPCError({ code: "NOT_FOUND", message: "券码不存在" });
        }

        if (coupon.status === "USED") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该券已使用" });
        }

        if (coupon.expiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该券已过期" });
        }

        const result = await ctx.prisma.$transaction(async (tx) => {
          const updated = await tx.coupon.update({
            where: { id: coupon.id, status: "ACTIVE" },
            data: { status: "USED", usedAt: new Date() },
          });

          await tx.verificationRecord.create({
            data: {
              couponId: coupon.id,
              verifiedBy: ctx.user.id,
              notes: "券码核销成功",
            },
          });

          return updated;
        });

        return {
          success: true,
          coupon: {
            code: result.code,
            productTitle: coupon.product.title,
            userName: coupon.user.name ?? coupon.user.email,
          },
        };
      } finally {
        if (ctx.redis) {
          await ctx.redis.del(lockKey);
        }
      }
    }),

  recentRecords: merchantProcedure.query(async ({ ctx }) => {
    return ctx.prisma.verificationRecord.findMany({
      include: {
        coupon: { include: { product: true, user: true } },
        verifier: true,
      },
      orderBy: { verifiedAt: "desc" },
      take: 50,
    });
  }),

  /** 核销记录查询 —— 商家/管理员后台使用（带筛选/分页） */
  listRecords: merchantProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().trim().optional(),
          fromDate: z.string().datetime().optional(),
          toDate: z.string().datetime().optional(),
          verifierId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const where: Record<string, unknown> = {};

      if (input?.verifierId) {
        where.verifiedBy = input.verifierId;
      }

      const dateFilter: Record<string, Date> = {};
      if (input?.fromDate) dateFilter.gte = new Date(input.fromDate);
      if (input?.toDate) dateFilter.lte = new Date(input.toDate);
      if (Object.keys(dateFilter).length > 0) {
        where.verifiedAt = dateFilter;
      }

      if (input?.search?.trim()) {
        const keyword = input.search.trim();
        where.OR = [
          { coupon: { code: { contains: keyword, mode: "insensitive" } } },
          { coupon: { product: { title: { contains: keyword, mode: "insensitive" } } } },
          { coupon: { user: { name: { contains: keyword, mode: "insensitive" } } } },
          { coupon: { user: { email: { contains: keyword, mode: "insensitive" } } } },
          { verifier: { name: { contains: keyword, mode: "insensitive" } } },
          { verifier: { email: { contains: keyword, mode: "insensitive" } } },
        ];
      }

      const [records, total] = await Promise.all([
        ctx.prisma.verificationRecord.findMany({
          where,
          include: {
            coupon: { include: { product: { select: { id: true, title: true, app: true } }, user: { select: { id: true, name: true, email: true } } } },
            verifier: { select: { id: true, name: true, email: true } },
          },
          orderBy: { verifiedAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.verificationRecord.count({ where }),
      ]);

      return { records, total, page, pageSize };
    }),
});
