import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/generated/prisma";

const SUSPICION_WINDOW_MS = 60 * 60 * 1000; // 1h
const DISTINCT_USER_THRESHOLD = 3;

type DbLike = Pick<PrismaClient, "deviceFingerprint">;

export type RiskHeaders = {
  visitorId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export function readRiskHeaders(headers: Headers): RiskHeaders {
  const raw = headers.get("x-visitor-id");
  const visitorId =
    raw && /^[A-Za-z0-9_-]{6,128}$/.test(raw) ? raw : null;
  const ipAddress =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null;
  const userAgent = headers.get("user-agent");
  return { visitorId, ipAddress, userAgent };
}

/**
 * Records the (visitorId, userId) pair, refreshing lastSeenAt and metadata.
 * Returns the row, or null when no visitorId is available (anonymous client).
 */
export async function recordFingerprint(
  db: DbLike,
  userId: string,
  risk: RiskHeaders,
) {
  if (!risk.visitorId) return null;

  const row = await db.deviceFingerprint.upsert({
    where: {
      visitorId_userId: {
        visitorId: risk.visitorId,
        userId,
      },
    },
    create: {
      visitorId: risk.visitorId,
      userId,
      ipAddress: risk.ipAddress,
      userAgent: risk.userAgent ? risk.userAgent.slice(0, 1000) : null,
    },
    update: {
      lastSeenAt: new Date(),
      ipAddress: risk.ipAddress ?? undefined,
      userAgent: risk.userAgent ? risk.userAgent.slice(0, 1000) : undefined,
    },
  });

  // Risk rule: many distinct userIds on the same visitorId in the recent window
  // → flag every row sharing that visitorId as suspicious. Admin can clear.
  const since = new Date(Date.now() - SUSPICION_WINDOW_MS);
  const recent = await db.deviceFingerprint.findMany({
    where: { visitorId: risk.visitorId, lastSeenAt: { gte: since } },
    select: { userId: true },
  });
  const distinctUsers = new Set(recent.map((r) => r.userId).filter(Boolean));
  if (distinctUsers.size > DISTINCT_USER_THRESHOLD) {
    await db.deviceFingerprint.updateMany({
      where: { visitorId: risk.visitorId, suspicious: false },
      data: { suspicious: true },
    });
  }

  return row;
}

/**
 * Throws when the visitorId has been blocked by an admin. Anonymous (null)
 * visitor IDs are allowed through — the caller is responsible for deciding
 * whether to require a fingerprint.
 */
export async function assertNotBlocked(
  db: DbLike,
  risk: RiskHeaders,
): Promise<void> {
  if (!risk.visitorId) return;
  const blocked = await db.deviceFingerprint.findFirst({
    where: {
      visitorId: risk.visitorId,
      blockedAt: { not: null },
    },
    select: { blockReason: true },
  });
  if (blocked) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: blocked.blockReason
        ? `当前设备已被风控限制：${blocked.blockReason}`
        : "当前设备已被风控限制，如有疑问请联系客服",
    });
  }
}
