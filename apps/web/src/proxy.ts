import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { withSecurityHeaders } from "@/lib/security-headers";

/** C 端需登录（会话级） */
const PROTECTED_PREFIXES = [
  "/member",
  "/coupons",
  "/orders",
  "/my-orders",
];

/** B 端（商家 / 管理员） */
const MERCHANT_PREFIXES = [
  "/merchant",
  "/dashboard",
  "/verify",
  "/verifications",
  "/products",
  "/agent-products",
  "/orders",
  "/settings",
  "/coupon-manage",
  "/users",
  "/agent-review",
  "/posts-manage",
  "/notices",
  "/audit-logs",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Next.js 16+：使用 `proxy` 约定（Node 运行时），可安全调用 better-auth + Prisma。
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.match(/\.(?:ico|svg|png|jpg|jpeg|gif|webp|css|js|woff2?)$/)
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  const needsAuth =
    matchesPrefix(pathname, PROTECTED_PREFIXES) ||
    matchesPrefix(pathname, MERCHANT_PREFIXES);

  if (!needsAuth) {
    return withSecurityHeaders(NextResponse.next());
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (matchesPrefix(pathname, MERCHANT_PREFIXES)) {
    const role = (session.user as { role?: string }).role;
    if (role !== "MERCHANT" && role !== "ADMIN") {
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/", request.url)),
      );
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
