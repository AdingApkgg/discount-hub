import { z } from "zod";
import { TRPCError } from "@trpc/server";
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

const ParamsSchema = z.object({ id: z.string().min(1) });

const UpdateBodySchema = z.object({
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

const getOp = defineOperation({
  method: "GET",
  path: "/api/v1/cms/notices/{id}",
  scope: "cms:read",
  summary: "获取单条公告",
  tags: TAGS,
  params: ParamsSchema,
  response: NoticeSchema,
  handler: async ({ params, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    const notice = await ctx.prisma.systemNotice.findUnique({ where: { id } });
    if (!notice) {
      throw new TRPCError({ code: "NOT_FOUND", message: "公告不存在" });
    }
    return notice;
  },
});

const updateOp = defineOperation({
  method: "PUT",
  path: "/api/v1/cms/notices/{id}",
  scope: "cms:write",
  summary: "更新公告（全量替换）",
  tags: TAGS,
  params: ParamsSchema,
  body: UpdateBodySchema,
  response: NoticeSchema,
  handler: async ({ params, body, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    return callerFor(ctx).admin.upsertNotice({
      id,
      ...(body as z.infer<typeof UpdateBodySchema>),
    });
  },
});

const deleteOp = defineOperation({
  method: "DELETE",
  path: "/api/v1/cms/notices/{id}",
  scope: "cms:write",
  summary: "删除公告",
  tags: TAGS,
  params: ParamsSchema,
  response: z.object({ success: z.boolean() }),
  handler: async ({ params, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    await callerFor(ctx).admin.deleteNotice({ id });
    return { success: true };
  },
});

export const GET = toHandler(getOp);
export const PUT = toHandler(updateOp);
export const DELETE = toHandler(deleteOp);
