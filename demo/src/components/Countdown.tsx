import { useEffect, useMemo, useState } from 'react';

function pad2(v: number) {
  return String(v).padStart(2, '0');
}

export default function Countdown({ targetAt }: { targetAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const parts = useMemo(() => {
    const diff = Math.max(0, targetAt - now);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return { days, hours, mins, secs, done: diff === 0 };
  }, [now, targetAt]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      <div className="text-xs text-[var(--text-muted)]">倒计时</div>
      <div className="flex items-center gap-1 font-mono text-sm">
        <span className="text-[var(--primary)]">{parts.days}</span>
        <span className="text-[var(--text-muted)]">天</span>
        <span className="text-[var(--primary)]">{pad2(parts.hours)}</span>
        <span className="text-[var(--text-muted)]">:</span>
        <span className="text-[var(--primary)]">{pad2(parts.mins)}</span>
        <span className="text-[var(--text-muted)]">:</span>
        <span className="text-[var(--primary)]">{pad2(parts.secs)}</span>
      </div>
      {parts.done ? (
        <span className="ml-1 text-xs rounded-full bg-white/10 px-2 py-0.5 text-[var(--text-muted)]">已结束</span>
      ) : null}
    </div>
  );
}
