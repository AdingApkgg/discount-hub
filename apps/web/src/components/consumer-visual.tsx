"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ==============================
 * CornerRibbon — 斜贴角标
 *   用于商品卡右上角「立省¥XX」「爆款」
 * ============================== */
export function CornerRibbon({
  children,
  tone = "red",
  position = "right",
}: {
  children: ReactNode;
  tone?: "red" | "gold" | "orange";
  position?: "left" | "right";
}) {
  const toneBg: Record<string, string> = {
    red: "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)]",
    gold: "bg-[linear-gradient(135deg,#F5B800_0%,#FF6E37_100%)]",
    orange: "bg-[linear-gradient(135deg,#FF6E37_0%,#FFA500_100%)]",
  };
  const rotate = position === "right" ? "rotate-45" : "-rotate-45";
  const outerAlign = position === "right" ? "right-0 top-0" : "left-0 top-0";
  const stripPos =
    position === "right" ? "right-[-32px] top-[14px]" : "left-[-32px] top-[14px]";
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 h-[68px] w-[68px] overflow-hidden",
        outerAlign,
      )}
    >
      <div
        className={cn(
          "absolute w-[130px] py-0.5 text-center text-[10px] font-black tracking-wider text-white shadow-[0_4px_10px_rgba(254,44,85,0.35)]",
          rotate,
          stripPos,
          toneBg[tone],
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ==============================
 * BurstBadge — 爆炸星形贴纸
 *   12 尖角圆齿 star burst
 * ============================== */
export function BurstBadge({
  children,
  tone = "red",
  size = 48,
  className,
}: {
  children: ReactNode;
  tone?: "red" | "gold" | "pink";
  size?: number;
  className?: string;
}) {
  const toneBg: Record<string, string> = {
    red: "#FE2C55",
    gold: "#F5B800",
    pink: "#FF4D8D",
  };
  const color = toneBg[tone];
  return (
    <div
      className={cn(
        "relative flex items-center justify-center font-black leading-none text-white",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 drop-shadow-[0_3px_6px_rgba(254,44,85,0.35)]"
      >
        <polygon
          fill={color}
          points="50,0 58,15 74,6 75,24 92,22 85,38 100,46 86,55 96,70 78,72 82,90 66,83 58,98 50,85 42,98 34,83 18,90 22,72 4,70 14,55 0,46 15,38 8,22 25,24 26,6 42,15"
        />
      </svg>
      <div
        className="relative font-black"
        style={{ fontSize: Math.round(size * 0.28) }}
      >
        {children}
      </div>
    </div>
  );
}

/* ==============================
 * StampMark — 红印章
 *   圆形边 + 五角星 + 竖排文字
 * ============================== */
export function StampMark({
  children,
  size = 56,
  className,
  tone = "red",
}: {
  children: ReactNode;
  size?: number;
  className?: string;
  tone?: "red" | "gold";
}) {
  const color = tone === "red" ? "#CC2040" : "#B8860B";
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full border-[3px] font-black tabular-nums",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.04)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderColor: color,
        color,
        fontSize: Math.round(size * 0.26),
        letterSpacing: "0.05em",
        transform: "rotate(-8deg)",
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1.5px)",
        backgroundSize: "3px 3px",
        opacity: 0.92,
      }}
    >
      {children}
    </div>
  );
}

/* ==============================
 * TearDivider — 券票撕边
 *   两侧半圆缺口 + 虚线
 * ============================== */
export function TearDivider({
  bg = "var(--app-card)",
  hole = "var(--app-shell-bg)",
}: {
  bg?: string;
  hole?: string;
}) {
  return (
    <div
      className="relative flex h-2.5 shrink-0 items-center px-2"
      style={{ background: bg }}
    >
      <div
        className="absolute left-[-6px] top-1/2 z-[1] h-3 w-3 -translate-y-1/2 rounded-full border border-[var(--app-card-border)]"
        style={{ background: hole }}
      />
      <div className="mx-2 h-0 flex-1 border-t border-dashed border-[var(--app-card-border)]" />
      <div
        className="absolute right-[-6px] top-1/2 z-[1] h-3 w-3 -translate-y-1/2 rounded-full border border-[var(--app-card-border)]"
        style={{ background: hole }}
      />
    </div>
  );
}

/* ==============================
 * FloorHeader — 楼层标题
 * ============================== */
export function FloorHeader({
  emoji,
  title,
  subtitle,
  cta,
  onCtaClick,
  tone = "red",
}: {
  emoji: ReactNode;
  title: string;
  subtitle?: string;
  cta?: string;
  onCtaClick?: () => void;
  tone?: "red" | "gold" | "pink";
}) {
  const accent: Record<string, string> = {
    red: "text-[var(--brand-red)]",
    gold: "text-[var(--brand-gold)]",
    pink: "text-[var(--brand-pink)]",
  };
  return (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{emoji}</span>
        <div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-[17px] font-black tracking-tight",
                accent[tone],
              )}
            >
              {title}
            </span>
            <span
              className="inline-block h-[2px] w-6 rounded-full"
              style={{ background: "currentColor", opacity: 0.3 }}
            />
          </div>
          {subtitle && (
            <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {cta && (
        <button
          type="button"
          onClick={onCtaClick}
          className="shrink-0 rounded-full bg-[var(--brand-red-soft)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--brand-red)] active:scale-95"
        >
          {cta} ›
        </button>
      )}
    </div>
  );
}

/* ==============================
 * PriceTag — 爆款价
 *   大红¥ + 斜体 + 删除线原价 + 立省
 * ============================== */
export function PriceTag({
  price,
  pointsPrice = 0,
  original,
  size = "md",
  showSave = true,
}: {
  price: number;
  pointsPrice?: number;
  original?: number | null;
  size?: "sm" | "md" | "lg";
  showSave?: boolean;
}) {
  const sizes: Record<string, { main: string; yen: string; orig: string; pts: string }> = {
    sm: { main: "text-lg", yen: "text-xs", orig: "text-[10px]", pts: "text-sm" },
    md: { main: "text-2xl", yen: "text-sm", orig: "text-[11px]", pts: "text-base" },
    lg: { main: "text-3xl", yen: "text-base", orig: "text-xs", pts: "text-lg" },
  };
  const s = sizes[size];
  const dec = price > 0 && Number.isInteger(price) ? 0 : 2;
  const saveYuan =
    original != null && original > price ? Math.max(1, Math.round(original - price)) : 0;

  const isFree = price === 0 && pointsPrice === 0;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-end gap-1.5">
        {isFree ? (
          <span
            className={cn(
              "italic font-black leading-none tracking-tight text-[var(--brand-red)]",
              s.main,
            )}
          >
            免费!
          </span>
        ) : (
          <>
            {pointsPrice > 0 && (
              <span
                className={cn(
                  "italic font-black leading-none text-[var(--brand-red)]",
                  s.pts,
                )}
              >
                {pointsPrice}
                <span className={cn("ml-0.5", s.orig)}>积分</span>
              </span>
            )}
            {pointsPrice > 0 && price > 0 && (
              <span className={cn("font-black text-foreground", s.pts)}>+</span>
            )}
            {price > 0 && (
              <span
                className={cn(
                  "italic font-black leading-none tracking-tight text-[var(--brand-red)]",
                  s.main,
                )}
              >
                <span className={cn("not-italic font-black", s.yen)}>¥</span>
                {price.toFixed(dec)}
              </span>
            )}
          </>
        )}
        {original != null && original > price && (
          <span
            className={cn(
              "pb-0.5 font-medium text-muted-foreground line-through",
              s.orig,
            )}
          >
            ¥{Number.isInteger(original) ? original.toFixed(0) : original.toFixed(2)}
          </span>
        )}
      </div>
      {showSave && saveYuan > 0 && (
        <span className="inline-flex w-fit items-center gap-0.5 rounded-sm bg-[linear-gradient(90deg,#FE2C55_0%,#FF6E37_100%)] px-1.5 py-[1px] text-[10px] font-black leading-none text-white shadow-[0_2px_4px_rgba(254,44,85,0.28)]">
          立省¥{saveYuan}
        </span>
      )}
    </div>
  );
}

/* ==============================
 * GrabProgress — 秒杀抢购进度条
 * ============================== */
export function GrabProgress({
  percent,
  label,
  size = "md",
}: {
  percent: number;
  label?: string;
  size?: "sm" | "md";
}) {
  const p = Math.min(100, Math.max(0, percent));
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-[var(--brand-red)]/10",
          h,
        )}
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#FE2C55_0%,#FF6E37_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
          style={{ width: `${p}%` }}
        />
      </div>
      {label && (
        <span className="shrink-0 text-[10px] font-black leading-none text-[var(--brand-red)] tabular-nums">
          {label}
        </span>
      )}
    </div>
  );
}

/* ==============================
 * HotSticker — 小贴纸（旋转）
 *   卡片内场景用，例如 "官方" "包邮" "拼团"
 * ============================== */
export function HotSticker({
  children,
  tone = "red",
  rotate = -6,
  className,
}: {
  children: ReactNode;
  tone?: "red" | "gold" | "pink" | "orange";
  rotate?: number;
  className?: string;
}) {
  const toneStyles: Record<string, string> = {
    red: "border-[var(--brand-red)] bg-[var(--brand-red-soft)] text-[var(--brand-red)]",
    gold: "border-[var(--brand-gold)] bg-[var(--brand-gold-soft)] text-[var(--brand-gold)]",
    pink: "border-[var(--brand-pink)] bg-[var(--brand-pink-soft)] text-[var(--brand-pink)]",
    orange: "border-[var(--brand-orange)] bg-[var(--brand-orange-soft)] text-[var(--brand-orange)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[3px] border px-1 py-[1px] text-[9px] font-black leading-[14px]",
        toneStyles[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/* ==============================
 * DanmuBubble — 弹幕气泡通栏
 *   滚动 "XX刚抢到..." 社证
 * ============================== */
export function DanmuBubble({ items }: { items: string[] }) {
  const content = items.join("   ·   ");
  return (
    <div className="relative flex items-center gap-2 overflow-hidden rounded-full border-2 border-dashed border-[var(--brand-gold)] bg-[var(--danmu-bg)] py-1 pl-8 pr-3">
      <span className="absolute left-1 top-1/2 -translate-y-1/2 text-lg">📣</span>
      <div className="consumer-marquee-track text-[11px] font-bold text-[var(--app-strong)]">
        <span className="shrink-0 whitespace-nowrap px-4">{content}</span>
        <span className="shrink-0 whitespace-nowrap px-4">{content}</span>
      </div>
    </div>
  );
}

/* ==============================
 * CoinBadge — 金币徽章（积分/返利用）
 * ============================== */
export function CoinBadge({
  value,
  label,
  size = "md",
}: {
  value: number | string;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const outer = size === "sm" ? "h-7 min-w-[56px] px-2" : size === "lg" ? "h-10 min-w-[84px] px-3" : "h-8 min-w-[64px] px-2.5";
  const text = size === "sm" ? "text-[11px]" : size === "lg" ? "text-sm" : "text-xs";
  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#FFE37A_0%,#F5B800_50%,#FF9B2A_100%)] font-black text-[#5C3A00] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_8px_rgba(245,184,0,0.35)]",
        outer,
        text,
      )}
    >
      <span
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#FFE37A] text-[9px] font-black text-[#8B6A00] shadow-[inset_0_0_0_1px_rgba(139,106,0,0.3)]"
        aria-hidden
      >
        ¥
      </span>
      <span className="tabular-nums leading-none">{value}</span>
      {label && <span className="text-[10px] font-semibold opacity-70">{label}</span>}
    </div>
  );
}

/* ==============================
 * SaleHighlightStrip — 秒杀红条（倒计时通栏）
 * ============================== */
export function SaleHighlightStrip({
  title,
  timer,
  emoji = "⚡",
}: {
  title: string;
  timer?: ReactNode;
  emoji?: ReactNode;
}) {
  return (
    <div className="relative flex items-center justify-between gap-2 overflow-hidden rounded-xl bg-[linear-gradient(90deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)] px-3 py-2 text-white shadow-[0_6px_20px_rgba(254,44,85,0.28)]">
      <div className="pointer-events-none absolute inset-y-0 right-8 w-20 -skew-x-12 bg-white/12 blur-sm" />
      <span className="flex items-center gap-1.5 text-sm font-black tracking-tight drop-shadow-sm">
        <span className="text-lg">{emoji}</span>
        {title}
      </span>
      {timer}
    </div>
  );
}

/* ==============================
 * EmojiShortcut — 金刚区单项
 *   iconUrl 优先；否则展示 emoji
 * ============================== */
export function EmojiShortcut({
  emoji,
  iconUrl,
  label,
  onClick,
  tone = "red",
  badge,
}: {
  emoji?: string;
  iconUrl?: string;
  label: string;
  onClick?: () => void;
  tone?: "red" | "gold" | "pink" | "orange" | "gradient";
  badge?: string;
}) {
  const toneBg: Record<string, string> = {
    red: "bg-[var(--pastel-red)]",
    gold: "bg-[var(--pastel-gold)]",
    pink: "bg-[var(--pastel-pink)]",
    orange: "bg-[var(--pastel-orange)]",
    gradient: "bg-[var(--pastel-gradient)]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center gap-1 active:scale-[0.93]"
    >
      <div
        className={cn(
          "relative flex h-[52px] w-[52px] items-center justify-center rounded-[18px] text-[28px] shadow-[0_4px_12px_rgba(254,44,85,0.14),inset_0_1px_0_rgba(255,255,255,0.8)] transition-transform group-hover:-translate-y-0.5",
          toneBg[tone],
        )}
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt=""
            className="h-9 w-9 object-contain drop-shadow-sm"
            loading="lazy"
          />
        ) : (
          <span className="drop-shadow-sm">{emoji ?? ""}</span>
        )}
        {badge && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-1 py-0.5 text-[9px] font-black leading-none text-white shadow-[0_2px_4px_rgba(254,44,85,0.4)]">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[11px] font-bold leading-none text-foreground">
        {label}
      </span>
    </button>
  );
}
