import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  merchantProcedure,
  sensitiveProcedure,
  type createTRPCContext,
} from "../init";
import { createCouponCode, type PayMethod, purchaseRequestSchema } from "@discount-hub/shared";
import { createPaymentSession } from "@/lib/payment/service";

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (v != null && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return Number(v) || 0;
}

function normalizeOrder<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = { ...o, cashPaid: toNum(o.cashPaid) };
  if (o.product && typeof o.product === "object") {
    const p = o.product as Record<string, unknown>;
    out.product = {
      ...p,
      cashPrice: toNum(p.cashPrice),
      originalCashPrice: p.originalCashPrice != null ? toNum(p.originalCashPrice) : null,
    };
  }
  return out as T;
}

type PrismaContext = Awaited<ReturnType<typeof createTRPCContext>>["prisma"];

function buildPaymentSession(params: {
  orderId: string;
  productTitle: string;
  qty: number;
  cashPaid: number;
  payMethod: PayMethod;
  paid: boolean;
}) {
  const session = createPaymentSession({
    orderId: params.orderId,
    productTitle: params.productTitle,
    quantity: params.qty,
    amount: params.cashPaid,
    method: params.payMethod,
  });

  if (!params.paid) {
    return session;
  }

  return {
    ...session,
    status: "PAID" as const,
    demoActionEnabled: false,
    instructions: [
      "支付已完成，订单已经正式入账。",
      ...session.instructions,
    ],
  };
}

async function finalizeOrderPayment(params: {
  prisma: PrismaContext;
  orderId: string;
  expectedUserId?: string;
}) {
  const order = await params.prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      coupon: true,
      product: true,
      user: true,
    },
  });

  if (!order) {
    throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
  }

  if (params.expectedUserId && order.userId !== params.expectedUserId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
  }

  if (order.status === "PAID") {
    if (!order.coupon) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "订单已支付但券码缺失",
      });
    }

    return {
      order,
      coupon: order.coupon,
      taskReward: 0,
      productTitle: order.product.title,
    };
  }

  if (order.status !== "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "当前订单状态无法继续支付",
    });
  }

  if (order.product.status !== "ACTIVE") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "商品不存在或已下架",
    });
  }

  if (order.product.stock < order.qty) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "库存不足" });
  }

  if (order.user.points < order.pointsPaid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "积分不足" });
  }

  return params.prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: order.productId },
      data: { stock: { decrement: order.qty } },
      select: { stock: true },
    });

    await tx.user.update({
      where: { id: order.userId },
      data: { points: { decrement: order.pointsPaid } },
    });

    const paidOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    const coupon = await tx.coupon.create({
      data: {
        code: createCouponCode(order.product.id),
        userId: order.userId,
        productId: order.productId,
        orderId: order.id,
        expiresAt: order.product.expiresAt,
      },
    });

    if (updatedProduct.stock <= 0) {
      await tx.product.update({
        where: { id: order.productId },
        data: { status: "SOLD_OUT" },
      });
    }

    let taskReward = 0;
    const purchaseTask = await tx.taskCompletion.findFirst({
      where: {
        userId: order.userId,
        taskId: "purchase",
        doneAt: { gte: todayStart() },
      },
    });

    if (!purchaseTask) {
      taskReward = 100;
      await tx.taskCompletion.create({
        data: {
          userId: order.userId,
          taskId: "purchase",
          reward: taskReward,
        },
      });
      await tx.user.update({
        where: { id: order.userId },
        data: { points: { increment: taskReward } },
      });
    }

    return {
      order: paidOrder,
      coupon,
      taskReward,
      productTitle: order.product.title,
    };
  });
}

export const orderRouter = createTRPCRouter({
  purchase: sensitiveProcedure
    .input(purchaseRequestSchema)
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

      const cashPaid = toNum(product.cashPrice) * input.qty;
      const pointsPaid = product.pointsPrice * input.qty;
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
      });

      if (!user || user.points < pointsPaid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "积分不足" });
      }

      const order = await ctx.prisma.order.create({
        data: {
          userId: ctx.user.id,
          productId: product.id,
          qty: input.qty,
          cashPaid,
          pointsPaid,
          payMethod: input.payMethod,
          status: "PENDING",
        },
      });

      if (cashPaid <= 0) {
        const result = await finalizeOrderPayment({
          prisma: ctx.prisma,
          orderId: order.id,
          expectedUserId: ctx.user.id,
        });

        return {
          order: result.order,
          coupon: result.coupon,
          taskReward: result.taskReward,
          completed: true,
          paymentSession: buildPaymentSession({
            orderId: result.order.id,
            productTitle: result.productTitle,
            qty: result.order.qty,
            cashPaid: toNum(result.order.cashPaid),
            payMethod: result.order.payMethod as PayMethod,
            paid: true,
          }),
        };
      }

      return {
        order,
        coupon: null,
        taskReward: 0,
        completed: false,
        paymentSession: buildPaymentSession({
          orderId: order.id,
          productTitle: product.title,
          qty: order.qty,
          cashPaid: toNum(order.cashPaid),
          payMethod: order.payMethod as PayMethod,
          paid: false,
        }),
      };
    }),

  completePayment: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await finalizeOrderPayment({
        prisma: ctx.prisma,
        orderId: input.orderId,
        expectedUserId: ctx.user.id,
      });

      return {
        order: result.order,
        coupon: result.coupon,
        taskReward: result.taskReward,
        completed: true,
        paymentSession: buildPaymentSession({
          orderId: result.order.id,
          productTitle: result.productTitle,
          qty: result.order.qty,
          cashPaid: toNum(result.order.cashPaid),
          payMethod: result.order.payMethod as PayMethod,
          paid: true,
        }),
      };
    }),

  cancel: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { coupon: true },
      });

      if (!order || order.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      }

      if (order.status === "PENDING") {
        await ctx.prisma.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });

        return { success: true };
      }

      if (order.status !== "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "仅已支付订单可取消",
        });
      }

      if (order.coupon?.status === "USED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "券码已核销，无法取消",
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });

        if (order.coupon) {
          await tx.coupon.update({
            where: { id: order.coupon.id },
            data: { status: "EXPIRED" },
          });
        }

        await tx.product.update({
          where: { id: order.productId },
          data: { stock: { increment: order.qty } },
        });

        await tx.user.update({
          where: { id: ctx.user.id },
          data: { points: { increment: order.pointsPaid } },
        });

        return { success: true };
      });
    }),

  myOrders: protectedProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.order.findMany({
      where: { userId: ctx.user.id },
      include: { product: true, coupon: true },
      orderBy: { createdAt: "desc" },
    });
    return orders.map(normalizeOrder);
  }),

  allOrders: merchantProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          status: z.enum(["all", "PENDING", "PAID", "CANCELLED", "REFUNDED"]).default("all"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const where: Record<string, unknown> = {};
      if (input?.status && input.status !== "all") {
        where.status = input.status;
      }
      const [orders, total] = await Promise.all([
        ctx.prisma.order.findMany({
          where,
          include: { user: true, product: true, coupon: true },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.order.count({ where }),
      ]);
      return { orders: orders.map(normalizeOrder), total, page, pageSize };
    }),

  refund: merchantProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { coupon: true },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "订单不存在" });
      }

      if (order.status !== "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "仅已支付的订单可以退款",
        });
      }

      if (order.coupon?.status === "USED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "券码已核销，无法退款",
        });
      }

      return ctx.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "REFUNDED" },
        });

        if (order.coupon) {
          await tx.coupon.update({
            where: { id: order.coupon.id },
            data: { status: "EXPIRED" },
          });
        }

        await tx.product.update({
          where: { id: order.productId },
          data: { stock: { increment: order.qty } },
        });

        if (order.pointsPaid > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: { points: { increment: order.pointsPaid } },
          });
        }

        return { success: true };
      });
    }),
});
