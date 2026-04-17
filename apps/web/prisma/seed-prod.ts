import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/* ---------- utils ---------- */
function randomCode() {
  return "CP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

/* ---------- main ---------- */
async function main() {
  console.log("Seeding production test data...\n");

  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 86400000);
  const oneMonth = new Date(now.getTime() + 30 * 86400000);
  const twoMonths = new Date(now.getTime() + 60 * 86400000);
  const threeMonths = new Date(now.getTime() + 90 * 86400000);

  /* ── 1. Merchant & test consumers ──────────────────── */

  let merchant = await prisma.user.findUnique({
    where: { email: "merchant@larx.cc" },
  });
  if (!merchant) {
    merchant = await prisma.user.create({
      data: {
        email: "merchant@larx.cc",
        name: "测试商家",
        role: "MERCHANT",
        points: 0,
        vipLevel: 0,
      },
    });
    console.log("  ✓ Merchant created: merchant@larx.cc");
  }

  // 保底创建 5 个固定测试消费者（若不存在），并塞入大量积分。
  // 主测试用户 test@larx.cc 保留 999,999 积分；其余 10,000~50,000
  const testConsumerDefs = [
    { email: "test@larx.cc",    name: "主测试用户",   points: 999_999, vipLevel: 4 },
    { email: "alice@larx.cc",   name: "Alice",       points:  50_000, vipLevel: 3 },
    { email: "bob@larx.cc",     name: "Bob",         points:  30_000, vipLevel: 2 },
    { email: "charlie@larx.cc", name: "Charlie",     points:  20_000, vipLevel: 2 },
    { email: "dave@larx.cc",    name: "Dave",        points:  10_000, vipLevel: 1 },
  ];

  const testConsumers = [];
  for (const def of testConsumerDefs) {
    const existing = await prisma.user.findUnique({ where: { email: def.email } });
    if (existing) {
      // 已存在则保证积分不低于目标（累加模式）
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: "CONSUMER",
          points: Math.max(existing.points, def.points),
          vipLevel: Math.max(existing.vipLevel, def.vipLevel),
          inviteCode: existing.inviteCode ?? def.email.split("@")[0].toUpperCase() + "001",
        },
      });
      testConsumers.push(updated);
    } else {
      const created = await prisma.user.create({
        data: {
          email: def.email,
          name: def.name,
          role: "CONSUMER",
          points: def.points,
          vipLevel: def.vipLevel,
          inviteCode: def.email.split("@")[0].toUpperCase() + "001",
        },
      });
      testConsumers.push(created);
    }
  }
  console.log(`  ✓ Test consumers: ${testConsumers.length} (test@larx.cc topped to 999,999 pts)`);

  // 追加已有 CONSUMER 用户（排除测试账号）每人加 +10000 积分，便于任意账号试购
  const otherConsumers = await prisma.user.findMany({
    where: {
      role: "CONSUMER",
      email: { notIn: testConsumerDefs.map((d) => d.email) },
    },
  });
  for (const c of otherConsumers) {
    await prisma.user.update({
      where: { id: c.id },
      data: { points: { increment: 10_000 } },
    });
  }
  if (otherConsumers.length > 0) {
    console.log(`  ✓ +10,000 pts added to ${otherConsumers.length} other consumers`);
  }

  const allConsumers = [...testConsumers, ...otherConsumers];

  /* ── 2. Products（30 款，覆盖多品类） ──────────────── */

  type Def = {
    app: string;
    title: string;
    subtitle: string;
    description: string;
    pointsPrice: number;
    cashPrice: number;
    originalCashPrice?: number;
    stock: number;
    expiresAt: Date;
    tags: string[];
    agentPrice?: number;
    agentMinQty?: number;
  };

  const productDefs: Def[] = [
    /* 视频会员 */
    {
      app: "抖音",
      title: "抖音 VIP 周卡",
      subtitle: "7 天畅享特权",
      description: "含直播免广告、专属表情包、评论区置顶等 VIP 特权，有效期 7 天",
      pointsPrice: 260,
      cashPrice: 5.9,
      originalCashPrice: 15.0,
      stock: 80,
      expiresAt: twoWeeks,
      tags: ["限时", "热门"],
    },
    {
      app: "抖音",
      title: "抖音 VIP 年卡",
      subtitle: "年度超值特惠",
      description: "全年享受抖音 VIP 全部特权，限量发售",
      pointsPrice: 2000,
      cashPrice: 68.0,
      originalCashPrice: 198.0,
      stock: 20,
      expiresAt: threeMonths,
      tags: ["限时", "热门", "年卡"],
      agentPrice: 55,
      agentMinQty: 10,
    },
    {
      app: "爱奇艺",
      title: "爱奇艺黄金 VIP 月卡",
      subtitle: "正版影视随心看",
      description: "解锁爱奇艺黄金会员全部权益，月度有效",
      pointsPrice: 500,
      cashPrice: 12.0,
      originalCashPrice: 30.0,
      stock: 100,
      expiresAt: oneMonth,
      tags: ["今日推荐", "热门"],
    },
    {
      app: "爱奇艺",
      title: "爱奇艺黄金 VIP 年卡",
      subtitle: "年度高性价比",
      description: "全年爱奇艺黄金会员，海量影视剧无广告畅享",
      pointsPrice: 3000,
      cashPrice: 118.0,
      originalCashPrice: 258.0,
      stock: 30,
      expiresAt: threeMonths,
      tags: ["热门", "年卡"],
      agentPrice: 95,
      agentMinQty: 5,
    },
    {
      app: "腾讯视频",
      title: "腾讯视频 VIP 月卡",
      subtitle: "独播剧抢先看",
      description: "腾讯视频 VIP 会员月卡，含多部独家剧集",
      pointsPrice: 500,
      cashPrice: 12.0,
      originalCashPrice: 30.0,
      stock: 100,
      expiresAt: oneMonth,
      tags: ["今日推荐", "热门"],
    },
    {
      app: "腾讯视频",
      title: "腾讯视频超级影视 VIP",
      subtitle: "电视端同步",
      description: "手机 + 电视双端畅享腾讯视频",
      pointsPrice: 900,
      cashPrice: 25.0,
      originalCashPrice: 58.0,
      stock: 50,
      expiresAt: oneMonth,
      tags: ["限时"],
    },
    {
      app: "优酷",
      title: "优酷 VIP 月卡",
      subtitle: "海量影视",
      description: "优酷 VIP 会员月卡，阿里系生态权益",
      pointsPrice: 480,
      cashPrice: 11.5,
      originalCashPrice: 28.0,
      stock: 100,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },
    {
      app: "B 站",
      title: "哔哩哔哩大会员月卡",
      subtitle: "番剧 + 专享内容",
      description: "Bilibili 大会员月卡，番剧抢先看、专属表情",
      pointsPrice: 550,
      cashPrice: 13.0,
      originalCashPrice: 25.0,
      stock: 100,
      expiresAt: oneMonth,
      tags: ["热门"],
    },
    {
      app: "B 站",
      title: "哔哩哔哩大会员年卡",
      subtitle: "年度最划算",
      description: "B 站年度大会员，折合每月低至 12 元",
      pointsPrice: 2800,
      cashPrice: 148.0,
      originalCashPrice: 228.0,
      stock: 40,
      expiresAt: threeMonths,
      tags: ["年卡", "热门"],
      agentPrice: 118,
      agentMinQty: 5,
    },
    {
      app: "芒果 TV",
      title: "芒果 TV VIP 月卡",
      subtitle: "综艺第一站",
      description: "芒果 TV 会员月卡，湖南卫视同步跟播",
      pointsPrice: 420,
      cashPrice: 10.0,
      originalCashPrice: 19.0,
      stock: 80,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },

    /* 音乐会员 */
    {
      app: "QQ 音乐",
      title: "QQ 音乐绿钻豪华版月卡",
      subtitle: "千万曲库无损听",
      description: "QQ 音乐绿钻豪华月卡，支持无损音质、杜比音效",
      pointsPrice: 350,
      cashPrice: 9.0,
      originalCashPrice: 18.0,
      stock: 150,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },
    {
      app: "网易云音乐",
      title: "网易云音乐黑胶 VIP 月卡",
      subtitle: "私人 DJ 模式",
      description: "网易云黑胶会员月卡，独家音乐包 + 专属音效",
      pointsPrice: 350,
      cashPrice: 9.0,
      originalCashPrice: 18.0,
      stock: 150,
      expiresAt: oneMonth,
      tags: ["热门"],
    },
    {
      app: "酷狗音乐",
      title: "酷狗豪华 VIP 月卡",
      subtitle: "海量曲库",
      description: "酷狗音乐豪华 VIP 会员月卡",
      pointsPrice: 300,
      cashPrice: 8.0,
      originalCashPrice: 15.0,
      stock: 100,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },

    /* 游戏直充 */
    {
      app: "王者荣耀",
      title: "王者荣耀 60 点券",
      subtitle: "直充到账",
      description: "王者荣耀点券直充，支持购买英雄、皮肤",
      pointsPrice: 280,
      cashPrice: 5.5,
      originalCashPrice: 6.0,
      stock: 500,
      expiresAt: oneMonth,
      tags: ["今日推荐", "热门"],
    },
    {
      app: "王者荣耀",
      title: "王者荣耀 600 点券",
      subtitle: "大额直充",
      description: "王者荣耀大额点券，性价比更高",
      pointsPrice: 2500,
      cashPrice: 55.0,
      originalCashPrice: 60.0,
      stock: 200,
      expiresAt: oneMonth,
      tags: ["热门"],
      agentPrice: 48,
      agentMinQty: 10,
    },
    {
      app: "原神",
      title: "原神创世结晶 x60",
      subtitle: "米游社官方直充",
      description: "原神创世结晶直充，通过米游社账号绑定",
      pointsPrice: 280,
      cashPrice: 5.8,
      originalCashPrice: 6.0,
      stock: 300,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },
    {
      app: "和平精英",
      title: "和平精英 60 点券",
      subtitle: "游戏道具直充",
      description: "和平精英点券，用于购买服装、武器皮肤等",
      pointsPrice: 280,
      cashPrice: 5.5,
      originalCashPrice: 6.0,
      stock: 400,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },
    {
      app: "Steam",
      title: "Steam 充值卡 ¥50",
      subtitle: "游戏钱包充值",
      description: "Steam 平台余额充值，兼容大陆区账号",
      pointsPrice: 2100,
      cashPrice: 48.0,
      originalCashPrice: 50.0,
      stock: 100,
      expiresAt: twoMonths,
      tags: ["热门"],
    },

    /* 话费 / 流量 */
    {
      app: "中国移动",
      title: "中国移动话费 ¥30",
      subtitle: "直充到账",
      description: "全国中国移动手机号话费直充，24 小时内到账",
      pointsPrice: 1200,
      cashPrice: 28.0,
      originalCashPrice: 30.0,
      stock: 500,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
      agentPrice: 26,
      agentMinQty: 20,
    },
    {
      app: "中国联通",
      title: "中国联通话费 ¥30",
      subtitle: "直充到账",
      description: "全国中国联通手机号话费直充，24 小时内到账",
      pointsPrice: 1200,
      cashPrice: 28.0,
      originalCashPrice: 30.0,
      stock: 500,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },
    {
      app: "中国电信",
      title: "中国电信话费 ¥30",
      subtitle: "直充到账",
      description: "全国中国电信手机号话费直充",
      pointsPrice: 1200,
      cashPrice: 28.0,
      originalCashPrice: 30.0,
      stock: 300,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },

    /* 生活权益 */
    {
      app: "美团",
      title: "美团外卖 5 元红包",
      subtitle: "午餐必备",
      description: "美团外卖满 25 减 5，全城餐饮可用",
      pointsPrice: 200,
      cashPrice: 2.0,
      originalCashPrice: 5.0,
      stock: 600,
      expiresAt: twoWeeks,
      tags: ["今日推荐", "热门"],
    },
    {
      app: "饿了么",
      title: "饿了么无门槛 6 元券",
      subtitle: "点外卖立减",
      description: "饿了么全场通用无门槛红包",
      pointsPrice: 240,
      cashPrice: 2.5,
      originalCashPrice: 6.0,
      stock: 500,
      expiresAt: twoWeeks,
      tags: ["今日推荐"],
    },
    {
      app: "星巴克",
      title: "星巴克咖啡买一赠一券",
      subtitle: "邀好友小憩",
      description: "任意两杯中杯饮品买一赠一，全国门店通用",
      pointsPrice: 1500,
      cashPrice: 22.0,
      originalCashPrice: 42.0,
      stock: 80,
      expiresAt: oneMonth,
      tags: ["限时", "热门"],
    },
    {
      app: "瑞幸咖啡",
      title: "瑞幸咖啡 9.9 元券",
      subtitle: "全场任意",
      description: "瑞幸任意饮品 9.9 元券",
      pointsPrice: 400,
      cashPrice: 0,
      stock: 300,
      expiresAt: twoWeeks,
      tags: ["零元购"],
    },
    {
      app: "麦当劳",
      title: "麦当劳欢享套餐券",
      subtitle: "立省 ¥20",
      description: "麦当劳精选欢享套餐券，门店通用",
      pointsPrice: 800,
      cashPrice: 18.0,
      originalCashPrice: 38.0,
      stock: 150,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },

    /* 学习充值 */
    {
      app: "知乎",
      title: "知乎盐选会员月卡",
      subtitle: "精品内容库",
      description: "知乎盐选会员，畅读精选回答和故事专栏",
      pointsPrice: 300,
      cashPrice: 6.9,
      originalCashPrice: 19.0,
      stock: 100,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
    },
    {
      app: "得到",
      title: "得到学习畅听卡月卡",
      subtitle: "听书会员",
      description: "得到 APP 电子书月卡 + 精选课程折扣",
      pointsPrice: 600,
      cashPrice: 18.0,
      originalCashPrice: 30.0,
      stock: 50,
      expiresAt: oneMonth,
      tags: ["限时"],
    },
    {
      app: "网易云课堂",
      title: "网易云课堂 50 元学习券",
      subtitle: "职场进阶",
      description: "网易云课堂付费课程满 100 减 50",
      pointsPrice: 1500,
      cashPrice: 0,
      stock: 80,
      expiresAt: oneMonth,
      tags: ["零元购"],
    },

    /* 0 元兑专区（纯积分） */
    {
      app: "抖音",
      title: "抖音 1000 钻石包",
      subtitle: "纯积分兑换",
      description: "可用于打赏主播、购买虚拟礼物，即刻到账",
      pointsPrice: 800,
      cashPrice: 0,
      stock: 500,
      expiresAt: twoMonths,
      tags: ["零元购", "热门"],
    },
    {
      app: "京东",
      title: "京东 PLUS 体验卡 3 天",
      subtitle: "积分直兑",
      description: "京东 PLUS 会员 3 天体验卡，运费券 + 专属折扣",
      pointsPrice: 500,
      cashPrice: 0,
      stock: 100,
      expiresAt: twoMonths,
      tags: ["零元购"],
    },
    {
      app: "拼多多",
      title: "拼多多百亿补贴券",
      subtitle: "积分直兑",
      description: "百亿补贴专区叠加券，限部分品类使用",
      pointsPrice: 150,
      cashPrice: 0,
      stock: 1000,
      expiresAt: oneMonth,
      tags: ["零元购"],
    },
  ];

  let created = 0;
  for (const def of productDefs) {
    const existing = await prisma.product.findFirst({
      where: { app: def.app, title: def.title },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          ...def,
          status: "ACTIVE",
        },
      });
      created++;
    }
  }
  const allProducts = await prisma.product.findMany({ where: { status: "ACTIVE" } });
  console.log(`  ✓ Products: ${created} new, ${allProducts.length} total active`);

  /* ── 3. Footprints (浏览足迹) ───────────────────────── */

  let footprintCount = 0;
  for (const consumer of allConsumers) {
    const viewed = sample(allProducts, 12 + Math.floor(Math.random() * 8));
    for (const product of viewed) {
      await prisma.footprint.create({
        data: {
          userId: consumer.id,
          productId: product.id,
          viewedAt: daysAgo(Math.floor(Math.random() * 7)),
        },
      });
      footprintCount++;
    }
  }
  console.log(`  ✓ Footprints: ${footprintCount} created`);

  /* ── 4. Favorites (收藏) ───────────────────────────── */

  let favoriteCount = 0;
  for (const consumer of allConsumers) {
    const favs = sample(allProducts, 5 + Math.floor(Math.random() * 5));
    for (const product of favs) {
      const exists = await prisma.favorite.findUnique({
        where: {
          userId_productId: { userId: consumer.id, productId: product.id },
        },
      });
      if (!exists) {
        await prisma.favorite.create({
          data: {
            userId: consumer.id,
            productId: product.id,
            createdAt: daysAgo(Math.floor(Math.random() * 14)),
          },
        });
        favoriteCount++;
      }
    }
  }
  console.log(`  ✓ Favorites: ${favoriteCount} created`);

  /* ── 5. Orders & Coupons ──────────────────────────── */

  const payMethods = ["alipay", "wechat", "unionpay", "paypal"] as const;
  const orderStatuses = ["PAID", "PAID", "PAID", "PAID", "PENDING", "CANCELLED"] as const;
  let orderCount = 0;
  let couponCount = 0;

  for (const consumer of allConsumers) {
    const numOrders = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numOrders; i++) {
      const product = pick(allProducts);
      const status = pick(orderStatuses);
      const payMethod = pick(payMethods);
      const createdAt = daysAgo(Math.floor(Math.random() * 30));

      const order = await prisma.order.create({
        data: {
          userId: consumer.id,
          productId: product.id,
          qty: 1,
          cashPaid: product.cashPrice,
          pointsPaid: product.pointsPrice,
          payMethod,
          status,
          paidAt: status === "PAID" ? createdAt : null,
          createdAt,
          updatedAt: createdAt,
        },
      });
      orderCount++;

      if (status === "PAID") {
        // 70% ACTIVE, 25% USED, 5% EXPIRED
        const r = Math.random();
        const couponStatus = r > 0.3 ? (r > 0.95 ? "EXPIRED" : "ACTIVE") : "USED";
        await prisma.coupon.create({
          data: {
            code: randomCode(),
            userId: consumer.id,
            productId: product.id,
            orderId: order.id,
            status: couponStatus as "ACTIVE" | "USED" | "EXPIRED",
            expiresAt: oneMonth,
            usedAt: couponStatus === "USED" ? new Date() : null,
            createdAt,
          },
        });
        couponCount++;
      }
    }
  }
  console.log(`  ✓ Orders: ${orderCount} created`);
  console.log(`  ✓ Coupons: ${couponCount} created`);

  /* ── 6. Checkin history ────────────────────────────── */

  const checkinRewards = [200, 3000, 300, 500, 800, 1200, 10000];
  let checkinCount = 0;
  for (const consumer of allConsumers) {
    const streak = 1 + Math.floor(Math.random() * 5);
    for (let d = streak; d >= 1; d--) {
      const dayIndex = Math.min(streak - d + 1, checkinRewards.length);
      const checkedAt = daysAgo(d);
      try {
        await prisma.checkin.create({
          data: {
            userId: consumer.id,
            dayIndex,
            reward: checkinRewards[dayIndex - 1],
            checkedAt,
          },
        });
        checkinCount++;
      } catch {
        // unique constraint, skip
      }
    }
  }
  console.log(`  ✓ Checkins: ${checkinCount} created`);

  /* ── 7. Task completions ───────────────────────────── */

  const taskDefs: Record<string, number> = {
    checkin: 200,
    browse: 100,
    purchase: 100,
    share: 80,
    c1: 30,
    c2: 30,
    c3: 40,
    c4: 50,
  };
  const taskIds = Object.keys(taskDefs);
  let taskCount = 0;

  for (const consumer of allConsumers) {
    const numTasks = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numTasks; i++) {
      const taskId = pick(taskIds);
      const doneAt = daysAgo(Math.floor(Math.random() * 10));
      try {
        await prisma.taskCompletion.create({
          data: {
            userId: consumer.id,
            taskId,
            reward: taskDefs[taskId],
            doneAt,
          },
        });
        taskCount++;
      } catch {
        // unique constraint
      }
    }
  }
  console.log(`  ✓ Task completions: ${taskCount} created`);

  /* ── 8. Verification records ───────────────────────── */

  const usedCoupons = await prisma.coupon.findMany({
    where: { status: "USED" },
    take: 20,
  });
  let verifyCount = 0;
  for (const coupon of usedCoupons) {
    const exists = await prisma.verificationRecord.findFirst({
      where: { couponId: coupon.id },
    });
    if (!exists) {
      await prisma.verificationRecord.create({
        data: { couponId: coupon.id, verifiedBy: merchant.id },
      });
      verifyCount++;
    }
  }
  console.log(`  ✓ Verifications: ${verifyCount} created`);

  /* ── 9. Posts (福利攻略内容) ──────────────────────── */

  const postDefs = [
    {
      title: "今日发现一个抖音限时券的隐藏玩法",
      content:
        "抖音 VIP 周卡叠加 8 折券使用，实际到手才 4.72 元，全网最低！\n\n步骤：\n1. 先进入券包页面领取 8 折券\n2. 再下单购买 VIP 周卡\n3. 结算时自动叠加\n\n这样一单省将近一半。",
      app: "抖音",
      likeCount: 24_321,
    },
    {
      title: "0 元兑专区怎么用最划算？3 天就能到手钻石",
      content:
        "连续签到 3 天就能积累 3500 积分，正好可以免费兑换 1000 钻石包。建议：\n\n- 第 1 天：签到 + 浏览 50 秒抖音\n- 第 2 天：签到 + 分享\n- 第 3 天：签到 + 兑换\n\n全程不需要花任何现金。",
      app: "抖音",
      likeCount: 11_203,
    },
    {
      title: "首充礼正确打开方式，别直接买",
      content:
        "首充礼 1 元秒到 20 元消费额，但是：\n\n- 必须先完成首次签到\n- 需要在 0 元兑专区先换一张 5 折券\n- 结算时两券叠加\n\n最终到手仅 0.5 元，几乎等于白送。",
      app: "抖音",
      likeCount: 8_766,
    },
    {
      title: "爱奇艺年卡拼车攻略：一年低至 40 元",
      content:
        "本次 118 元年卡建议 5 人合买，平摊下来每人 23.6 元起。加上积分抵扣可以更低。注意：",
      app: "爱奇艺",
      likeCount: 5_421,
    },
    {
      title: "B 站大会员为什么值得买年卡？",
      content:
        "月卡 13 元 × 12 = 156 元；年卡 148 元，直接省 8 元。加上 VIP 等级签到加成，性价比拉满。",
      app: "B 站",
      likeCount: 4_198,
    },
  ];

  let postCount = 0;
  for (const def of postDefs) {
    const exists = await prisma.post.findFirst({ where: { title: def.title } });
    if (!exists) {
      const author = pick(testConsumers);
      await prisma.post.create({
        data: {
          userId: author.id,
          title: def.title,
          content: def.content,
          images: [],
          likeCount: def.likeCount,
          app: def.app,
          createdAt: daysAgo(Math.floor(Math.random() * 10)),
        },
      });
      postCount++;
    }
  }
  console.log(`  ✓ Posts: ${postCount} created`);

  /* ── 10. Final pass: reset test-user points to guaranteed minima ── */
  // 测试用户的积分可能会被前面的订单扣掉，这里确保他们始终有充足积分
  for (const def of testConsumerDefs) {
    const user = await prisma.user.findUnique({ where: { email: def.email } });
    if (user && user.points < def.points) {
      await prisma.user.update({
        where: { id: user.id },
        data: { points: def.points, vipLevel: def.vipLevel },
      });
    }
  }
  console.log(`  ✓ Test consumer points restored to minima`);

  /* ── summary ─────────────────────────────────────── */
  const summary = await prisma.user.findMany({
    where: { email: { in: testConsumerDefs.map((d) => d.email) } },
    select: { email: true, name: true, points: true, vipLevel: true },
  });

  console.log("\n=== Test Users Summary ===");
  for (const u of summary) {
    console.log(
      `  ${u.email.padEnd(24)} | ${(u.name ?? "").padEnd(10)} | ${u.points
        .toLocaleString("en-US")
        .padStart(10)} pts | VIP${u.vipLevel}`,
    );
  }

  console.log("\nProduction seed completed!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
