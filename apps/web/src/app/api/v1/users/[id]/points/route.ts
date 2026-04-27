import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["用户管理"];

const ParamsSchema = z.object({ id: z.string().min(1) });

const BodySchema = z.object({
  delta: z.number().int().min(-1_000_000).max(1_000_000),
  reason: z.string().min(1).max(500),
});

const ResponseSchema = z.object({
  id: z.string(),
  points: z.number().int(),
});

const adjustOp = defineOperation({
  method: "POST",
  path: "/api/v1/users/{id}/points",
  scope: "users:write",
  summary: "调整用户积分（正/负 delta，自动写审计）",
  description:
    "积分余额会被夹到 `>= 0`：例如用户当前 50 积分，传 `delta=-200` 实际只会扣 50。返回更新后的余额。",
  tags: TAGS,
  params: ParamsSchema,
  body: BodySchema,
  response: ResponseSchema,
  handler: async ({ params, body, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    const input = body as z.infer<typeof BodySchema>;
    return callerFor(ctx).admin.adjustUserPoints({
      userId: id,
      delta: input.delta,
      reason: input.reason,
    });
  },
});

export const POST = toHandler(adjustOp);
