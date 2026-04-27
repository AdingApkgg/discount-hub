"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useSiteContent, asNumber } from "@/hooks/use-site-content";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  INFO: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  WARNING: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  SUCCESS: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  CRITICAL: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
};

export default function NoticeBanner() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const noticeContent = useSiteContent("notice");
  const criticalToastDuration = asNumber(
    noticeContent["notice.critical_toast_duration_ms"],
    12000,
  );
  const maxVisible = asNumber(noticeContent["notice.max_visible_banners"], 1);

  const { data } = useQuery(trpc.notice.listActive.queryOptions());
  const markRead = useMutation(trpc.notice.markRead.mutationOptions());

  useEffect(() => {
    if (!data?.length) return;
    for (const n of data) {
      if (n.level !== "CRITICAL" || n.read) continue;
      const key = `notice:critical-toast:${n.id}`;
      try {
        if (sessionStorage.getItem(key)) continue;
        sessionStorage.setItem(key, "1");
        toast.error(n.title, {
          description: n.content,
          duration: criticalToastDuration,
        });
      } catch {
        /* sessionStorage unavailable */
      }
    }
  }, [data, criticalToastDuration]);

  const visible = useMemo(() => {
    return (data ?? [])
      .filter((n) => n.pinned && !n.read && !dismissed.has(n.id))
      .slice(0, Math.max(1, maxVisible));
  }, [data, dismissed, maxVisible]);

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 px-4 py-3">
      {visible.map((n) => (
        <div
          key={n.id}
          className={cn(
            "relative flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm",
            LEVEL_STYLES[n.level] ?? LEVEL_STYLES.INFO,
          )}
        >
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{n.title}</div>
            <p className="mt-0.5 line-clamp-2 text-xs opacity-80">{n.content}</p>
            {n.linkUrl ? (
              <Link
                href={n.linkUrl}
                className="mt-1 inline-block text-xs underline underline-offset-2"
              >
                查看详情
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="关闭"
            className="shrink-0 rounded-full p-1 opacity-70 hover:opacity-100"
            onClick={async () => {
              setDismissed((s) => new Set(s).add(n.id));
              try {
                await markRead.mutateAsync({ noticeId: n.id });
                await qc.invalidateQueries();
              } catch {}
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
