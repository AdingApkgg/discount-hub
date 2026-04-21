import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type Redis from "ioredis";
import { productCreateSchema, productUpdateSchema } from "@discount-hub/shared";
import { createTRPCRouter, publicProcedure, merchantProcedure } from "../init";

const PRODUCT_LIST_TTL = 60;
const PRODUCT_DETAIL_TTL = 120;
const MAX_BULK_IDS = 200;

async function invalidateProductCaches(
  redis: Redis | null | undefined,
  productIds?: string[],
) {
  if (!redis) return;
  const keys = await redis.keys("products:list:*");
  if (keys.length > 0) await redis.del(...keys);
  if (productIds?.length) {
    await Promise.all(productIds.map((id) => redis.del(`products:detail:${id}`)));
  }
}

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

      await invalidateProductCaches(ctx.redis ?? null, []);

      return product;
    }),

  update: merchantProcedure
    .input(productUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.update({
        where: { id: input.id },
        data: input.data,
      });

      await invalidateProductCaches(ctx.redis ?? null, [input.id]);

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

      await invalidateProductCaches(ctx.redis ?? null, [input.id]);

      return { success: true };
    }),

  bulkSetStatus: merchantProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(MAX_BULK_IDS),
        status: z.enum(["ACTIVE", "SOLD_OUT", "EXPIRED", "DRAFT"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.product.updateMany({
        where: { id: { in: input.ids } },
        data: { status: input.status },
      });
      await invalidateProductCaches(ctx.redis ?? null, input.ids);
      return { updated: result.count };
    }),

  bulkSetStock: merchantProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(MAX_BULK_IDS),
        stock: z.number().int().min(0).max(10_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.product.updateMany({
        where: { id: { in: input.ids } },
        data: { stock: input.stock },
      });
      await invalidateProductCaches(ctx.redis ?? null, input.ids);
      return { updated: result.count };
    }),

  bulkAdjustStock: merchantProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(MAX_BULK_IDS),
        delta: z.number().int().min(-10_000_000).max(10_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const products = await ctx.prisma.product.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, stock: true },
      });
      await ctx.prisma.$transaction(
        products.map((p) =>
          ctx.prisma.product.update({
            where: { id: p.id },
            data: { stock: Math.max(0, p.stock + input.delta) },
          }),
        ),
      );
      await invalidateProductCaches(ctx.redis ?? null, input.ids);
      return { updated: products.length };
    }),

  bulkSetPrices: merchantProcedure
    .input(
      z
        .object({
          ids: z.array(z.string()).min(1).max(MAX_BULK_IDS),
          cashPrice: z.number().min(0).optional(),
          pointsPrice: z.number().int().min(0).optional(),
        })
        .refine((d) => d.cashPrice !== undefined || d.pointsPrice !== undefined, {
          message: "至少指定现金价或积分价之一",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: {
        cashPrice?: number;
        pointsPrice?: number;
      } = {};
      if (input.cashPrice !== undefined) {
        data.cashPrice = input.cashPrice;
      }
      if (input.pointsPrice !== undefined) {
        data.pointsPrice = input.pointsPrice;
      }
      const result = await ctx.prisma.product.updateMany({
        where: { id: { in: input.ids } },
        data,
      });
      await invalidateProductCaches(ctx.redis ?? null, input.ids);
      return { updated: result.count };
    }),

  bulkSetAgentPricing: merchantProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1).max(MAX_BULK_IDS),
        clearAgent: z.boolean().optional(),
        agentPrice: z.number().min(0).optional(),
        agentMinQty: z.number().int().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.clearAgent) {
        const result = await ctx.prisma.product.updateMany({
          where: { id: { in: input.ids } },
          data: { agentPrice: null, agentMinQty: null },
        });
        await invalidateProductCaches(ctx.redis ?? null, input.ids);
        return { updated: result.count };
      }
      const data: {
        agentPrice?: number | null;
        agentMinQty?: number | null;
      } = {};
      if (input.agentPrice !== undefined) {
        data.agentPrice = input.agentPrice;
      }
      if (input.agentMinQty !== undefined) {
        data.agentMinQty = input.agentMinQty;
      }
      if (Object.keys(data).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请指定批发价、最低订量或选择清空代理价",
        });
      }
      const result = await ctx.prisma.product.updateMany({
        where: { id: { in: input.ids } },
        data,
      });
      await invalidateProductCaches(ctx.redis ?? null, input.ids);
      return { updated: result.count };
    }),

  bulkImportStockRows: merchantProcedure
    .input(
      z.object({
        rows: z
          .array(
            z.object({
              id: z.string().min(1),
              stock: z.number().int().min(0).max(10_000_000),
            }),
          )
          .min(1)
          .max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const requestIds = [...new Set(input.rows.map((r) => r.id))];
      const existing = await ctx.prisma.product.findMany({
        where: { id: { in: requestIds } },
        select: { id: true },
      });
      const idSet = new Set(existing.map((e) => e.id));
      const byId = new Map<string, number>();
      for (const r of input.rows) {
        if (idSet.has(r.id)) byId.set(r.id, r.stock);
      }
      const updates = [...byId.entries()];
      if (updates.length > 0) {
        await ctx.prisma.$transaction(
          updates.map(([id, stock]) =>
            ctx.prisma.product.update({ where: { id }, data: { stock } }),
          ),
        );
      }
      const touched = updates.map(([id]) => id);
      await invalidateProductCaches(ctx.redis ?? null, touched);
      return {
        updated: byId.size,
        skipped: input.rows.length - byId.size,
      };
    }),
});
