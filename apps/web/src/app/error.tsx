"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "@/components/motion";

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
    <motion.div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
    >
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
      >
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-xl font-semibold text-slate-900">出了点问题</h2>
        <p className="mt-2 text-sm text-slate-500">
          页面遇到了错误，请刷新重试
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-slate-400">
            {error.digest}
          </p>
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button onClick={reset} className="rounded-full px-6">
          重试
        </Button>
      </motion.div>
    </motion.div>
  );
}
