"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  ImageOff,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { useSiteContent, asString, asNumber } from "@/hooks/use-site-content";
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
  HotSticker,
  PriceTag,
} from "@/components/consumer-visual";

type FootprintRecord = RouterOutputs["user"]["myFootprints"][number];

function formatTime(value: Date | string) {
  const d = value instanceof Date ? value : new Date(String(value));
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function dayKey(value: Date | string): {
  key: string;
  label: string;
  date: Date;
} {
  const d = value instanceof Date ? value : new Date(String(value));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diff === 0) return { key: "today", label: "今天", date: target };
  if (diff === 1) return { key: "yesterday", label: "昨天", date: target };
  if (diff < 7) return { key: `d${diff}`, label: `${diff} 天前`, date: target };
  return {
    key: target.toISOString().slice(0, 10),
    label: `${target.getMonth() + 1}-${String(target.getDate()).padStart(2, "0")}`,
    date: target,
  };
}

function FootprintsHero({
  count,
  recentDays,
  emptyText,
}: {
  count: number;
  recentDays: number;
  emptyText: string;
}) {
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
              我的足迹
            </span>
            <HotSticker tone="gold" rotate={-5}>
              再看一眼
            </HotSticker>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-white/90">
            <Eye className="h-3 w-3" />
            {count > 0 ? `近 ${recentDays} 天浏览 ${count} 件` : emptyText}
          </div>
        </div>
      </div>
    </div>
  );
}

function FootprintRow({
  fp,
  onClick,
}: {
  fp: FootprintRecord;
  onClick: () => void;
}) {
  const p = fp.product;
  const price = Number((p as { cashPrice: unknown }).cashPrice ?? 0);
  const original =
    (p as { originalCashPrice?: unknown }).originalCashPrice != null
      ? Number((p as { originalCashPrice: unknown }).originalCashPrice)
      : null;
  const stock = (p as { stock?: number }).stock ?? 0;
  const lowStock = stock > 0 && stock <= 10;
  const soldOut = stock === 0;
  const subtitle = (p as { subtitle?: string }).subtitle ?? "";
  const imageUrl = (p as { imageUrl?: string | null }).imageUrl ?? null;
  const time = formatTime(fp.viewedAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-stretch gap-3 overflow-hidden rounded-2xl bg-[var(--app-card)] p-3 text-left shadow-[0_4px_14px_rgba(122,60,30,0.06)] transition-transform active:scale-[0.99]"
    >
      {/* 缩略图 */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--app-soft)] shadow-[inset_0_0_0_1px_var(--app-card-border)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={p.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black text-[var(--brand-red)]">
              售罄
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="line-clamp-1 flex-1 text-[13px] font-black text-foreground">
            {p.title}
          </span>
          <span className="shrink-0 text-[10px] font-semibold text-muted-foreground tabular-nums">
            {time}
          </span>
        </div>
        <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-muted-foreground">
          {p.app}
          {subtitle && <span className="ml-1 opacity-70">· {subtitle}</span>}
        </div>

        {/* 紧迫感 */}
        {lowStock && (
          <div className="mt-1.5">
            <HotSticker tone="red" rotate={-3}>
              仅剩 {stock} 件
            </HotSticker>
          </div>
        )}

        <div className="mt-1.5 flex items-end justify-between gap-2">
          <PriceTag
            price={price}
            pointsPrice={p.pointsPrice}
            original={original ?? undefined}
            size="sm"
            showSave={false}
          />
          <span
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[11px] font-black text-white shadow-[0_2px_6px_rgba(254,44,85,0.32)]",
              soldOut
                ? "bg-[var(--app-soft-strong)] text-muted-foreground shadow-none"
                : "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] hover:brightness-110",
            )}
          >
            {soldOut ? "缺货" : "再看看"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function FootprintsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();
  const footprintsContent = useSiteContent("footprints");
  const recentDays = asNumber(footprintsContent["footprints.recent_days"], 30);
  const emptyText = asString(footprintsContent["footprints.empty_text"], "看过的好物都会留在这");

  const { data: footprints, isLoading } = useQuery({
    ...trpc.user.myFootprints.queryOptions(),
    enabled: !!session?.user,
    retry: false,
  });

  const items = useMemo(
    () => (footprints ?? []) as FootprintRecord[],
    [footprints],
  );

  // 按日分组
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; date: Date; items: FootprintRecord[] }
    >();
    for (const it of items) {
      const k = dayKey(it.viewedAt);
      const cur = map.get(k.key);
      if (cur) cur.items.push(it);
      else map.set(k.key, { label: k.label, date: k.date, items: [it] });
    }
    return Array.from(map.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [items]);

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
          <FootprintsHero count={items.length} recentDays={recentDays} emptyText={emptyText} />
        </AnimatedItem>

        {!session?.user ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] px-5 py-10 text-center shadow-[inset_0_0_0_1px_var(--app-card-border)]"
          >
            <div className="dotted-warm pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative">
              <Eye
                className="mx-auto mb-2 h-12 w-12 text-[var(--brand-red)]"
                strokeWidth={1.5}
              />
              <div className="text-[14px] font-black text-[var(--brand-red)]">
                登录后查看浏览记录
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#8B4513]">
                同步多端足迹，再不丢失看过的好物
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
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[112px] w-full rounded-2xl" />
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
              <Eye
                className="mx-auto mb-2 h-12 w-12 text-[var(--brand-red)]"
                strokeWidth={1.5}
              />
              <div className="text-[14px] font-black text-[var(--brand-red)]">
                还没有浏览记录
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#8B4513]">
                逛过的好物会自动留在这里
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
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.date.toISOString()} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-red-soft)] px-2.5 py-0.5 text-[11px] font-black text-[var(--brand-red)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
                    {group.label}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {group.items.length} 件
                  </span>
                  <div className="h-px flex-1 bg-[var(--app-card-border)]" />
                </div>
                <StaggerList className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {group.items.map((fp) => (
                      <motion.div
                        key={fp.id}
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
                        <FootprintRow
                          fp={fp}
                          onClick={() =>
                            router.push(`/scroll/${fp.product.id}`)
                          }
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </StaggerList>
              </section>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
