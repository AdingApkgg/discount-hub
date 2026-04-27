import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["CMS · 帖子审核"];

const ParamsSchema = z.object({ id: z.string().min(1) });

const DeleteBodySchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .optional();

const deleteOp = defineOperation({
  method: "DELETE",
  path: "/api/v1/cms/posts/{id}",
  scope: "cms:write",
  summary: "删除帖子（含评论级联）",
  description:
    "调用 `post.adminDeletePost`：在事务中删除帖子和其所有评论，并写入审计日志。",
  tags: TAGS,
  params: ParamsSchema,
  body: DeleteBodySchema,
  response: z.object({ success: z.boolean() }),
  handler: async ({ params, body, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    const reason = (body as { reason?: string } | undefined)?.reason;
    return callerFor(ctx).post.adminDeletePost({ id, reason });
  },
});

export const DELETE = toHandler(deleteOp);
