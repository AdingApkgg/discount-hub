import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma";

const KEY_PREFIX = "dh_live_";
const PREFIX_DISPLAY_LEN = 16;

export type GeneratedApiKey = {
  /** Plain-text key, returned to the caller exactly once. */
  key: string;
  /** Public prefix (first 16 chars) safe to display in admin UIs. */
  prefix: string;
  /** sha256 of the plain key, the only form persisted in the DB. */
  hashedKey: string;
};

export function generateApiKey(): GeneratedApiKey {
  const random = randomBytes(24).toString("base64url");
  const key = `${KEY_PREFIX}${random}`;
  return {
    key,
    prefix: key.slice(0, PREFIX_DISPLAY_LEN),
    hashedKey: hashApiKey(key),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function extractBearerToken(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!match) return null;
  const token = match[1].trim();
  if (token.length < 20 || token.length > 200) return null;
  if (!token.startsWith(KEY_PREFIX)) return null;
  return token;
}

type DbLike = Pick<PrismaClient, "apiKey" | "user">;

export type ApiAuthResult = {
  apiKey: {
    id: string;
    prefix: string;
    scopes: string[];
    userId: string;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    points: number;
    vipLevel: number;
    isBanned: boolean;
  };
};

/**
 * Resolves a Bearer token from the request headers into an authenticated
 * subject. Returns null when no token is present, the token is malformed,
 * the key is unknown, inactive, expired, or the owner is banned.
 *
 * Best-effort updates lastUsedAt + lastUsedIp without blocking the caller.
 */
export async function resolveApiKeyAuth(
  db: DbLike,
  headers: Headers,
): Promise<ApiAuthResult | null> {
  const token = extractBearerToken(headers);
  if (!token) return null;

  const hashedKey = hashApiKey(token);
  const row = await db.apiKey.findUnique({
    where: { hashedKey },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          points: true,
          vipLevel: true,
          isBanned: true,
        },
      },
    },
  });

  if (!row || !row.isActive) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  if (row.user.isBanned) return null;

  const ipAddress =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null;

  // Best-effort: don't await, don't fail the request if it fails.
  db.apiKey
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date(), lastUsedIp: ipAddress },
    })
    .catch((err) => {
      console.error("[api-key] lastUsedAt update failed:", err);
    });

  return {
    apiKey: {
      id: row.id,
      prefix: row.prefix,
      scopes: row.scopes,
      userId: row.userId,
    },
    user: row.user,
  };
}
