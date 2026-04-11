"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "@/components/motion";

export default function NotFound() {
  return (
    <motion.div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
    >
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
      >
        <FileQuestion className="h-8 w-8 text-slate-400" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h2 className="text-xl font-semibold text-slate-900">找不到页面</h2>
        <p className="mt-2 text-sm text-slate-500">
          你访问的页面不存在或已被移除
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button asChild className="rounded-full px-6">
          <Link href="/">返回首页</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
