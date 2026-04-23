import type {
  ScrollItem,
  BannerItem,
  InviteRecord,
  EarnContentItem,
} from "@discount-hub/shared";

export const banners: BannerItem[] = [
  {
    id: "b1",
    title: "今晚 20:00 限时神卷上新",
    subtitle: "诱惑优惠，先到先得",
    cta: "立刻开抢",
    gradient: "from-[#FE2C55]/90 via-[#FF4D8D]/85 to-[#FF6E37]/90",
    scrollId: "s-douyin-8off",
  },
  {
    id: "b2",
    title: "新用户首充礼",
    subtitle: "满减券叠加，最高立省 100",
    cta: "查看推荐",
    gradient: "from-[#F5B800]/90 via-[#FF6E37]/90 to-[#FE2C55]/90",
    scrollId: "s-douyin-first-topup",
  },
  {
    id: "b3",
    title: "0 元兑专区",
    subtitle: "积分即兑，秒到账（原型演示）",
    cta: "去逛逛",
    gradient: "from-[#FF4D8D]/85 via-[#FE2C55]/85 to-[#F5B800]/85",
    scrollId: "s-douyin-1000-diamond",
  },
];

export const scrollsLimited: ScrollItem[] = [
  {
    id: "s-douyin-8off",
    app: "抖音",
    title: "通用八折卷",
    subtitle: "立省 50 元",
    description: "适用于抖音多数权益类商品，限时放量。",
    pointsPrice: 300,
    cashPrice: 10,
    originalCashPrice: 90,
    expiresAt: "2026-12-31 23:59",
    availableCountText: "可用 9 张",
    tags: ["限时", "热卖", "可叠加"],
  },
  {
    id: "s-douyin-vip-week",
    app: "抖音",
    title: "VIP 周卡",
    subtitle: "会员周卡特惠",
    description: "适合短期体验升级，随时可用。",
    pointsPrice: 260,
    cashPrice: 12,
    originalCashPrice: 69,
    expiresAt: "2026-06-30 23:59",
    availableCountText: "可用 3 张",
    tags: ["限时", "会员"],
  },
  {
    id: "s-douyin-coin-pack",
    app: "抖音",
    title: "通用折扣包",
    subtitle: "下单立减",
    description: "覆盖更多权益与礼包，限购 1。",
    pointsPrice: 380,
    cashPrice: 8,
    originalCashPrice: 59,
    expiresAt: "2026-05-20 23:59",
    availableCountText: "可用 2 张",
    tags: ["限购", "限时"],
  },
  {
    id: "s-douyin-year",
    app: "抖音",
    title: "VIP 年卡",
    subtitle: "年度最强折扣",
    description: "年度权益一次到位，支持兑换核销。",
    pointsPrice: 980,
    cashPrice: 29,
    originalCashPrice: 199,
    expiresAt: "2026-09-30 23:59",
    availableCountText: "可用 1 张",
    tags: ["爆款", "年卡"],
  },
];

export const todayPicks: ScrollItem[] = [
  {
    id: "s-douyin-first-topup",
    app: "抖音",
    title: "新用户首充礼",
    subtitle: "限时 9 折",
    description: "新客专享，首单可用，数量有限。",
    pointsPrice: 220,
    cashPrice: 9,
    originalCashPrice: 100,
    expiresAt: "2026-07-15 23:59",
    availableCountText: "可用 6 张",
    tags: ["今日推荐"],
  },
  {
    id: "s-douyin-live",
    app: "抖音",
    title: "直播间福利卷",
    subtitle: "立减 30",
    description: "直播权益专区使用，支持多场景。",
    pointsPrice: 240,
    cashPrice: 6,
    originalCashPrice: 49,
    expiresAt: "2026-06-18 23:59",
    availableCountText: "可用 5 张",
    tags: ["今日推荐", "直播"],
  },
  {
    id: "s-douyin-gift",
    app: "抖音",
    title: "礼物折扣券",
    subtitle: "送礼更划算",
    description: "节日场景推荐，适合送礼。",
    pointsPrice: 200,
    cashPrice: 8,
    originalCashPrice: 79,
    expiresAt: "2026-08-08 23:59",
    availableCountText: "可用 4 张",
    tags: ["推荐"],
  },
];

export const zeroCost: ScrollItem[] = [
  {
    id: "s-douyin-1000-diamond",
    app: "抖音",
    title: "1000 钻石",
    subtitle: "0 元兑（积分换）",
    description: "积分兑换直充权益，到账以实际为准（原型示意）。",
    pointsPrice: 300,
    cashPrice: 0,
    originalCashPrice: 38,
    expiresAt: "2026-10-10 23:59",
    availableCountText: "可用 20 份",
    tags: ["0元兑", "积分"],
  },
  {
    id: "s-douyin-boost",
    app: "抖音",
    title: "热度加速包",
    subtitle: "0 元兑（积分换）",
    description: "新手尝鲜权益，限量。",
    pointsPrice: 180,
    cashPrice: 0,
    originalCashPrice: 19,
    expiresAt: "2026-06-06 23:59",
    availableCountText: "可用 12 份",
    tags: ["0元兑"],
  },
];

export const hotPosts = [
  {
    id: "p1",
    title: "今天刷到的隐藏福利，真的香",
    excerpt: "限时神卷叠加后到手价太离谱了…",
    likeText: "2.4w",
    app: "抖音",
  },
  {
    id: "p2",
    title: "0 元兑专区怎么用最划算",
    excerpt: "签到拿积分，三天就能换到钻石包。",
    likeText: "1.1w",
    app: "抖音",
  },
  {
    id: "p3",
    title: "今日值得兑：首充礼的正确打开方式",
    excerpt: "别直接买，先领券再叠加，立省更多。",
    likeText: "8.7k",
    app: "抖音",
  },
];

export const hotRanking = [
  { rank: 1, name: "抖音 VIP 周卡", hot: "热度 98" },
  { rank: 2, name: "抖音 VIP 年卡", hot: "热度 95" },
  { rank: 3, name: "通用八折卷", hot: "热度 92" },
  { rank: 4, name: "新用户首充礼", hot: "热度 88" },
  { rank: 5, name: "1000 钻石", hot: "热度 84" },
];

export const inviteBenefits = [
  "积分优惠券",
  "抖音钻石",
  "限时神卷优先购资格",
  "专属折扣加成",
];

export const inviteRecords: InviteRecord[] = [
  {
    id: "r1",
    who: "用户 0xA3F2",
    time: "2026-03-30 16:21",
    status: "已注册",
    reward: "+30 积分",
  },
  {
    id: "r2",
    who: "用户 0x19D8",
    time: "2026-03-29 20:04",
    status: "已下单",
    reward: "+1 抖音钻石包",
  },
  {
    id: "r3",
    who: "用户 0x4C11",
    time: "2026-03-28 11:39",
    status: "已完成",
    reward: "+80 积分",
  },
];

export const earnContents: EarnContentItem[] = [
  {
    id: "c1",
    title: "你养龙虾了吗？openclaw 爆火出圈，怎么抓住机会",
    subtitle: "去抖音观看",
    app: "抖音",
    rewardPoints: 30,
    gradient: "from-[#FE2C55]/25 via-[#FF6E37]/20 to-[#3D1A12]",
  },
  {
    id: "c2",
    title: "三分钟看懂：限时神卷叠加玩法，立省翻倍",
    subtitle: "去抖音观看",
    app: "抖音",
    rewardPoints: 30,
    gradient: "from-[#FF4D8D]/25 via-[#FE2C55]/15 to-[#3D1A12]",
  },
  {
    id: "c3",
    title: "新用户首充礼到底值不值？这样买最划算",
    subtitle: "去抖音观看",
    app: "抖音",
    rewardPoints: 40,
    gradient: "from-[#F5B800]/20 via-[#FF6E37]/20 to-[#3D1A12]",
  },
  {
    id: "c4",
    title: "0 元兑专区隐藏福利：连续签到 4 天直接起飞",
    subtitle: "去抖音观看",
    app: "抖音",
    rewardPoints: 50,
    gradient: "from-[#FFA64D]/20 via-[#FE2C55]/20 to-[#3D1A12]",
  },
];

export function findScroll(id: string) {
  return (
    [...scrollsLimited, ...todayPicks, ...zeroCost].find((x) => x.id === id) ??
    scrollsLimited[0]
  );
}
