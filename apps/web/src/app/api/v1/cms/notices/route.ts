import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["CMS · 公告"];

const NoticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  level: z.enum(["INFO", "WARNING", "SUCCESS", "CRITICAL"]),
  audience: z.enum(["ALL", "CONSUMER", "MERCHANT", "AGENT", "ADMIN"]),
  pinned: z.boolean(),
  isActive: z.boolean(),
  startAt: z.string().datetime().nullable(),
  endAt: z.string().datetime().nullable(),
  linkUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ListResponseSchema = z.object({
  notices: z.array(NoticeSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  includeInactive: z.coerce.boolean().default(true),
});

const CreateBodySchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(5000),
  level: z.enum(["INFO", "WARNING", "SUCCESS", "CRITICAL"]).default("INFO"),
  audience: z
    .enum(["ALL", "CONSUMER", "MERCHANT", "AGENT", "ADMIN"])
    .default("ALL"),
  pinned: z.boolean().default(false),
  isActive: z.boolean().default(true),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
});

const listOp = defineOperation({
  method: "GET",
  path: "/api/v1/cms/notices",
  scope: "cms:read",
  summary: "列出系统公告",
  description:
    "分页返回系统公告列表，按 `pinned desc, createdAt desc` 排序。需要 `cms:read` scope，且 API Key 所属用户必须为 ADMIN 角色。",
  tags: TAGS,
  query: ListQuerySchema,
  response: ListResponseSchema,
  handler: async ({ query, ctx }) => {
    return callerFor(ctx).admin.listNotices(query as z.infer<typeof ListQuerySchema>);
  },
});

const createOp = defineOperation({
  method: "POST",
  path: "/api/v1/cms/notices",
  scope: "cms:write",
  summary: "创建系统公告",
  description: "返回新建公告对象。需要 `cms:write` scope。",
  tags: TAGS,
  body: CreateBodySchema,
  response: NoticeSchema,
  handler: async ({ body, ctx }) => {
    return callerFor(ctx).admin.upsertNotice(
      body as z.infer<typeof CreateBodySchema>,
    );
  },
});

export const GET = toHandler(listOp);
export const POST = toHandler(createOp);
