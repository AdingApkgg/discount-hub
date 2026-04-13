import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({ headers: opts.headers });

  return {
    prisma,
    redis,
    session,
    user: session?.user ?? null,
    headers: opts.headers,
  };
};

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

/** Rate-limited public procedure: 60 req / 60s per IP */
export const publicProcedure = t.procedure.use(async ({ ctx, next }) => {
  const ip =
    ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ctx.headers.get("x-real-ip") ??
    "anonymous";
  await checkRateLimit(`pub:${ip}`, { max: 60, windowSec: 60 });
  return next({ ctx });
});

/** Rate-limited + auth: 30 req / 60s per user */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
  }
  await checkRateLimit(`user:${ctx.user.id}`, { max: 30, windowSec: 60 });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Merchant-only: 30 req / 60s per user */
export const merchantProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.user.role !== "MERCHANT" && ctx.user.role !== "ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅商家可访问" });
    }
    return next({ ctx });
  },
);

/** Admin-only: 30 req / 60s per user */
export const adminProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.user.role !== "ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可访问" });
    }
    return next({ ctx });
  },
);

/** Strict rate limit for sensitive mutations: 10 req / 60s */
export const sensitiveProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    await checkRateLimit(`sensitive:${ctx.user.id}`, {
      max: 10,
      windowSec: 60,
    });
    return next({ ctx });
  },
);
