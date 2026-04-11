"use client";

import {
  motion,
  AnimatePresence,
  type Variants,
  type Transition,
  useReducedMotion,
} from "motion/react";
import { useInView } from "motion/react";
import { useRef, type ReactNode } from "react";

const spring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
};

const smooth: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 24,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, filter: "blur(4px)" },
  visible: { opacity: 1, filter: "blur(0px)" },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1 },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export function PageTransition({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      variants={staggerContainer}
      transition={smooth}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  variants = fadeUp,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variants?: Variants;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reducedMotion ? false : "hidden"}
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={{ ...smooth, delay }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={fadeUp} transition={smooth}>
      {children}
    </motion.div>
  );
}

export function StaggerList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reducedMotion ? false : "hidden"}
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function AnimateList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div className={className} layout>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AnimateListItem({
  children,
  className,
  layoutId,
}: {
  children: ReactNode;
  className?: string;
  layoutId: string;
}) {
  return (
    <motion.div
      className={className}
      layoutId={layoutId}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      transition={spring}
    >
      {children}
    </motion.div>
  );
}

export function HoverScale({
  children,
  className,
  scale = 1.02,
}: {
  children: ReactNode;
  className?: string;
  scale?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
    >
      {children}
    </motion.div>
  );
}

export function PulseOnce({
  children,
  className,
  trigger,
}: {
  children: ReactNode;
  className?: string;
  trigger: unknown;
}) {
  return (
    <motion.div
      key={String(trigger)}
      className={className}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence, spring, smooth };
export type { Variants, Transition };
