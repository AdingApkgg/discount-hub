"use client";

import { useState, useSyncExternalStore } from "react";
import { X, Download } from "lucide-react";
import Image from "next/image";

const DISMISS_KEY = "android-banner-dismissed";
const DISMISS_DAYS = 7;
const APK_URL = "/downloads/discount-hub.apk";

function getIsAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return false;
  if (/DiscountHub/i.test(ua)) return false;
  return true;
}

function isDismissed(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  return Date.now() - Number(dismissed) < DISMISS_DAYS * 86_400_000;
}

const subscribe = () => () => {};
const useIsAndroid = () =>
  useSyncExternalStore(subscribe, getIsAndroid, () => false);

export default function AndroidAppBanner() {
  const isAndroid = useIsAndroid();
  const [dismissed, setDismissed] = useState(() =>
    typeof window === "undefined" ? true : isDismissed(),
  );

  if (!isAndroid || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="mx-auto flex max-w-xl items-center gap-3 bg-gradient-to-r from-[#FE2C55] to-[#FF6E37] px-4 py-3 shadow-lg sm:rounded-b-2xl">
        <Image
          src="/logo.png"
          alt="Discount Hub"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Discount Hub 安卓版
          </p>
          <p className="truncate text-xs text-white/85">
            下载 App 获得更流畅的体验
          </p>
        </div>
        <a
          href={APK_URL}
          download
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-red)] shadow-sm active:scale-95"
        >
          <Download className="h-4 w-4" />
          下载
        </a>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
