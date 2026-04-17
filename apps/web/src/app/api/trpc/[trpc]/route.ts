import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError({ path, error, type }) {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[tRPC ${type}] ${path ?? "?"}`, error.cause ?? error);
      }
    },
  });

export { handler as GET, handler as POST };
