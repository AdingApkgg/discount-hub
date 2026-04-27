"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, Flame, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { openApp } from "@discount-hub/shared";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { banners, earnContents, hotPosts } from "@/data/mock";
import { pickAdSlotImage } from "@/lib/ad-slot-image";
import { cn } from "@/lib/utils";
import {
  motion,
  AnimatePresence,
  AnimatedItem,
  AnimatedSection,
  PageTransition,
  StaggerList,
} from "@/components/motion";
import {
  BurstBadge,
  CoinBadge,
  CornerRibbon,
  DanmuBubble,
  EmojiShortcut,
  FloorHeader,
  GrabProgress,
  HotSticker,
  PriceTag,
  SaleHighlightStrip,
  StampMark,
  TearDivider,
} from "@/components/consumer-visual";

type ProductItem = RouterOutputs["product"]["list"][number];
type UserProfile = RouterOutputs["user"]["me"];

/* ============ 顶部：用户入口 + 搜索 + 金币 ============ */
function TopBar({
  profile,
  onGoMember,
  onLogin,
  onSearch,
  isAuthed,
}: {
  profile: UserProfile | undefined;
  onGoMember: () => void;
  onLogin: () => void;
  onSearch: () => void;
  isAuthed: boolean;
}) {
  const points = profile?.points ?? 0;
  const name = profile?.name ?? "游客";
  const vipLevel = profile?.vipLevel ?? 0;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isAuthed ? onGoMember : onLogin}
        className="relative flex shrink-0 items-center gap-2 rounded-full bg-[var(--app-card)] px-2 py-1 pr-3 shadow-[0_2px_8px_rgba(254,44,85,0.12)]"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          {name.slice(0, 1)}
          {vipLevel > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[#F5B800] px-1 text-[8px] font-black leading-[12px] text-[#5C3A00] ring-2 ring-white">
              V{vipLevel}
            </span>
          )}
        </span>
        <span className="text-[12px] font-black leading-none text-foreground">
          {name.length > 4 ? name.slice(0, 4) + "…" : name}
        </span>
      </button>

      <button
        type="button"
        onClick={onSearch}
        className="flex h-9 flex-1 items-center gap-2 rounded-full bg-[var(--app-card)] px-3 text-[13px] shadow-[inset_0_0_0_1.5px_rgba(254,44,85,0.65)]"
      >
        <Search className="h-4 w-4 text-[var(--brand-red)]" strokeWidth={2.6} />
        <span className="flex-1 text-left font-semibold text-muted-foreground">
          搜神券 · 省到抽筋
        </span>
        <span className="rounded-full bg-[var(--brand-red)] px-2 py-0.5 text-[10px] font-black text-white">
          搜索
        </span>
      </button>

      <button
        type="button"
        onClick={onGoMember}
        className="shrink-0"
        aria-label="我的积分"
      >
        <CoinBadge value={points.toLocaleString("zh-CN")} size="sm" />
      </button>
    </div>
  );
}

/* ============ 倒计时条 ============ */
function useEndOfTodayMs() {
  return useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);
}

function FlashTimer() {
  const targetAt = useEndOfTodayMs();
  // Initial value is null so SSR and first client render match (both render 00:00:00).
  // Effect kicks in after hydration to start the live countdown.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = now === null ? 0 : Math.max(0, targetAt - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <SaleHighlightStrip
      title="今日秒杀神券"
      emoji="⚡"
      timer={
        <span className="inline-flex items-center gap-1 font-mono text-sm font-black tabular-nums">
          <span className="rounded-md bg-black/70 px-2 py-0.5 text-white shadow-inner">
            {pad(h)}
          </span>
          <span className="text-white/90">:</span>
          <span className="rounded-md bg-black/70 px-2 py-0.5 text-white shadow-inner">
            {pad(m)}
          </span>
          <span className="text-white/90">:</span>
          <span className="rounded-md bg-black/70 px-2 py-0.5 text-white shadow-inner">
            {pad(s)}
          </span>
        </span>
      }
    />
  );
}

type CmsBannerItem = {
  id: string;
  imageUrl: string;
  title: string;
  linkUrl: string;
};

function BannerDots({
  len,
  activeIndex,
  onSeek,
}: {
  len: number;
  activeIndex: number;
  onSeek: (i: number) => void;
}) {
  return (
    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
      {Array.from({ length: len }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSeek(i)}
          aria-label={`切换到第 ${i + 1} 张`}
          className={cn(
            "h-1 rounded-full transition-all",
            i === activeIndex ? "w-4 bg-white" : "w-1 bg-white/55",
          )}
        />
      ))}
    </div>
  );
}

/* ============ Banner 轮播 ============ */
function BannerCarousel({
  cmsBanners,
  onOpen,
  onFollowAdLink,
  onCmsFallback,
}: {
  cmsBanners: CmsBannerItem[];
  onOpen: (scrollId: string) => void;
  onFollowAdLink: (url: string) => void;
  onCmsFallback: () => void;
}) {
  const [index, setIndex] = useState(0);
  const useCms = cmsBanners.length > 0;
  const slides = useCms ? cmsBanners : null;
  const mockLen = banners.length;

  useEffect(() => {
    const len = useCms ? cmsBanners.length : mockLen;
    if (len <= 1) return;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % len);
    }, 6000);
    return () => window.clearTimeout(id);
  }, [index, useCms, cmsBanners.length, mockLen]);

  const currentMock = banners[index % mockLen];

  if (useCms && slides) {
    const current = slides[index % slides.length];
    return (
      <div className="relative overflow-hidden rounded-2xl shadow-[0_10px_24px_rgba(254,44,85,0.12)]">
        <AnimatePresence mode="wait">
          <motion.button
            key={current.id}
            type="button"
            onClick={() =>
              current.linkUrl.trim()
                ? onFollowAdLink(current.linkUrl)
                : onCmsFallback()
            }
            className="relative block h-36 w-full overflow-hidden md:h-40"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
            <div className="absolute bottom-3 left-3 right-16 text-left">
              <HotSticker tone="gold" rotate={-4}>
                🔥 限时推广
              </HotSticker>
              <div className="mt-1 line-clamp-2 text-base font-black leading-tight text-white drop-shadow-md md:text-lg">
                {current.title}
              </div>
            </div>
          </motion.button>
        </AnimatePresence>
        <BannerDots
          len={slides.length}
          activeIndex={index % slides.length}
          onSeek={setIndex}
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-[0_10px_24px_rgba(254,44,85,0.12)]">
      <AnimatePresence mode="wait">
        <motion.button
          key={currentMock.id}
          type="button"
          onClick={() => onOpen(currentMock.scrollId)}
          className={cn(
            "relative flex h-36 w-full items-center justify-between overflow-hidden bg-gradient-to-br px-5 text-left text-white md:h-40",
            currentMock.gradient,
          )}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
        >
          <div className="stripe-urgent absolute inset-0" />
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative max-w-[62%]">
            <HotSticker tone="gold" rotate={-5}>
              🎁 {currentMock.cta}
            </HotSticker>
            <div className="mt-1.5 text-xl font-black leading-tight tracking-tight drop-shadow-md md:text-2xl">
              {currentMock.title}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-white/90 md:text-xs">
              {currentMock.subtitle}
            </div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[var(--brand-red)] shadow-md">
              立即冲 <ArrowRight className="h-3 w-3" strokeWidth={3} />
            </div>
          </div>
          <div className="relative text-6xl drop-shadow-lg md:text-7xl">🎁</div>
        </motion.button>
      </AnimatePresence>
      <BannerDots
        len={mockLen}
        activeIndex={index % mockLen}
        onSeek={setIndex}
      />
    </div>
  );
}

/* ============ 副 Banner：2 张矩形拼接 ============ */
function DoubleBannerCell({
  emoji,
  label,
  title,
  badge,
  tone,
  onClick,
}: {
  emoji: string;
  label: string;
  title: string;
  badge: string;
  tone: "red" | "gold";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex h-[88px] w-full items-center justify-between overflow-hidden rounded-2xl px-3.5 text-left text-white active:scale-[0.98]",
        tone === "red"
          ? "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] shadow-[0_6px_18px_rgba(254,44,85,0.28)]"
          : "bg-[linear-gradient(135deg,#F5B800_0%,#FF6E37_100%)] shadow-[0_6px_18px_rgba(245,184,0,0.32)]",
      )}
    >
      <div className="stripe-urgent pointer-events-none absolute inset-0" />
      <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/20 blur-xl" />
      <div className="relative">
        <div className="inline-flex items-center rounded-full bg-white/85 px-1.5 py-[1px] text-[9px] font-black text-[var(--brand-red)]">
          {label}
        </div>
        <div className="mt-1 text-base font-black leading-tight drop-shadow-sm">
          {title}
        </div>
        <div className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[var(--brand-red)]">
          {badge} <ArrowRight className="h-2.5 w-2.5" strokeWidth={3} />
        </div>
      </div>
      <div className="relative text-4xl drop-shadow-md">{emoji}</div>
    </button>
  );
}

function DoubleBannerCmsCell({
  slot,
  onClick,
}: {
  slot: CmsBannerItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-[88px] w-full overflow-hidden rounded-2xl active:scale-[0.98]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slot.imageUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
      <div className="absolute bottom-2 left-2 right-2 text-left">
        <HotSticker tone="gold" rotate={-4}>
          🔥 推广
        </HotSticker>
        <div className="mt-1 line-clamp-1 text-[12px] font-black text-white drop-shadow">
          {slot.title}
        </div>
      </div>
    </button>
  );
}

function DoubleBanners({
  cmsInline,
  onLimited,
  onZero,
  onFollowAdLink,
}: {
  cmsInline: CmsBannerItem[];
  onLimited: () => void;
  onZero: () => void;
  onFollowAdLink: (url: string) => void;
}) {
  const handleCms = (slot: CmsBannerItem, fallback: () => void) => () =>
    slot.linkUrl.trim() ? onFollowAdLink(slot.linkUrl) : fallback();

  if (cmsInline.length >= 2) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        <DoubleBannerCmsCell
          slot={cmsInline[0]}
          onClick={handleCms(cmsInline[0], onLimited)}
        />
        <DoubleBannerCmsCell
          slot={cmsInline[1]}
          onClick={handleCms(cmsInline[1], onZero)}
        />
      </div>
    );
  }
  if (cmsInline.length === 1) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        <DoubleBannerCmsCell
          slot={cmsInline[0]}
          onClick={handleCms(cmsInline[0], onLimited)}
        />
        <DoubleBannerCell
          emoji="💎"
          label="兑到手软"
          title="0元专区"
          badge="冲"
          tone="gold"
          onClick={onZero}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <DoubleBannerCell
        emoji="⚡"
        label="错过后悔"
        title="限时神券"
        badge="领"
        tone="red"
        onClick={onLimited}
      />
      <DoubleBannerCell
        emoji="💎"
        label="兑到手软"
        title="0元专区"
        badge="冲"
        tone="gold"
        onClick={onZero}
      />
    </div>
  );
}

/* ============ 金刚区 ============ */
const SHORTCUTS = [
  { id: "video", emoji: "🎬", label: "视频VIP", tone: "red" as const, badge: "HOT" },
  { id: "music", emoji: "🎵", label: "音乐会员", tone: "pink" as const },
  { id: "game", emoji: "🎮", label: "游戏直充", tone: "red" as const, badge: "-90%" },
  { id: "phone", emoji: "📱", label: "话费充值", tone: "orange" as const },
  { id: "food", emoji: "🍜", label: "外卖美食", tone: "orange" as const },
  { id: "shop", emoji: "🛍️", label: "品牌券包", tone: "pink" as const, badge: "新" },
  { id: "learn", emoji: "📚", label: "学习知识", tone: "gold" as const },
  { id: "rebate", emoji: "🎁", label: "邀请返利", tone: "gold" as const, badge: "¥100" },
  { id: "zero", emoji: "💎", label: "0元兑", tone: "gradient" as const, badge: "爆" },
  { id: "all", emoji: "🧭", label: "全部分类", tone: "orange" as const },
] as const;

function ShortcutGrid({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-y-3">
      {SHORTCUTS.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.025, type: "spring", stiffness: 320, damping: 26 }}
        >
          <EmojiShortcut
            emoji={s.emoji}
            label={s.label}
            tone={s.tone}
            badge={"badge" in s ? (s as { badge?: string }).badge : undefined}
            onClick={() => onSelect(s.id)}
          />
        </motion.div>
      ))}
    </div>
  );
}

/* ============ 分类 Tab + 二级 Chip ============ */
const CATEGORY_TABS = [
  { id: "limited", label: "限时神券", emoji: "⚡" },
  { id: "today", label: "今日必抢", emoji: "🔥" },
  { id: "zero", label: "0元冲", emoji: "💸" },
] as const;

type CategoryId = (typeof CATEGORY_TABS)[number]["id"];

function CategoryTabs({
  active,
  onChange,
}: {
  active: CategoryId;
  onChange: (id: CategoryId) => void;
}) {
  return (
    <div className="relative flex items-center gap-1 overflow-hidden rounded-full bg-[var(--app-card)] p-1 shadow-[inset_0_0_0_1.5px_rgba(254,44,85,0.18)]">
      {CATEGORY_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="relative flex flex-1 items-center justify-center gap-1 py-1.5 text-[13px] transition-colors"
          >
            {isActive && (
              <motion.span
                layoutId="home-cat-pill"
                className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] shadow-[0_4px_12px_rgba(254,44,85,0.32)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex items-center gap-1 font-black",
                isActive ? "text-white" : "text-muted-foreground",
              )}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const FILTER_CHIPS = [
  { id: "recommend", label: "智能推荐", emoji: "✨" },
  { id: "hot", label: "疯抢榜", emoji: "🔥" },
  { id: "new", label: "上新", emoji: "🆕" },
  { id: "price-asc", label: "低价", emoji: "💰" },
] as const;

type FilterId = (typeof FILTER_CHIPS)[number]["id"];

function FilterChips({
  active,
  onChange,
}: {
  active: FilterId;
  onChange: (id: FilterId) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {FILTER_CHIPS.map((c) => {
        const isActive = c.id === active;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black transition-all active:scale-95",
              isActive
                ? "bg-[var(--brand-red)] text-white shadow-[0_3px_8px_rgba(254,44,85,0.28)]"
                : "bg-[var(--app-card)] text-muted-foreground shadow-[inset_0_0_0_1px_rgba(193,122,60,0.18)]",
            )}
          >
            <span className="mr-0.5">{c.emoji}</span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

const GRAB_AVATAR_SEEDS = ["张", "李", "王", "赵"] as const;

function useProductMeta(item: ProductItem) {
  const price = Number(item.cashPrice);
  const original =
    item.originalCashPrice != null ? Number(item.originalCashPrice) : null;

  return useMemo(() => {
    let h = 0;
    for (let i = 0; i < item.id.length; i++) h += item.id.charCodeAt(i);
    const sold = 800 + (h % 8200);
    const rating = (4.6 + (h % 4) * 0.1).toFixed(1);
    const grabbing = 120 + (h % 980);
    const stockPercent = 20 + (h % 70);
    const saveYuan =
      original != null && original > price
        ? Math.max(1, Math.round(original - price))
        : 3 + (h % 36);
    return { price, original, sold, rating, grabbing, stockPercent, saveYuan };
  }, [item.id, original, price]);
}

function getCtaLabel(price: number, pointsPrice: number) {
  if (price > 0) {
    const dec = Number.isInteger(price) ? 0 : 2;
    return `¥${price.toFixed(dec)} 抢`;
  }
  if (pointsPrice > 0) return `${pointsPrice}积分抢`;
  return "免费冲";
}

/* ============ 移动端商品行（带角标/进度/撕边/burst） ============ */
function MobileProductRow({
  item,
  onClick,
}: {
  item: ProductItem;
  onClick: () => void;
}) {
  const { price, original, sold, rating, grabbing, stockPercent, saveYuan } =
    useProductMeta(item);
  return (
    <div
      className="group relative flex w-full cursor-pointer items-stretch gap-0 overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_4px_16px_rgba(122,60,30,0.08)] transition-transform active:scale-[0.99]"
      onClick={onClick}
    >
      {saveYuan > 0 && (
        <CornerRibbon tone="red" position="right">
          立省¥{saveYuan}
        </CornerRibbon>
      )}
      <div className="relative h-[116px] w-[116px] shrink-0 overflow-hidden bg-[var(--app-soft)]">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-muted-foreground">
            {item.app}
          </div>
        )}
        <div className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
          {item.app}
        </div>
        <BurstBadge tone="red" size={32} className="absolute bottom-1 left-1">
          爆
        </BurstBadge>
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-2.5 py-2">
        <div className="flex items-start gap-1">
          <HotSticker tone="red" rotate={-4}>
            官方
          </HotSticker>
          <HotSticker tone="gold" rotate={3}>
            包邮
          </HotSticker>
          <HotSticker tone="pink" rotate={-2}>
            可叠券
          </HotSticker>
        </div>
        <div className="mt-1 line-clamp-2 text-[13px] font-black leading-[18px] text-foreground">
          {item.title}
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-0.5 text-[var(--brand-orange)]">
            ⭐<span className="font-black">{rating}</span>
          </span>
          <span>·</span>
          <span>已售{sold}</span>
        </div>

        <div className="mt-1">
          <GrabProgress
            percent={stockPercent}
            label={`${grabbing}人抢中`}
            size="sm"
          />
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <PriceTag
            price={price}
            pointsPrice={item.pointsPrice}
            original={original}
            size="md"
            showSave={false}
          />
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="h-8 shrink-0 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-3.5 text-[12px] font-black text-white shadow-[0_4px_10px_rgba(254,44,85,0.32)] hover:brightness-110"
          >
            {getCtaLabel(price, item.pointsPrice)}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============ 宽屏商品卡 ============ */
function DesktopProductCard({
  item,
  onClick,
}: {
  item: ProductItem;
  onClick: () => void;
}) {
  const { price, original, sold, rating, grabbing, stockPercent, saveYuan } =
    useProductMeta(item);
  const ctaLabel = getCtaLabel(price, item.pointsPrice);

  return (
    <div
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_4px_16px_rgba(122,60,30,0.08)] transition-transform active:scale-[0.99]"
      onClick={onClick}
    >
      {saveYuan > 0 && (
        <CornerRibbon tone="red" position="right">
          立省¥{saveYuan}
        </CornerRibbon>
      )}
      <div className="relative aspect-square overflow-hidden bg-[var(--app-soft)]">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-muted-foreground">
            {item.app}
          </div>
        )}
        <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-black text-white">
          {item.app}
        </div>
        <StampMark size={44} className="absolute bottom-1.5 left-1.5 bg-white/75 backdrop-blur-sm">
          官方
        </StampMark>
      </div>

      <TearDivider />

      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-0.5">
        <div className="flex items-start gap-1">
          <HotSticker tone="red" rotate={-4}>
            百亿
          </HotSticker>
          <HotSticker tone="gold" rotate={3}>
            包邮
          </HotSticker>
          <HotSticker tone="pink" rotate={-2}>
            可叠券
          </HotSticker>
        </div>
        <div className="mt-1 line-clamp-2 min-h-[36px] text-[13px] font-black leading-[18px] text-foreground">
          {item.title}
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-0.5 text-[var(--brand-orange)]">
            ⭐<span className="font-black">{rating}</span>
          </span>
          <span>·</span>
          <span>已售{sold}</span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {GRAB_AVATAR_SEEDS.map((ch, i) => (
              <div
                key={i}
                className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--app-card)] bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-[9px] font-black text-white"
                style={{ zIndex: GRAB_AVATAR_SEEDS.length - i }}
              >
                {ch}
              </div>
            ))}
          </div>
          <span className="text-[10px] font-black text-[var(--brand-red)]">
            {grabbing}人抢中
          </span>
        </div>

        <div className="mt-1">
          <GrabProgress percent={stockPercent} size="sm" />
        </div>

        <div className="mt-auto pt-1.5">
          <PriceTag
            price={price}
            pointsPrice={item.pointsPrice}
            original={original}
            size="md"
            showSave={false}
          />
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="mt-1.5 h-9 w-full rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-sm font-black text-white shadow-[0_4px_10px_rgba(254,44,85,0.32)] hover:brightness-110"
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============ Skeletons ============ */
function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      <div className="flex flex-col gap-2.5 md:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <Card
            key={i}
            className="flex gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-[0_4px_16px_rgba(122,60,30,0.08)]"
          >
            <Skeleton className="h-[116px] w-[116px] shrink-0" />
            <div className="flex-1 space-y-1.5 p-2.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-1.5 w-full" />
              <div className="flex items-end justify-between gap-2 pt-1.5">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="hidden gap-2.5 md:grid md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card
            key={i}
            className="gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-[0_4px_16px_rgba(122,60,30,0.08)]"
          >
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-2 p-2.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-full rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

/* ============ 刷积分内容卡 ============ */
function EarnContentCard({
  content,
  onClick,
}: {
  content: (typeof earnContents)[number];
  onClick: () => void;
}) {
  return (
    <div
      className="flex h-full w-40 shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_4px_12px_rgba(122,60,30,0.08)] transition-transform active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)]">
        <span className="text-3xl">▶️</span>
        <BurstBadge tone="gold" size={40} className="absolute right-1 top-1">
          +{content.rewardPoints}
        </BurstBadge>
      </div>
      <div className="flex flex-1 flex-col p-2">
        <div className="line-clamp-2 min-h-[36px] text-[12px] font-bold leading-[18px] text-foreground">
          {content.title}
        </div>
        <div className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-[var(--brand-red-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--brand-red)]">
          {content.subtitle} ›
        </div>
      </div>
    </div>
  );
}

/* ============ 信任底栏 ============ */
const TRUST_MARQUEE_LINE =
  "🛡 官方授权  ·  ⚡ 极速到账  ·  ✨ 7天售后  ·  💰 积分抵现  ·  ";

function TrustMarquee() {
  return (
    <div className="overflow-hidden rounded-full bg-[linear-gradient(90deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)] py-2 text-[11px] font-black text-white shadow-[0_4px_12px_rgba(254,44,85,0.22)]">
      <div className="consumer-marquee-track">
        <span className="shrink-0 whitespace-nowrap px-5">{TRUST_MARQUEE_LINE}</span>
        <span className="shrink-0 whitespace-nowrap px-5">{TRUST_MARQUEE_LINE}</span>
      </div>
    </div>
  );
}

/* ============ 弹幕抢购通栏 ============ */
const DANMU_ITEMS = [
  "🎉 张**在 3 秒前抢到 ¥1 神券",
  "🔥 李**节省了 ¥128",
  "⚡ 王**用积分换了视频VIP",
  "💎 赵**拿下 0 元专区",
  "📣 最近 1 小时 1.2 万人参团",
];

/* ============ 页面 ============ */
export default function HomePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [activeCat, setActiveCat] = useState<CategoryId>("limited");
  const [activeFilter, setActiveFilter] = useState<FilterId>("recommend");

  const { data: productsData, isLoading: loadingProducts } = useQuery(
    trpc.product.list.queryOptions({ category: activeCat }),
  );
  const { data: session } = useSession();
  const { data: profile } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  });

  const { data: publicAds } = useQuery(
    trpc.admin.listPublicAdSlots.queryOptions(undefined),
  );

  const cmsBannerSlides = useMemo((): CmsBannerItem[] => {
    if (!publicAds?.length) return [];
    const out: CmsBannerItem[] = [];
    for (const s of publicAds) {
      if (s.placement !== "banner") continue;
      const imageUrl = pickAdSlotImage(s.imageUrls);
      if (!imageUrl) continue;
      out.push({ id: s.id, imageUrl, title: s.name, linkUrl: s.linkUrl ?? "" });
    }
    return out;
  }, [publicAds]);

  const cmsInlineSlides = useMemo((): CmsBannerItem[] => {
    if (!publicAds?.length) return [];
    const out: CmsBannerItem[] = [];
    for (const s of publicAds) {
      if (s.placement !== "inline") continue;
      const imageUrl = pickAdSlotImage(s.imageUrls);
      if (!imageUrl) continue;
      out.push({ id: s.id, imageUrl, title: s.name, linkUrl: s.linkUrl ?? "" });
    }
    return out;
  }, [publicAds]);

  const followAdLink = useCallback(
    (url: string) => {
      const u = url.trim();
      if (!u) {
        router.push("/");
        return;
      }
      if (/^https?:\/\//i.test(u)) {
        window.open(u, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(u.startsWith("/") ? u : `/${u}`);
    },
    [router],
  );

  const productsRaw = useMemo(
    () => (productsData ?? []) as ProductItem[],
    [productsData],
  );

  const products = useMemo(() => {
    const arr = [...productsRaw];
    if (activeFilter === "price-asc") {
      arr.sort((a, b) => Number(a.cashPrice) - Number(b.cashPrice));
    } else if (activeFilter === "new") {
      arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (activeFilter === "hot") {
      arr.sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
    }
    return arr;
  }, [productsRaw, activeFilter]);

  const openScroll = (id: string) => router.push(`/scroll/${id}`);

  return (
    <PageTransition>
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
        <AnimatedItem>
          <TopBar
            profile={profile as UserProfile | undefined}
            isAuthed={!!session?.user}
            onGoMember={() => router.push("/member")}
            onLogin={() => router.push("/login")}
            onSearch={() => router.push("/member")}
          />
        </AnimatedItem>

        <AnimatedItem>
          <DanmuBubble items={DANMU_ITEMS} />
        </AnimatedItem>

        <AnimatedItem>
          <div className="rounded-2xl bg-[var(--app-card)] p-2.5 shadow-[0_4px_14px_rgba(122,60,30,0.06)]">
            <ShortcutGrid onSelect={() => router.push("/member")} />
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <BannerCarousel
            cmsBanners={cmsBannerSlides}
            onOpen={openScroll}
            onFollowAdLink={followAdLink}
            onCmsFallback={() => router.push("/")}
          />
        </AnimatedItem>

        <AnimatedItem>
          <FlashTimer />
        </AnimatedItem>

        <AnimatedItem>
          <DoubleBanners
            cmsInline={cmsInlineSlides}
            onLimited={() => setActiveCat("limited")}
            onZero={() => setActiveCat("zero")}
            onFollowAdLink={followAdLink}
          />
        </AnimatedItem>

        {/* 商品楼层 */}
        <AnimatedSection className="space-y-2">
          <FloorHeader
            emoji="🔥"
            title="百亿补贴楼"
            subtitle="官方直补 · 全网最低"
            cta="全部"
            onCtaClick={() => router.push("/category/limited")}
          />

          <CategoryTabs active={activeCat} onChange={setActiveCat} />
          <FilterChips active={activeFilter} onChange={setActiveFilter} />

          {loadingProducts ? (
            <ProductGridSkeleton count={4} />
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-[var(--app-card)] p-8 text-center text-xs font-semibold text-muted-foreground shadow-[0_4px_14px_rgba(122,60,30,0.06)]">
              😅 暂无商品
            </div>
          ) : (
            <>
              <StaggerList className="flex flex-col gap-2.5 md:hidden">
                {products.map((item) => (
                  <AnimatedItem key={item.id}>
                    <MobileProductRow
                      item={item}
                      onClick={() => openScroll(item.id)}
                    />
                  </AnimatedItem>
                ))}
              </StaggerList>
              <StaggerList className="hidden gap-2.5 md:grid md:grid-cols-3 lg:grid-cols-4">
                {products.map((item) => (
                  <AnimatedItem key={item.id}>
                    <DesktopProductCard
                      item={item}
                      onClick={() => openScroll(item.id)}
                    />
                  </AnimatedItem>
                ))}
              </StaggerList>
            </>
          )}
        </AnimatedSection>

        {/* 刷积分楼层 */}
        <AnimatedSection className="space-y-2">
          <FloorHeader
            emoji="📺"
            title="刷视频赚积分"
            subtitle="看一下就能换神券"
            cta="更多"
            tone="gold"
            onCtaClick={() => router.push("/member")}
          />
          <ScrollArea>
            <div className="flex gap-2.5 pb-1">
              {earnContents.slice(0, 6).map((content) => (
                <EarnContentCard
                  key={content.id}
                  content={content}
                  onClick={() => openApp(content.app)}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </AnimatedSection>

        {/* 薅攻略楼层 */}
        <AnimatedSection className="space-y-2">
          <FloorHeader
            emoji="📣"
            title="薅羊毛攻略"
            subtitle="官方亲授抢券姿势"
            tone="pink"
          />
          <div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_4px_14px_rgba(122,60,30,0.08)]">
            {hotPosts.map((post, i) => (
              <button
                key={post.id}
                type="button"
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-[var(--app-soft)]",
                  i !== hotPosts.length - 1 &&
                    "border-b border-dashed border-[var(--app-card-border)]",
                )}
              >
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--pastel-gradient)]">
                  <Flame className="h-6 w-6 text-[var(--brand-red)]" strokeWidth={2.4} />
                  <span className="absolute -right-1 -top-1 rounded-full bg-[var(--brand-red)] px-1 text-[9px] font-black text-white">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <HotSticker tone="red" rotate={-3}>
                      官方
                    </HotSticker>
                    <div className="line-clamp-1 text-[13px] font-black text-foreground">
                      {post.title}
                    </div>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                    {post.excerpt}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                    <span className="rounded bg-[var(--app-soft)] px-1 py-0 font-black">
                      {post.app}
                    </span>
                    <span>👁 1.6万</span>
                    <span>·</span>
                    <span className="text-[var(--brand-red)]">👍 {post.likeText}</span>
                  </div>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection>
          <TrustMarquee />
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
