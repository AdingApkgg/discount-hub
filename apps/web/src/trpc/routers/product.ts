import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { productCreateSchema, productUpdateSchema } from "@discount-hub/shared";
import { createTRPCRouter, publicProcedure, merchantProcedure } from "../init";

const PRODUCT_LIST_TTL = 60;
const PRODUCT_DETAIL_TTL = 120;

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (v != null && typeof v === "object" && "toNumber" in v) return (v as { toNumber(): number }).toNumber();
  return Number(v) || 0;
}

function normalizeProduct<T extends Record<string, unknown>>(p: T): T {
  return {
    ...p,
    cashPrice: toNum(p.cashPrice),
    originalCashPrice: p.originalCashPrice != null ? toNum(p.originalCashPrice) : null,
  };
}

export const productRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          category: z.enum(["limited", "today", "zero", "all"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const cacheKey = `products:list:${input?.category ?? "all"}`;

      // Try Redis cache first
      if (ctx.redis) {
        const cached = await ctx.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      const where: Record<string, unknown> = { status: "ACTIVE" };

      if (input?.category && input.category !== "all") {
        const tagMap: Record<string, string> = {
          limited: "限时",
          today: "今日推荐",
          zero: "零元购",
        };
        where.tags = { has: tagMap[input.category] };
      }

      const products = await ctx.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const normalized = products.map(normalizeProduct);

      if (ctx.redis) {
        await ctx.redis.set(cacheKey, JSON.stringify(normalized), "EX", PRODUCT_LIST_TTL);
      }

      return normalized;
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `products:detail:${input.id}`;

      if (ctx.redis) {
        const cached = await ctx.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      const product = await ctx.prisma.product.findUnique({
        where: { id: input.id },
      });

      if (!product) return null;

      const normalized = normalizeProduct(product);

      if (ctx.redis) {
        await ctx.redis.set(cacheKey, JSON.stringify(normalized), "EX", PRODUCT_DETAIL_TTL);
      }

      return normalized;
    }),

  manageList: merchantProcedure
    .input(
      z
        .object({
          status: z
            .enum(["all", "ACTIVE", "SOLD_OUT", "EXPIRED", "DRAFT"])
            .default("all"),
          search: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      const search = input?.search?.trim();

      if (input?.status && input.status !== "all") {
        where.status = input.status;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { subtitle: { contains: search, mode: "insensitive" } },
          { app: { contains: search, mode: "insensitive" } },
        ];
      }

      const products = await ctx.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
      });

      return products.map(normalizeProduct);
    }),

  create: merchantProcedure
    .input(productCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.create({ data: input });

      // Invalidate list cache on create
      if (ctx.redis) {
        const keys = await ctx.redis.keys("products:list:*");
        if (keys.length > 0) await ctx.redis.del(...keys);
      }

      return product;
    }),

  update: merchantProcedure
    .input(productUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.update({
        where: { id: input.id },
        data: input.data,
      });

      // Invalidate caches on update
      if (ctx.redis) {
        const keys = await ctx.redis.keys("products:list:*");
        if (keys.length > 0) await ctx.redis.del(...keys);
        await ctx.redis.del(`products:detail:${input.id}`);
      }

      return product;
    }),

  delete: merchantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const activeOrders = await ctx.prisma.order.count({
        where: {
          productId: input.id,
          status: { in: ["PENDING", "PAID"] },
        },
      });

      if (activeOrders > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `该商品还有 ${activeOrders} 个未完结订单，无法删除`,
        });
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.verificationRecord.deleteMany({
          where: { coupon: { productId: input.id } },
        });
        await tx.coupon.deleteMany({ where: { productId: input.id } });
        await tx.order.deleteMany({ where: { productId: input.id } });
        await tx.product.delete({ where: { id: input.id } });
      });

      if (ctx.redis) {
        const keys = await ctx.redis.keys("products:list:*");
        if (keys.length > 0) await ctx.redis.del(...keys);
        await ctx.redis.del(`products:detail:${input.id}`);
      }

      return { success: true };
    }),
});
