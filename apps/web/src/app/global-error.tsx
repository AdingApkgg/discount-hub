"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError:root]", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-4 text-center antialiased">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            应用加载失败
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            请稍后重试。若持续出现，请联系管理员。
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {error.digest}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground"
        >
          重试
        </button>
      </body>
    </html>
  );
}
