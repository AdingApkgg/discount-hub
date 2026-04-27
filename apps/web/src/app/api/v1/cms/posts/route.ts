import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["CMS · 帖子审核"];

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  images: z.array(z.string()),
  app: z.string().nullable(),
  likeCount: z.number().int(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    })
    .nullable(),
  _count: z.object({ comments: z.number().int() }),
});

const ListResponseSchema = z.object({
  posts: z.array(PostSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

const listOp = defineOperation({
  method: "GET",
  path: "/api/v1/cms/posts",
  scope: "cms:read",
  summary: "列出帖子（管理审核视图）",
  description:
    "返回平台所有帖子的分页列表，支持按标题 / 内容 / 作者搜索。需要 ADMIN 角色 + `cms:read` scope。",
  tags: TAGS,
  query: ListQuerySchema,
  response: ListResponseSchema,
  handler: async ({ query, ctx }) => {
    return callerFor(ctx).post.adminList(
      query as z.infer<typeof ListQuerySchema>,
    );
  },
});

export const GET = toHandler(listOp);
