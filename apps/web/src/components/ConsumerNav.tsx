"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { motion } from "@/components/motion";

type Tab = {
  id: string;
  emoji: string;
  label: string;
  activeEmoji?: string;
};

const TABS: Tab[] = [
  { id: "/", emoji: "🏠", activeEmoji: "🏡", label: "首页" },
  { id: "/member", emoji: "👑", activeEmoji: "🏆", label: "会员中心" },
  { id: "/profile", emoji: "👤", activeEmoji: "🎀", label: "我的" },
];

export default function ConsumerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const navTabs: Tab[] = TABS.map((tab) =>
    tab.id === "/profile" && !session
      ? { id: "/login", emoji: "🔑", activeEmoji: "🔓", label: "登录" }
      : tab,
  );

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* 桌面端顶栏 */}
      <motion.header
        className="sticky top-0 z-20 hidden bg-[var(--nav-top-bg)] backdrop-blur md:block"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-8 py-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-3 active:scale-95"
          >
            <div className="relative">
              <Image
                src="/logo.png"
                alt="Discount Hub"
                width={44}
                height={44}
                className="h-11 w-11 rounded-2xl object-cover shadow-[0_4px_12px_rgba(254,44,85,0.22)]"
              />
              <span className="absolute -right-1 -top-1 rounded-full bg-[linear-gradient(135deg,#F5B800_0%,#FF6E37_100%)] px-1 text-[9px] font-black leading-[14px] text-white shadow ring-2 ring-white">
                HOT
              </span>
            </div>
            <div className="min-w-0 text-left">
              <div className="truncate text-base font-black text-[var(--brand-red)]">
                Discount Hub
              </div>
              <div className="truncate text-xs font-semibold text-muted-foreground">
                神券市集 · 积分当钱花
              </div>
            </div>
          </button>

          <nav className="flex items-center gap-1.5 rounded-full bg-[var(--app-card)] p-1 shadow-[inset_0_0_0_1.5px_rgba(254,44,85,0.15),0_4px_14px_rgba(254,44,85,0.06)]">
            {navTabs.map((tab) => {
              const active = isActive(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => router.push(tab.id)}
                  className="relative px-4 py-1.5"
                >
                  {active && (
                    <motion.span
                      layoutId="desktop-nav-pill"
                      className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] shadow-[0_4px_12px_rgba(254,44,85,0.32)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 flex items-center gap-1.5 text-sm font-black",
                      active ? "text-white" : "text-muted-foreground",
                    )}
                  >
                    <span className="text-base leading-none">
                      {active ? tab.activeEmoji ?? tab.emoji : tab.emoji}
                    </span>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </motion.header>

      {/* 移动端底栏 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="底部导航"
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72px] bg-[var(--nav-bottom-fade)]" />
        <div className="relative mx-auto flex max-w-md items-stretch gap-1 rounded-t-[24px] bg-[var(--app-card)]/95 px-2 pb-1 pt-1 shadow-[0_-6px_20px_rgba(254,44,85,0.1)] backdrop-blur">
          {navTabs.map((tab) => {
            const active = isActive(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => router.push(tab.id)}
                className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 active:scale-95"
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full text-[22px] leading-none transition-all",
                    active &&
                      "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] shadow-[0_6px_14px_rgba(254,44,85,0.38)] scale-110",
                  )}
                >
                  <span className={active ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" : ""}>
                    {active ? tab.activeEmoji ?? tab.emoji : tab.emoji}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="mobile-nav-dot"
                      className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--brand-red)]"
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black leading-none",
                    active ? "text-[var(--brand-red)]" : "text-muted-foreground",
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
