import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { withSecurityHeaders } from "@/lib/security-headers";
import { writeAuditLog } from "@/lib/audit";

type ExportType = "orders" | "coupons" | "verifications";

async function buildOrdersCsv(url: URL) {
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  const createdAt: Record<string, Date> = {};
  if (from) createdAt.gte = new Date(from);
  if (to) createdAt.lte = new Date(to);
  if (Object.keys(createdAt).length) where.createdAt = createdAt;

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, name: true, phone: true } },
      product: { select: { id: true, title: true, app: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });

  const rows = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt ? o.paidAt.toISOString() : "",
    status: o.status,
    payMethod: o.payMethod,
    qty: o.qty,
    cashPaid: Number(o.cashPaid).toFixed(2),
    pointsPaid: o.pointsPaid,
    userId: o.user.id,
    userEmail: o.user.email,
    userName: o.user.name ?? "",
    userPhone: o.user.phone ?? "",
    productId: o.product.id,
    productTitle: o.product.title,
    productApp: o.product.app,
  }));

  return toCsv(rows, [
    { key: "id", label: "订单号" },
    { key: "createdAt", label: "创建时间" },
    { key: "paidAt", label: "支付时间" },
    { key: "status", label: "状态" },
    { key: "payMethod", label: "支付方式" },
    { key: "qty", label: "数量" },
    { key: "cashPaid", label: "现金金额" },
    { key: "pointsPaid", label: "积分支付" },
    { key: "userId", label: "用户ID" },
    { key: "userEmail", label: "用户邮箱" },
    { key: "userName", label: "用户名" },
    { key: "userPhone", label: "电话" },
    { key: "productId", label: "商品ID" },
    { key: "productTitle", label: "商品名称" },
    { key: "productApp", label: "APP" },
  ]);
}

async function buildCouponsCsv(url: URL) {
  const status = url.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  const coupons = await prisma.coupon.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, name: true } },
      product: { select: { id: true, title: true, app: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });
  const rows = coupons.map((c) => ({
    code: c.code,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    expiresAt: c.expiresAt.toISOString(),
    usedAt: c.usedAt ? c.usedAt.toISOString() : "",
    orderId: c.orderId,
    userId: c.user.id,
    userEmail: c.user.email,
    productTitle: c.product.title,
    productApp: c.product.app,
  }));
  return toCsv(rows, [
    { key: "code", label: "券码" },
    { key: "status", label: "状态" },
    { key: "createdAt", label: "发放时间" },
    { key: "expiresAt", label: "过期时间" },
    { key: "usedAt", label: "核销时间" },
    { key: "orderId", label: "订单号" },
    { key: "userId", label: "用户ID" },
    { key: "userEmail", label: "用户邮箱" },
    { key: "productTitle", label: "商品" },
    { key: "productApp", label: "APP" },
  ]);
}

async function buildVerificationsCsv(url: URL) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const where: Record<string, unknown> = {};
  const verifiedAt: Record<string, Date> = {};
  if (from) verifiedAt.gte = new Date(from);
  if (to) verifiedAt.lte = new Date(to);
  if (Object.keys(verifiedAt).length) where.verifiedAt = verifiedAt;

  const records = await prisma.verificationRecord.findMany({
    where,
    include: {
      coupon: {
        include: {
          product: { select: { title: true, app: true } },
          user: { select: { email: true, name: true } },
        },
      },
      verifier: { select: { email: true, name: true } },
    },
    orderBy: { verifiedAt: "desc" },
    take: 10_000,
  });
  const rows = records.map((r) => ({
    id: r.id,
    verifiedAt: r.verifiedAt.toISOString(),
    couponCode: r.coupon.code,
    productTitle: r.coupon.product.title,
    productApp: r.coupon.product.app,
    userEmail: r.coupon.user.email,
    userName: r.coupon.user.name ?? "",
    verifierEmail: r.verifier.email,
    verifierName: r.verifier.name ?? "",
    notes: r.notes,
  }));
  return toCsv(rows, [
    { key: "id", label: "记录ID" },
    { key: "verifiedAt", label: "核销时间" },
    { key: "couponCode", label: "券码" },
    { key: "productTitle", label: "商品" },
    { key: "productApp", label: "APP" },
    { key: "userEmail", label: "用户邮箱" },
    { key: "userName", label: "用户名" },
    { key: "verifierEmail", label: "核销人邮箱" },
    { key: "verifierName", label: "核销人" },
    { key: "notes", label: "备注" },
  ]);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ type: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return withSecurityHeaders(
      NextResponse.json({ error: "请先登录" }, { status: 401 }),
    );
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "MERCHANT" && role !== "ADMIN") {
    return withSecurityHeaders(
      NextResponse.json({ error: "仅商家可导出" }, { status: 403 }),
    );
  }

  const { type } = await ctx.params;
  const allowed: ExportType[] = ["orders", "coupons", "verifications"];
  if (!allowed.includes(type as ExportType)) {
    return withSecurityHeaders(
      NextResponse.json({ error: "不支持的导出类型" }, { status: 400 }),
    );
  }

  const url = new URL(req.url);
  const csv =
    type === "orders"
      ? await buildOrdersCsv(url)
      : type === "coupons"
        ? await buildCouponsCsv(url)
        : await buildVerificationsCsv(url);

  const filename = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  await writeAuditLog({
    actorId: session.user.id,
    action: `export.${type}`,
    targetType: "Export",
    summary: `导出 ${type} ${csv.split("\n").length - 1} 行`,
    metadata: {
      params: Object.fromEntries(url.searchParams.entries()),
    },
    headers: req.headers,
  });

  return withSecurityHeaders(
    new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    }) as NextResponse,
  );
}
