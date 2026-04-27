import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["推广 · 佣金"];

const ParamsSchema = z.object({ id: z.string().min(1) });

const ResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "PAID", "REVOKED"]),
  paidAt: z.string().datetime().nullable(),
});

const payOp = defineOperation({
  method: "POST",
  path: "/api/v1/promotion/commissions/{id}/pay",
  scope: "promo:write",
  summary: "标记佣金为已结算",
  description: "把指定佣金记录的 `status` 置为 `PAID`，并记录 `paidAt`。",
  tags: TAGS,
  params: ParamsSchema,
  response: ResponseSchema,
  handler: async ({ params, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    return callerFor(ctx).admin.markAgentCommissionPaid({ id });
  },
});

export const POST = toHandler(payOp);
