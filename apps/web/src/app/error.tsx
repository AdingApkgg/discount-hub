"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">出了点问题</h2>
        <p className="mt-2 text-sm text-slate-500">
          页面遇到了错误，请刷新重试
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-slate-400">
            {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} className="rounded-full px-6">
        重试
      </Button>
    </div>
  );
}
