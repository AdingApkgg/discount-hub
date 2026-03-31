import { z } from "zod";
import { createTRPCRouter, baseProcedure, merchantProcedure } from "../init";

export const productRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z
        .object({
          category: z.enum(["limited", "today", "zero", "all"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx }) => {
      return ctx.prisma.product.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
    }),

  byId: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.product.findUnique({ where: { id: input.id } });
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
      return ctx.prisma.product.create({ data: input });
    }),

  update: merchantProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().optional(),
          subtitle: z.string().optional(),
          description: z.string().optional(),
          pointsPrice: z.number().int().min(0).optional(),
          cashPrice: z.number().min(0).optional(),
          stock: z.number().int().min(0).optional(),
          status: z
            .enum(["ACTIVE", "SOLD_OUT", "EXPIRED", "DRAFT"])
            .optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.product.update({
        where: { id: input.id },
        data: input.data,
      });
    }),
});
