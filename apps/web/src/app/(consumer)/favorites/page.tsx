"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  ImageOff,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AnimatedItem,
  AnimatePresence,
  motion,
  PageTransition,
  StaggerList,
} from "@/components/motion";
import {
  BurstBadge,
  CornerRibbon,
  HotSticker,
  PriceTag,
} from "@/components/consumer-visual";

type FavoriteRecord = RouterOutputs["user"]["myFavorites"][number];

function FavoritesHero({ count }: { count: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)] px-4 py-3 text-white shadow-[0_10px_24px_rgba(254,44,85,0.22)]">
      <div className="stripe-urgent pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-[var(--brand-gold)]/30 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <BurstBadge tone="gold" size={56}>
          {count}
        </BurstBadge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black drop-shadow-sm">
              我的心愿单
            </span>
            <HotSticker tone="gold" rotate={-5}>
              先收藏再下手
            </HotSticker>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-white/90">
            <Heart className="h-3 w-3" />
            {count > 0 ? `已收藏 ${count} 件 · 降价立刻提醒` : "心动的先点心，跌价不错过"}
          </div>
        </div>
      </div>
    </div>
  );
}

function FavCard({
  fav,
  onClick,
}: {
  fav: FavoriteRecord;
  onClick: () => void;
}) {
  const p = fav.product;
  const price = Number((p as { cashPrice: unknown }).cashPrice ?? 0);
  const original =
    (p as { originalCashPrice?: unknown }).originalCashPrice != null
      ? Number((p as { originalCashPrice: unknown }).originalCashPrice)
      : null;
  const saved =
    original != null && original > price ? Math.max(1, Math.round(original - price)) : 0;
  const stock = (p as { stock?: number }).stock ?? 0;
  const lowStock = stock > 0 && stock <= 10;
  const soldOut = stock === 0;
  const tags = (p as { tags?: unknown }).tags as string[] | undefined;
  const subtitle = (p as { subtitle?: string }).subtitle ?? "";
  const imageUrl = (p as { imageUrl?: string | null }).imageUrl ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-[var(--app-card)] text-left shadow-[0_6px_18px_rgba(122,60,30,0.08)] transition-transform active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--app-soft)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={p.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}

        {/* 平台标签 */}
        <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">
          {p.app}
        </div>

        {/* 立省角标 */}
        {saved > 0 && (
          <CornerRibbon tone="red" position="right">
            立省¥{saved}
          </CornerRibbon>
        )}

        {/* 售罄遮罩 */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[12px] font-black text-[var(--brand-red)] shadow">
              已售罄
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="line-clamp-1 text-[13px] font-black text-foreground">
          {p.title}
        </div>
        {subtitle && (
          <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-muted-foreground">
            {subtitle}
          </div>
        )}

        {/* 标签 */}
        {(tags && tags.length > 0) || lowStock ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {lowStock && (
              <HotSticker tone="red" rotate={-4}>
                仅剩 {stock} 件
              </HotSticker>
            )}
            {tags?.slice(0, 2).map((tag, i) => (
              <HotSticker
                key={tag}
                tone={i % 2 === 0 ? "gold" : "pink"}
                rotate={i % 2 === 0 ? -3 : 4}
              >
                {tag}
              </HotSticker>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex items-end justify-between gap-2">
          <PriceTag
            price={price}
            pointsPrice={p.pointsPrice}
            original={original ?? undefined}
            size="sm"
          />
          <span
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-full px-2.5 text-[11px] font-black text-white shadow-[0_2px_6px_rgba(254,44,85,0.32)]",
              soldOut
                ? "bg-[var(--app-soft-strong)] text-muted-foreground shadow-none"
                : "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] hover:brightness-110",
            )}
          >
            {soldOut ? "缺货" : "去抢"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();

  const { data: favorites, isLoading } = useQuery({
    ...trpc.user.myFavorites.queryOptions(),
    enabled: !!session?.user,
    retry: false,
  });

  const items = useMemo(
    () => (favorites ?? []) as FavoriteRecord[],
    [favorites],
  );

  return (
    <PageTransition>
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
        <AnimatedItem>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-card)] text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)] active:scale-95"
            aria-label="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </AnimatedItem>

        <AnimatedItem>
          <FavoritesHero count={items.length} />
        </AnimatedItem>

        {!session?.user ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] px-5 py-10 text-center shadow-[inset_0_0_0_1px_var(--app-card-border)]"
          >
            <div className="dotted-warm pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative">
              <Heart
                className="mx-auto mb-2 h-12 w-12 text-[var(--brand-red)]"
                strokeWidth={1.5}
              />
              <div className="text-[14px] font-black text-[var(--brand-red)]">
                登录后查看心愿单
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#8B4513]">
                登录即送 200 积分，跨设备同步收藏
              </div>
              <Button
                onClick={() => router.push("/login")}
                className="mt-4 h-9 gap-1 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-5 text-[12px] font-black text-white shadow-[0_4px_10px_rgba(254,44,85,0.32)] hover:brightness-110"
              >
                <Sparkles className="h-3.5 w-3.5" />
                去登录
              </Button>
            </div>
          </motion.div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-[4/5] w-full rounded-2xl"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] px-5 py-10 text-center shadow-[inset_0_0_0_1px_var(--app-card-border)]"
          >
            <div className="dotted-warm pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative">
              <Heart
                className="mx-auto mb-2 h-12 w-12 text-[var(--brand-red)]"
                strokeWidth={1.5}
              />
              <div className="text-[14px] font-black text-[var(--brand-red)]">
                心愿单空空
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#8B4513]">
                看到心动的就点❤️ · 跌价第一时间告诉你
              </div>
              <Button
                onClick={() => router.push("/")}
                className="mt-4 h-9 gap-1 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-5 text-[12px] font-black text-white shadow-[0_4px_10px_rgba(254,44,85,0.32)] hover:brightness-110"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                去首页逛逛
              </Button>
            </div>
          </motion.div>
        ) : (
          <StaggerList className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {items.map((fav) => (
                <motion.div
                  key={fav.id}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 28,
                  }}
                >
                  <FavCard
                    fav={fav}
                    onClick={() =>
                      router.push(`/scroll/${fav.product.id}`)
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </StaggerList>
        )}
      </div>
    </PageTransition>
  );
}
