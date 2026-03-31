"use client";

import { useEffect, useState } from "react";

export default function Countdown({ targetAt }: { targetAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, targetAt - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-1.5 text-sm font-mono">
      <span className="rounded-lg bg-white/10 border border-white/10 px-2 py-1 text-[var(--text)]">
        {pad(h)}
      </span>
      <span className="text-[var(--text-muted)]">:</span>
      <span className="rounded-lg bg-white/10 border border-white/10 px-2 py-1 text-[var(--text)]">
        {pad(m)}
      </span>
      <span className="text-[var(--text-muted)]">:</span>
      <span className="rounded-lg bg-white/10 border border-white/10 px-2 py-1 text-[var(--text)]">
        {pad(s)}
      </span>
    </div>
  );
}
