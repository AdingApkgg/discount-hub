"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Ticket, CreditCard, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "/", icon: Home, label: "首页" },
  { id: "/coupons", icon: Ticket, label: "卷包" },
  { id: "/member", icon: CreditCard, label: "会员" },
  { id: "/profile", icon: User, label: "我的" },
] as const;

export default function ConsumerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-black/30 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          <div
            className="h-9 w-9 rounded-xl shrink-0"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-glow)",
            }}
          />
          <div className="min-w-0 max-w-[10rem] sm:max-w-none text-left">
            <div className="text-sm font-semibold text-foreground leading-tight truncate">
              折扣中心
            </div>
            <div className="text-xs text-muted-foreground leading-tight truncate">
              诱惑优惠，先到先得
            </div>
          </div>
        </button>

        <div className="hidden sm:flex items-center gap-1.5">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={isActive(t.id) ? "default" : "ghost"}
              size="sm"
              onClick={() => router.push(t.id)}
              className={cn(
                "gap-2",
                isActive(t.id) &&
                  "bg-primary/15 text-foreground border border-primary/40 hover:bg-primary/20",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
          {!session && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/login")}
              className="gap-2 ml-2"
            >
              <LogIn className="h-4 w-4" />
              登录
            </Button>
          )}
        </div>

        <div className="sm:hidden flex items-center gap-1">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={isActive(t.id) ? "default" : "ghost"}
              size="icon"
              onClick={() => router.push(t.id)}
              className={cn(
                "h-9 w-9 rounded-xl",
                isActive(t.id) &&
                  "bg-primary/15 border border-primary/40",
              )}
              aria-label={t.label}
            >
              <t.icon
                className={cn(
                  "h-4 w-4",
                  isActive(t.id) ? "text-foreground" : "text-muted-foreground",
                )}
              />
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}
