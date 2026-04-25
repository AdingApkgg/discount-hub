"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ProductItem = RouterOutputs["product"]["list"][number];

const LAST_SHOWN_KEY = "redemption_prompt_last_shown_ms";
const LAST_POINTS_KEY = "redemption_prompt_last_points";

function readLastShown(): number {
  if (typeof window === "undefined") return 0;
  const v = sessionStorage.getItem(LAST_SHOWN_KEY);
  return v ? Number(v) || 0 : 0;
}

function writeLastShown(ms: number) {
  sessionStorage.setItem(LAST_SHOWN_KEY, String(ms));
}

function readLastPoints(): number {
  if (typeof window === "undefined") return 0;
  const v = sessionStorage.getItem(LAST_POINTS_KEY);
  return v ? Number(v) || 0 : 0;
}

function writeLastPoints(p: number) {
  sessionStorage.setItem(LAST_POINTS_KEY, String(p));
}

export default function RedemptionPrompt() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const { data: profile } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  });
  const { data: guide } = useQuery({
    ...trpc.guide.getActiveRedemption.queryOptions(),
    enabled: !!session?.user,
  });
  const points = profile?.points ?? 0;

  const { data: zeroProducts } = useQuery({
    ...trpc.product.list.queryOptions({ category: "zero" }),
    enabled: open,
  });

  const redeemable = ((zeroProducts ?? []) as ProductItem[]).filter(
    (p) => p.pointsPrice <= points,
  );

  useEffect(() => {
    if (!session?.user || !guide || !profile) return;
    if (points < guide.minPoints) {
      // Track baseline so we can detect later threshold crossings.
      writeLastPoints(points);
      return;
    }

    const lastPoints = readLastPoints();
    const lastShown = readLastShown();
    const cooldownMs = guide.cooldownHours * 60 * 60 * 1000;
    const cooldownExpired = Date.now() - lastShown >= cooldownMs;
    // Only re-fire if user just crossed threshold or earned new points since last show.
    const crossedThreshold = lastPoints < guide.minPoints && points >= guide.minPoints;
    const earnedSinceLast = points > lastPoints && cooldownExpired;

    if (crossedThreshold || earnedSinceLast) {
      const timer = setTimeout(() => {
        setOpen(true);
        writeLastShown(Date.now());
        writeLastPoints(points);
      }, 800);
      return () => clearTimeout(timer);
    }

    writeLastPoints(points);
  }, [session, guide, profile, points]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleGoRedeem = useCallback(() => {
    setOpen(false);
    router.push("/category/zero");
  }, [router]);

  if (!session?.user || !guide) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm rounded-[28px] border-border bg-background p-0">
        <div className="relative">
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 rounded-full bg-secondary/80 p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="rounded-t-[28px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-4 pt-7 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Gift className="h-7 w-7 text-primary" />
            </div>
            <div className="mt-3 text-lg font-bold text-foreground">
              {guide.headline}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {guide.subline || `当前积分 ${points.toLocaleString()}，已可兑换以下商品`}
            </div>
          </div>

          <div className="space-y-2 px-5 pt-3">
            {redeemable.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                继续累积更多积分即可解锁更多商品
              </div>
            ) : (
              redeemable.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/scroll/${p.id}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-secondary/40 p-3 text-left hover:bg-secondary/60"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {p.title}
                    </div>
                    <div className="mt-0.5 text-xs font-bold text-primary">
                      {p.pointsPrice.toLocaleString()} 积分
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-5 pb-5 pt-3">
            <Button onClick={handleGoRedeem} className="w-full rounded-full">
              <Gift className="h-4 w-4" />
              {guide.ctaText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
