import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["推广 · 代理商"];

const ApplicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  realName: z.string(),
  region: z.string(),
  platforms: z.array(z.string()),
  qualificationUrl: z.string().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
});

const listOp = defineOperation({
  method: "GET",
  path: "/api/v1/promotion/agents/applications",
  scope: "promo:read",
  summary: "列出代理商申请（按时间倒序）",
  description: "返回所有申请记录，包含 PENDING/APPROVED/REJECTED 三种状态。",
  tags: TAGS,
  response: z.array(ApplicationSchema),
  handler: async ({ ctx }) => {
    return callerFor(ctx).agent.pendingApplications();
  },
});

export const GET = toHandler(listOp);
