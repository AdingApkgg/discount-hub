import ConsumerNav from "@/components/ConsumerNav";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--app-shell-bg)] md:px-5 md:py-5">
      <div className="consumer-theme relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-[var(--app-shell-surface)] md:min-h-[calc(100vh-2.5rem)] md:overflow-hidden md:rounded-[36px] md:border md:border-[var(--app-card-border)] md:shadow-[var(--app-frame-shadow)]">
        <ConsumerNav />
        <main className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
