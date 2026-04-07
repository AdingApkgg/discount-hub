/**
 * tRPC Router Unit Tests
 *
 * These tests verify the business logic of each router.
 * They use a mock context to isolate from the database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers/_app";
import { createCallerFactory, createTRPCContext } from "../init";

const createCaller = createCallerFactory(appRouter);
type CallerContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ─── Mock Prisma Helpers ────────────────────────────

function mockPrisma() {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { cashPaid: null }, _count: 0 }),
    },
    coupon: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    checkin: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    taskCompletion: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    verificationRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      // For interactive transactions, call fn with prisma mock itself
      if (typeof fn === "function") return fn(mockPrismaInstance);
      // For array transactions, resolve all
      return Promise.all(fn as unknown[]);
    }),
  };
}

let mockPrismaInstance: ReturnType<typeof mockPrisma>;

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
};

const mockConsumer = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "CONSUMER" as const,
  points: 5000,
  vipLevel: 2,
};

const mockMerchant = {
  id: "merchant-1",
  email: "merchant@example.com",
  name: "Merchant",
  role: "MERCHANT" as const,
  points: 0,
  vipLevel: 0,
};

const mockHeaders = new Headers({
  "x-forwarded-for": "127.0.0.1",
  "user-agent": "vitest",
});

function makeCaller(user: typeof mockConsumer | typeof mockMerchant | null = null) {
  const ctx = {
    prisma: mockPrismaInstance as unknown as CallerContext["prisma"],
    redis: mockRedis as unknown as CallerContext["redis"],
    session: (user ? { user } : null) as CallerContext["session"],
    user,
    headers: mockHeaders,
  } as CallerContext;

  return createCaller(ctx);
}

// ─── Tests ──────────────────────────────────────────

describe("product router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("list returns products", async () => {
    const products = [
      { id: "p1", title: "Test", app: "抖音", tags: ["限时"], status: "ACTIVE" },
    ];
    mockPrismaInstance.product.findMany.mockResolvedValue(products);

    const caller = makeCaller();
    const result = await caller.product.list({ category: "all" });

    expect(result).toEqual(products);
    expect(mockPrismaInstance.product.findMany).toHaveBeenCalled();
  });

  it("byId returns null for missing product", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.product.byId({ id: "nonexistent" });

    expect(result).toBeNull();
  });

  it("create requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);

    await expect(
      caller.product.create({
        app: "抖音",
        title: "Test Product",
        pointsPrice: 100,
        cashPrice: 9.9,
        stock: 10,
        expiresAt: new Date("2026-12-31"),
      }),
    ).rejects.toThrow(TRPCError);
  });

  it("create succeeds for merchant", async () => {
    const newProduct = { id: "p1", app: "抖音", title: "Test Product" };
    mockPrismaInstance.product.create.mockResolvedValue(newProduct);

    const caller = makeCaller(mockMerchant);
    const result = await caller.product.create({
      app: "抖音",
      title: "Test Product",
      pointsPrice: 100,
      cashPrice: 9.9,
      stock: 10,
      expiresAt: new Date("2026-12-31"),
    });

    expect(result).toEqual(newProduct);
  });
});

describe("order router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("purchase requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(
      caller.order.purchase({
        productId: "p1",
        qty: 1,
        payMethod: "alipay",
      }),
    ).rejects.toThrow("请先登录");
  });

  it("purchase throws if product not found", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue(null);

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.order.purchase({
        productId: "p1",
        qty: 1,
        payMethod: "alipay",
      }),
    ).rejects.toThrow("商品不存在或已下架");
  });

  it("purchase throws if stock insufficient", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue({
      id: "p1",
      status: "ACTIVE",
      stock: 0,
      cashPrice: { toNumber: () => 9.9 },
      pointsPrice: 100,
      expiresAt: new Date("2026-12-31"),
    });

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.order.purchase({
        productId: "p1",
        qty: 1,
        payMethod: "alipay",
      }),
    ).rejects.toThrow("库存不足");
  });

  it("purchase creates a pending payment session for cash orders", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue({
      id: "p1",
      title: "Test Product",
      status: "ACTIVE",
      stock: 5,
      cashPrice: { toNumber: () => 9.9 },
      pointsPrice: 100,
    });
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: "user-1",
      points: 5000,
    });
    mockPrismaInstance.order.create.mockResolvedValue({
      id: "o1",
      qty: 1,
      cashPaid: { toNumber: () => 9.9 },
      pointsPaid: 100,
      payMethod: "wechat",
      status: "PENDING",
    });

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.purchase({
      productId: "p1",
      qty: 1,
      payMethod: "wechat",
    });

    expect(result.completed).toBe(false);
    expect(result.coupon).toBeNull();
    expect(result.paymentSession.provider).toBe("rainbow");
    expect(result.paymentSession.method).toBe("wechat");
  });

  it("completePayment settles a pending order", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      productId: "p1",
      qty: 1,
      cashPaid: { toNumber: () => 9.9 },
      pointsPaid: 100,
      payMethod: "alipay",
      status: "PENDING",
      coupon: null,
      product: {
        id: "p1",
        title: "Test Product",
        status: "ACTIVE",
        stock: 5,
        expiresAt: new Date("2026-12-31"),
      },
      user: {
        id: "user-1",
        points: 5000,
      },
    });
    mockPrismaInstance.product.update.mockResolvedValue({ stock: 4 });
    mockPrismaInstance.user.update.mockResolvedValue({});
    mockPrismaInstance.order.update.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      productId: "p1",
      qty: 1,
      cashPaid: { toNumber: () => 9.9 },
      pointsPaid: 100,
      payMethod: "alipay",
      status: "PAID",
      paidAt: new Date("2026-04-01T00:00:00Z"),
    });
    mockPrismaInstance.coupon.create.mockResolvedValue({
      id: "c1",
      code: "CP-TEST",
    });
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.completePayment({ orderId: "o1" });

    expect(result.completed).toBe(true);
    expect(result.coupon?.code).toBe("CP-TEST");
    expect(result.paymentSession.status).toBe("PAID");
    expect(mockPrismaInstance.order.update).toHaveBeenCalled();
  });

  it("cancel requires own order", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "other-user",
      status: "PAID",
      coupon: null,
    });

    const caller = makeCaller(mockConsumer);

    await expect(caller.order.cancel({ orderId: "o1" })).rejects.toThrow(
      "订单不存在",
    );
  });

  it("myOrders returns user orders", async () => {
    const orders = [{ id: "o1", userId: "user-1" }];
    mockPrismaInstance.order.findMany.mockResolvedValue(orders);

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.myOrders();

    expect(result).toEqual(orders);
  });
});

describe("verify router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("verifyCoupon requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);

    await expect(
      caller.verify.verifyCoupon({ code: "TEST123" }),
    ).rejects.toThrow("仅商家可访问");
  });

  it("verifyCoupon throws if code not found", async () => {
    mockPrismaInstance.coupon.findUnique.mockResolvedValue(null);

    const caller = makeCaller(mockMerchant);

    await expect(
      caller.verify.verifyCoupon({ code: "INVALID" }),
    ).rejects.toThrow("券码不存在");
  });

  it("verifyCoupon throws if already used", async () => {
    mockPrismaInstance.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "USED123",
      status: "USED",
      expiresAt: new Date("2026-12-31"),
      product: { title: "Test" },
      user: { name: "User" },
    });

    const caller = makeCaller(mockMerchant);

    await expect(
      caller.verify.verifyCoupon({ code: "USED123" }),
    ).rejects.toThrow("该券已使用");
  });
});

describe("points router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("getStatus returns user points info", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      points: 1000,
      vipLevel: 2,
    });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result).toHaveProperty("points", 1000);
    expect(result).toHaveProperty("vipLevel", 2);
    expect(result).toHaveProperty("checkedInToday", false);
  });

  it("checkin prevents double checkin", async () => {
    // Mock that user already checked in today
    mockPrismaInstance.checkin.findFirst.mockResolvedValue({
      id: "ch1",
      userId: "user-1",
    });

    const caller = makeCaller(mockConsumer);

    await expect(caller.points.checkin()).rejects.toThrow("今日已签到");
  });

  it("completeTask prevents duplicate task completion", async () => {
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue({
      id: "tc1",
    });

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.points.completeTask({ taskId: "browse" }),
    ).rejects.toThrow("今日已完成该任务");
  });
});

describe("user router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("me requires authentication", async () => {
    const caller = makeCaller(null);
    await expect(caller.user.me()).rejects.toThrow("请先登录");
  });

  it("me returns user profile", async () => {
    const profile = {
      id: "user-1",
      email: "test@example.com",
      name: "Test",
      _count: { referrals: 0, orders: 3, coupons: 2 },
    };
    mockPrismaInstance.user.findUnique.mockResolvedValue(profile);

    const caller = makeCaller(mockConsumer);
    const result = await caller.user.me();

    expect(result).toEqual(profile);
  });

  it("dashboardStats requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);
    await expect(caller.user.dashboardStats()).rejects.toThrow("仅商家可访问");
  });
});
