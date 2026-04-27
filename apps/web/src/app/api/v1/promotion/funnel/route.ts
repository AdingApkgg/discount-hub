import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["推广 · 邀请漏斗"];

const FunnelStepSchema = z.object({
  label: z.string(),
  value: z.number().int(),
});

const ResponseSchema = z.object({
  totalUsers: z.number().int(),
  usersWithCode: z.number().int(),
  shareEvents: z.number().int(),
  shareLinkEvents: z.number().int(),
  shareImageEvents: z.number().int(),
  linkVisitEvents: z.number().int(),
  registerEvents: z.number().int(),
  invitedWithOrders: z.number().int(),
  steps: z.array(FunnelStepSchema),
});

const getOp = defineOperation({
  method: "GET",
  path: "/api/v1/promotion/funnel",
  scope: "promo:read",
  summary: "邀请漏斗统计（生成码 → 分享 → 访问 → 注册 → 下单）",
  tags: TAGS,
  response: ResponseSchema,
  handler: async ({ ctx }) => {
    return callerFor(ctx).admin.inviteFunnel();
  },
});

export const GET = toHandler(getOp);
