import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["CMS · 兑换引导"];

const GuideSchema = z.object({
  id: z.string(),
  name: z.string(),
  headline: z.string(),
  subline: z.string(),
  ctaText: z.string(),
  minPoints: z.number().int(),
  cooldownHours: z.number().int(),
  showFab: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ParamsSchema = z.object({ id: z.string().min(1) });

const UpdateBodySchema = z.object({
  name: z.string().min(1).max(80),
  headline: z.string().min(1).max(120),
  subline: z.string().max(200).default(""),
  ctaText: z.string().min(1).max(40),
  minPoints: z.number().int().min(0).max(1_000_000),
  cooldownHours: z.number().int().min(0).max(720),
  showFab: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

const updateOp = defineOperation({
  method: "PUT",
  path: "/api/v1/cms/redemption-guides/{id}",
  scope: "cms:write",
  summary: "更新兑换引导（全量替换）",
  tags: TAGS,
  params: ParamsSchema,
  body: UpdateBodySchema,
  response: GuideSchema,
  handler: async ({ params, body, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    return callerFor(ctx).admin.upsertRedemptionGuide({
      id,
      ...(body as z.infer<typeof UpdateBodySchema>),
    });
  },
});

const deleteOp = defineOperation({
  method: "DELETE",
  path: "/api/v1/cms/redemption-guides/{id}",
  scope: "cms:write",
  summary: "删除兑换引导",
  tags: TAGS,
  params: ParamsSchema,
  response: z.object({ success: z.boolean() }),
  handler: async ({ params, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    await callerFor(ctx).admin.deleteRedemptionGuide({ id });
    return { success: true };
  },
});

export const PUT = toHandler(updateOp);
export const DELETE = toHandler(deleteOp);
