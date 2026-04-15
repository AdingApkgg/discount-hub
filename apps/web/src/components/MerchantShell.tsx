"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Package,
  ClipboardList,
  Settings,
  Menu,
  Ticket,
  Users,
  UserCheck,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion } from "@/components/motion";

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  adminOnly?: boolean;
};

const allNavItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "数据看板" },
  { href: "/verify", icon: QrCode, label: "扫码核销" },
  { href: "/products", icon: Package, label: "商品管理" },
  { href: "/orders", icon: ClipboardList, label: "订单管理" },
  { href: "/coupon-manage", icon: Ticket, label: "券码管理" },
  { href: "/users", icon: Users, label: "用户管理", adminOnly: true },
  { href: "/agent-review", icon: UserCheck, label: "代理审核", adminOnly: true },
  { href: "/settings", icon: Settings, label: "设置" },
];

function SidebarContent({
  pathname,
  isAdmin,
}: {
  pathname: string;
  isAdmin: boolean;
}) {
  const router = useRouter();

  const navItems = useMemo(
    () => allNavItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );

  return (
    <>
      <div className="p-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-3"
        >
          <div
            className="h-9 w-9 rounded-xl"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-glow)",
            }}
          />
          <div>
            <div className="text-sm font-semibold text-foreground">折扣中心</div>
            <div className="text-xs text-muted-foreground">
              {isAdmin ? "管理后台" : "商家后台"}
            </div>
          </div>
        </button>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Button
              key={item.href}
              variant={active ? "secondary" : "ghost"}
              className={cn(
                "relative w-full justify-start gap-3",
                active ? "bg-transparent text-foreground" : "",
              )}
              onClick={() => router.push(item.href)}
            >
              {active && (
                <motion.span
                  layoutId="merchant-sidebar-pill"
                  className="absolute inset-0 rounded-md bg-primary/10"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {item.label}
              </span>
            </Button>
          );
        })}
      </nav>
      <div className="p-4">
        <Separator className="mb-4" />
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => router.push("/")}
        >
          切换到 C 端
        </Button>
        <div className="mt-3 text-center text-[11px] text-muted-foreground">
          v1.0.0
        </div>
      </div>
    </>
  );
}

export default function MerchantShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  return (
    <div className="min-h-screen bg-background flex">
      <motion.aside
        className="hidden lg:flex flex-col w-64 border-r border-border bg-card"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <SidebarContent pathname={pathname} isAdmin={isAdmin} />
      </motion.aside>

      <div className="flex-1 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="h-7 w-7 rounded-lg"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow: "var(--shadow-glow)",
                }}
              />
              <span className="text-sm font-semibold text-foreground">
                {isAdmin ? "管理后台" : "商家后台"}
              </span>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-card border-border">
                <SheetTitle className="sr-only">导航菜单</SheetTitle>
                <SidebarContent pathname={pathname} isAdmin={isAdmin} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <motion.main
          className="flex-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.1 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
