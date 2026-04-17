"use client";

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

export default function ConsumerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const navTabs = tabs.map((tab) =>
    tab.id === "/profile" && !session
      ? { id: "/login", icon: LogIn, label: "登录" }
      : tab,
  );

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
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

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--app-card-border)] bg-[var(--app-nav-bg)] pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(15,23,42,0.04)] md:hidden"
        aria-label="底部导航"
      >
        <div className="flex items-stretch">
          {navTabs.map((tab) => {
            const active = isActive(tab.id);
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => router.push(tab.id)}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "text-[var(--brand-red)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2.4 : 2}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
