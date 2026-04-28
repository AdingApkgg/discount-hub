/**
 * Backfill: assign a unique invite code to every user that currently has NULL.
 *
 * Idempotent — only touches rows where inviteCode IS NULL. Safe to re-run.
 *
 * Run separately against each DB by pointing DATABASE_URL at it:
 *   DATABASE_URL=postgresql://... pnpm --filter web exec tsx prisma/backfill-invite-codes.ts
 */

import "dotenv/config";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { ensureInviteCode } from "../src/lib/invite-code";

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
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  console.log(`Backfilling invite codes against: ${describeDb(url)}`);

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const usersWithoutCode = await prisma.user.findMany({
    where: { inviteCode: null },
    select: { id: true, email: true },
  });

  if (usersWithoutCode.length === 0) {
    console.log("✓ All users already have invite codes.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(`  Found ${usersWithoutCode.length} user(s) without invite code:`);
  for (const u of usersWithoutCode) {
    const code = await ensureInviteCode(prisma, u.id);
    console.log(`    ${u.email.padEnd(30)} → ${code}`);
  }

  console.log(`✓ Backfill complete (${usersWithoutCode.length} updated).`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
