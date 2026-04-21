/** 从后台配置的多种尺寸图中选一张用于 C 端展示（优先横幅类 key） */
export function pickAdSlotImage(imageUrls: unknown): string | null {
  if (!imageUrls || typeof imageUrls !== "object") return null;
  const o = imageUrls as Record<string, unknown>;
  const preferred = [
    "banner",
    "home",
    "default",
    "wide",
    "xl",
    "mobile",
    "square",
    "sidebar",
    "popup",
    "inline",
  ];
  for (const key of preferred) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of Object.values(o)) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
