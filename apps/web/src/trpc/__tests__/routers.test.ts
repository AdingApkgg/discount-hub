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

    expect(result).toEqual(products);
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
      JSON.stringify(products),
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

    expect(result).toEqual(product);
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

    expect(result).toEqual(products);
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
    const orders = [{ id: "o1", userId: "user-1" }];
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
    const orders = [{ id: "o1" }, { id: "o2" }];
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

  it("getStatus caps nextDayIndex at 4", async () => {
    mockPrismaInstance.user.findUnique.mockResolvedValue({ points: 100, vipLevel: 0 });
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "ch1", dayIndex: 4, checkedAt: yesterdayDate() });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.getStatus();

    expect(result.nextDayIndex).toBe(4);
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

  it("checkin caps at day 4 and gives 500 points", async () => {
    mockPrismaInstance.checkin.findFirst
      .mockResolvedValueOnce(null) // existing today check
      .mockResolvedValueOnce({ id: "ch-prev", dayIndex: 4, checkedAt: yesterdayDate() });
    mockPrismaInstance.checkin.create.mockResolvedValue({});
    mockPrismaInstance.user.update.mockResolvedValue({ points: 5500 });

    const caller = makeCaller(mockConsumer);
    const result = await caller.points.checkin();

    expect(result.dayIndex).toBe(4);
    expect(result.reward).toBe(500);
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
    mockPrismaInstance.taskCompletion.findFirst.mockResolvedValue({
      id: "tc1",
    });

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
        data: { points: { increment: 100 } },
      }),
    );
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

    const caller = makeCaller(mockConsumer);
    const result = await caller.user.me();

    expect(result).toEqual(profile);
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
      _sum: { cashPaid: { toNumber: () => 1234.5 } },
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
