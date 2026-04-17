"use client";

import { Loader2 } from "lucide-react";
import { motion } from "@/components/motion";

export default function ConsumerLoading() {
  return (
    <motion.div
      className="flex min-h-[50vh] items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-8 w-8 text-muted-foreground" />
      </motion.div>
    </motion.div>
  );
}
