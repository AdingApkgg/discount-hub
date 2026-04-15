import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../init";

export const postRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const [posts, total] = await Promise.all([
        ctx.prisma.post.findMany({
          include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: (page - 1) * limit,
        }),
        ctx.prisma.post.count(),
      ]);
      return { posts, total, page, limit };
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        include: {
          user: { select: { id: true, name: true, image: true } },
          comments: {
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          _count: { select: { comments: true } },
        },
      });
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "帖子不存在" });
      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        content: z.string().min(1).max(5000),
        images: z.array(z.string().url()).max(9).default([]),
        app: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.post.create({
        data: { ...input, userId: ctx.user.id },
      });
    }),

  like: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.update({
        where: { id: input.id },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
      return post;
    }),

  comment: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        content: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.create({
        data: { postId: input.postId, userId: ctx.user.id, content: input.content },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    }),
});
