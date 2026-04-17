"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  Flame,
  Gamepad2,
  Gift,
  GraduationCap,
  Grid3x3,
  Music,
  Phone,
  Play,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  UtensilsCrossed,
  Video,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  motion,
  AnimatePresence,
  AnimatedItem,
  AnimatedSection,
  HoverScale,
  PageTransition,
  StaggerList,
} from "@/components/motion";

type ProductItem = RouterOutputs["product"]["list"][number];
type UserProfile = RouterOutputs["user"]["me"];

function getVipLabel(profile: UserProfile | undefined | null) {
  if (!profile) return "普通会员";
  return profile.vipLevel <= 0 ? "普通会员" : `VIP${profile.vipLevel}`;
}

/* ---------- 顶部用户栏 + 搜索 ---------- */
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isAuthed ? onGoMember : onLogin}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
            {name.slice(0, 1)}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-foreground">{name}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="rounded bg-[var(--brand-red-soft)] px-1.5 py-0.5 font-semibold text-[var(--brand-red)]">
                {getVipLabel(profile)}
              </span>
              {isAuthed && (
                <span>{points.toLocaleString("zh-CN")} 积分</span>
              )}
            </div>
          </div>
        </button>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="flex h-10 w-full items-center gap-2 rounded-full border border-[var(--app-card-border)] bg-secondary/60 px-4 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">🔍 搜好物!</span>
      </button>
    </div>
  );
}

/* ---------- 顶部热卖跑马灯 ---------- */
const HOT_MARQUEE_LINE =
  "🔥 刚刚有人兑成功!  ·  ⚡ 券量不多手慢无!  ·  💰 积分当钱花!  ·  🎁 0元也能兑!  ·  ⭐ 官方渠道放心!  ·  ";

function HotMarquee() {
  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-r from-[#FE2C55] to-[#FF6E37] py-2 text-[11px] font-bold text-white shadow-sm">
      <div className="consumer-marquee-track">
        <span className="shrink-0 whitespace-nowrap px-4">{HOT_MARQUEE_LINE}</span>
        <span className="shrink-0 whitespace-nowrap px-4">{HOT_MARQUEE_LINE}</span>
      </div>
    </div>
  );
}

/* ---------- Banner 下秒杀倒计时 ---------- */
function useEndOfTodayMs() {
  return useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);
}

function FlashCountdownStrip() {
  const targetAt = useEndOfTodayMs();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, targetAt - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-[#FE2C55] via-[#FF4D6A] to-[#FF6E37] px-3 py-2.5 text-white shadow-[0_6px_20px_rgba(254,44,85,0.22)]">
      <span className="text-xs font-black tracking-tight">⚡ 今日秒杀!</span>
      <span className="inline-flex items-center gap-1 font-mono text-sm font-black tabular-nums">
        <span className="rounded-md bg-white/20 px-2 py-0.5">{pad(h)}</span>
        <span className="opacity-80">:</span>
        <span className="rounded-md bg-white/20 px-2 py-0.5">{pad(m)}</span>
        <span className="opacity-80">:</span>
        <span className="rounded-md bg-white/20 px-2 py-0.5">{pad(s)}</span>
      </span>
    </div>
  );
}

/* ---------- Banner 轮播 ---------- */
function BannerCarousel({ onOpen }: { onOpen: (scrollId: string) => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 6000);
    return () => window.clearTimeout(id);
  }, [index]);

  const current = banners[index];

  return (
    <div className="relative overflow-hidden rounded-xl">
      <AnimatePresence mode="wait">
        <motion.button
          key={current.id}
          type="button"
          onClick={() => onOpen(current.scrollId)}
          className={cn(
            "relative flex h-32 w-full items-center justify-between overflow-hidden rounded-xl bg-gradient-to-br px-5 text-left text-white md:h-36",
            current.gradient,
          )}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/10" />
          <div className="relative max-w-[60%]">
            <div className="text-[11px] font-medium text-white/80">
              {current.cta}
            </div>
            <div className="mt-1 text-lg font-extrabold leading-tight tracking-tight md:text-xl">
              {current.title}
            </div>
            <div className="mt-1 text-[11px] text-white/85 md:text-xs">
              {current.subtitle}
            </div>
          </div>
          <div className="relative text-5xl md:text-6xl opacity-90">🎁</div>
        </motion.button>
      </AnimatePresence>

      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`切换到第 ${i + 1} 张`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-5 bg-white" : "w-1.5 bg-white/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- 副 Banner 并排 2 张 ---------- */
function DoubleBanners({
  onLimited,
  onZero,
}: {
  onLimited: () => void;
  onZero: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <HoverScale>
        <button
          type="button"
          onClick={onLimited}
          className="relative flex h-20 w-full items-center justify-between overflow-hidden rounded-xl bg-gradient-to-br from-[#FE2C55] to-[#FF6E37] px-4 text-left text-white shadow-[0_6px_18px_rgba(254,44,85,0.2)]"
        >
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/15 blur-xl" />
          <div className="relative">
            <div className="text-[10px] font-bold text-white/90">⚡ 错过后悔!</div>
            <div className="text-base font-extrabold leading-tight">限时神券!</div>
            <div className="mt-0.5 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-red)]">
              领!
            </div>
          </div>
          <div className="relative text-3xl">⚡</div>
        </button>
      </HoverScale>
      <HoverScale>
        <button
          type="button"
          onClick={onZero}
          className="relative flex h-20 w-full items-center justify-between overflow-hidden rounded-xl bg-gradient-to-br from-[#F5B800] to-[#FF6E37] px-4 text-left text-white shadow-[0_6px_18px_rgba(245,184,0,0.24)]"
        >
          <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/15 blur-xl" />
          <div className="relative">
            <div className="text-[10px] font-bold text-white/90">💎 兑到手软!</div>
            <div className="text-base font-extrabold leading-tight">0元专区!</div>
            <div className="mt-0.5 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-orange)]">
              冲!
            </div>
          </div>
          <div className="relative text-3xl">💎</div>
        </button>
      </HoverScale>
    </div>
  );
}

/* ---------- 金刚区 10 品牌入口 ---------- */
const SHORTCUTS = [
  { id: "video",   icon: Video,             label: "视频会员",  color: "from-[#FE2C55] to-[#FF4D8D]" },
  { id: "music",   icon: Music,             label: "音乐会员",  color: "from-[#00D084] to-[#0AE59C]" },
  { id: "game",    icon: Gamepad2,          label: "游戏直充",  color: "from-[#A855F7] to-[#C084FC]" },
  { id: "phone",   icon: Phone,             label: "话费充值",  color: "from-[#3B82F6] to-[#60A5FA]" },
  { id: "food",    icon: UtensilsCrossed,   label: "外卖美食",  color: "from-[#FF6E37] to-[#FFA500]" },
  { id: "shop",    icon: ShoppingBag,       label: "品牌券包",  color: "from-[#EC4899] to-[#F472B6]" },
  { id: "learn",   icon: GraduationCap,     label: "学习知识",  color: "from-[#06B6D4] to-[#22D3EE]" },
  { id: "rebate",  icon: Gift,              label: "邀请返利",  color: "from-[#F5B800] to-[#FFA500]" },
  { id: "zero",    icon: Sparkles,          label: "0 元兑",   color: "from-[#FE2C55] to-[#A855F7]" },
  { id: "all",     icon: Grid3x3,           label: "全部分类",  color: "from-[#64748B] to-[#94A3B8]" },
] as const;

function ShortcutGrid({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-y-4">
        {SHORTCUTS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className="flex flex-col items-center gap-1.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 320, damping: 26 }}
              whileTap={{ scale: 0.92 }}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm",
                  s.color,
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-medium text-foreground">
                {s.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 一级分类 Tab ---------- */
const CATEGORY_TABS = [
  { id: "limited", label: "⚡ 限时神券!" },
  { id: "today", label: "🔥 今日必抢!" },
  { id: "zero", label: "💸 0元冲!" },
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
    <div className="relative flex items-center gap-1 border-b border-[var(--app-card-border)]">
      {CATEGORY_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm transition-colors",
              isActive
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {isActive && (
              <motion.span
                layoutId="home-cat-tab"
                className="absolute bottom-[-1px] left-2 right-2 h-[3px] rounded-full bg-[var(--brand-red)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 二级胶囊筛选 ---------- */
const FILTER_CHIPS = [
  { id: "recommend", label: "✨ 推荐!" },
  { id: "hot", label: "🔥 最热!" },
  { id: "new", label: "🆕 上新!" },
  { id: "price-asc", label: "💰 低价!" },
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
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {FILTER_CHIPS.map((c) => {
        const isActive = c.id === active;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
              isActive
                ? "border-[var(--brand-red)] bg-[var(--brand-red-soft)] font-semibold text-[var(--brand-red)]"
                : "border-[var(--app-card-border)] bg-white text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

const GRAB_AVATAR_SEEDS = ["张", "李", "王", "赵"] as const;

/* ---------- 商品信息 hash（社证稳定伪数据） ---------- */
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
    const saveYuan =
      original != null && original > price
        ? Math.max(1, Math.round(original - price))
        : 3 + (h % 36);
    return { price, original, sold, rating, grabbing, saveYuan };
  }, [item.id, original, price]);
}

function getCtaLabel(price: number, pointsPrice: number) {
  if (price > 0) {
    const dec = Number.isInteger(price) ? 0 : 2;
    return `¥${price.toFixed(dec)}抢!`;
  }
  if (pointsPrice > 0) return `${pointsPrice}积分抢!`;
  return "免费冲!";
}

/* ---------- 移动端：一行一条的横向商品行 ---------- */
function MobileProductRow({
  item,
  onClick,
}: {
  item: ProductItem;
  onClick: () => void;
}) {
  const { price, original, sold, rating, grabbing, saveYuan } =
    useProductMeta(item);

  return (
    <HoverScale scale={1.005}>
      <Card
        className="group relative flex w-full cursor-pointer flex-row items-stretch gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-white p-0 shadow-none transition-colors hover:border-[var(--brand-red)]/45"
        onClick={onClick}
      >
        <div className="relative h-[120px] w-[120px] shrink-0 overflow-hidden bg-secondary">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold text-muted-foreground">
                {item.app}
              </span>
            </div>
          )}
          <div className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {item.app}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col px-3 py-2.5">
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0 rounded border border-[var(--brand-red)] bg-[var(--brand-red-soft)] px-1 py-0 text-[9px] font-bold leading-[14px] text-[var(--brand-red)]">
              官方
            </span>
            <div className="line-clamp-2 flex-1 text-[13px] font-semibold leading-[18px] text-foreground">
              {item.title}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-[var(--brand-orange)] text-[var(--brand-orange)]" />
              <span className="font-semibold text-foreground">{rating}</span>
            </span>
            <span>·</span>
            <span>已售 {sold}</span>
            <span>·</span>
            <span className="font-semibold text-[var(--brand-red)]">
              {grabbing}人抢!
            </span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-end gap-1.5">
                <div className="text-xl font-black leading-none tracking-tight text-[var(--brand-red)]">
                  {item.pointsPrice > 0 && (
                    <span className="text-base">{item.pointsPrice}积分</span>
                  )}
                  {item.pointsPrice > 0 && price > 0 && (
                    <span className="mx-0.5 text-sm font-black text-foreground">
                      +
                    </span>
                  )}
                  {price > 0 && (
                    <span>
                      ¥
                      {Number.isInteger(price)
                        ? price.toFixed(0)
                        : price.toFixed(2)}
                    </span>
                  )}
                  {item.pointsPrice === 0 && price === 0 && (
                    <span className="text-lg">免费!</span>
                  )}
                </div>
                {original != null && original > price && (
                  <span className="pb-0.5 text-[10px] text-muted-foreground line-through">
                    ¥
                    {Number.isInteger(original)
                      ? original.toFixed(0)
                      : original.toFixed(2)}
                  </span>
                )}
              </div>
              {saveYuan > 0 && (
                <span className="mt-1 inline-block rounded-sm bg-[var(--brand-red)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  立省¥{saveYuan}
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="h-8 shrink-0 rounded-full bg-[var(--brand-red)] px-4 text-xs font-black text-white shadow-sm hover:bg-[var(--brand-red-hover)]"
            >
              {getCtaLabel(price, item.pointsPrice)}
            </Button>
          </div>
        </div>
      </Card>
    </HoverScale>
  );
}

/* ---------- 宽屏：券形竖向卡片（多列网格） ---------- */
function MinimalProductCard({
  item,
  onClick,
}: {
  item: ProductItem;
  onClick: () => void;
}) {
  const { price, original, sold, rating, grabbing, saveYuan } =
    useProductMeta(item);
  const ctaLabel = getCtaLabel(price, item.pointsPrice);

  return (
    <HoverScale scale={1.015}>
      <Card
        className="group relative flex h-full cursor-pointer flex-col gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-white p-0 shadow-none transition-colors hover:border-[var(--brand-red)]/45"
        onClick={onClick}
      >
        {saveYuan > 0 && (
          <div className="pointer-events-none absolute right-0 top-0 z-20 h-[52px] w-[52px] overflow-hidden">
            <div className="absolute right-[-28px] top-[10px] w-[120px] rotate-45 bg-[var(--brand-red)] py-0.5 text-center text-[9px] font-black tracking-wide text-white shadow-md">
              立省¥{saveYuan}
            </div>
          </div>
        )}

        <div className="relative aspect-square overflow-hidden bg-secondary">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold text-muted-foreground">
                {item.app}
              </span>
            </div>
          )}
          <div className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {item.app}
          </div>
          <div className="absolute right-1.5 top-1.5 rounded border border-white/40 bg-[var(--brand-red)]/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            官方
          </div>
        </div>

        {/* 券撕边 */}
        <div className="relative flex h-2.5 shrink-0 items-center bg-white px-2">
          <div
            className="absolute left-[-6px] top-1/2 z-[1] h-3 w-3 -translate-y-1/2 rounded-full border border-[var(--app-card-border)] bg-[var(--app-shell-bg)]"
            aria-hidden
          />
          <div className="mx-2 h-0 flex-1 border-t border-dashed border-[var(--app-card-border)]" />
          <div
            className="absolute right-[-6px] top-1/2 z-[1] h-3 w-3 -translate-y-1/2 rounded-full border border-[var(--app-card-border)] bg-[var(--app-shell-bg)]"
            aria-hidden
          />
        </div>

        <div className="flex flex-1 flex-col bg-white px-3 pb-3 pt-0.5">
          <div className="line-clamp-2 min-h-[36px] text-[13px] font-semibold leading-[18px] text-foreground">
            {item.title}
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-[var(--brand-orange)] text-[var(--brand-orange)]" />
              <span className="font-semibold text-foreground">{rating}</span>
            </span>
            <span>·</span>
            <span>已售 {sold}</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-2">
              {GRAB_AVATAR_SEEDS.map((ch, i) => (
                <div
                  key={i}
                  className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#FE2C55] to-[#FF6E37] text-[9px] font-black text-white first:ml-0"
                  style={{ zIndex: GRAB_AVATAR_SEEDS.length - i }}
                >
                  {ch}
                </div>
              ))}
            </div>
            <span className="text-[10px] font-semibold text-[var(--brand-red)]">
              {grabbing}人正在抢!
            </span>
          </div>

          <div className="mt-auto pt-2">
            <div className="flex flex-wrap items-end gap-1.5">
              <div className="text-2xl font-black leading-none tracking-tight text-[var(--brand-red)]">
                {item.pointsPrice > 0 && (
                  <span className="text-lg">{item.pointsPrice}积分</span>
                )}
                {item.pointsPrice > 0 && price > 0 && (
                  <span className="mx-0.5 text-base font-black text-foreground">
                    +
                  </span>
                )}
                {price > 0 && (
                  <span>
                    ¥
                    {Number.isInteger(price)
                      ? price.toFixed(0)
                      : price.toFixed(2)}
                  </span>
                )}
                {item.pointsPrice === 0 && price === 0 && (
                  <span className="text-xl">免费!</span>
                )}
              </div>
              {original != null && original > price && (
                <span className="pb-0.5 text-[10px] text-muted-foreground line-through">
                  ¥
                  {Number.isInteger(original)
                    ? original.toFixed(0)
                    : original.toFixed(2)}
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="mt-2 h-9 w-full rounded-full bg-[var(--brand-red)] text-sm font-black text-white shadow-sm hover:bg-[var(--brand-red-hover)]"
            >
              {ctaLabel}
            </Button>
          </div>
        </div>
      </Card>
    </HoverScale>
  );
}

/* ---------- Skeletons ---------- */
function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: count }).map((_, i) => (
          <Card
            key={i}
            className="flex gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] p-0"
          >
            <Skeleton className="h-[120px] w-[120px] shrink-0" />
            <div className="flex-1 space-y-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/5" />
              <div className="flex items-end justify-between gap-2 pt-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card
            key={i}
            className="gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] p-0"
          >
            <Skeleton className="aspect-square w-full" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-8 w-full rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

/* ---------- 内容种草卡 ---------- */
function EarnContentCard({
  content,
  onClick,
}: {
  content: (typeof earnContents)[number];
  onClick: () => void;
}) {
  return (
    <HoverScale scale={1.02}>
      <Card
        className="flex h-full cursor-pointer gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-white p-0 shadow-none"
        onClick={onClick}
      >
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-secondary">
          <Play className="h-8 w-8 text-muted-foreground" />
          <div className="absolute right-1.5 top-1.5 rounded bg-[var(--brand-red)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            +{content.rewardPoints}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-3">
          <div className="line-clamp-2 min-h-[36px] text-[12px] font-medium leading-[18px] text-foreground">
            {content.title}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {content.subtitle}
          </div>
        </div>
      </Card>
    </HoverScale>
  );
}

const TRUST_MARQUEE_LINE =
  "🛡 官方授权!  ·  ⚡ 极速到账!  ·  ✨ 7天售后!  ·  💰 积分抵现!  ·  ";

function TrustMarquee() {
  return (
    <div className="overflow-hidden rounded-xl bg-[var(--brand-red)] py-2.5 text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
      <div className="consumer-marquee-track">
        <span className="shrink-0 whitespace-nowrap px-5">
          {TRUST_MARQUEE_LINE}
        </span>
        <span className="shrink-0 whitespace-nowrap px-5">
          {TRUST_MARQUEE_LINE}
        </span>
      </div>
    </div>
  );
}

/* =========================================================== */
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

  const productsRaw = useMemo(
    () => (productsData ?? []) as ProductItem[],
    [productsData],
  );

  // 前端按 filter 排序
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
      <div className="space-y-4 px-4 py-4 md:space-y-5 md:px-6 md:py-5">
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
          <HotMarquee />
        </AnimatedItem>

        <AnimatedItem>
          <ShortcutGrid onSelect={() => router.push("/member")} />
        </AnimatedItem>

        <AnimatedItem>
          <BannerCarousel onOpen={openScroll} />
        </AnimatedItem>

        <AnimatedItem>
          <FlashCountdownStrip />
        </AnimatedItem>

        <AnimatedItem>
          <DoubleBanners
            onLimited={() => setActiveCat("limited")}
            onZero={() => setActiveCat("zero")}
          />
        </AnimatedItem>

        <AnimatedItem>
          <CategoryTabs active={activeCat} onChange={setActiveCat} />
        </AnimatedItem>

        <AnimatedItem>
          <FilterChips active={activeFilter} onChange={setActiveFilter} />
        </AnimatedItem>

        <AnimatedSection>
          {loadingProducts ? (
            <ProductGridSkeleton count={4} />
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-8 text-center text-xs text-muted-foreground">
              😅 暂无!
            </div>
          ) : (
            <>
              <StaggerList className="flex flex-col gap-3 md:hidden">
                {products.map((item) => (
                  <AnimatedItem key={item.id}>
                    <MobileProductRow
                      item={item}
                      onClick={() => openScroll(item.id)}
                    />
                  </AnimatedItem>
                ))}
              </StaggerList>
              <StaggerList className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-4">
                {products.map((item) => (
                  <AnimatedItem key={item.id}>
                    <MinimalProductCard
                      item={item}
                      onClick={() => openScroll(item.id)}
                    />
                  </AnimatedItem>
                ))}
              </StaggerList>
            </>
          )}
        </AnimatedSection>

        {/* 看内容赚积分 */}
        <AnimatedSection className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">📺 刷积分!</h2>
            <button
              type="button"
              onClick={() => router.push("/member")}
              className="flex items-center text-xs font-medium text-muted-foreground hover:text-[var(--brand-red)]"
            >
              更多!
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <ScrollArea>
            <StaggerList className="flex gap-3 pb-1">
              {earnContents.slice(0, 6).map((content) => (
                <AnimatedItem key={content.id} className="w-40 shrink-0">
                  <EarnContentCard
                    content={content}
                    onClick={() => openApp(content.app)}
                  />
                </AnimatedItem>
              ))}
            </StaggerList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </AnimatedSection>

        {/* 福利攻略 */}
        <AnimatedSection className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">📣 薅攻略!</h2>
            <span className="rounded-full bg-[var(--brand-red-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-red)]">
              官方!
            </span>
          </div>
          <Card className="gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-white p-0 shadow-none">
            {hotPosts.map((post, i) => (
              <button
                key={post.id}
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60",
                  i !== hotPosts.length - 1 &&
                    "border-b border-[var(--app-card-border)]",
                )}
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#FE2C55]/10 to-[#FF6E37]/10">
                  <Flame className="h-6 w-6 text-[var(--brand-red)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded border border-[var(--brand-red)] px-1 py-0 text-[9px] font-bold text-[var(--brand-red)]">
                      官方
                    </span>
                    <div className="line-clamp-1 text-[13px] font-semibold text-foreground">
                      {post.title}
                    </div>
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {post.excerpt}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium">{post.app}</span>
                    <span>·</span>
                    <span>👁 1.6 万</span>
                    <span>·</span>
                    <span>👍 {post.likeText}</span>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </Card>
        </AnimatedSection>

        {/* 信任底栏（红底跑马灯） */}
        <AnimatedSection>
          <TrustMarquee />
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
