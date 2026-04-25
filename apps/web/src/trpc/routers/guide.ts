import { createTRPCRouter, protectedProcedure } from "../init";

export const guideRouter = createTRPCRouter({
  getActiveRedemption: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.redemptionGuide.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        headline: true,
        subline: true,
        ctaText: true,
        minPoints: true,
        cooldownHours: true,
        showFab: true,
      },
    });
  }),
});
