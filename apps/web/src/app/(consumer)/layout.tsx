import Link from "next/link";
import ConsumerNav from "@/components/ConsumerNav";
import AndroidAppBanner from "@/components/AndroidAppBanner";
import CheckinPrompt from "@/components/CheckinPrompt";

function ConsumerFooter() {
  return (
    <footer className="hidden border-t border-[var(--app-card-border)] bg-[var(--app-shell-surface)] md:block">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-8 py-8 text-xs text-muted-foreground md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Discount Hub</span>
          <span className="text-border">·</span>
          <span>优惠券交易平台</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/" className="transition-colors hover:text-foreground">首页</Link>
          <Link href="/coupons" className="transition-colors hover:text-foreground">券包</Link>
          <Link href="/member" className="transition-colors hover:text-foreground">会员中心</Link>
          <Link href="/profile" className="transition-colors hover:text-foreground">我的</Link>
        </nav>
        <span>© {new Date().getFullYear()} Discount Hub</span>
      </div>
    </footer>
  );
}

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--app-shell-bg)] md:px-5 md:py-5">
      <AndroidAppBanner />
      <div className="consumer-theme relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-[var(--app-shell-surface)] md:min-h-[calc(100vh-2.5rem)] md:overflow-hidden md:rounded-[36px] md:border md:border-[var(--app-card-border)] md:shadow-[var(--app-frame-shadow)]">
        <ConsumerNav />
        <main className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <CheckinPrompt />
        <ConsumerFooter />
      </div>
    </div>
  );
}
