import type { ZodTypeAny } from "zod";
import type { NextRequest } from "next/server";
import type { createTRPCContext } from "@/trpc/init";
import type { RestScope } from "./scopes";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiOperationSpec = {
  /** Uppercase HTTP method. */
  method: HttpMethod;
  /** OpenAPI-style path with `{param}` placeholders, e.g. `/api/v1/users/{id}`. */
  path: string;
  /** Required scope on the calling API key. */
  scope: RestScope;
  /** Short summary shown in the API doc. */
  summary: string;
  /** Long description (Markdown). Optional. */
  description?: string;
  /** OpenAPI tags (used for grouping in Swagger UI). */
  tags: string[];
  query?: ZodTypeAny;
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  /** Documentation-only. The handler's return is sent as-is, not re-validated. */
  response?: ZodTypeAny;
  handler: (input: {
    query: unknown;
    body: unknown;
    params: unknown;
    ctx: Awaited<ReturnType<typeof createTRPCContext>>;
    req: NextRequest;
  }) => Promise<unknown>;
};

const ops = new Map<string, ApiOperationSpec>();

/**
 * Registers a REST operation. Idempotent — re-registering the same
 * `${method} ${path}` overwrites the previous entry (so HMR in dev works).
 */
export function register(spec: ApiOperationSpec): ApiOperationSpec {
  const key = `${spec.method} ${spec.path}`;
  ops.set(key, spec);
  return spec;
}

export function getAllOperations(): ApiOperationSpec[] {
  return [...ops.values()].sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });
}
