import type React from 'react';
import { useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function useLockedBody(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export default function Modal({
  open,
  title,
  children,
  onClose,
  className,
  bodyClassName,
}: {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = useId();
  const container = useMemo(() => {
    const el = document.getElementById('modal-root');
    if (el) return el;
    const created = document.createElement('div');
    created.id = 'modal-root';
    document.body.appendChild(created);
    return created;
  }, []);

  useLockedBody(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 z-0"
        onClick={onClose}
        aria-label="关闭弹窗"
      />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6 z-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? headingId : undefined}
          className={`w-full sm:max-w-[720px] max-h-[90vh] rounded-3xl border border-white/10 bg-[var(--panel)] shadow-[0_30px_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden ${className ?? ''}`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="min-w-0">
              {title ? (
                <h2 id={headingId} className="text-base font-semibold text-[var(--text)] truncate">
                  {title}
                </h2>
              ) : (
                <div />
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 transition"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className={`flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] ${bodyClassName ?? ''}`}>{children}</div>
        </div>
      </div>
    </div>,
    container
  );
}
