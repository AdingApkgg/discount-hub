import { prisma } from "@/lib/prisma";

export type AuditInput = {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
  headers?: Headers;
};

/**
 * 记录管理员/核心操作审计日志。不阻塞主流程——写失败仅打日志。
 */
export async function writeAuditLog(input: AuditInput) {
  const ip =
    input.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    input.headers?.get("x-real-ip") ??
    null;
  const userAgent = input.headers?.get("user-agent") ?? null;

  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        summary: input.summary ?? "",
        metadata: (input.metadata as object | undefined) ?? undefined,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] write failed", err);
  }
}
