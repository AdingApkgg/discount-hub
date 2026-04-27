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

const CreateBodySchema = z.object({
  name: z.string().min(1).max(80),
  headline: z.string().min(1).max(120),
  subline: z.string().max(200).default(""),
  ctaText: z.string().min(1).max(40),
  minPoints: z.number().int().min(0).max(1_000_000),
  cooldownHours: z.number().int().min(0).max(720),
  showFab: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

const listOp = defineOperation({
  method: "GET",
  path: "/api/v1/cms/redemption-guides",
  scope: "cms:read",
  summary: "列出兑换引导（弹窗 / FAB 配置）",
  tags: TAGS,
  response: z.array(GuideSchema),
  handler: async ({ ctx }) => {
    return callerFor(ctx).admin.listRedemptionGuides();
  },
});

const createOp = defineOperation({
  method: "POST",
  path: "/api/v1/cms/redemption-guides",
  scope: "cms:write",
  summary: "创建兑换引导",
  tags: TAGS,
  body: CreateBodySchema,
  response: GuideSchema,
  handler: async ({ body, ctx }) => {
    return callerFor(ctx).admin.upsertRedemptionGuide(
      body as z.infer<typeof CreateBodySchema>,
    );
  },
});

export const GET = toHandler(listOp);
export const POST = toHandler(createOp);
