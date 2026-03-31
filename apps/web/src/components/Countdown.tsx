"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function Countdown({
  targetAt,
  variant = "dark",
}: {
  targetAt: number;
  variant?: "dark" | "light";
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, targetAt - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const chipClassName =
    variant === "light"
      ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
      : "border border-white/10 bg-white/10 text-[var(--text)]";
  const separatorClassName =
    variant === "light" ? "text-slate-400" : "text-[var(--text-muted)]";

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-1.5 text-sm font-mono">
      <span className={cn("rounded-lg px-2 py-1", chipClassName)}>
        {pad(h)}
      </span>
      <span className={separatorClassName}>:</span>
      <span className={cn("rounded-lg px-2 py-1", chipClassName)}>
        {pad(m)}
      </span>
      <span className={separatorClassName}>:</span>
      <span className={cn("rounded-lg px-2 py-1", chipClassName)}>
        {pad(s)}
      </span>
    </div>
  );
}
