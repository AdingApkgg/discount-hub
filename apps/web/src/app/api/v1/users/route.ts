import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["用户管理"];

const UserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.enum(["CONSUMER", "MERCHANT", "AGENT", "ADMIN"]),
  points: z.number().int(),
  vipLevel: z.number().int(),
  createdAt: z.string().datetime(),
  _count: z.object({
    orders: z.number().int(),
    coupons: z.number().int(),
    referrals: z.number().int(),
  }),
});

const ListResponseSchema = z.object({
  users: z.array(UserSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z
    .enum(["all", "CONSUMER", "MERCHANT", "AGENT", "ADMIN"])
    .default("all"),
  search: z.string().optional(),
});

const listOp = defineOperation({
  method: "GET",
  path: "/api/v1/users",
  scope: "users:read",
  summary: "分页列出用户（按 createdAt desc）",
  description:
    "支持按角色过滤 + 关键字搜索（匹配 name / email / phone，大小写不敏感）。",
  tags: TAGS,
  query: ListQuerySchema,
  response: ListResponseSchema,
  handler: async ({ query, ctx }) => {
    return callerFor(ctx).admin.listUsers(
      query as z.infer<typeof ListQuerySchema>,
    );
  },
});

export const GET = toHandler(listOp);
