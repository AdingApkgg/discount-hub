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
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <nav className="rounded-[28px] border border-slate-200 bg-white/95 p-2 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] backdrop-blur">
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
                    ? "bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                    : "text-slate-500 hover:bg-slate-100",
                )}
                aria-label={tab.label}
              >
                <Icon className={cn("h-[18px] w-[18px]", active ? "text-white" : "text-slate-500")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
