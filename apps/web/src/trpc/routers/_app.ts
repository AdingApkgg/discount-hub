import { createTRPCRouter } from "../init";
import { productRouter } from "./product";
import { orderRouter } from "./order";
import { verifyRouter } from "./verify";
import { pointsRouter } from "./points";
import { userRouter } from "./user";
import { adminRouter } from "./admin";
import { postRouter } from "./post";
import { agentRouter } from "./agent";
import { noticeRouter } from "./notice";
import { supportRouter } from "./support";

export const appRouter = createTRPCRouter({
  product: productRouter,
  order: orderRouter,
  verify: verifyRouter,
  points: pointsRouter,
  user: userRouter,
  admin: adminRouter,
  post: postRouter,
  agent: agentRouter,
  notice: noticeRouter,
  support: supportRouter,
});

export type AppRouter = typeof appRouter;
