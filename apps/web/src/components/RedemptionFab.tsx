"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Gift, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

const HIDDEN_KEY = "redemption_fab_hidden_until_ms";

const SUPPRESSED_PATHS = ["/category/zero", "/scroll/", "/login", "/register"];

function isSuppressed(pathname: string | null): boolean {
  if (!pathname) return true;
  return SUPPRESSED_PATHS.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p,
  );
}

export default function RedemptionFab() {
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  const { data: profile } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  });
  const { data: guide } = useQuery({
    ...trpc.guide.getActiveRedemption.queryOptions(),
    enabled: !!session?.user,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = sessionStorage.getItem(HIDDEN_KEY);
    if (v && Number(v) > Date.now()) {
      setDismissed(true);
    }
  }, []);

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      // Hide for the next hour within this session.
      sessionStorage.setItem(HIDDEN_KEY, String(Date.now() + 60 * 60 * 1000));
    }
  }

  const points = profile?.points ?? 0;

  if (!session?.user || !guide || !guide.showFab) return null;
  if (points < guide.minPoints) return null;
  if (dismissed) return null;
  if (isSuppressed(pathname)) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ bottom: "calc(80px + env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-primary-foreground shadow-lg shadow-primary/30">
        <button
          onClick={() => router.push("/category/zero")}
          className="flex items-center gap-2 text-sm font-bold"
        >
          <Gift className="h-4 w-4" />
          <span>{guide.ctaText}</span>
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-black tabular-nums">
            {points.toLocaleString()} 积分
          </span>
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-full p-0.5 text-primary-foreground/70 hover:text-primary-foreground"
          aria-label="关闭"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
