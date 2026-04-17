import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { env } from "@/env";
import { prisma } from "./prisma";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  baseURL:
    env.BETTER_AUTH_URL ??
    env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [username()],
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "CONSUMER", input: false },
      points: { type: "number", defaultValue: 0, input: false },
      vipLevel: { type: "number", defaultValue: 0, input: false },
      phone: { type: "string", required: false, input: false },
      inviteCode: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh after 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min client-side cookie cache
    },
  },
  advanced: {
    cookiePrefix: "dh",
    ...(isProd && {
      defaultCookieAttributes: {
        secure: true,
        httpOnly: true,
        sameSite: "lax" as const,
      },
    }),
  },
  trustedOrigins: [
    env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ],
  rateLimit: {
    window: 60,
    max: 20,
  },
});
