import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { defineOperation, toHandler } from "@/lib/rest/handler";
import { callerFor } from "@/lib/rest/caller";

const TAGS = ["用户管理"];

const ParamsSchema = z.object({ id: z.string().min(1) });

const UserDetailSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    role: z.enum(["CONSUMER", "MERCHANT", "AGENT", "ADMIN"]),
    points: z.number().int(),
    vipLevel: z.number().int(),
    vipExpiresAt: z.string().datetime().nullable(),
    inviteCode: z.string().nullable(),
    invitedById: z.string().nullable(),
    isBanned: z.boolean(),
    banReason: z.string().nullable(),
    bannedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
});

const PatchBodySchema = z
  .object({
    role: z.enum(["CONSUMER", "MERCHANT", "AGENT", "ADMIN"]).optional(),
    vipLevel: z.number().int().min(0).max(10).optional(),
    vipExpiresAt: z.string().datetime().nullable().optional(),
    banned: z.boolean().optional(),
    parentAgentId: z.string().nullable().optional(),
    reason: z.string().min(1).max(500).optional(),
  })
  .refine(
    (v) =>
      v.role !== undefined ||
      v.vipLevel !== undefined ||
      v.banned !== undefined ||
      v.parentAgentId !== undefined,
    { message: "PATCH 至少需要一个字段：role / vipLevel / banned / parentAgentId" },
  )
  .refine((v) => v.vipLevel === undefined || v.reason !== undefined, {
    message: "修改 vipLevel 时必须提供 reason",
    path: ["reason"],
  });

const PatchResponseSchema = z.object({
  applied: z.array(
    z.enum(["role", "vip", "ban", "parentAgent"]),
  ),
  user: z.object({
    id: z.string(),
    role: z.string(),
    vipLevel: z.number().int(),
    vipExpiresAt: z.string().datetime().nullable(),
    isBanned: z.boolean(),
    parentAgentId: z.string().nullable(),
  }),
});

const getOp = defineOperation({
  method: "GET",
  path: "/api/v1/users/{id}",
  scope: "users:read",
  summary: "获取用户详情（含最近 10 单 / 10 次签到 / 20 条审计）",
  tags: TAGS,
  params: ParamsSchema,
  response: UserDetailSchema,
  handler: async ({ params, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    return callerFor(ctx).admin.userDetail({ userId: id });
  },
});

const patchOp = defineOperation({
  method: "PATCH",
  path: "/api/v1/users/{id}",
  scope: "users:write",
  summary: "修改用户字段（role / vipLevel / banned / parentAgentId）",
  description:
    "可在单次请求中合并 1-N 个变更。每个字段会调用对应的 tRPC 过程并独立写入审计日志。" +
    "若中途某项失败，已成功的变更不会回滚。",
  tags: TAGS,
  params: ParamsSchema,
  body: PatchBodySchema,
  response: PatchResponseSchema,
  handler: async ({ params, body, ctx }) => {
    const { id } = params as z.infer<typeof ParamsSchema>;
    const input = body as z.infer<typeof PatchBodySchema>;
    const caller = callerFor(ctx);
    const applied: ("role" | "vip" | "ban" | "parentAgent")[] = [];

    if (input.role !== undefined) {
      await caller.admin.updateUserRole({ userId: id, role: input.role });
      applied.push("role");
    }
    if (input.vipLevel !== undefined) {
      if (input.reason === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "修改 vipLevel 时必须提供 reason",
        });
      }
      await caller.admin.setUserVip({
        userId: id,
        vipLevel: input.vipLevel,
        vipExpiresAt: input.vipExpiresAt,
        reason: input.reason,
      });
      applied.push("vip");
    }
    if (input.banned !== undefined) {
      await caller.admin.setUserBanned({
        userId: id,
        banned: input.banned,
        reason: input.reason,
      });
      applied.push("ban");
    }
    if (input.parentAgentId !== undefined) {
      await caller.admin.setUserParentAgent({
        userId: id,
        parentAgentId: input.parentAgentId,
      });
      applied.push("parentAgent");
    }

    const user = await ctx.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        vipLevel: true,
        vipExpiresAt: true,
        isBanned: true,
        parentAgentId: true,
      },
    });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
    }
    return { applied, user };
  },
});

export const GET = toHandler(getOp);
export const PATCH = toHandler(patchOp);
