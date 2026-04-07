import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/member", "/coupons", "/orders"];
const MERCHANT_PREFIXES = ["/merchant", "/dashboard", "/verify"];

const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-DNS-Prefetch-Control": "on",
};

function addSecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return response;
}

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static / API / _next assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.match(/\.(?:ico|svg|png|jpg|jpeg|gif|webp|css|js|woff2?)$/)
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  const needsAuth =
    matchesPrefix(pathname, PROTECTED_PREFIXES) ||
    matchesPrefix(pathname, MERCHANT_PREFIXES);

  if (!needsAuth) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Validate session server-side
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // Merchant role gate
  if (matchesPrefix(pathname, MERCHANT_PREFIXES)) {
    const role = (session.user as { role?: string }).role;
    if (role !== "MERCHANT" && role !== "ADMIN") {
      return addSecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
