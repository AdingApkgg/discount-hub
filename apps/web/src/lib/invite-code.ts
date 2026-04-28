import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma";

// Avoid I/O/0/1/L for visual clarity — 31 chars × 8 positions ≈ 8.5e11 keyspace.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateInviteCode(length = CODE_LENGTH): string {
  // Rejection sampling: only accept bytes < 31 * floor(256 / 31) so the
  // distribution is uniform across the 31-char alphabet.
  const max = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  const out: string[] = [];
  while (out.length < length) {
    const buf = randomBytes(length * 2);
    for (const byte of buf) {
      if (byte >= max) continue;
      out.push(ALPHABET[byte % ALPHABET.length]);
      if (out.length >= length) break;
    }
  }
  return out.join("");
}

/**
 * Assign a unique invite code to the given user, retrying on rare collisions.
 * Returns the code that was set, or the existing one if already present.
 */
export async function ensureInviteCode(
  db: Pick<PrismaClient, "user">,
  userId: string,
): Promise<string> {
  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { inviteCode: true },
  });
  if (existing?.inviteCode) return existing.inviteCode;

  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateInviteCode();
    try {
      await db.user.update({
        where: { id: userId },
        data: { inviteCode: code },
      });
      return code;
    } catch (err) {
      // Prisma unique constraint code is P2002. If we hit it, regenerate and retry.
      const code = (err as { code?: string }).code;
      if (code === "P2002") continue;
      throw err;
    }
  }
  throw new Error("Failed to generate unique invite code after retries");
}
