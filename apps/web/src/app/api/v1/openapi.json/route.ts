import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security-headers";
import "@/lib/rest/routes-index";
import { getAllOperations } from "@/lib/rest/registry";
import { buildOpenApi } from "@/lib/rest/openapi";

export const dynamic = "force-dynamic";

export async function GET() {
  const doc = buildOpenApi(getAllOperations(), {
    title: "Discount Hub External API",
    version: "1.0.0",
    description:
      "面向外部代理与第三方系统的 REST API。\n\n" +
      "**鉴权**：所有请求必须在 `Authorization` 头中携带 API Key — `Bearer dh_live_...`。\n\n" +
      "**Scope**：每个 API Key 在签发时绑定 scope（如 `cms:read`、`users:write`）。" +
      "请求路由所需 scope 由 OpenAPI `security` 字段标注。\n\n" +
      "**错误格式**：`{ \"error\": { \"code\": \"...\", \"message\": \"...\", \"details\": ... } }`。",
    baseUrl: "/",
  });

  return withSecurityHeaders(NextResponse.json(doc) as NextResponse);
}
