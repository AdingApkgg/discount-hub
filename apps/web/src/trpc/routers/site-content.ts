import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import { mergeSiteContent } from "@/lib/site-content-defaults";

export const siteContentRouter = createTRPCRouter({
  /** Fetch all keys in a category, merged with hardcoded defaults so unsaved keys still resolve. */
  getByCategory: publicProcedure
    .input(z.object({ category: z.string().min(1).max(60) }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.siteContent.findMany({
        where: { category: input.category },
        orderBy: { sortOrder: "asc" },
        select: { key: true, value: true },
      });
      const dbMap: Record<string, unknown> = {};
      for (const item of items) {
        dbMap[item.key] = item.value;
      }
      return mergeSiteContent(input.category, dbMap);
    }),
});
