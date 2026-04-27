import type { NextRequest } from "next/server";
import { resolveApiKeyAuth } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";
import { createTRPCContext } from "@/trpc/init";
import { hasScope } from "./scopes";
import { jsonError, jsonOk, mapErrorToResponse } from "./errors";
import { register, type ApiOperationSpec } from "./registry";

/**
 * Declarative spec helper. Registers the operation in the global registry
 * (consumed by /api/v1/openapi.json) and returns it unchanged.
 *
 * Query schemas should use `z.coerce.{number,boolean}()` for non-string
 * fields — URL search params are always strings.
 */
export function defineOperation(spec: ApiOperationSpec): ApiOperationSpec {
  return register(spec);
}

type RouteCtx = { params?: Promise<Record<string, string | string[] | undefined>> };

/**
 * Wraps a registered operation into a Next.js route-handler function.
 *
 * Per request:
 *   1. Bearer API key required (no cookie session — these endpoints are for
 *      external callers).
 *   2. Required scope on the key.
 *   3. Zod validation of query / path params / body.
 *   4. Build a tRPC context (so the handler can call procedures with the
 *      same auth / risk / rate-limit story) and dispatch.
 *   5. Map TRPCError / ZodError to standard JSON error responses.
 */
export function toHandler(spec: ApiOperationSpec) {
  return async (req: NextRequest, ctx?: RouteCtx) => {
    const apiAuth = await resolveApiKeyAuth(prisma, req.headers);
    if (!apiAuth) {
      return jsonError(
        401,
        "UNAUTHORIZED",
        "缺少 API Key，请在 Authorization 头中携带 `Bearer dh_live_...`",
      );
    }
    if (!hasScope(apiAuth.apiKey.scopes, spec.scope)) {
      return jsonError(
        403,
        "FORBIDDEN",
        `当前 API Key 缺少必需的 scope：${spec.scope}`,
      );
    }

    const url = new URL(req.url);
    const queryRaw = Object.fromEntries(url.searchParams.entries());
    const paramsRaw = ctx?.params ? await ctx.params : {};

    let bodyRaw: unknown = undefined;
    if (spec.body && req.method !== "GET" && req.method !== "HEAD") {
      try {
        const text = await req.text();
        bodyRaw = text ? JSON.parse(text) : undefined;
      } catch {
        return jsonError(400, "BAD_REQUEST", "请求体不是合法 JSON");
      }
    }

    let parsedQuery: unknown;
    let parsedBody: unknown;
    let parsedParams: unknown;
    try {
      parsedQuery = spec.query ? spec.query.parse(queryRaw) : queryRaw;
      parsedBody = spec.body ? spec.body.parse(bodyRaw) : bodyRaw;
      parsedParams = spec.params ? spec.params.parse(paramsRaw) : paramsRaw;
    } catch (err) {
      return mapErrorToResponse(err);
    }

    try {
      const trpcCtx = await createTRPCContext({ headers: req.headers });
      const result = await spec.handler({
        query: parsedQuery,
        body: parsedBody,
        params: parsedParams,
        ctx: trpcCtx,
        req,
      });
      return jsonOk(result ?? null);
    } catch (err) {
      return mapErrorToResponse(err);
    }
  };
}
