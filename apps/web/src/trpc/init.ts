import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { readRiskHeaders } from "@/lib/device-risk";
import { resolveApiKeyAuth, type ApiAuthResult } from "@/lib/api-key";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Bearer token (API key) takes precedence: agents using a key never need
  // a cookie. When no key is present, fall back to the cookie session.
  const apiAuth = await resolveApiKeyAuth(prisma, opts.headers);
  const session = apiAuth
    ? null
    : await auth.api.getSession({ headers: opts.headers });

  const user = (apiAuth?.user ?? session?.user ?? null) as
    | (NonNullable<ApiAuthResult>["user"] & { isBanned?: boolean })
    | null;

  return {
    prisma,
    redis,
    session,
    apiAuth,
    user,
    headers: opts.headers,
    risk: readRiskHeaders(opts.headers),
  };
};

const isProd = process.env.NODE_ENV === "production";

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
    errorFormatter(opts) {
      const { shape, error } = opts;
      if (isProd && error.code === "INTERNAL_SERVER_ERROR") {
        return {
          ...shape,
          message: "服务器内部错误，请稍后重试",
        };
      }
      return shape;
    },
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
  if ((ctx.user as { isBanned?: boolean }).isBanned) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "账号已被封禁，如有疑问请联系管理员",
    });
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
