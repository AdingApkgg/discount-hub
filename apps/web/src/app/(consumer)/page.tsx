"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  Gift,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import Countdown from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { banners, hotPosts, hotRanking } from "@/data/mock";
import {
  appCardClassName,
  SectionHeading,
  PageHeading,
  EmptyState,
} from "@/components/shared";
import {
  motion,
  AnimatePresence,
  AnimatedSection,
  StaggerList,
  AnimatedItem,
  PageTransition,
  HoverScale,
} from "@/components/motion";

type ProductItem = RouterOutputs["product"]["list"][number];
type UserProfile = RouterOutputs["user"]["me"];

function getVipLabel(profile: UserProfile | undefined | null) {
  if (!profile) return "普通会员";
  return profile.vipLevel <= 0 ? "普通会员" : `VIP${profile.vipLevel}`;
}

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <HoverScale>
      <Button
        variant="outline"
        onClick={onClick}
        className="h-auto w-full flex-col items-start gap-0 rounded-[24px] border-[var(--app-card-border)] bg-[var(--app-card)] p-4 text-left shadow-sm hover:bg-secondary/80 hover:shadow-md"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div className="mt-4 text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">
          {subtitle}
        </div>
      </Button>
    </HoverScale>
  );
}

function ProductCard({
  item,
  onClick,
}: {
  item: ProductItem;
  onClick: () => void;
}) {
  const price = Number(item.cashPrice);

  return (
    <HoverScale>
    <Card
      className={`${appCardClassName} w-[250px] shrink-0 cursor-pointer overflow-hidden md:w-auto md:shrink`}
      onClick={onClick}
    >
      <div className="relative h-28 overflow-hidden bg-[linear-gradient(135deg,#111827_0%,#1f2937_55%,#374151_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent_42%)]" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
          <div className="min-w-0">
            <Badge className="bg-white/12 text-white hover:bg-white/12">
              {item.app}
            </Badge>
            <div className="mt-3 truncate text-lg font-semibold text-white">
              {item.title}
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-white/20 bg-white/12 text-xs text-white"
          >
            {item.tags[0] ?? "推荐"}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {item.subtitle}
        </p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">兑换价</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-semibold text-foreground">
                {item.pointsPrice}
              </span>
              <span className="text-xs text-muted-foreground">积分</span>
              <span className="text-sm text-muted-foreground">
                + ¥{price.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right text-xs leading-5 text-muted-foreground">
            <div>库存 {item.stock}</div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-medium"
            >
              去兑换
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </HoverScale>
  );
}

function ProductSectionSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className={appCardClassName}>
          <Skeleton className="h-28 w-full rounded-t-[28px]" />
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProductSection({
  title,
  subtitle,
  action,
  items,
  isLoading,
  emptyText,
  onOpen,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  items: ProductItem[];
  isLoading: boolean;
  emptyText: string;
  onOpen: (id: string) => void;
}) {
  return (
    <AnimatedSection className="space-y-3">
      <SectionHeading title={title} subtitle={subtitle} action={action} />
      {isLoading ? (
        <ProductSectionSkeleton />
      ) : items.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <ScrollArea className="md:overflow-visible">
          <StaggerList className="flex gap-3 pb-1 md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <AnimatedItem key={item.id}>
                <ProductCard
                  item={item}
                  onClick={() => onOpen(item.id)}
                />
              </AnimatedItem>
            ))}
          </StaggerList>
          <ScrollBar orientation="horizontal" className="md:hidden" />
        </ScrollArea>
      )}
    </AnimatedSection>
  );
}

export default function HomePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [bannerIndex, setBannerIndex] = useState(0);
  const [targetAt] = useState(() => Date.now() + 6 * 60 * 60 * 1000);

  const { data: limitedProducts, isLoading: loadingLimited } = useQuery(
    trpc.product.list.queryOptions({ category: "limited" }),
  );
  const { data: todayProducts, isLoading: loadingToday } = useQuery(
    trpc.product.list.queryOptions({ category: "today" }),
  );
  const { data: zeroProducts, isLoading: loadingZero } = useQuery(
    trpc.product.list.queryOptions({ category: "zero" }),
  );
  const { data: session } = useSession();
  const { data: profile } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  });

  const limited = useMemo(
    () => (limitedProducts ?? []) as ProductItem[],
    [limitedProducts],
  );
  const today = useMemo(
    () => (todayProducts ?? []) as ProductItem[],
    [todayProducts],
  );
  const zero = useMemo(
    () => (zeroProducts ?? []) as ProductItem[],
    [zeroProducts],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBannerIndex((current) => (current + 1) % banners.length);
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [bannerIndex]);

  const currentBanner = banners[bannerIndex];
  const openScroll = (id: string) => router.push(`/scroll/${id}`);

  return (
    <PageTransition>
    <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
      <AnimatedItem>
      <PageHeading
        label="Discount Hub"
        title="今日精选"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/member")}
            className="rounded-full border-[var(--app-card-border)] bg-[var(--app-card)] px-4 text-foreground shadow-sm hover:bg-secondary"
          >
            {getVipLabel(profile as UserProfile | undefined)}
          </Button>
        }
      />
      </AnimatedItem>

      <AnimatedItem>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.95fr)]">
        <Card className="overflow-hidden rounded-[30px] border border-[var(--app-hero-border)] bg-[var(--app-hero-bg)] py-0 text-white shadow-[var(--app-hero-shadow)]">
          <CardContent className="relative p-5 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,45,85,0.28),transparent_40%)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <Badge className="border-none bg-white/12 text-white hover:bg-white/12">
                  本周主推
                </Badge>
                <div className="text-xs text-white/60">
                  {bannerIndex + 1}/{banners.length}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={bannerIndex}
                  initial={{ opacity: 0, x: 30, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -30, filter: "blur(4px)" }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <div className="mt-5 max-w-[18rem] text-[28px] font-semibold leading-tight md:max-w-[24rem] md:text-[38px]">
                    {currentBanner.title}
                  </div>
                  <p className="mt-3 max-w-[22rem] text-sm leading-6 text-white/72 md:text-base">
                    {currentBanner.subtitle}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => openScroll(currentBanner.scrollId)}
                      className="rounded-full bg-[var(--app-hero-cta-bg)] px-5 text-[var(--app-hero-cta-text)] hover:bg-[var(--app-hero-cta-hover)]"
                    >
                      {currentBanner.cta}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/member")}
                      className="rounded-full border-white/15 bg-white/10 px-5 text-white hover:bg-white/16 hover:text-white"
                    >
                      会员中心
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 grid grid-cols-3 gap-3 md:max-w-[34rem]">
                {[
                  {
                    label: "会员等级",
                    value: getVipLabel(profile as UserProfile | undefined),
                  },
                  {
                    label: "可用积分",
                    value: (
                      (profile as UserProfile | undefined)?.points ?? 0
                    ).toLocaleString("zh-CN"),
                  },
                  {
                    label: "我的券包",
                    value: `${(profile as UserProfile | undefined)?._count.coupons ?? 0} 张`,
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="rounded-2xl bg-white/10 p-3 backdrop-blur"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 260, damping: 24 }}
                  >
                    <div className="text-[11px] text-white/60">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-base font-semibold">
                      {stat.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <HoverScale>
          <Button
            variant="outline"
            onClick={() => router.push("/coupons")}
            className="h-auto w-full justify-start gap-3 rounded-[24px] border-[var(--app-card-border)] bg-[var(--app-card)] px-4 py-3 text-left shadow-sm hover:bg-secondary"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                搜索会员、券包、积分兑换权益
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                推荐先查看限时神券和 0 元兑专区
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          </HoverScale>

          <StaggerList className="grid grid-cols-2 gap-3">
            <AnimatedItem>
            <QuickAction
              icon={Sparkles}
              title="会员任务"
              subtitle="签到、浏览、分享都能拿积分"
              onClick={() => router.push("/member")}
            />
            </AnimatedItem>
            <AnimatedItem>
            <QuickAction
              icon={Ticket}
              title="我的券包"
              subtitle="购买后的权益都在这里查看"
              onClick={() => router.push("/coupons")}
            />
            </AnimatedItem>
            <AnimatedItem>
            <QuickAction
              icon={Gift}
              title="邀请有礼"
              subtitle="复制邀请码，持续拉新赚奖励"
              onClick={() => router.push("/profile")}
            />
            </AnimatedItem>
            <AnimatedItem>
            <QuickAction
              icon={WalletCards}
              title="账户资料"
              subtitle="完善昵称与手机号，方便联系"
              onClick={() => router.push("/profile")}
            />
            </AnimatedItem>
          </StaggerList>
        </div>
      </section>
      </AnimatedItem>

      <ProductSection
        title="限时神券"
        subtitle="今天的放量权益都集中在这里，倒计时结束后会自动下架。"
        action={<Countdown targetAt={targetAt} variant="light" />}
        items={limited}
        isLoading={loadingLimited}
        emptyText="暂无限时商品"
        onOpen={openScroll}
      />

      <ProductSection
        title="今日值得兑"
        subtitle="今天最稳妥的三类组合，适合直接下单。"
        items={today}
        isLoading={loadingToday}
        emptyText="暂无推荐商品"
        onOpen={openScroll}
      />

      <ProductSection
        title="0 元兑专区"
        subtitle="只消耗积分，不额外花现金，适合先攒后换。"
        items={zero}
        isLoading={loadingZero}
        emptyText="暂无零元购商品"
        onOpen={openScroll}
      />

      <AnimatedSection className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="福利攻略"
              subtitle="把首页信息流做得更像线框稿里的运营内容位。"
            />
            <StaggerList className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              {hotPosts.map((post) => (
                <AnimatedItem key={post.id}>
                <HoverScale>
                <Button
                  variant="outline"
                  className="h-auto w-full items-start justify-between gap-3 rounded-2xl border-[var(--app-card-border)] bg-[var(--app-card)] px-4 py-4 text-left hover:bg-secondary"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {post.title}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      {post.excerpt}
                    </div>
                    <Badge
                      variant="secondary"
                      className="mt-3 rounded-full text-[11px]"
                    >
                      {post.app}
                    </Badge>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
                </HoverScale>
                </AnimatedItem>
              ))}
            </StaggerList>
          </CardContent>
        </Card>

        <Card className={appCardClassName}>
          <CardContent className="p-5 md:p-6">
            <SectionHeading
              title="热门兑换榜"
              subtitle="帮你快速看今天最热门的权益趋势。"
              action={
                <Badge
                  variant="outline"
                  className="border-border bg-secondary text-muted-foreground"
                >
                  <TrendingUp className="mr-1 h-3.5 w-3.5" />
                  TOP 5
                </Badge>
              }
            />
            <StaggerList className="mt-5 space-y-3">
              {hotRanking.map((item) => (
                <AnimatedItem key={item.rank}>
                <HoverScale scale={1.01}>
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-sm font-semibold text-foreground shadow-sm">
                      {item.rank}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {item.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.hot}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                </HoverScale>
                </AnimatedItem>
              ))}
            </StaggerList>
          </CardContent>
        </Card>
      </AnimatedSection>
    </div>
    </PageTransition>
  );
}
