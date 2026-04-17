import { NextResponse } from "next/server";

const securityHeaderList: { key: string; value: string }[] = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/**
 * Apply standard security headers. HSTS in production (HTTPS only in real deploys).
 */
export function withSecurityHeaders<T extends NextResponse>(response: T): T {
  for (const { key, value } of securityHeaderList) {
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

/**
 * Best-effort for static / versioned assets: do not set HSTS (avoids dev http issues).
 */