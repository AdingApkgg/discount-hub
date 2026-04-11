import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEED_PRODUCT_TAG = "seed-v1";

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Users ──────────────────────────────────
  const consumer = await prisma.user.upsert({
    where: { email: "consumer@example.com" },
    update: {},
    create: {
      email: "consumer@example.com",
      name: "测试用户",
      role: "CONSUMER",
      points: 5000,
      vipLevel: 2,
      inviteCode: "INVITE001",
    },
  });

  const merchant = await prisma.user.upsert({
    where: { email: "merchant@example.com" },
    update: {},
    create: {
      email: "merchant@example.com",
      name: "测试商家",
      role: "MERCHANT",
      points: 0,
      vipLevel: 0,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "管理员",
      role: "ADMIN",
      points: 0,
      vipLevel: 0,
    },
  });

  console.log(`  ✓ Users: ${consumer.name}, ${merchant.name}, ${admin.name}`);

  // ── 2. Products (idempotent via app+title) ────
  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const productDefs = [
    {
      app: "抖音",
      title: "抖音超级VIP月卡",
      subtitle: "畅享全平台特权",
      description: "包含直播免广告、专属表情、评论置顶等VIP特权",
      pointsPrice: 500,
      cashPrice: 9.9,
      originalCashPrice: 30.0,
      stock: 100,
      expiresAt: oneMonthLater,
      tags: ["限时", "热门", SEED_PRODUCT_TAG],
      status: "ACTIVE" as const,
    },
    {
      app: "支付宝",
      title: "支付宝红包 ¥5",
      subtitle: "消费直减",
      description: "满10元可用，全场通用红包",
      pointsPrice: 200,
      cashPrice: 3.0,
      originalCashPrice: 5.0,
      stock: 500,
      expiresAt: oneMonthLater,
      tags: ["今日推荐", "热门", SEED_PRODUCT_TAG],
      status: "ACTIVE" as const,
    },
    {
      app: "抖音",
      title: "抖音钻石 x100",
      subtitle: "零元兑换",
      description: "可用于打赏主播、购买礼物",
      pointsPrice: 1000,
      cashPrice: 0,
      stock: 200,
      expiresAt: oneMonthLater,
      tags: ["零元购", SEED_PRODUCT_TAG],
      status: "ACTIVE" as const,
    },
    {
      app: "微信支付",
      title: "微信立减金 ¥3",
      subtitle: "限量发放",
      description: "微信支付时自动抵扣",
      pointsPrice: 150,
      cashPrice: 1.5,
      originalCashPrice: 3.0,
      stock: 300,
      expiresAt: oneMonthLater,
      tags: ["限时", "今日推荐", SEED_PRODUCT_TAG],
      status: "ACTIVE" as const,
    },
    {
      app: "抖音",
      title: "抖音加速卡 x5",
      subtitle: "免费领取",
      description: "观看视频获得额外经验加速",
      pointsPrice: 300,
      cashPrice: 0,
      stock: 1000,
      expiresAt: oneMonthLater,
      tags: ["零元购", SEED_PRODUCT_TAG],
      status: "ACTIVE" as const,
    },
  ];

  const products = [];
  for (const def of productDefs) {
    const existing = await prisma.product.findFirst({
      where: { app: def.app, title: def.title },
    });
    if (existing) {
      products.push(existing);
    } else {
      products.push(await prisma.product.create({ data: def }));
    }
  }

  console.log(`  ✓ Products: ${products.length} ensured`);

  // ── 3. Sample order & coupon (idempotent) ─────
  const existingOrder = await prisma.order.findFirst({
    where: {
      userId: consumer.id,
      productId: products[0].id,
      status: "PAID",
    },
  });

  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        userId: consumer.id,
        productId: products[0].id,
        qty: 1,
        cashPaid: 9.9,
        pointsPaid: 500,
        payMethod: "alipay",
        status: "PAID",
        paidAt: new Date(),
      },
    });

    await prisma.coupon.create({
      data: {
        code: "CP-SEED-TEST01",
        userId: consumer.id,
        productId: products[0].id,
        orderId: order.id,
        status: "ACTIVE",
        expiresAt: oneMonthLater,
      },
    });

    console.log(`  ✓ Order: ${order.id}, Coupon: CP-SEED-TEST01`);
  } else {
    console.log("  ✓ Order & Coupon already exist, skipped");
  }

  // ── 4. Sample checkin (idempotent) ────────────
  const today = new Date();
  today.setHours(8, 0, 0, 0);

  const existingCheckin = await prisma.checkin.findFirst({
    where: {
      userId: consumer.id,
      checkedAt: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) },
    },
  });

  if (!existingCheckin) {
    await prisma.checkin.create({
      data: {
        userId: consumer.id,
        dayIndex: 1,
        reward: 200,
        checkedAt: today,
      },
    });
    console.log("  ✓ Checkin record created");
  } else {
    console.log("  ✓ Checkin record already exists, skipped");
  }

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
