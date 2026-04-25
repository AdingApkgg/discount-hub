import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!code || code.length > 20) {
    return NextResponse.json({ error: "短链不存在" }, { status: 404 });
  }

  const link = await prisma.shortLink.findUnique({
    where: { code },
    select: { targetUrl: true, expiresAt: true, kind: true, userId: true },
  });

  if (!link) {
    return NextResponse.json({ error: "短链不存在" }, { status: 404 });
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "短链已过期" }, { status: 410 });
  }

  // Best-effort click increment; don't block redirect on failure.
  prisma.shortLink
    .update({ where: { code }, data: { clicks: { increment: 1 } } })
    .catch((err) => {
      console.error("[shortLink] click increment failed:", err);
    });

  // Best-effort LINK_VISIT event for invite-kind links so the funnel can
  // separate "shared the link" from "the link was actually opened".
  if (link.kind === "invite" && link.userId) {
    const inviteCodeMatch = link.targetUrl.match(/inviteCode=([^&]+)/);
    const inviteCode = inviteCodeMatch
      ? decodeURIComponent(inviteCodeMatch[1])
      : null;
    prisma.inviteEvent
      .create({
        data: {
          ownerId: link.userId,
          eventType: "LINK_VISIT",
          inviteCode,
          metadata: { code, targetUrl: link.targetUrl },
        },
      })
      .catch((err) => {
        console.error("[shortLink] LINK_VISIT record failed:", err);
      });
  }

  return NextResponse.redirect(link.targetUrl, { status: 302 });
}
