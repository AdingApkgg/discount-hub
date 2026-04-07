import { z } from "zod";
import { createTRPCRouter, publicProcedure, merchantProcedure } from "../init";

const PRODUCT_LIST_TTL = 60; // Cache product list for 60 seconds
const PRODUCT_DETAIL_TTL = 120; // Cache individual products for 2 minutes

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

      // Write to cache
      if (ctx.redis) {
        await ctx.redis.set(cacheKey, JSON.stringify(products), "EX", PRODUCT_LIST_TTL);
      }

      return products;
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

      if (product && ctx.redis) {
        await ctx.redis.set(cacheKey, JSON.stringify(product), "EX", PRODUCT_DETAIL_TTL);
      }

      return product;
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

      return ctx.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
      });
    }),

  create: merchantProcedure
    .input(
      z.object({
        app: z.string(),
        title: z.string(),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        pointsPrice: z.number().int().min(0),
        cashPrice: z.number().min(0),
        originalCashPrice: z.number().min(0).optional(),
        stock: z.number().int().min(0),
        expiresAt: z.date(),
        tags: z.array(z.string()).optional(),
      }),
    )
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
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().optional(),
          subtitle: z.string().optional(),
          description: z.string().optional(),
          app: z.string().optional(),
          pointsPrice: z.number().int().min(0).optional(),
          cashPrice: z.number().min(0).optional(),
          originalCashPrice: z.number().min(0).nullable().optional(),
          stock: z.number().int().min(0).optional(),
          expiresAt: z.date().optional(),
          tags: z.array(z.string()).optional(),
          status: z
            .enum(["ACTIVE", "SOLD_OUT", "EXPIRED", "DRAFT"])
            .optional(),
        }),
      }),
    )
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
});
