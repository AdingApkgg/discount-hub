"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  Gift,
  Loader2,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import Countdown from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { banners, hotPosts, hotRanking } from "@/data/mock";

type ProductItem = RouterOutputs["product"]["list"][number];
type UserProfile = RouterOutputs["user"]["me"];

const surfaceClassName =
  "gap-0 rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_12px_36px_rgba(15,23,42,0.06)]";

function cashNum(v: number | { toNumber(): number }): number {
  return typeof v === "number" ? v : v.toNumber();
}

function getVipLabel(profile: UserProfile | undefined | null) {
  if (!profile) return "普通会员";
  return profile.vipLevel <= 0 ? "普通会员" : `VIP${profile.vipLevel}`;
}

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
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
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>
      <div className="mt-4 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</div>
    </button>
  );
}

function ProductCard({
  item,
  onClick,
}: {
  item: ProductItem;
  onClick: () => void;
}) {
  const price = cashNum(item.cashPrice);

  return (
    <Card
      className={`${surfaceClassName} w-[250px] shrink-0 overflow-hidden`}
      onClick={onClick}
    >
      <div className="relative h-28 overflow-hidden bg-[linear-gradient(135deg,#111827_0%,#1f2937_55%,#374151_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent_42%)]" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
          <div>
            <Badge className="bg-white/12 text-white hover:bg-white/12">
              {item.app}
            </Badge>
            <div className="mt-3 text-lg font-semibold text-white">
              {item.title}
            </div>
          </div>
          <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white">
            {item.tags[0] ?? "推荐"}
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <p className="text-sm leading-6 text-slate-600">{item.subtitle}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-slate-400">兑换价</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-semibold text-slate-900">
                {item.pointsPrice}
              </span>
              <span className="text-xs text-slate-500">积分</span>
              <span className="text-sm text-slate-400">+ ¥{price.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-right text-xs leading-5 text-slate-500">
            <div>库存 {item.stock}</div>
            <div className="font-medium text-slate-700">去兑换</div>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const { data: profile } = useQuery(trpc.user.me.queryOptions());

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
    <div className="space-y-4 px-4 py-4">
      <section className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
            Discount Hub
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900">
            今日精选
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/member")}
          className="rounded-full border-slate-200 bg-white px-4 text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {getVipLabel(profile)}
        </Button>
      </section>

      <Card className="overflow-hidden rounded-[30px] border border-slate-900 bg-[#111827] py-0 text-white shadow-[0_18px_50px_rgba(15,23,42,0.22)]">
        <CardContent className="relative p-5">
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

            <div className="mt-5 max-w-[16rem] text-[28px] font-semibold leading-tight">
              {currentBanner.title}
            </div>
            <p className="mt-3 max-w-[17rem] text-sm leading-6 text-white/72">
              {currentBanner.subtitle}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <Button
                onClick={() => openScroll(currentBanner.scrollId)}
                className="rounded-full bg-white px-5 text-slate-900 hover:bg-white/90"
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

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <div className="text-[11px] text-white/60">会员等级</div>
                <div className="mt-2 text-base font-semibold">
                  {getVipLabel(profile)}
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <div className="text-[11px] text-white/60">可用积分</div>
                <div className="mt-2 text-base font-semibold">
                  {(profile?.points ?? 0).toLocaleString("zh-CN")}
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <div className="text-[11px] text-white/60">我的券包</div>
                <div className="mt-2 text-base font-semibold">
                  {profile?._count.coupons ?? 0} 张
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <button
          type="button"
          onClick={() => router.push("/coupons")}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
            <Search className="h-4 w-4 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-700">
              搜索会员、券包、积分兑换权益
            </div>
            <div className="mt-1 text-xs text-slate-400">
              推荐先查看限时神券和 0 元兑专区
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <QuickAction
          icon={Sparkles}
          title="会员任务"
          subtitle="签到、浏览、分享都能拿积分"
          onClick={() => router.push("/member")}
        />
        <QuickAction
          icon={Ticket}
          title="我的券包"
          subtitle="购买后的权益都在这里查看"
          onClick={() => router.push("/coupons")}
        />
        <QuickAction
          icon={Gift}
          title="邀请有礼"
          subtitle="复制邀请码，持续拉新赚奖励"
          onClick={() => router.push("/profile")}
        />
        <QuickAction
          icon={WalletCards}
          title="账户资料"
          subtitle="完善昵称与手机号，方便联系"
          onClick={() => router.push("/profile")}
        />
      </section>

      <section id="limited" className="space-y-3">
        <SectionHeading
          title="限时神券"
          subtitle="今天的放量权益都集中在这里，倒计时结束后会自动下架。"
          action={<Countdown targetAt={targetAt} variant="light" />}
        />
        {loadingLimited ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : limited.length === 0 ? (
          <Card className={surfaceClassName}>
            <CardContent className="p-6 text-center text-sm text-slate-500">
              暂无限时商品
            </CardContent>
          </Card>
        ) : (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {limited.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onClick={() => openScroll(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section id="today" className="space-y-3">
        <SectionHeading
          title="今日值得兑"
          subtitle="今天最稳妥的三类组合，适合直接下单。"
        />
        {loadingToday ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : today.length === 0 ? (
          <Card className={surfaceClassName}>
            <CardContent className="p-6 text-center text-sm text-slate-500">
              暂无推荐商品
            </CardContent>
          </Card>
        ) : (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {today.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onClick={() => openScroll(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section id="zero" className="space-y-3">
        <SectionHeading
          title="0 元兑专区"
          subtitle="只消耗积分，不额外花现金，适合先攒后换。"
        />
        {loadingZero ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : zero.length === 0 ? (
          <Card className={surfaceClassName}>
            <CardContent className="p-6 text-center text-sm text-slate-500">
              暂无零元购商品
            </CardContent>
          </Card>
        ) : (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {zero.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onClick={() => openScroll(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <Card className={surfaceClassName}>
        <CardContent className="p-5">
          <SectionHeading
            title="热门兑换榜"
            subtitle="帮你快速看今天最热门的权益趋势。"
            action={
              <Badge
                variant="outline"
                className="border-slate-200 bg-slate-50 text-slate-600"
              >
                <TrendingUp className="mr-1 h-3.5 w-3.5" />
                TOP 5
              </Badge>
            }
          />
          <div className="mt-5 space-y-3">
            {hotRanking.map((item) => (
              <div
                key={item.rank}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-900 shadow-sm">
                    {item.rank}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.hot}</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={surfaceClassName}>
        <CardContent className="p-5">
          <SectionHeading
            title="福利攻略"
            subtitle="把首页信息流做得更像线框稿里的运营内容位。"
          />
          <div className="mt-5 space-y-3">
            {hotPosts.map((post) => (
              <button
                key={post.id}
                type="button"
                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {post.title}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {post.excerpt}
                  </div>
                  <div className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                    {post.app}
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
