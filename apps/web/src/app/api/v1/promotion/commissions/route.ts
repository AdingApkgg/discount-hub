import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["推广 · 佣金"];

const CommissionSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  orderId: z.string(),
  level: z.number().int(),
  rate: z.number(),
  amount: z.number(),
  status: z.enum(["PENDING", "PAID", "REVOKED"]),
  paidAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  agent: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
  }),
  order: z.object({
    id: z.string(),
    productId: z.string(),
    cashPaid: z.number(),
  }),
});

const ListResponseSchema = z.object({
  rows: z.array(CommissionSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const ListQuerySchema = z.object({
  status: z.enum(["PENDING", "PAID", "REVOKED"]).optional(),
  agentId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

const listOp = defineOperation({
  method: "GET",
  path: "/api/v1/promotion/commissions",
  scope: "promo:read",
  summary: "列出代理商佣金记录",
  description: "可按状态 / 代理商过滤。`amount` 为人民币元（Decimal 序列化为字符串/数字）。",
  tags: TAGS,
  query: ListQuerySchema,
  response: ListResponseSchema,
  handler: async ({ query, ctx }) => {
    return callerFor(ctx).admin.listAgentCommissions(
      query as z.infer<typeof ListQuerySchema>,
    );
  },
});

export const GET = toHandler(listOp);
