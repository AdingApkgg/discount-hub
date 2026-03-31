import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  merchantProcedure,
} from "../init";
import { createCouponCode } from "@discount-hub/shared";

export const orderRouter = createTRPCRouter({
  purchase: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        qty: z.number().int().min(1).max(10).default(1),
        payMethod: z.enum([
          "alipay",
          "wechat",
          "unionpay",
          "paypal",
          "crypto",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.productId },
      });

      if (!product || product.status !== "ACTIVE") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "商品不存在或已下架",
        });
      }

      if (product.stock < input.qty) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "库存不足" });
      }

      const cashPaid = product.cashPrice.toNumber() * input.qty;
      const pointsPaid = product.pointsPrice * input.qty;
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
      });

      if (!user || user.points < pointsPaid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "积分不足" });
      }

      const result = await ctx.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: input.qty } },
        });

        await tx.user.update({
          where: { id: ctx.user.id },
          data: { points: { decrement: pointsPaid } },
        });

        const order = await tx.order.create({
          data: {
            userId: ctx.user.id,
            productId: product.id,
            qty: input.qty,
            cashPaid,
            pointsPaid,
            payMethod: input.payMethod,
            status: "PAID",
            paidAt: new Date(),
          },
        });

        const coupon = await tx.coupon.create({
          data: {
            code: createCouponCode(product.id),
            userId: ctx.user.id,
            productId: product.id,
            orderId: order.id,
            expiresAt: product.expiresAt,
          },
        });

        return { order, coupon };
      });

      return result;
    }),

  myOrders: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.order.findMany({
      where: { userId: ctx.user.id },
      include: { product: true, coupon: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  allOrders: merchantProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const [orders, total] = await Promise.all([
        ctx.prisma.order.findMany({
          include: { user: true, product: true, coupon: true },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.order.count(),
      ]);
      return { orders, total, page, pageSize };
    }),
});
