import ConsumerNav from "@/components/ConsumerNav";
import ConsumerFooter from "@/components/ConsumerFooter";
import AndroidAppBanner from "@/components/AndroidAppBanner";
import CheckinPrompt from "@/components/CheckinPrompt";
import RedemptionPrompt from "@/components/RedemptionPrompt";
import RedemptionFab from "@/components/RedemptionFab";
import NoticeBanner from "@/components/NoticeBanner";
import FingerprintInit from "@/components/FingerprintInit";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--app-shell-bg)]">
      <AndroidAppBanner />
      <div className="consumer-theme relative flex min-h-screen w-full flex-col bg-[var(--app-shell-surface)]">
        <ConsumerNav />
        <NoticeBanner />
        <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <FingerprintInit />
        <CheckinPrompt />
        <RedemptionPrompt />
        <RedemptionFab />
        <ConsumerFooter />
      </div>
    </div>
  );
}
