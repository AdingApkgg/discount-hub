import { NextRequest, NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { withSecurityHeaders } from "@/lib/security-headers";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
const DEFAULT_KIND = "products";
const KIND_PATTERN = /^[a-z0-9-]{1,32}$/;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return withSecurityHeaders(
      NextResponse.json({ error: "请先登录" }, { status: 401 }),
    );
  }
  if (session.user.role !== "MERCHANT" && session.user.role !== "ADMIN") {
    return withSecurityHeaders(
      NextResponse.json({ error: "仅商家可上传" }, { status: 403 }),
    );
  }

  try {
    await checkRateLimit(`upload:${session.user.id}`, {
      max: 30,
      windowSec: 60,
    });
  } catch (e) {
    if (e instanceof TRPCError && e.code === "TOO_MANY_REQUESTS") {
      return withSecurityHeaders(
        NextResponse.json({ error: e.message }, { status: 429 }),
      );
    }
    throw e;
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return withSecurityHeaders(
      NextResponse.json({ error: "未选择文件" }, { status: 400 }),
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: "仅支持 JPG / PNG / WebP / GIF 格式" },
        { status: 400 },
      ),
    );
  }
  if (file.size > MAX_SIZE) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: "文件大小不能超过 5MB" },
        { status: 400 },
      ),
    );
  }

  const kindRaw = formData.get("kind");
  const kind =
    typeof kindRaw === "string" && KIND_PATTERN.test(kindRaw)
      ? kindRaw
      : DEFAULT_KIND;
  const targetDir = path.join(UPLOADS_ROOT, kind);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await mkdir(targetDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(targetDir, filename), buffer);

  const url = `/uploads/${kind}/${filename}`;
  return withSecurityHeaders(NextResponse.json({ url }));
}
