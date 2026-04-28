import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { env } from "@/env";
import { prisma } from "./prisma";
import { ensureInviteCode } from "./invite-code";

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
  databaseHooks: {
    user: {
      create: {
        // Assign every newly registered user a unique 8-char invite code
        // so they can immediately share / earn referral rewards.
        after: async (user: { id: string }) => {
          try {
            await ensureInviteCode(prisma, user.id);
          } catch (err) {
            console.error("[auth.databaseHooks.user.create.after] failed to assign invite code", err);
          }
        },
      },
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
