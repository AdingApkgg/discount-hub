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
});
