/**
 * Sets Better Auth email/password (credential) for every user to the same plaintext.
 * Destructive — use only on databases you intend to wipe shared credentials on.
 *
 * Plaintext password is fixed to Merchant123! (meets app minPasswordLength).
 *
 * Requires ALLOW_RESET_ALL_USER_PASSWORDS=1.
 *
 * Run separately for dev and prod, each time with the correct DATABASE_URL:
 *   ALLOW_RESET_ALL_USER_PASSWORDS=1 pnpm --filter web run db:reset-all-passwords
 */

import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma";

const PLAIN_PASSWORD = "Merchant123!";

function describeDb(url: string): string {
  try {
    const normalized = url.replace(/^postgresql:/i, "http:");
    const u = new URL(normalized);
    const db = u.pathname.replace(/^\//, "") || "(no db name)";
    return `${u.hostname}:${u.port || "5432"}/${db}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  if (process.env.ALLOW_RESET_ALL_USER_PASSWORDS !== "1") {
    console.error(
      "Refusing to run: set ALLOW_RESET_ALL_USER_PASSWORDS=1 to confirm.",
    );
    process.exit(1);
  }

  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  if (PLAIN_PASSWORD.length < 8) {
    console.error("Configured password does not meet minimum length.");
    process.exit(1);
  }

  console.log(`Target database: ${describeDb(conn)}`);

  const pool = new Pool({ connectionString: conn });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { email: "asc" },
    });

    let touched = 0;
    let lastHash = "";

    for (const user of users) {
      lastHash = await hashPassword(PLAIN_PASSWORD);

      const existing = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });

      if (existing) {
        await prisma.account.update({
          where: { id: existing.id },
          data: { password: lastHash },
        });
      } else {
        await prisma.account.create({
          data: {
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: lastHash,
          },
        });
      }
      touched++;
      console.log(`  ✓ ${user.email}`);
    }

    if (users.length > 0 && lastHash) {
      if (!(await verifyPassword({ hash: lastHash, password: PLAIN_PASSWORD }))) {
        throw new Error("verifyPassword check failed after reset");
      }
    }

    console.log(
      `\nDone. Updated ${touched} user(s). Plaintext is the constant PLAIN_PASSWORD in this script.`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
