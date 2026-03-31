import ConsumerNav from "@/components/ConsumerNav";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <ConsumerNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
