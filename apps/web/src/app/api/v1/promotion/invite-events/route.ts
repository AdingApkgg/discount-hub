import { z } from "zod";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["推广 · 邀请漏斗"];

const BodySchema = z.object({
  eventType: z.enum(["SHARE_LINK", "SHARE_IMAGE"]),
});

const recordOp = defineOperation({
  method: "POST",
  path: "/api/v1/promotion/invite-events",
  scope: "promo:write",
  summary: "记录邀请事件（仅 SHARE_LINK / SHARE_IMAGE 由外部上报）",
  description:
    "`LINK_VISIT` / `REGISTER` / `ORDER` 由系统自动写入，无需调用此接口。",
  tags: TAGS,
  body: BodySchema,
  response: z.object({ ok: z.boolean() }),
  handler: async ({ body, ctx }) => {
    return callerFor(ctx).share.recordInviteEvent(
      body as z.infer<typeof BodySchema>,
    );
  },
});

export const POST = toHandler(recordOp);
