"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import Image from "next/image";

const DISMISS_KEY = "android-banner-dismissed";
const DISMISS_DAYS = 7;
const APK_URL = "/downloads/discount-hub.apk";

function shouldShow(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua)) return false;
  if (/DiscountHub/i.test(ua)) return false;

  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (dismissed) {
    const ts = Number(dismissed);
    if (Date.now() - ts < DISMISS_DAYS * 86_400_000) return false;
  }
  return true;
}

export default function AndroidAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShow());
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="mx-auto flex max-w-xl items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 shadow-lg sm:rounded-b-2xl">
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
          <p className="truncate text-xs text-blue-100">
            下载 App 获得更流畅的体验
          </p>
        </div>
        <a
          href={APK_URL}
          download
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm active:scale-95"
        >
          <Download className="h-4 w-4" />
          下载
        </a>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1.5 text-blue-100 hover:bg-white/20 hover:text-white"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
