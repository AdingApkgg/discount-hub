import ConsumerNav from "@/components/ConsumerNav";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#ececec] sm:px-4 sm:py-5">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#f7f7f7] sm:min-h-[calc(100vh-2.5rem)] sm:overflow-hidden sm:rounded-[32px] sm:border sm:border-slate-200 sm:shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <main className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <ConsumerNav />
      </div>
    </div>
  );
}
