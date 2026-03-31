import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    RAINBOW_EASYPAY_API_URL: z.string().url().optional(),
    RAINBOW_EASYPAY_PID: z.string().min(1).optional(),
    RAINBOW_EASYPAY_KEY: z.string().min(1).optional(),
    PAYPAL_CLIENT_ID: z.string().min(1).optional(),
    PAYPAL_CLIENT_SECRET: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    USDT_TRC20_RECEIVE_ADDRESS: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    RAINBOW_EASYPAY_API_URL: process.env.RAINBOW_EASYPAY_API_URL,
    RAINBOW_EASYPAY_PID: process.env.RAINBOW_EASYPAY_PID,
    RAINBOW_EASYPAY_KEY: process.env.RAINBOW_EASYPAY_KEY,
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    USDT_TRC20_RECEIVE_ADDRESS: process.env.USDT_TRC20_RECEIVE_ADDRESS,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
