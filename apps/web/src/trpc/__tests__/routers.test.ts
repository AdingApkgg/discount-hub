/**
 * tRPC Router Unit Tests
 *
 * These tests verify the business logic of each router.
 * They use a mock context to isolate from the database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(undefined),
}));

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
      count: vi.fn().mockResolvedValue(0),
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
    incentiveConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    taskTemplate: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    supportConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    supportFaq: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    shortLink: {
      create: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
    },
    posterTemplate: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    inviteEvent: {
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    redemptionGuide: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    agentCommissionConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    agentCommission: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null }, _count: 0 }),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    agentApplication: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    deviceFingerprint: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: "fp1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
    taskCompletion: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
    },
    verificationRecord: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      if (typeof fn === "function") return fn(mockPrismaInstance);
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

const mockAdmin = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN" as const,
  points: 0,
  vipLevel: 0,
};

const mockHeaders = new Headers({
  "x-forwarded-for": "127.0.0.1",
  "user-agent": "vitest",
});

type AnyMockUser =
  | typeof mockConsumer
  | typeof mockMerchant
  | typeof mockAdmin
  | { id: string; email: string; name: string; role: "AGENT"; points: number; vipLevel: number };

function makeCaller(user: AnyMockUser | null = null) {
  const ctx = {
    prisma: mockPrismaInstance as unknown as CallerContext["prisma"],
    redis: mockRedis as unknown as CallerContext["redis"],
    session: (user ? { user } : null) as CallerContext["session"],
    user,
    headers: mockHeaders,
    risk: {
      visitorId: null,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    },
  } as CallerContext;

  return createCaller(ctx);
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function yesterdayDate() {
  const d = todayStart();
  d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

function twoDaysAgo() {
  const d = todayStart();
  d.setDate(d.getDate() - 2);
  d.setHours(12, 0, 0, 0);
  return d;
}

// ─── Tests ──────────────────────────────────────────

// ════════════════════════════════════════════════════
// Product Router
// ════════════════════════════════════════════════════

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

    expect(result).toEqual([
      {
        ...products[0],
        cashPrice: 0,
        originalCashPrice: null,
      },
    ]);
    expect(mockPrismaInstance.product.findMany).toHaveBeenCalled();
  });

  it("list with category filter applies correct tag", async () => {
    mockPrismaInstance.product.findMany.mockResolvedValue([]);

    const caller = makeCaller();
    await caller.product.list({ category: "limited" });

    expect(mockPrismaInstance.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          tags: { has: "限时" },
        }),
      }),
    );
  });

  it("list returns cached data from Redis", async () => {
    const cached = [{ id: "p1", title: "Cached" }];
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

    const caller = makeCaller();
    const result = await caller.product.list({ category: "all" });

    expect(result).toEqual(cached);
    expect(mockPrismaInstance.product.findMany).not.toHaveBeenCalled();
  });

  it("list writes to Redis cache on miss", async () => {
    const products = [{ id: "p1", title: "Fresh" }];
    mockPrismaInstance.product.findMany.mockResolvedValue(products);

    const caller = makeCaller();
    await caller.product.list({ category: "all" });

    expect(mockRedis.set).toHaveBeenCalledWith(
      "products:list:all",
      JSON.stringify([
        {
          ...products[0],
          cashPrice: 0,
          originalCashPrice: null,
        },
      ]),
      "EX",
      60,
    );
  });

  it("byId returns null for missing product", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue(null);

    const caller = makeCaller();
    const result = await caller.product.byId({ id: "nonexistent" });

    expect(result).toBeNull();
  });

  it("byId returns product when found", async () => {
    const product = { id: "p1", title: "Test", app: "抖音" };
    mockPrismaInstance.product.findUnique.mockResolvedValue(product);

    const caller = makeCaller();
    const result = await caller.product.byId({ id: "p1" });

    expect(result).toEqual({
      ...product,
      cashPrice: 0,
      originalCashPrice: null,
    });
  });

  it("byId returns cached product from Redis", async () => {
    const cached = { id: "p1", title: "Cached Detail" };
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached));

    const caller = makeCaller();
    const result = await caller.product.byId({ id: "p1" });

    expect(result).toEqual(cached);
    expect(mockPrismaInstance.product.findUnique).not.toHaveBeenCalled();
  });

  it("manageList requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);

    await expect(caller.product.manageList()).rejects.toThrow("仅商家可访问");
  });

  it("manageList returns all products for merchant", async () => {
    const products = [{ id: "p1" }, { id: "p2" }];
    mockPrismaInstance.product.findMany.mockResolvedValue(products);

    const caller = makeCaller(mockMerchant);
    const result = await caller.product.manageList();

    expect(result).toEqual([
      { id: "p1", cashPrice: 0, originalCashPrice: null },
      { id: "p2", cashPrice: 0, originalCashPrice: null },
    ]);
  });

  it("manageList filters by status", async () => {
    mockPrismaInstance.product.findMany.mockResolvedValue([]);

    const caller = makeCaller(mockMerchant);
    await caller.product.manageList({ status: "DRAFT" });

    expect(mockPrismaInstance.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "DRAFT" }),
      }),
    );
  });

  it("manageList filters by search keyword", async () => {
    mockPrismaInstance.product.findMany.mockResolvedValue([]);

    const caller = makeCaller(mockMerchant);
    await caller.product.manageList({ status: "all", search: "抖音" });

    expect(mockPrismaInstance.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ title: { contains: "抖音", mode: "insensitive" } }),
          ]),
        }),
      }),
    );
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

  it("create invalidates Redis list cache", async () => {
    mockPrismaInstance.product.create.mockResolvedValue({ id: "p1" });
    mockRedis.keys.mockResolvedValueOnce(["products:list:all", "products:list:limited"]);

    const caller = makeCaller(mockMerchant);
    await caller.product.create({
      app: "抖音",
      title: "Test",
      pointsPrice: 0,
      cashPrice: 0,
      stock: 1,
      expiresAt: new Date("2026-12-31"),
    });

    expect(mockRedis.keys).toHaveBeenCalledWith("products:list:*");
    expect(mockRedis.del).toHaveBeenCalledWith("products:list:all", "products:list:limited");
  });

  it("update requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);

    await expect(
      caller.product.update({ id: "p1", data: { title: "Updated" } }),
    ).rejects.toThrow("仅商家可访问");
  });

  it("update succeeds and invalidates caches", async () => {
    const updated = { id: "p1", title: "Updated" };
    mockPrismaInstance.product.update.mockResolvedValue(updated);
    mockRedis.keys.mockResolvedValueOnce(["products:list:all"]);

    const caller = makeCaller(mockMerchant);
    const result = await caller.product.update({ id: "p1", data: { title: "Updated" } });

    expect(result).toEqual(updated);
    expect(mockRedis.del).toHaveBeenCalledWith("products:list:all");
    expect(mockRedis.del).toHaveBeenCalledWith("products:detail:p1");
  });
});

// ════════════════════════════════════════════════════
// Order Router
// ════════════════════════════════════════════════════

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

  it("purchase throws for inactive product", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue({
      id: "p1",
      status: "SOLD_OUT",
      stock: 10,
      cashPrice: { toNumber: () => 9.9 },
      pointsPrice: 100,
    });

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.order.purchase({ productId: "p1", qty: 1, payMethod: "alipay" }),
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

  it("purchase throws if stock less than qty", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue({
      id: "p1",
      status: "ACTIVE",
      stock: 2,
      cashPrice: { toNumber: () => 9.9 },
      pointsPrice: 100,
    });

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.order.purchase({ productId: "p1", qty: 5, payMethod: "alipay" }),
    ).rejects.toThrow("库存不足");
  });

  it("purchase throws if points insufficient", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue({
      id: "p1",
      status: "ACTIVE",
      stock: 10,
      cashPrice: { toNumber: () => 9.9 },
      pointsPrice: 3000,
    });
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: "user-1",
      points: 100,
    });

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.order.purchase({ productId: "p1", qty: 2, payMethod: "alipay" }),
    ).rejects.toThrow("积分不足");
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
    expect(result.paymentSession.status).toBe("PENDING");
  });

  it("purchase with zero cash completes immediately", async () => {
    mockPrismaInstance.product.findUnique.mockResolvedValue({
      id: "p1",
      title: "Free Product",
      status: "ACTIVE",
      stock: 5,
      cashPrice: { toNumber: () => 0 },
      pointsPrice: 100,
      expiresAt: new Date("2026-12-31"),
    });
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: "user-1",
      points: 5000,
    });
    mockPrismaInstance.order.create.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      productId: "p1",
      qty: 1,
      cashPaid: { toNumber: () => 0 },
      pointsPaid: 100,
      payMethod: "alipay",
      status: "PENDING",
    });
    // finalizeOrderPayment will re-fetch the order with includes
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      productId: "p1",
      qty: 1,
      cashPaid: { toNumber: () => 0 },
      pointsPaid: 100,
      payMethod: "alipay",
      status: "PENDING",
      coupon: null,
      product: {
        id: "p1",
        title: "Free Product",
        status: "ACTIVE",
        stock: 5,
        expiresAt: new Date("2026-12-31"),
      },
      user: { id: "user-1", points: 5000 },
    });
    mockPrismaInstance.product.update.mockResolvedValue({ stock: 4 });
    mockPrismaInstance.user.update.mockResolvedValue({});
    mockPrismaInstance.order.update.mockResolvedValue({
      id: "o1",
      qty: 1,
      cashPaid: { toNumber: () => 0 },
      pointsPaid: 100,
      payMethod: "alipay",
      status: "PAID",
    });
    mockPrismaInstance.coupon.create.mockResolvedValue({ id: "c1", code: "CP-FREE" });
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.purchase({
      productId: "p1",
      qty: 1,
      payMethod: "alipay",
    });

    expect(result.completed).toBe(true);
    expect(result.coupon).not.toBeNull();
    expect(result.paymentSession.status).toBe("PAID");
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

  it("completePayment throws for non-existent order", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue(null);

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.order.completePayment({ orderId: "nonexistent" }),
    ).rejects.toThrow("订单不存在");
  });

  it("completePayment throws for other user's order", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "other-user",
      status: "PENDING",
      coupon: null,
      product: { id: "p1", title: "T", status: "ACTIVE", stock: 5 },
      user: { id: "other-user", points: 5000 },
    });

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.order.completePayment({ orderId: "o1" }),
    ).rejects.toThrow("订单不存在");
  });

  it("completePayment returns existing coupon for already-paid order", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      productId: "p1",
      qty: 1,
      cashPaid: { toNumber: () => 9.9 },
      pointsPaid: 100,
      payMethod: "alipay",
      status: "PAID",
      coupon: { id: "c1", code: "CP-EXISTING" },
      product: { id: "p1", title: "Test Product", status: "ACTIVE", stock: 5 },
      user: { id: "user-1", points: 5000 },
    });

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.completePayment({ orderId: "o1" });

    expect(result.completed).toBe(true);
    expect(result.coupon?.code).toBe("CP-EXISTING");
    expect(mockPrismaInstance.$transaction).not.toHaveBeenCalled();
  });

  it("completePayment throws for cancelled order", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      status: "CANCELLED",
      coupon: null,
      product: { id: "p1", title: "T", status: "ACTIVE", stock: 5 },
      user: { id: "user-1", points: 5000 },
    });

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.order.completePayment({ orderId: "o1" }),
    ).rejects.toThrow("当前订单状态无法继续支付");
  });

  it("completePayment auto-awards purchase task reward", async () => {
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
        title: "Test",
        status: "ACTIVE",
        stock: 5,
        expiresAt: new Date("2026-12-31"),
      },
      user: { id: "user-1", points: 5000 },
    });
    mockPrismaInstance.product.update.mockResolvedValue({ stock: 4 });
    mockPrismaInstance.user.update.mockResolvedValue({});
    mockPrismaInstance.order.update.mockResolvedValue({
      id: "o1",
      qty: 1,
      cashPaid: { toNumber: () => 9.9 },
      pointsPaid: 100,
      payMethod: "alipay",
      status: "PAID",
    });
    mockPrismaInstance.coupon.create.mockResolvedValue({ id: "c1", code: "CP-T" });
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.completePayment({ orderId: "o1" });

    expect(result.taskReward).toBe(100);
    expect(mockPrismaInstance.taskCompletion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taskId: "purchase", reward: 100 }),
      }),
    );
  });

  it("completePayment skips task reward if already completed today", async () => {
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
        title: "Test",
        status: "ACTIVE",
        stock: 5,
        expiresAt: new Date("2026-12-31"),
      },
      user: { id: "user-1", points: 5000 },
    });
    mockPrismaInstance.product.update.mockResolvedValue({ stock: 4 });
    mockPrismaInstance.user.update.mockResolvedValue({});
    mockPrismaInstance.order.update.mockResolvedValue({
      id: "o1",
      qty: 1,
      cashPaid: { toNumber: () => 9.9 },
      pointsPaid: 100,
      payMethod: "alipay",
      status: "PAID",
    });
    mockPrismaInstance.coupon.create.mockResolvedValue({ id: "c1", code: "CP-T" });
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue({ id: "tc-existing" });

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.completePayment({ orderId: "o1" });

    expect(result.taskReward).toBe(0);
    expect(mockPrismaInstance.taskCompletion.create).not.toHaveBeenCalled();
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

  it("cancel PENDING order succeeds without refund", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      status: "PENDING",
      coupon: null,
    });
    mockPrismaInstance.order.update.mockResolvedValue({ status: "CANCELLED" });

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.cancel({ orderId: "o1" });

    expect(result.success).toBe(true);
    expect(mockPrismaInstance.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "CANCELLED" } }),
    );
    expect(mockPrismaInstance.$transaction).not.toHaveBeenCalled();
  });

  it("cancel PAID order refunds stock and points", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      productId: "p1",
      qty: 2,
      pointsPaid: 200,
      status: "PAID",
      coupon: { id: "c1", status: "ACTIVE" },
    });
    mockPrismaInstance.order.update.mockResolvedValue({ status: "CANCELLED" });
    mockPrismaInstance.coupon.update.mockResolvedValue({});
    mockPrismaInstance.product.update.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.cancel({ orderId: "o1" });

    expect(result.success).toBe(true);
    expect(mockPrismaInstance.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stock: { increment: 2 } },
      }),
    );
    expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { points: { increment: 200 } },
      }),
    );
    expect(mockPrismaInstance.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "EXPIRED" },
      }),
    );
  });

  it("cancel throws for PAID order with USED coupon", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      status: "PAID",
      coupon: { id: "c1", status: "USED" },
    });

    const caller = makeCaller(mockConsumer);

    await expect(caller.order.cancel({ orderId: "o1" })).rejects.toThrow(
      "券码已核销，无法取消",
    );
  });

  it("cancel throws for CANCELLED order", async () => {
    mockPrismaInstance.order.findUnique.mockResolvedValue({
      id: "o1",
      userId: "user-1",
      status: "CANCELLED",
      coupon: null,
    });

    const caller = makeCaller(mockConsumer);

    await expect(caller.order.cancel({ orderId: "o1" })).rejects.toThrow(
      "仅已支付订单可取消",
    );
  });

  it("myOrders returns user orders", async () => {
    const orders = [{ id: "o1", userId: "user-1", cashPaid: 0 }];
    mockPrismaInstance.order.findMany.mockResolvedValue(orders);

    const caller = makeCaller(mockConsumer);
    const result = await caller.order.myOrders();

    expect(result).toEqual(orders);
  });

  it("myOrders requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(caller.order.myOrders()).rejects.toThrow("请先登录");
  });

  it("allOrders requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);

    await expect(caller.order.allOrders()).rejects.toThrow("仅商家可访问");
  });

  it("allOrders returns paginated results", async () => {
    const orders = [{ id: "o1", cashPaid: 0 }, { id: "o2", cashPaid: 0 }];
    mockPrismaInstance.order.findMany.mockResolvedValue(orders);
    mockPrismaInstance.order.count.mockResolvedValue(50);

    const caller = makeCaller(mockMerchant);
    const result = await caller.order.allOrders({ page: 2, pageSize: 10 });

    expect(result.orders).toEqual(orders);
    expect(result.total).toBe(50);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(mockPrismaInstance.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 10 }),
    );
  });
});

// ════════════════════════════════════════════════════
// Verify Router
// ════════════════════════════════════════════════════

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

  it("verifyCoupon requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(
      caller.verify.verifyCoupon({ code: "TEST123" }),
    ).rejects.toThrow("请先登录");
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

  it("verifyCoupon throws if coupon expired", async () => {
    mockPrismaInstance.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "EXPIRED123",
      status: "ACTIVE",
      expiresAt: new Date("2020-01-01"),
      product: { title: "Test" },
      user: { name: "User" },
    });

    const caller = makeCaller(mockMerchant);

    await expect(
      caller.verify.verifyCoupon({ code: "EXPIRED123" }),
    ).rejects.toThrow("该券已过期");
  });

  it("verifyCoupon succeeds for valid coupon", async () => {
    mockPrismaInstance.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "VALID123",
      status: "ACTIVE",
      expiresAt: new Date("2030-12-31"),
      product: { title: "Premium Product" },
      user: { name: "张三", email: "zhang@example.com" },
    });
    mockPrismaInstance.coupon.update.mockResolvedValue({
      id: "c1",
      code: "VALID123",
      status: "USED",
    });
    mockPrismaInstance.verificationRecord.create.mockResolvedValue({});

    const caller = makeCaller(mockMerchant);
    const result = await caller.verify.verifyCoupon({ code: "VALID123" });

    expect(result.success).toBe(true);
    expect(result.coupon.code).toBe("VALID123");
    expect(result.coupon.productTitle).toBe("Premium Product");
    expect(result.coupon.userName).toBe("张三");
  });

  it("verifyCoupon uses email as userName when name is null", async () => {
    mockPrismaInstance.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "VALID456",
      status: "ACTIVE",
      expiresAt: new Date("2030-12-31"),
      product: { title: "Test" },
      user: { name: null, email: "anon@example.com" },
    });
    mockPrismaInstance.coupon.update.mockResolvedValue({
      id: "c1",
      code: "VALID456",
      status: "USED",
    });
    mockPrismaInstance.verificationRecord.create.mockResolvedValue({});

    const caller = makeCaller(mockMerchant);
    const result = await caller.verify.verifyCoupon({ code: "VALID456" });

    expect(result.coupon.userName).toBe("anon@example.com");
  });

  it("verifyCoupon creates verification record", async () => {
    mockPrismaInstance.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "REC123",
      status: "ACTIVE",
      expiresAt: new Date("2030-12-31"),
      product: { title: "Test" },
      user: { name: "User" },
    });
    mockPrismaInstance.coupon.update.mockResolvedValue({ id: "c1", code: "REC123", status: "USED" });
    mockPrismaInstance.verificationRecord.create.mockResolvedValue({});

    const caller = makeCaller(mockMerchant);
    await caller.verify.verifyCoupon({ code: "REC123" });

    expect(mockPrismaInstance.verificationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          couponId: "c1",
          verifiedBy: "merchant-1",
        }),
      }),
    );
  });

  it("verifyCoupon blocks concurrent verification via Redis lock", async () => {
    mockRedis.set.mockResolvedValueOnce(null);

    const caller = makeCaller(mockMerchant);

    await expect(
      caller.verify.verifyCoupon({ code: "LOCKED123" }),
    ).rejects.toThrow("该券码正在核销中，请勿重复操作");
  });

  it("verifyCoupon releases Redis lock after success", async () => {
    mockRedis.set.mockResolvedValueOnce("OK");
    mockPrismaInstance.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "LOCK-OK",
      status: "ACTIVE",
      expiresAt: new Date("2030-12-31"),
      product: { title: "Test" },
      user: { name: "User" },
    });
    mockPrismaInstance.coupon.update.mockResolvedValue({ id: "c1", code: "LOCK-OK", status: "USED" });
    mockPrismaInstance.verificationRecord.create.mockResolvedValue({});

    const caller = makeCaller(mockMerchant);
    await caller.verify.verifyCoupon({ code: "LOCK-OK" });

    expect(mockRedis.del).toHaveBeenCalledWith("verify:lock:LOCK-OK");
  });

  it("verifyCoupon releases Redis lock on failure", async () => {
    mockRedis.set.mockResolvedValueOnce("OK");
    mockPrismaInstance.coupon.findUnique.mockResolvedValue(null);

    const caller = makeCaller(mockMerchant);

    await expect(
      caller.verify.verifyCoupon({ code: "LOCK-FAIL" }),
    ).rejects.toThrow("券码不存在");

    expect(mockRedis.del).toHaveBeenCalledWith("verify:lock:LOCK-FAIL");
  });

  it("recentRecords requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);

    await expect(caller.verify.recentRecords()).rejects.toThrow("仅商家可访问");
  });

  it("recentRecords returns verification history", async () => {
    const records = [
      { id: "vr1", coupon: { code: "C1", product: {}, user: {} }, verifier: {} },
    ];
    mockPrismaInstance.verificationRecord.findMany.mockResolvedValue(records);

    const caller = makeCaller(mockMerchant);
    const result = await caller.verify.recentRecords();

    expect(result).toEqual(records);
    expect(mockPrismaInstance.verificationRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});

// ════════════════════════════════════════════════════
// Points Router
// ════════════════════════════════════════════════════

describe("points router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  // ── getStatus ──

  it("getStatus requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(caller.points.getStatus()).rejects.toThrow("请先登录");
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
    expect(result).toHaveProperty("nextDayIndex", 1);
    expect(result).toHaveProperty("todayTasks");
    expect(Array.isArray(result.todayTasks)).toBe(true);
  });

  it("getStatus aggregates todayTaskCounts from completions", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({ points: 0, vipLevel: 0 });
    mockPrismaInstance.taskCompletion.findMany.mockResolvedValue([
      { taskId: "chat5" },
      { taskId: "chat5" },
      { taskId: "chat5" },
      { taskId: "browse" },
    ]);

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result.todayTaskCounts).toEqual({ chat5: 3, browse: 1 });
    expect(new Set(result.todayTasks)).toEqual(new Set(["chat5", "browse"]));
  });

  it("getStatus defaults to 0 when user has no record", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue(null);

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result.points).toBe(0);
    expect(result.vipLevel).toBe(0);
  });

  it("getStatus shows checkedInToday=true when checked in", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({ points: 100, vipLevel: 0 });
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce({ id: "ch1", dayIndex: 1 })  // todayCheckin
      .mockResolvedValueOnce({ id: "ch1", dayIndex: 1, checkedAt: new Date() }); // lastCheckin

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result.checkedInToday).toBe(true);
  });

  it("getStatus calculates nextDayIndex=2 after yesterday checkin", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({ points: 100, vipLevel: 0 });
    const yesterday = yesterdayDate();
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null)  // todayCheckin — not checked in today
      .mockResolvedValueOnce({ id: "ch1", dayIndex: 1, checkedAt: yesterday }); // lastCheckin

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result.nextDayIndex).toBe(2);
  });

  it("getStatus resets nextDayIndex to 1 after break in streak", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({ points: 100, vipLevel: 0 });
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null)  // todayCheckin
      .mockResolvedValueOnce({ id: "ch1", dayIndex: 3, checkedAt: twoDaysAgo() }); // lastCheckin — 2 days ago

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result.nextDayIndex).toBe(1);
  });

  it("getStatus advances nextDayIndex after yesterday streak (cycle > 4)", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({ points: 100, vipLevel: 0 });
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "ch1", dayIndex: 4, checkedAt: yesterdayDate() });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result.nextDayIndex).toBe(5);
  });

  it("getStatus returns today completed task IDs", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({ points: 100, vipLevel: 0 });
    mockPrismaInstance.taskCompletion.findMany.mockResolvedValue([
      { taskId: "browse" },
      { taskId: "share" },
    ]);

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result.todayTasks).toEqual(["browse", "share"]);
  });

  // ── checkin ──

  it("checkin requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(caller.points.checkin()).rejects.toThrow("请先登录");
  });

  it("checkin prevents double checkin", async () => {
    mockPrismaInstance.checkin.findFirst.mockResolvedValue({
      id: "ch1",
      userId: "user-1",
    });

    const caller = makeCaller(mockConsumer);

    await expect(caller.points.checkin()).rejects.toThrow("今日已签到");
  });

  it("checkin first day gives 200 points", async () => {
    mockPrismaInstance.checkin.findFirst.mockResolvedValue(null);
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({ points: 5200 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.checkin();

    expect(result.dayIndex).toBe(1);
    expect(result.reward).toBe(200);
    expect(mockPrismaInstance.checkin.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dayIndex: 1, reward: 200 }),
      }),
    );
  });

  it("checkin new-user first sign-in gives newUserBonusPoints", async () => {
    mockPrismaInstance.checkin.findFirst.mockResolvedValue(null);
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      vipLevel: 0,
      points: 0,
      createdAt: new Date(),
    });
    mockPrismaInstance.incentiveConfig.findFirst.mockResolvedValue({
      newUserBonusPoints: 500,
      newUserBonusDays: 7,
      newUserCheckinMulti: 2.0,
      oldUserCheckinMulti: 1.0,
      referralReward: 1000,
      refereeReward: 500,
      isActive: true,
    });
    mockPrismaInstance.user.update.mockResolvedValue({ points: 500 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.checkin();

    expect(result.reward).toBe(500);
  });

  it("checkin new-user day 2 applies newUserCheckinMulti", async () => {
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "ch-prev", dayIndex: 1, checkedAt: yesterdayDate() });
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      vipLevel: 0,
      points: 500,
      createdAt: new Date(),
    });
    mockPrismaInstance.incentiveConfig.findFirst.mockResolvedValue({
      newUserBonusPoints: 500,
      newUserBonusDays: 7,
      newUserCheckinMulti: 2.0,
      oldUserCheckinMulti: 1.0,
      referralReward: 1000,
      refereeReward: 500,
      isActive: true,
    });
    mockPrismaInstance.user.update.mockResolvedValue({ points: 6500 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.checkin();

    // day 2 base = 3000, vip 0 bonus 0, newUserMulti 2.0 → 6000
    expect(result.dayIndex).toBe(2);
    expect(result.reward).toBe(6000);
  });

  it("checkin old-user day 1 applies oldUserCheckinMulti", async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "ch-old", dayIndex: 3, checkedAt: twoDaysAgo() });
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      vipLevel: 0,
      points: 5000,
      createdAt: thirtyDaysAgo,
    });
    mockPrismaInstance.incentiveConfig.findFirst.mockResolvedValue({
      newUserBonusPoints: 500,
      newUserBonusDays: 7,
      newUserCheckinMulti: 2.0,
      oldUserCheckinMulti: 1.2,
      referralReward: 1000,
      refereeReward: 500,
      isActive: true,
    });
    mockPrismaInstance.user.update.mockResolvedValue({ points: 5240 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.checkin();

    // streak broken → day 1, base 200, oldUserMulti 1.2 → 240
    expect(result.dayIndex).toBe(1);
    expect(result.reward).toBe(240);
  });

  it("checkin consecutive day increments dayIndex", async () => {
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null) // existing today check
      .mockResolvedValueOnce({ id: "ch-prev", dayIndex: 2, checkedAt: yesterdayDate() }); // last checkin
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({ points: 5300 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.checkin();

    expect(result.dayIndex).toBe(3);
    expect(result.reward).toBe(300);
  });

  it("checkin resets to day 1 after streak break", async () => {
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null) // existing today check
      .mockResolvedValueOnce({ id: "ch-old", dayIndex: 3, checkedAt: twoDaysAgo() }); // last checkin — broken streak
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({ points: 5200 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.checkin();

    expect(result.dayIndex).toBe(1);
    expect(result.reward).toBe(200);
  });

  it("checkin continues streak to day 5 after day 4", async () => {
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null) // existing today check
      .mockResolvedValueOnce({ id: "ch-prev", dayIndex: 4, checkedAt: yesterdayDate() });
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({ points: 5500 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.checkin();

    expect(result.dayIndex).toBe(5);
    expect(result.reward).toBe(800);
  });

  it("checkin streakBonusThreshold=3 day 3 boosts vipLevel from existing+1", async () => {
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "ch-prev", dayIndex: 2, checkedAt: yesterdayDate() });
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    // User starts at vip 2 with 0 points: pure-points path would compute vip=0,
    // so any vipLevel > 0 in the update can only come from the streak bonus.
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      vipLevel: 2,
      points: 0,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    });
    mockPrismaInstance.incentiveConfig.findFirst.mockResolvedValue({
      newUserBonusPoints: 500,
      newUserBonusDays: 7,
      newUserCheckinMulti: 2.0,
      oldUserCheckinMulti: 1.0,
      referralReward: 1000,
      refereeReward: 500,
      streakBonusThreshold: 3,
      isActive: true,
    });
    mockPrismaInstance.user.update.mockResolvedValue({ points: 300 });

    const caller = makeCaller(mockConsumer);
    await caller.points.checkin();

    // streak bonus = floor(3/3) = 1 → max(0, 2+1) = 3
    expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vipLevel: { set: 3 },
        }),
      }),
    );
  });

  it("checkin streakBonusThreshold=0 disables streak vipLevel boost", async () => {
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "ch-prev", dayIndex: 2, checkedAt: yesterdayDate() });
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      vipLevel: 2,
      points: 0,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    });
    mockPrismaInstance.incentiveConfig.findFirst.mockResolvedValue({
      newUserBonusPoints: 500,
      newUserBonusDays: 7,
      newUserCheckinMulti: 2.0,
      oldUserCheckinMulti: 1.0,
      referralReward: 1000,
      refereeReward: 500,
      streakBonusThreshold: 0,
      isActive: true,
    });
    mockPrismaInstance.user.update.mockResolvedValue({ points: 300 });

    const caller = makeCaller(mockConsumer);
    await caller.points.checkin();

    // No streak bonus → newVipLevel = computeVipLevel(0+300) = 0; user gets demoted
    // because that is the configured policy (vip set, not max with current)
    expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vipLevel: { set: 0 },
        }),
      }),
    );
  });

  it("checkin updates VIP level based on accumulated points", async () => {
    mockPrismaInstance.checkin.findFirst.mockResolvedValue(null);
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({ points: 5200 });

    const caller = makeCaller(mockConsumer);
    await caller.points.checkin();

    expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          points: { increment: 200 },
          vipLevel: expect.objectContaining({ set: expect.any(Number) }),
        }),
      }),
    );
  });

  // ── completeTask ──

  it("completeTask requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(
      caller.points.completeTask({ taskId: "browse" }),
    ).rejects.toThrow("请先登录");
  });

  it("completeTask throws for unknown taskId", async () => {
    const caller = makeCaller(mockConsumer);

    await expect(
      caller.points.completeTask({ taskId: "nonexistent_task" }),
    ).rejects.toThrow("未知任务");
  });

  it("completeTask prevents duplicate task completion", async () => {
    mockPrismaInstance.taskCompletion.count.mockResolvedValue(1);

    const caller = makeCaller(mockConsumer);

    await expect(
      caller.points.completeTask({ taskId: "browse" }),
    ).rejects.toThrow("今日已完成该任务");
  });

  it("completeTask 'browse' awards 100 points", async () => {
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.completeTask({ taskId: "browse" });

    expect(result.taskId).toBe("browse");
    expect(result.reward).toBe(100);
  });

  it("completeTask 'share' awards 80 points", async () => {
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.completeTask({ taskId: "share" });

    expect(result.taskId).toBe("share");
    expect(result.reward).toBe(80);
  });

  it("completeTask 'c4' awards 50 points", async () => {
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.completeTask({ taskId: "c4" });

    expect(result.taskId).toBe("c4");
    expect(result.reward).toBe(50);
  });

  it("completeTask increments user points", async () => {
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    await caller.points.completeTask({ taskId: "browse" });

    expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          points: { increment: 100 },
          vipLevel: { set: expect.any(Number) },
        }),
      }),
    );
  });

  it("completeTask uses TaskTemplate reward when present", async () => {
    mockPrismaInstance.taskTemplate.findUnique.mockResolvedValue({
      reward: 999,
      isActive: true,
    });
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.completeTask({ taskId: "browse" });

    expect(result.reward).toBe(999);
  });

  it("completeTask accepts new taskId not in TASK_REWARDS via template", async () => {
    mockPrismaInstance.taskTemplate.findUnique.mockResolvedValue({
      reward: 250,
      isActive: true,
    });
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue(null);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.completeTask({ taskId: "watch_video" });

    expect(result.reward).toBe(250);
  });

  it("completeTask rejects inactive template task", async () => {
    mockPrismaInstance.taskTemplate.findUnique.mockResolvedValue({
      reward: 100,
      isActive: false,
      type: "BASIC",
      targetCount: 1,
    });

    const caller = makeCaller(mockConsumer);
    await expect(
      caller.points.completeTask({ taskId: "browse" }),
    ).rejects.toThrow("任务已下线");
  });

  it("completeTask CUMULATIVE step 1 of 5 records 0 reward, returns progress", async () => {
    mockPrismaInstance.taskTemplate.findUnique.mockResolvedValue({
      reward: 500,
      isActive: true,
      type: "CUMULATIVE",
      targetCount: 5,
    });
    mockPrismaInstance.taskCompletion.count.mockResolvedValue(0);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.completeTask({ taskId: "chat5" });

    expect(result).toMatchObject({
      reward: 0,
      progress: 1,
      target: 5,
      done: false,
    });
    expect(mockPrismaInstance.user.update).not.toHaveBeenCalled();
    expect(mockPrismaInstance.taskCompletion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reward: 0 }),
      }),
    );
  });

  it("completeTask CUMULATIVE final step pays full reward", async () => {
    mockPrismaInstance.taskTemplate.findUnique.mockResolvedValue({
      reward: 500,
      isActive: true,
      type: "CUMULATIVE",
      targetCount: 5,
    });
    mockPrismaInstance.taskCompletion.count.mockResolvedValue(4);
    mockPrismaInstance.taskCompletion.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({ points: 5500 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.completeTask({ taskId: "chat5" });

    expect(result).toMatchObject({
      reward: 500,
      progress: 5,
      target: 5,
      done: true,
    });
    expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          points: { increment: 500 },
        }),
      }),
    );
  });

  it("completeTask CUMULATIVE rejects when already at target", async () => {
    mockPrismaInstance.taskTemplate.findUnique.mockResolvedValue({
      reward: 500,
      isActive: true,
      type: "CUMULATIVE",
      targetCount: 5,
    });
    mockPrismaInstance.taskCompletion.count.mockResolvedValue(5);

    const caller = makeCaller(mockConsumer);
    await expect(
      caller.points.completeTask({ taskId: "chat5" }),
    ).rejects.toThrow("今日已完成该任务");
  });
});

// ════════════════════════════════════════════════════
// User Router
// ════════════════════════════════════════════════════

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
    mockPrismaInstance.order.findMany.mockResolvedValue([]);

    const caller = makeCaller(mockConsumer);
    const result = await caller.user.me();

    expect(result).toEqual({
      ...profile,
      totalSavingsCents: 0,
      totalSavingsPoints: 0,
    });
  });

  it("me computes savings as originalCashPrice * qty - cashPaid", async () => {
    const profile = {
      id: "user-1",
      _count: { referrals: 0, orders: 2, coupons: 0 },
    };
    mockPrismaInstance.user.findUnique.mockResolvedValue(profile);
    mockPrismaInstance.order.findMany.mockResolvedValue([
      {
        qty: 2,
        cashPaid: 30,
        pointsPaid: 5000,
        product: { originalCashPrice: 50, cashPrice: 20 },
      },
      {
        qty: 1,
        cashPaid: 10,
        pointsPaid: 0,
        product: { originalCashPrice: null, cashPrice: 10 },
      },
      {
        qty: 1,
        cashPaid: 80,
        pointsPaid: 0,
        product: { originalCashPrice: 60, cashPrice: 60 },
      },
    ]);

    const caller = makeCaller(mockConsumer);
    const result = await caller.user.me();

    expect(result).toMatchObject({
      totalSavingsCents: 7000,
      totalSavingsPoints: 5000,
    });
  });

  it("updateProfile requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(
      caller.user.updateProfile({ name: "New Name" }),
    ).rejects.toThrow("请先登录");
  });

  it("updateProfile updates user name", async () => {
    const updated = { id: "user-1", name: "New Name", phone: null };
    mockPrismaInstance.user.update.mockResolvedValue(updated);

    const caller = makeCaller(mockConsumer);
    const result = await caller.user.updateProfile({ name: "New Name" });

    expect(result.name).toBe("New Name");
    expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { name: "New Name" },
      }),
    );
  });

  it("updateProfile updates user phone", async () => {
    const updated = { id: "user-1", name: "Test", phone: "13800138000" };
    mockPrismaInstance.user.update.mockResolvedValue(updated);

    const caller = makeCaller(mockConsumer);
    const result = await caller.user.updateProfile({ phone: "13800138000" });

    expect(result.phone).toBe("13800138000");
  });

  it("myCoupons requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(caller.user.myCoupons()).rejects.toThrow("请先登录");
  });

  it("myCoupons returns user coupons with product info", async () => {
    const coupons = [
      { id: "c1", code: "CP-123", status: "ACTIVE", product: { title: "Test" } },
      { id: "c2", code: "CP-456", status: "USED", product: { title: "Other" } },
    ];
    mockPrismaInstance.coupon.findMany.mockResolvedValue(coupons);

    const caller = makeCaller(mockConsumer);
    const result = await caller.user.myCoupons();

    expect(result).toHaveLength(2);
    expect(result[0].product.title).toBe("Test");
  });

  it("referrals requires authentication", async () => {
    const caller = makeCaller(null);

    await expect(caller.user.referrals()).rejects.toThrow("请先登录");
  });

  it("referrals returns invited users", async () => {
    const referrals = [
      { id: "u2", name: "Ref1", email: "ref1@example.com", createdAt: new Date() },
    ];
    mockPrismaInstance.user.findMany.mockResolvedValue(referrals);

    const caller = makeCaller(mockConsumer);
    const result = await caller.user.referrals();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Ref1");
  });

  it("dashboardStats requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);
    await expect(caller.user.dashboardStats()).rejects.toThrow("仅商家可访问");
  });

  it("dashboardStats requires authentication", async () => {
    const caller = makeCaller(null);
    await expect(caller.user.dashboardStats()).rejects.toThrow("请先登录");
  });

  it("dashboardStats returns aggregated stats", async () => {
    mockPrismaInstance.verificationRecord.count.mockResolvedValue(15);
    mockPrismaInstance.order.aggregate.mockResolvedValue({
      _sum: { cashPaid: 1234.5 },
      _count: 42,
    });
    mockPrismaInstance.user.count.mockResolvedValue(300);
    mockPrismaInstance.product.count.mockResolvedValue(25);

    const caller = makeCaller(mockMerchant);
    const result = await caller.user.dashboardStats();

    expect(result.todayVerifications).toBe(15);
    expect(result.todayRevenue).toBe(1234.5);
    expect(result.todayOrderCount).toBe(42);
    expect(result.activeUsers).toBe(300);
    expect(result.activeProducts).toBe(25);
  });

  it("dashboardStats defaults revenue to 0 when no orders", async () => {
    mockPrismaInstance.verificationRecord.count.mockResolvedValue(0);
    mockPrismaInstance.order.aggregate.mockResolvedValue({
      _sum: { cashPaid: null },
      _count: 0,
    });
    mockPrismaInstance.user.count.mockResolvedValue(0);
    mockPrismaInstance.product.count.mockResolvedValue(0);

    const caller = makeCaller(mockMerchant);
    const result = await caller.user.dashboardStats();

    expect(result.todayRevenue).toBe(0);
    expect(result.todayOrderCount).toBe(0);
  });
});

// ════════════════════════════════════════════════════
// Support Router
// ════════════════════════════════════════════════════

describe("support router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("askAI without API key matches DB FAQ keyword", async () => {
    mockPrismaInstance.supportFaq.findMany.mockResolvedValue([
      { keywords: ["积分", "签到"], answer: "签到可获得积分。" },
      { keywords: ["退款"], answer: "未核销订单可退。" },
    ]);

    const caller = makeCaller(mockConsumer);
    const result = await caller.support.askAI({ message: "我怎么签到？" });

    expect(result.provider).toBe("faq");
    expect(result.answer).toBe("签到可获得积分。");
  });

  it("askAI without API key falls back when no FAQ matches", async () => {
    mockPrismaInstance.supportFaq.findMany.mockResolvedValue([
      { keywords: ["积分"], answer: "签到可获得积分。" },
    ]);

    const caller = makeCaller(mockConsumer);
    const result = await caller.support.askAI({ message: "支付方式有哪些？" });

    expect(result.provider).toBe("faq");
    expect(result.answer).toContain("无法回答");
  });

  it("askAI keyword matching is case-insensitive", async () => {
    mockPrismaInstance.supportFaq.findMany.mockResolvedValue([
      { keywords: ["VIP", "等级"], answer: "VIP 由积分决定。" },
    ]);

    const caller = makeCaller(mockConsumer);
    const result = await caller.support.askAI({ message: "vip 怎么升？" });

    expect(result.answer).toBe("VIP 由积分决定。");
  });

  it("listFaqs returns active FAQs with public fields only", async () => {
    mockPrismaInstance.supportFaq.findMany.mockResolvedValue([
      { id: "f1", question: "积分？", answer: "签到。" },
    ]);

    const caller = makeCaller(mockConsumer);
    const result = await caller.support.listFaqs();

    expect(result).toEqual([{ id: "f1", question: "积分？", answer: "签到。" }]);
    expect(mockPrismaInstance.supportFaq.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        select: { id: true, question: true, answer: true },
      }),
    );
  });

  it("getPublicConfig returns transferWaitSeconds from DB", async () => {
    mockPrismaInstance.supportConfig.findFirst.mockResolvedValue({
      transferWaitSeconds: 45,
    });

    const caller = makeCaller(mockConsumer);
    const result = await caller.support.getPublicConfig();

    expect(result.transferWaitSeconds).toBe(45);
  });

  it("getPublicConfig defaults to 30 when no config row exists", async () => {
    mockPrismaInstance.supportConfig.findFirst.mockResolvedValue(null);

    const caller = makeCaller(mockConsumer);
    const result = await caller.support.getPublicConfig();

    expect(result.transferWaitSeconds).toBe(30);
  });

  it("askAI requires authentication", async () => {
    const caller = makeCaller(null);
    await expect(
      caller.support.askAI({ message: "hi" }),
    ).rejects.toThrow("请先登录");
  });
});

// ════════════════════════════════════════════════════
// Share Router
// ════════════════════════════════════════════════════

describe("share router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("createShortLink stores target URL with user + kind + expiry", async () => {
    mockPrismaInstance.shortLink.create.mockResolvedValue({
      code: "abc1234",
      targetUrl: "https://example.com/login?inviteCode=XYZ",
      expiresAt: null,
    });

    const caller = makeCaller(mockConsumer);
    const result = await caller.share.createShortLink({
      targetUrl: "https://example.com/login?inviteCode=XYZ",
      kind: "invite",
      expiresInDays: 90,
    });

    expect(result.code).toBe("abc1234");
    expect(mockPrismaInstance.shortLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          targetUrl: "https://example.com/login?inviteCode=XYZ",
          kind: "invite",
          userId: "user-1",
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it("createShortLink retries on unique-constraint collision", async () => {
    const collision = Object.assign(new Error("unique"), { code: "P2002" });
    mockPrismaInstance.shortLink.create
      .mockRejectedValueOnce(collision)
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({
        code: "succeed",
        targetUrl: "https://example.com",
        expiresAt: null,
      });

    const caller = makeCaller(mockConsumer);
    const result = await caller.share.createShortLink({
      targetUrl: "https://example.com",
    });

    expect(result.code).toBe("succeed");
    expect(mockPrismaInstance.shortLink.create).toHaveBeenCalledTimes(3);
  });

  it("createShortLink rejects invalid URL input", async () => {
    const caller = makeCaller(mockConsumer);
    await expect(
      caller.share.createShortLink({ targetUrl: "not-a-url" }),
    ).rejects.toThrow();
  });

  it("createShortLink without expiry stores null expiresAt", async () => {
    mockPrismaInstance.shortLink.create.mockResolvedValue({
      code: "noexp7",
      targetUrl: "https://example.com",
      expiresAt: null,
    });

    const caller = makeCaller(mockConsumer);
    await caller.share.createShortLink({
      targetUrl: "https://example.com",
    });

    expect(mockPrismaInstance.shortLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresAt: null }),
      }),
    );
  });

  it("listActivePosterTemplates filters by kind + isActive + sortOrder", async () => {
    const tpls = [
      { id: "t1", name: "节日邀请", headline: "一起省", subline: "", ctaText: "", bgGradient: "", accentColor: "#0EA5E9" },
    ];
    mockPrismaInstance.posterTemplate.findMany.mockResolvedValue(tpls);

    const caller = makeCaller(mockConsumer);
    const result = await caller.share.listActivePosterTemplates({ kind: "invite" });

    expect(result).toEqual(tpls);
    expect(mockPrismaInstance.posterTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, kind: "invite" },
        orderBy: { sortOrder: "asc" },
      }),
    );
  });

  it("listActivePosterTemplates defaults kind to 'invite'", async () => {
    mockPrismaInstance.posterTemplate.findMany.mockResolvedValue([]);

    const caller = makeCaller(mockConsumer);
    await caller.share.listActivePosterTemplates();

    expect(mockPrismaInstance.posterTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, kind: "invite" },
      }),
    );
  });

  it("recordInviteEvent stores SHARE_LINK with the user's invite code", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      inviteCode: "MYCODE",
    });

    const caller = makeCaller(mockConsumer);
    await caller.share.recordInviteEvent({ eventType: "SHARE_LINK" });

    expect(mockPrismaInstance.inviteEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: "user-1",
          eventType: "SHARE_LINK",
          inviteCode: "MYCODE",
        }),
      }),
    );
  });

  it("recordInviteEvent stores SHARE_IMAGE with null inviteCode if user has none", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({ inviteCode: null });

    const caller = makeCaller(mockConsumer);
    await caller.share.recordInviteEvent({ eventType: "SHARE_IMAGE" });

    expect(mockPrismaInstance.inviteEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "SHARE_IMAGE",
          inviteCode: null,
        }),
      }),
    );
  });

  it("recordInviteEvent rejects unknown event types", async () => {
    const caller = makeCaller(mockConsumer);
    await expect(
      // @ts-expect-error testing invalid input
      caller.share.recordInviteEvent({ eventType: "HACK" }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════
// Admin Invite Funnel
// ════════════════════════════════════════════════════

describe("admin.inviteFunnel", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("returns counts from real InviteEvent rows", async () => {
    mockPrismaInstance.user.count
      .mockResolvedValueOnce(1000) // totalUsers
      .mockResolvedValueOnce(800); // usersWithCode
    mockPrismaInstance.inviteEvent.count
      .mockResolvedValueOnce(120) // SHARE_LINK
      .mockResolvedValueOnce(40) // SHARE_IMAGE
      .mockResolvedValueOnce(220) // LINK_VISIT
      .mockResolvedValueOnce(75); // REGISTER
    mockPrismaInstance.inviteEvent.findMany.mockResolvedValue([
      { guestId: "g1" },
      { guestId: "g2" },
      { guestId: "g3" },
    ]);

    const caller = makeCaller(mockMerchant);
    const result = await caller.admin.inviteFunnel();

    expect(result).toMatchObject({
      totalUsers: 1000,
      usersWithCode: 800,
      shareEvents: 160,
      shareLinkEvents: 120,
      shareImageEvents: 40,
      linkVisitEvents: 220,
      registerEvents: 75,
      invitedWithOrders: 3,
    });
    expect(result.steps).toEqual([
      { label: "生成邀请码", value: 800 },
      { label: "分享次数", value: 160 },
      { label: "链接访问", value: 220 },
      { label: "被邀请注册", value: 75 },
      { label: "被邀请下单", value: 3 },
    ]);
  });

  it("requires merchant role", async () => {
    const caller = makeCaller(mockConsumer);
    await expect(caller.admin.inviteFunnel()).rejects.toThrow("仅商家可访问");
  });

  it("uses distinct guestId for invitedWithOrders", async () => {
    mockPrismaInstance.inviteEvent.findMany.mockResolvedValue([]);

    const caller = makeCaller(mockMerchant);
    await caller.admin.inviteFunnel();

    expect(mockPrismaInstance.inviteEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventType: "ORDER", guestId: { not: null } },
        distinct: ["guestId"],
      }),
    );
  });
});

// ════════════════════════════════════════════════════
// Guide Router (Redemption Guide)
// ════════════════════════════════════════════════════

describe("guide router", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("getActiveRedemption returns latest active row's public fields", async () => {
    mockPrismaInstance.redemptionGuide.findFirst.mockResolvedValue({
      id: "g1",
      headline: "积分可兑好礼",
      subline: "现在去看看",
      ctaText: "立即兑换",
      minPoints: 200,
      cooldownHours: 12,
      showFab: true,
    });

    const caller = makeCaller(mockConsumer);
    const result = await caller.guide.getActiveRedemption();

    expect(result).toMatchObject({
      headline: "积分可兑好礼",
      minPoints: 200,
      showFab: true,
    });
    expect(mockPrismaInstance.redemptionGuide.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
      }),
    );
  });

  it("getActiveRedemption returns null when no row exists", async () => {
    mockPrismaInstance.redemptionGuide.findFirst.mockResolvedValue(null);

    const caller = makeCaller(mockConsumer);
    const result = await caller.guide.getActiveRedemption();

    expect(result).toBeNull();
  });

  it("getActiveRedemption requires authentication", async () => {
    const caller = makeCaller(null);
    await expect(caller.guide.getActiveRedemption()).rejects.toThrow("请先登录");
  });
});

// ════════════════════════════════════════════════════
// Admin Redemption Guide CRUD
// ════════════════════════════════════════════════════

describe("admin.redemptionGuide CRUD", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("listRedemptionGuides returns rows ordered by updatedAt desc", async () => {
    const rows = [{ id: "g1", name: "默认" }];
    mockPrismaInstance.redemptionGuide.findMany.mockResolvedValue(rows);

    const caller = makeCaller(mockMerchant);
    const result = await caller.admin.listRedemptionGuides();

    expect(result).toEqual(rows);
    expect(mockPrismaInstance.redemptionGuide.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updatedAt: "desc" } }),
    );
  });

  it("upsertRedemptionGuide creates when no id", async () => {
    mockPrismaInstance.redemptionGuide.create.mockResolvedValue({ id: "new" });

    const caller = makeCaller(mockAdmin);
    await caller.admin.upsertRedemptionGuide({
      name: "春节",
      headline: "新年红包",
      subline: "",
      ctaText: "立即兑换",
      minPoints: 500,
      cooldownHours: 24,
      showFab: true,
      isActive: true,
    });

    expect(mockPrismaInstance.redemptionGuide.create).toHaveBeenCalled();
    expect(mockPrismaInstance.redemptionGuide.update).not.toHaveBeenCalled();
  });

  it("upsertRedemptionGuide updates when id provided", async () => {
    mockPrismaInstance.redemptionGuide.update.mockResolvedValue({ id: "g1" });

    const caller = makeCaller(mockAdmin);
    await caller.admin.upsertRedemptionGuide({
      id: "g1",
      name: "更新后",
      headline: "更新后的引导",
      subline: "",
      ctaText: "立即兑换",
      minPoints: 100,
      cooldownHours: 24,
      showFab: false,
      isActive: true,
    });

    expect(mockPrismaInstance.redemptionGuide.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "g1" } }),
    );
    expect(mockPrismaInstance.redemptionGuide.create).not.toHaveBeenCalled();
  });

  it("upsertRedemptionGuide requires admin role", async () => {
    const caller = makeCaller(mockMerchant);
    await expect(
      caller.admin.upsertRedemptionGuide({
        name: "x",
        headline: "x",
        subline: "",
        ctaText: "x",
        minPoints: 0,
        cooldownHours: 0,
        showFab: true,
        isActive: true,
      }),
    ).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════
// Agent Commission
// ════════════════════════════════════════════════════

const mockAgent = {
  id: "agent-1",
  email: "agent@example.com",
  name: "Agent",
  role: "AGENT" as const,
  points: 0,
  vipLevel: 0,
};

describe("agent router commissions", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("commissionSummary aggregates pending + paid + downline", async () => {
    mockPrismaInstance.agentCommission.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 123.45 }, _count: 5 })
      .mockResolvedValueOnce({ _sum: { amount: 678.9 }, _count: 12 });
    mockPrismaInstance.user.count.mockResolvedValue(8);

    const caller = makeCaller(mockAgent);
    const result = await caller.agent.commissionSummary();

    expect(result).toEqual({
      pendingAmount: 123.45,
      pendingCount: 5,
      paidAmount: 678.9,
      paidCount: 12,
      downlineCount: 8,
    });
  });

  it("commissionSummary handles null sum as zero", async () => {
    mockPrismaInstance.agentCommission.aggregate
      .mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 })
      .mockResolvedValueOnce({ _sum: { amount: null }, _count: 0 });
    mockPrismaInstance.user.count.mockResolvedValue(0);

    const caller = makeCaller(mockAgent);
    const result = await caller.agent.commissionSummary();

    expect(result.pendingAmount).toBe(0);
    expect(result.paidAmount).toBe(0);
  });

  it("myCommissions filters by status", async () => {
    mockPrismaInstance.agentCommission.findMany.mockResolvedValue([]);

    const caller = makeCaller(mockAgent);
    await caller.agent.myCommissions({ status: "PAID", limit: 50 });

    expect(mockPrismaInstance.agentCommission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId: "agent-1", status: "PAID" },
      }),
    );
  });

  it("myDownline lists users where parentAgentId matches", async () => {
    mockPrismaInstance.user.findMany.mockResolvedValue([
      { id: "u2", email: "x@y.com", role: "CONSUMER", createdAt: new Date() },
    ]);

    const caller = makeCaller(mockAgent);
    const result = await caller.agent.myDownline();

    expect(result).toHaveLength(1);
    expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentAgentId: "agent-1" },
      }),
    );
  });

  it("commissionSummary requires AGENT or ADMIN role", async () => {
    const caller = makeCaller(mockConsumer);
    await expect(caller.agent.commissionSummary()).rejects.toThrow("仅代理商可访问");
  });
});

describe("admin agent commission CRUD", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("getAgentCommissionConfig returns defaults when no row", async () => {
    mockPrismaInstance.agentCommissionConfig.findFirst.mockResolvedValue(null);

    const caller = makeCaller(mockMerchant);
    const result = await caller.admin.getAgentCommissionConfig();

    expect(result.level1Rate).toBe(0.1);
    expect(result.level2Rate).toBe(0.05);
    expect(result.maxLevels).toBe(2);
  });

  it("upsertAgentCommissionConfig creates when no id", async () => {
    mockPrismaInstance.agentCommissionConfig.create.mockResolvedValue({ id: "new" });

    const caller = makeCaller(mockAdmin);
    await caller.admin.upsertAgentCommissionConfig({
      level1Rate: 0.15,
      level2Rate: 0.05,
      level3Rate: 0,
      maxLevels: 2,
      isActive: true,
    });

    expect(mockPrismaInstance.agentCommissionConfig.create).toHaveBeenCalled();
  });

  it("markAgentCommissionPaid sets status PAID and paidAt", async () => {
    mockPrismaInstance.agentCommission.update.mockResolvedValue({});

    const caller = makeCaller(mockAdmin);
    await caller.admin.markAgentCommissionPaid({ id: "c1" });

    expect(mockPrismaInstance.agentCommission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({ status: "PAID" }),
      }),
    );
  });

  it("setUserParentAgent rejects setting self as parent", async () => {
    const caller = makeCaller(mockAdmin);
    await expect(
      caller.admin.setUserParentAgent({ userId: "u1", parentAgentId: "u1" }),
    ).rejects.toThrow("不能将自己设为上级代理");
  });

  it("listAgents includes pending+paid amounts per agent", async () => {
    mockPrismaInstance.user.findMany.mockResolvedValue([
      {
        id: "a1",
        name: "Agent 1",
        email: "a@a",
        createdAt: new Date(),
        parentAgentId: null,
        _count: { downline: 2, agentCommissions: 5 },
      },
    ]);
    mockPrismaInstance.user.count.mockResolvedValue(1);
    mockPrismaInstance.agentCommission.groupBy.mockResolvedValue([
      { agentId: "a1", status: "PENDING", _sum: { amount: 50 } },
      { agentId: "a1", status: "PAID", _sum: { amount: 200 } },
    ]);

    const caller = makeCaller(mockMerchant);
    const result = await caller.admin.listAgents();

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]).toMatchObject({
      pendingAmount: 50,
      paidAmount: 200,
    });
  });
});

// ════════════════════════════════════════════════════
// Device Fingerprint Risk
// ════════════════════════════════════════════════════

import {
  recordFingerprint,
  assertNotBlocked,
  readRiskHeaders,
} from "@/lib/device-risk";

describe("device-risk helpers", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("readRiskHeaders extracts and validates visitorId format", () => {
    const ok = new Headers({
      "x-visitor-id": "abc123def456",
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "Test",
    });
    expect(readRiskHeaders(ok)).toEqual({
      visitorId: "abc123def456",
      ipAddress: "1.2.3.4",
      userAgent: "Test",
    });
  });

  it("readRiskHeaders rejects malformed visitorId", () => {
    const bad = new Headers({ "x-visitor-id": "short" });
    expect(readRiskHeaders(bad).visitorId).toBeNull();

    const inj = new Headers({ "x-visitor-id": "a'; DROP TABLE--" });
    expect(readRiskHeaders(inj).visitorId).toBeNull();
  });

  it("recordFingerprint is a no-op when visitorId is null", async () => {
    const result = await recordFingerprint(
      mockPrismaInstance as never,
      "user-1",
      { visitorId: null, ipAddress: null, userAgent: null },
    );
    expect(result).toBeNull();
    expect(mockPrismaInstance.deviceFingerprint.upsert).not.toHaveBeenCalled();
  });

  it("recordFingerprint upserts and skips suspicion flag below threshold", async () => {
    mockPrismaInstance.deviceFingerprint.findMany.mockResolvedValue([
      { userId: "u1" },
      { userId: "u2" },
    ]);

    await recordFingerprint(
      mockPrismaInstance as never,
      "u1",
      { visitorId: "vis-aaaa-1234", ipAddress: "1.1.1.1", userAgent: "ua" },
    );

    expect(mockPrismaInstance.deviceFingerprint.upsert).toHaveBeenCalled();
    expect(mockPrismaInstance.deviceFingerprint.updateMany).not.toHaveBeenCalled();
  });

  it("recordFingerprint flags suspicious when distinct userIds > 3", async () => {
    mockPrismaInstance.deviceFingerprint.findMany.mockResolvedValue([
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
      { userId: "u4" },
      { userId: "u5" },
    ]);

    await recordFingerprint(
      mockPrismaInstance as never,
      "u5",
      { visitorId: "vis-bbbb-5678", ipAddress: null, userAgent: null },
    );

    expect(mockPrismaInstance.deviceFingerprint.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visitorId: "vis-bbbb-5678", suspicious: false },
        data: { suspicious: true },
      }),
    );
  });

  it("assertNotBlocked passes when no blocked row exists", async () => {
    mockPrismaInstance.deviceFingerprint.findFirst.mockResolvedValue(null);
    await expect(
      assertNotBlocked(mockPrismaInstance as never, {
        visitorId: "vis-ok-1234",
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
  });

  it("assertNotBlocked throws when visitorId has been blocked", async () => {
    mockPrismaInstance.deviceFingerprint.findFirst.mockResolvedValue({
      blockReason: "刷单",
    });
    await expect(
      assertNotBlocked(mockPrismaInstance as never, {
        visitorId: "vis-blocked-9999",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toThrow("当前设备已被风控限制");
  });

  it("assertNotBlocked is a no-op when visitorId is null", async () => {
    await expect(
      assertNotBlocked(mockPrismaInstance as never, {
        visitorId: null,
        ipAddress: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
    expect(mockPrismaInstance.deviceFingerprint.findFirst).not.toHaveBeenCalled();
  });
});

describe("admin device fingerprint CRUD", () => {
  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    vi.clearAllMocks();
  });

  it("listDeviceFingerprints filters by suspicious by default", async () => {
    mockPrismaInstance.deviceFingerprint.findMany.mockResolvedValue([]);
    mockPrismaInstance.deviceFingerprint.count.mockResolvedValue(0);

    const caller = makeCaller(mockMerchant);
    await caller.admin.listDeviceFingerprints();

    expect(mockPrismaInstance.deviceFingerprint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { suspicious: true } }),
    );
  });

  it("listDeviceFingerprints filter=blocked uses blockedAt criteria", async () => {
    mockPrismaInstance.deviceFingerprint.findMany.mockResolvedValue([]);
    mockPrismaInstance.deviceFingerprint.count.mockResolvedValue(0);

    const caller = makeCaller(mockMerchant);
    await caller.admin.listDeviceFingerprints({ filter: "blocked" });

    expect(mockPrismaInstance.deviceFingerprint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { blockedAt: { not: null } } }),
    );
  });

  it("blockDeviceFingerprint sets blockedAt + blockedBy + reason", async () => {
    mockPrismaInstance.deviceFingerprint.updateMany = vi.fn().mockResolvedValue({ count: 1 });

    const caller = makeCaller(mockAdmin);
    await caller.admin.blockDeviceFingerprint({
      visitorId: "vis-block-test",
      reason: "测试封禁",
    });

    expect(mockPrismaInstance.deviceFingerprint.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visitorId: "vis-block-test" },
        data: expect.objectContaining({
          blockedBy: "admin-1",
          blockReason: "测试封禁",
        }),
      }),
    );
  });

  it("unblockDeviceFingerprint clears block fields and suspicion", async () => {
    mockPrismaInstance.deviceFingerprint.updateMany = vi.fn().mockResolvedValue({ count: 1 });

    const caller = makeCaller(mockAdmin);
    await caller.admin.unblockDeviceFingerprint({ visitorId: "vis-unblock" });

    expect(mockPrismaInstance.deviceFingerprint.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockedAt: null,
          blockReason: null,
          suspicious: false,
        }),
      }),
    );
  });

  it("blockDeviceFingerprint requires admin role", async () => {
    const caller = makeCaller(mockMerchant);
    await expect(
      caller.admin.blockDeviceFingerprint({ visitorId: "x" }),
    ).rejects.toThrow();
  });
});
