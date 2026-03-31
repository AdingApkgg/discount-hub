"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Ticket, CreditCard, User, LogIn } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "/", icon: Home, label: "首页" },
  { id: "/coupons", icon: Ticket, label: "券包" },
  { id: "/member", icon: CreditCard, label: "会员" },
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
      <header className="sticky top-0 z-20 hidden border-b border-[var(--app-card-border)] bg-[var(--app-nav-bg)]/95 backdrop-blur md:block">
        <div className="flex items-center justify-between gap-6 px-8 py-5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="h-11 w-11 rounded-2xl bg-[var(--gradient-primary)] shadow-[var(--shadow-glow)]" />
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[var(--app-heading)]">
                Discount Hub
              </div>
              <div className="truncate text-xs text-[var(--app-text-muted)]">
                Web 端按宽屏自适应展示
              </div>
            </div>
          </button>

          <nav className="flex items-center gap-2">
            {navTabs.map((tab) => {
              const active = isActive(tab.id);
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => router.push(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
                      : "text-[var(--app-nav-text)] hover:bg-[var(--app-nav-hover)]",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active
                        ? "text-[var(--app-nav-active-text)]"
                        : "text-[var(--app-nav-text)]",
                    )}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        <nav className="rounded-[28px] border border-[var(--app-card-border)] bg-[var(--app-nav-bg)] p-2 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            {navTabs.map((tab) => {
              const active = isActive(tab.id);
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => router.push(tab.id)}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[20px] px-2 py-3 text-[11px] font-medium transition",
                    active
                      ? "bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                      : "text-[var(--app-nav-text)] hover:bg-[var(--app-nav-hover)]",
                  )}
                  aria-label={tab.label}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      active
                        ? "text-[var(--app-nav-active-text)]"
                        : "text-[var(--app-nav-text)]",
                    )}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
