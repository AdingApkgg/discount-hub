"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Home, Crown, User, LogIn } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "@/components/motion";

const tabs = [
  { id: "/", icon: Home, label: "首页" },
  { id: "/member", icon: Crown, label: "会员" },
  { id: "/profile", icon: User, label: "我的" },
] as const;

function useConsumerNavState() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const navTabs = useMemo(
    () =>
      tabs.map((tab) =>
        tab.id === "/profile" && !session
          ? { id: "/login", icon: LogIn, label: "登录" as const }
          : tab,
      ),
    [session],
  );

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return pathname === "/";
      return pathname.startsWith(path);
    },
    [pathname],
  );

  return { navTabs, isActive, router };
}

export function ConsumerDesktopNav() {
  const { navTabs, isActive, router } = useConsumerNavState();

  return (
    <motion.header
      className="sticky top-0 z-20 hidden border-b border-[var(--app-card-border)] bg-[var(--app-nav-bg)]/95 backdrop-blur md:block"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-between gap-6 px-8 py-5">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="h-auto gap-3 px-2 py-1.5 text-left"
        >
          <Image
            src="/logo.png"
            alt="Discount Hub"
            width={44}
            height={44}
            className="h-11 w-11 rounded-2xl object-cover shadow-[var(--shadow-glow)]"
          />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-foreground">
              Discount Hub
            </div>
            <div className="truncate text-xs text-muted-foreground">
              优惠券交易平台
            </div>
          </div>
        </Button>

        <nav className="flex items-center gap-2">
          {navTabs.map((tab) => {
            const active = isActive(tab.id);
            const Icon = tab.icon;

            return (
              <Button
                key={tab.id}
                variant={active ? "default" : "ghost"}
                onClick={() => router.push(tab.id)}
                className={cn(
                  "relative gap-2 rounded-full px-4",
                  active
                    ? "bg-transparent text-[var(--app-nav-active-text)] hover:bg-transparent"
                    : "text-muted-foreground hover:bg-[var(--app-nav-hover)] hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="desktop-nav-pill"
                    className="absolute inset-0 rounded-full bg-[var(--app-nav-active-bg)] shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </span>
              </Button>
            );
          })}
        </nav>
      </div>
    </motion.header>
  );
}

/** 移动端：文档流贴底 Tab（与主内容同列，全宽贴边、非悬浮层） */
export function ConsumerMobileTabBar() {
  const { navTabs, isActive, router } = useConsumerNavState();

  return (
    <div className="z-40 w-full shrink-0 border-t border-[var(--app-card-border)] bg-[var(--app-shell-surface)] pb-[env(safe-area-inset-bottom)] pt-0.5 shadow-none md:hidden">
      <nav className="flex w-full min-w-0 items-stretch">
        {navTabs.map((tab) => {
          const active = isActive(tab.id);
          const Icon = tab.icon;

          return (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => router.push(tab.id)}
              className={cn(
                "relative h-[52px] min-w-0 flex-1 flex-col gap-0.5 rounded-none px-1 py-1 text-[11px] font-semibold shadow-none",
                active
                  ? "text-[var(--brand-red)] hover:bg-transparent hover:text-[var(--brand-red)]"
                  : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground dark:hover:bg-white/[0.06]",
              )}
              aria-label={tab.label}
            >
              {active ? (
                <span
                  className="absolute left-1/2 top-0 h-[3px] w-9 -translate-x-1/2 rounded-full bg-[var(--brand-red)]"
                  aria-hidden
                />
              ) : null}
              <span className="relative flex flex-col items-center gap-0.5">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span>{tab.label}</span>
              </span>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}

export default function ConsumerNav() {
  return (
    <>
      <ConsumerDesktopNav />
      <ConsumerMobileTabBar />
    </>
  );
}
