import { createCallerFactory } from "@/trpc/init";
import { appRouter, type AppRouter } from "@/trpc/routers/_app";
import type { createTRPCContext } from "@/trpc/init";

const factory = createCallerFactory(appRouter);

export type AppCaller = ReturnType<typeof factory>;
export type Trpc = AppRouter;

/** Build a tRPC caller bound to the given REST request context. */
export function callerFor(
  ctx: Awaited<ReturnType<typeof createTRPCContext>>,
): AppCaller {
  return factory(ctx);
}
