import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../init";
import { writeAuditLog } from "@/lib/audit";

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

  // ── Admin moderation ──

  adminList: adminProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
          search: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const where: Record<string, unknown> = {};
      if (input?.search?.trim()) {
        const k = input.search.trim();
        where.OR = [
          { title: { contains: k, mode: "insensitive" } },
          { content: { contains: k, mode: "insensitive" } },
          { user: { name: { contains: k, mode: "insensitive" } } },
          { user: { email: { contains: k, mode: "insensitive" } } },
        ];
      }
      const [posts, total] = await Promise.all([
        ctx.prisma.post.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { createdAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
        ctx.prisma.post.count({ where }),
      ]);
      return { posts, total, page, pageSize };
    }),

  adminDeletePost: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        select: { id: true, userId: true, title: true },
      });
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "帖子不存在" });

      await ctx.prisma.$transaction([
        ctx.prisma.comment.deleteMany({ where: { postId: input.id } }),
        ctx.prisma.post.delete({ where: { id: input.id } }),
      ]);

      await writeAuditLog({
        actorId: ctx.user.id,
        action: "post.delete",
        targetType: "Post",
        targetId: post.id,
        summary: `删除帖子「${post.title}」`,
        metadata: { authorId: post.userId, reason: input.reason },
        headers: ctx.headers,
      });

      return { success: true };
    }),

  adminDeleteComment: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.prisma.comment.findUnique({
        where: { id: input.id },
        select: { id: true, postId: true, userId: true, content: true },
      });
      if (!comment)
        throw new TRPCError({ code: "NOT_FOUND", message: "评论不存在" });

      await ctx.prisma.comment.delete({ where: { id: input.id } });

      await writeAuditLog({
        actorId: ctx.user.id,
        action: "comment.delete",
        targetType: "Comment",
        targetId: comment.id,
        summary: `删除评论`,
        metadata: {
          postId: comment.postId,
          authorId: comment.userId,
          reason: input.reason,
          preview: comment.content.slice(0, 80),
        },
        headers: ctx.headers,
      });

      return { success: true };
    }),
});
