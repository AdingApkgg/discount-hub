import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["推广 · 短链"];

const BodySchema = z.object({
  targetUrl: z.string().url().max(2000),
  kind: z.string().min(1).max(40).default("invite"),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const ResponseSchema = z.object({
  code: z.string(),
  targetUrl: z.string(),
  expiresAt: z.string().datetime().nullable(),
});

const createOp = defineOperation({
  method: "POST",
  path: "/api/v1/promotion/short-links",
  scope: "promo:write",
  summary: "创建短链（用于邀请页跳转）",
  description:
    "短链归属于 API Key 所属用户。返回的 `code` 用于拼接 `https://your-domain/s/{code}` 形式的短链。",
  tags: TAGS,
  body: BodySchema,
  response: ResponseSchema,
  handler: async ({ body, ctx }) => {
    return callerFor(ctx).share.createShortLink(
      body as z.infer<typeof BodySchema>,
    );
  },
});

export const POST = toHandler(createOp);
