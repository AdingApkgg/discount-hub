import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["推广 · 代理商"];

const ParamsSchema = z.object({ id: z.string().min(1) });

const BodySchema = z.object({
  approve: z.boolean(),
  note: z.string().optional(),
});

const ApplicationSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
});

const reviewOp = defineOperation({
  method: "POST",
  path: "/api/v1/promotion/agents/applications/{id}/review",
  scope: "promo:write",
  summary: "审核代理商申请（通过会自动把用户角色设为 AGENT）",
  tags: TAGS,
  params: ParamsSchema,
  body: BodySchema,
  response: ApplicationSchema,
  handler: async ({ params, body, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    return callerFor(ctx).agent.reviewApplication({
      id,
      ...(body as z.infer<typeof BodySchema>),
    });
  },
});

export const POST = toHandler(reviewOp);
