"use client";

import Link from "next/link";
import { useSiteContent, asString } from "@/hooks/use-site-content";

export default function ConsumerFooter() {
  const companyContent = useSiteContent("company");
  const brandName = asString(companyContent["company.name"], "Discount Hub");
  const shortDescription = asString(
    companyContent["company.short_description"],
    "优惠券交易平台",
  );

  return (
    <footer className="hidden border-t border-[var(--app-card-border)] bg-[var(--app-shell-surface)] md:block">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-8 py-8 text-xs text-muted-foreground md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{brandName}</span>
          <span className="text-border">·</span>
          <span>{shortDescription}</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/" className="transition-colors hover:text-foreground">首页</Link>
          <Link href="/coupons" className="transition-colors hover:text-foreground">券包</Link>
          <Link href="/member" className="transition-colors hover:text-foreground">会员中心</Link>
          <Link href="/profile" className="transition-colors hover:text-foreground">我的</Link>
        </nav>
        <span>© {new Date().getFullYear()} {brandName}</span>
      </div>
    </footer>
  );
}
