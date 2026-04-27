import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";

const TRPC_TO_HTTP: Record<string, number> = {
  PARSE_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_SUPPORTED: 405,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

export type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function jsonResponse(body: unknown, status: number): NextResponse {
  return withSecurityHeaders(
    NextResponse.json(body, { status }) as NextResponse,
  );
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse {
  const body: ErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return jsonResponse(body, status);
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return jsonResponse(data ?? null, status);
}

export function mapErrorToResponse(err: unknown): NextResponse {
  if (err instanceof TRPCError) {
    return jsonError(
      TRPC_TO_HTTP[err.code] ?? 500,
      err.code,
      err.message,
      err.cause instanceof ZodError ? err.cause.issues : undefined,
    );
  }
  if (err instanceof ZodError) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "请求参数校验失败",
      err.issues,
    );
  }
  console.error("[rest] unhandled error:", err);
  return jsonError(500, "INTERNAL_SERVER_ERROR", "服务器内部错误");
}
