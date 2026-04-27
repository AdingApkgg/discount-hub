import { z, type ZodTypeAny } from "zod";
import type { ApiOperationSpec } from "./registry";

type JsonSchemaObject = Record<string, unknown> & {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
};

const STANDARD_ERROR_RESPONSES = {
  "400": { description: "请求参数校验失败" },
  "401": { description: "缺少或无效的 API Key" },
  "403": { description: "API Key 权限不足（scope 不匹配）" },
  "404": { description: "目标资源不存在" },
  "429": { description: "速率限制触发" },
  "500": { description: "服务器内部错误" },
};

const ERROR_SCHEMA = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string", example: "BAD_REQUEST" },
        message: { type: "string", example: "请求参数校验失败" },
        details: {},
      },
    },
  },
};

export type OpenApiDoc = {
  openapi: "3.1.0";
  info: { title: string; version: string; description?: string };
  servers: { url: string; description?: string }[];
  tags: { name: string; description?: string }[];
  components: Record<string, unknown>;
  paths: Record<string, Record<string, unknown>>;
};

export function buildOpenApi(
  operations: ApiOperationSpec[],
  meta: { title: string; version: string; description?: string; baseUrl?: string },
): OpenApiDoc {
  const tagSet = new Set<string>();
  const paths: OpenApiDoc["paths"] = {};

  for (const op of operations) {
    op.tags.forEach((t) => tagSet.add(t));

    paths[op.path] ??= {};
    paths[op.path][op.method.toLowerCase()] = {
      summary: op.summary,
      description: op.description,
      tags: op.tags,
      security: [{ bearerAuth: [op.scope] }],
      parameters: [
        ...extractParameters(op.params, "path"),
        ...extractParameters(op.query, "query"),
      ],
      ...(op.body
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": { schema: zodToJson(op.body) },
              },
            },
          }
        : {}),
      responses: {
        "200": {
          description: "成功",
          content: op.response
            ? { "application/json": { schema: zodToJson(op.response) } }
            : { "application/json": { schema: {} } },
        },
        ...Object.fromEntries(
          Object.entries(STANDARD_ERROR_RESPONSES).map(([code, def]) => [
            code,
            {
              ...def,
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          ]),
        ),
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: meta,
    servers: [{ url: meta.baseUrl ?? "/" }],
    tags: [...tagSet].sort().map((name) => ({ name })),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key (dh_live_...)",
          description: "用 `Authorization: Bearer dh_live_...` 头部访问。在管理后台 → 设置 → API Keys 中签发。",
        },
      },
      schemas: { Error: ERROR_SCHEMA },
    },
    paths,
  };
}

function zodToJson(schema: ZodTypeAny): JsonSchemaObject {
  return z.toJSONSchema(schema) as JsonSchemaObject;
}

function extractParameters(
  schema: ZodTypeAny | undefined,
  location: "query" | "path",
): unknown[] {
  if (!schema) return [];
  const json = zodToJson(schema);
  if (json.type !== "object" || !json.properties) return [];

  const required = new Set(json.required ?? []);
  return Object.entries(json.properties).map(([name, propSchema]) => {
    // A field in `required` but with a `default` is required server-side
    // (Zod will produce a value), but optional from the client's POV.
    const hasDefault =
      propSchema !== null &&
      typeof propSchema === "object" &&
      "default" in (propSchema as Record<string, unknown>);
    const isRequired =
      location === "path" ? true : required.has(name) && !hasDefault;
    return {
      name,
      in: location,
      required: isRequired,
      schema: propSchema,
    };
  });
}
