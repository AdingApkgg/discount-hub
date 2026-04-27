import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["推广 · 代理商"];

const AgentSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  createdAt: z.string().datetime(),
  parentAgentId: z.string().nullable(),
  pendingAmount: z.number(),
  paidAmount: z.number(),
  _count: z.object({
    downline: z.number().int(),
    agentCommissions: z.number().int(),
  }),
});

const ListResponseSchema = z.object({
  agents: z.array(AgentSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const listOp = defineOperation({
  method: "GET",
  path: "/api/v1/promotion/agents",
  scope: "promo:read",
  summary: "列出代理商（含待结算 / 已结算佣金小计 + 下线数量）",
  tags: TAGS,
  query: ListQuerySchema,
  response: ListResponseSchema,
  handler: async ({ query, ctx }) => {
    return callerFor(ctx).admin.listAgents(
      query as z.infer<typeof ListQuerySchema>,
    );
  },
});

export const GET = toHandler(listOp);
