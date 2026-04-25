import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";

const ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode(length = 7): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export const shareRouter = createTRPCRouter({
  createShortLink: protectedProcedure
    .input(
      z.object({
        targetUrl: z.string().url().max(2000),
        kind: z.string().min(1).max(40).default("invite"),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Try a handful of candidate codes to dodge unique-constraint collisions.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();
        try {
          const link = await ctx.prisma.shortLink.create({
            data: {
              code,
              targetUrl: input.targetUrl,
              kind: input.kind,
              userId: ctx.user.id,
              expiresAt,
            },
            select: { code: true, targetUrl: true, expiresAt: true },
          });
          return link;
        } catch (err: unknown) {
          // Prisma P2002 = unique constraint violation; retry with a new code.
          const e = err as { code?: string };
          if (e?.code !== "P2002") {
            throw err;
          }
        }
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "短链生成失败，请稍后重试",
      });
    }),

  listActivePosterTemplates: protectedProcedure
    .input(
      z
        .object({
          kind: z.string().min(1).max(40).default("invite"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const kind = input?.kind ?? "invite";
      return ctx.prisma.posterTemplate.findMany({
        where: { isActive: true, kind },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          headline: true,
          subline: true,
          ctaText: true,
          bgGradient: true,
          accentColor: true,
        },
      });
    }),
});
