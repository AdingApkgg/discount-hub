import { X } from 'lucide-react';
import type { ToastItem } from '../contexts/ToastContext';

export default function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => {
        const tone =
          t.variant === 'success'
            ? 'border-emerald-400/30 bg-emerald-500/10'
            : t.variant === 'error'
              ? 'border-red-400/30 bg-red-500/10'
              : 'border-white/10 bg-white/5';
        return (
          <div
            key={t.id}
            className={`w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border ${tone} backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--text)]">{t.title}</div>
                {t.description ? (
                  <div className="mt-0.5 text-xs text-[var(--text-muted)]">{t.description}</div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 transition"
                aria-label="关闭提示"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

