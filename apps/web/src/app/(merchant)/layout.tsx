"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Package,
  ClipboardList,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "数据看板" },
  { href: "/verify", icon: QrCode, label: "扫码核销" },
  { href: "/products", icon: Package, label: "商品管理" },
  { href: "/orders", icon: ClipboardList, label: "订单管理" },
  { href: "/settings", icon: Settings, label: "设置" },
] as const;

function SidebarContent({ pathname }: { pathname: string }) {
  const router = useRouter();
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
            <div className="text-xs text-muted-foreground">商家后台</div>
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
                "w-full justify-start gap-3",
                active && "bg-primary/10 text-foreground",
              )}
              onClick={() => router.push(item.href)}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Button>
          );
        })}
      </nav>
      <div className="p-4">
        <Separator className="mb-4" />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/")}
        >
          切换到 C 端
        </Button>
      </div>
    </>
  );
}

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card">
        <SidebarContent pathname={pathname} />
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 border-b border-border bg-black/30 backdrop-blur-md">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">商家后台</div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-card border-border">
                <SheetTitle className="sr-only">导航菜单</SheetTitle>
                <SidebarContent pathname={pathname} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
