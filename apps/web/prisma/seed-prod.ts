import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function randomCode() {
  return "CP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding production test data...\n");

  const merchant = await prisma.user.findUnique({
    where: { email: "merchant@larx.cc" },
  });
  if (!merchant) throw new Error("merchant@larx.cc not found");

  const consumers = await prisma.user.findMany({
    where: { role: "CONSUMER" },
    take: 5,
  });
  if (consumers.length === 0) throw new Error("No consumers found");

  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 86400000);
  const oneMonth = new Date(now.getTime() + 30 * 86400000);
  const twoMonths = new Date(now.getTime() + 60 * 86400000);

  // ── 1. Products ───────────────────────────────────

  const productDefs = [
    {
      app: "抖音",
      title: "抖音 VIP 周卡",
      subtitle: "7天畅享特权",
      description: "含直播免广告、专属表情包、评论区置顶等 VIP 特权，有效期 7 天",
      pointsPrice: 260,
      cashPrice: 5.9,
      originalCashPrice: 15.0,
      stock: 80,
      expiresAt: twoWeeks,
      tags: ["限时", "热门"],
      status: "ACTIVE" as const,
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
      expiresAt: twoMonths,
      tags: ["限时", "热门"],
      status: "ACTIVE" as const,
    },
    {
      app: "抖音",
      title: "通用八折券",
      subtitle: "全品类可用",
      description: "抖音平台折扣直充八折优惠，月卡、年卡、享卡全品类通用",
      pointsPrice: 300,
      cashPrice: 10.0,
      originalCashPrice: 90.0,
      stock: 150,
      expiresAt: oneMonth,
      tags: ["限时", "今日推荐"],
      status: "ACTIVE" as const,
    },
    {
      app: "抖音",
      title: "1000 钻石包",
      subtitle: "积分直兑",
      description: "可用于打赏主播、购买虚拟礼物，即刻到账",
      pointsPrice: 800,
      cashPrice: 0,
      stock: 500,
      expiresAt: twoMonths,
      tags: ["零元购"],
      status: "ACTIVE" as const,
    },
    {
      app: "抖音",
      title: "新用户首充礼",
      subtitle: "限新用户领取",
      description: "首次充值满 50 减 20，叠加使用更划算",
      pointsPrice: 100,
      cashPrice: 1.0,
      originalCashPrice: 20.0,
      stock: 999,
      expiresAt: oneMonth,
      tags: ["今日推荐", "热门"],
      status: "ACTIVE" as const,
    },
    {
      app: "微信支付",
      title: "微信支付立减 10 元",
      subtitle: "大额直减",
      description: "满 30 可用，微信支付时自动抵扣",
      pointsPrice: 400,
      cashPrice: 5.0,
      originalCashPrice: 10.0,
      stock: 200,
      expiresAt: twoWeeks,
      tags: ["限时"],
      status: "ACTIVE" as const,
    },
    {
      app: "支付宝",
      title: "支付宝消费金 8 元",
      subtitle: "限时发放",
      description: "全场通用消费金，满 20 可用",
      pointsPrice: 350,
      cashPrice: 4.0,
      originalCashPrice: 8.0,
      stock: 300,
      expiresAt: oneMonth,
      tags: ["今日推荐"],
      status: "ACTIVE" as const,
    },
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
      status: "ACTIVE" as const,
    },
    {
      app: "拼多多",
      title: "拼多多百亿补贴券",
      subtitle: "再省一笔",
      description: "百亿补贴专区叠加券，限部分品类使用",
      pointsPrice: 150,
      cashPrice: 0,
      stock: 1000,
      expiresAt: oneMonth,
      tags: ["零元购"],
      status: "ACTIVE" as const,
    },
    {
      app: "京东",
      title: "京东 PLUS 体验卡",
      subtitle: "3天免费体验",
      description: "京东 PLUS 会员 3 天体验卡，享受运费券等权益",
      pointsPrice: 500,
      cashPrice: 0,
      stock: 100,
      expiresAt: twoMonths,
      tags: ["零元购", "热门"],
      status: "ACTIVE" as const,
    },
  ];

  let created = 0;
  const products = [];
  for (const def of productDefs) {
    const existing = await prisma.product.findFirst({
      where: { app: def.app, title: def.title },
    });
    if (existing) {
      products.push(existing);
    } else {
      products.push(await prisma.product.create({ data: def }));
      created++;
    }
  }
  // also include existing products
  const allProducts = await prisma.product.findMany({ where: { status: "ACTIVE" } });
  console.log(`  Products: ${created} new, ${allProducts.length} total active`);

  // ── 2. Orders & Coupons ───────────────────────────

  const payMethods = ["alipay", "wechat", "unionpay"];
  const orderStatuses: Array<"PAID" | "PENDING" | "CANCELLED"> = [
    "PAID", "PAID", "PAID", "PENDING", "CANCELLED",
  ];
  let orderCount = 0;
  let couponCount = 0;

  for (const consumer of consumers) {
    const numOrders = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numOrders; i++) {
      const product = allProducts[Math.floor(Math.random() * allProducts.length)];
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const payMethod = payMethods[Math.floor(Math.random() * payMethods.length)];
      const createdAt = daysAgo(Math.floor(Math.random() * 14));

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
        const couponStatus = Math.random() > 0.3 ? "ACTIVE" : "USED";
        await prisma.coupon.create({
          data: {
            code: randomCode(),
            userId: consumer.id,
            productId: product.id,
            orderId: order.id,
            status: couponStatus as "ACTIVE" | "USED",
            expiresAt: oneMonth,
            usedAt: couponStatus === "USED" ? new Date() : null,
            createdAt,
          },
        });
        couponCount++;
      }
    }
  }
  console.log(`  Orders: ${orderCount} created`);
  console.log(`  Coupons: ${couponCount} created`);

  // ── 3. Checkin history ────────────────────────────

  let checkinCount = 0;
  for (const consumer of consumers) {
    const streak = 1 + Math.floor(Math.random() * 4);
    for (let d = streak; d >= 1; d--) {
      const rewards = [200, 3000, 300, 500];
      const dayIndex = Math.min(streak - d + 1, 4);
      const checkedAt = daysAgo(d);
      try {
        await prisma.checkin.create({
          data: {
            userId: consumer.id,
            dayIndex,
            reward: rewards[dayIndex - 1],
            checkedAt,
          },
        });
        checkinCount++;
      } catch {
        // unique constraint
      }
    }
  }
  console.log(`  Checkins: ${checkinCount} created`);

  // ── 4. Task completions ───────────────────────────

  const taskDefs: Record<string, number> = {
    checkin: 200,
    browse: 100,
    purchase: 100,
    share: 80,
    c1: 30,
    c2: 30,
  };
  const taskIds = Object.keys(taskDefs);
  let taskCount = 0;

  for (const consumer of consumers) {
    const numTasks = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numTasks; i++) {
      const taskId = taskIds[Math.floor(Math.random() * taskIds.length)];
      const doneAt = daysAgo(Math.floor(Math.random() * 7));
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
  console.log(`  Task completions: ${taskCount} created`);

  // ── 5. Verification records ───────────────────────

  const usedCoupons = await prisma.coupon.findMany({
    where: { status: "USED" },
    take: 5,
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
  console.log(`  Verifications: ${verifyCount} created`);

  // ── 6. Update consumer points & VIP ───────────────

  for (const consumer of consumers) {
    const agg = await prisma.taskCompletion.aggregate({
      where: { userId: consumer.id },
      _sum: { reward: true },
    });
    const pts = (agg._sum.reward ?? 0) + 500;
    const vip =
      pts >= 2000 ? 4 : pts >= 1200 ? 3 : pts >= 500 ? 2 : pts >= 200 ? 1 : 0;
    await prisma.user.update({
      where: { id: consumer.id },
      data: { points: pts, vipLevel: vip },
    });
  }
  console.log(`  Consumer points & VIP updated`);

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
