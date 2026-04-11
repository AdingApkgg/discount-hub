# 折扣权益平台 — 生产项目 Prompt

> 基于 `demo/` 原型和 `drawing/一级页面（首页_会员_我的）.pdf` 设计稿提炼，可直接喂给 AI 生成生产级代码。

---

## 一、技术栈约束

| 层 | 选型 | 版本 | 关键注意 |
|---|------|------|---------|
| 框架 | Next.js | 16 | App Router only；`params` 是 Promise，需 `use(params)` 或 `await params` |
| UI 库 | React | 19 | `use()` hook 解包 Promise |
| 类型 | TypeScript | 6 | `moduleResolution: "bundler"` |
| API | tRPC | v11 | `@trpc/tanstack-react-query` → `createTRPCContext`, `useTRPC`；`@trpc/client` → `httpBatchLink` |
| 查询 | TanStack Query | 5 | `useQuery(trpc.xxx.queryOptions())` |
| ORM | Prisma | 7 | `prisma.config.ts` 传 datasource.url；output → `src/generated/prisma` |
| 校验 | Zod | 4 | — |
| CSS | Tailwind CSS | 4 | `@import "tailwindcss"`；`@theme inline {}` |
| 认证 | Better Auth | 1.5+ | 服务端 `auth.api.getSession`；客户端 `useSession` |
| 组件 | shadcn/ui | — | Card, Badge, Button, Dialog, Tabs, Progress, Avatar, Input, Separator 等 |
| 状态 | Zustand | — | persist middleware |
| 缓存 | ioredis | — | tRPC context 中做 rate-limit |
| Toast | Sonner | — | `toast.success` / `toast.error` |
| 图标 | Lucide React | — | 全部用 lucide 图标 |
| 包管理 | pnpm + Turbo | — | monorepo；`@discount-hub/shared` workspace 包 |

### 禁止的过时写法

- ❌ `schema.prisma` datasource 里写 `url = env("DATABASE_URL")`
- ❌ `createTRPCReact`（v10 已废弃）
- ❌ 从 `@trpc/tanstack-react-query` 导入 `httpBatchLink`
- ❌ `trpc.xxx.useQuery()`
- ❌ Pages Router (`pages/` 目录)
- ❌ `@tailwind base/components/utilities`
- ❌ `tailwind.config.js`

---

## 二、全局设计语言

```
- 明亮简洁风格，主色调 slate / white
- CSS 变量驱动：--app-card, --app-card-border, --app-card-shadow, --app-hero-bg 等
- 卡片圆角：外层 rounded-[28px]~rounded-[30px]，嵌套 rounded-[22px]~rounded-[24px]
- Hero 区域：深色背景 (slate-900) + 径向渐变覆盖 + 白色文字
- 正文区域：白色背景 + slate-200 边框 + slate-50 次背景色
- Loading：统一 Loader2 spinner（来自 lucide-react）
- 空状态：圆角虚线边框 + 居中提示文字
- 按钮：rounded-full，主操作用 default variant，次操作用 outline
```

### 导航

- **桌面端**：顶部 sticky header，Logo + 四个 tab 按钮（pill 样式）
- **移动端**：底部固定浮岛式 tab bar（rounded-[28px]）
- **四个 Tab**：首页 `Home` / 券包 `Ticket` / 会员 `CreditCard` / 我的 `User`
- 未登录时 "我的" tab 变为 "登录" `LogIn`

---

## 三、数据模型（Prisma Schema）

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role       { CONSUMER  MERCHANT  ADMIN }
enum ProductStatus { ACTIVE  INACTIVE  SOLD_OUT }
enum OrderStatus   { PENDING  PAID  COMPLETED  CANCELLED  REFUNDED }
enum CouponStatus  { ACTIVE  USED  EXPIRED }

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  phone         String?
  image         String?
  role          Role      @default(CONSUMER)
  points        Int       @default(0)
  vipLevel      Int       @default(0)
  inviteCode    String?   @unique
  invitedById   String?
  invitedBy     User?     @relation("Referral", fields: [invitedById], references: [id])
  referrals     User[]    @relation("Referral")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions        Session[]
  accounts        Account[]
  orders          Order[]
  coupons         Coupon[]
  checkins        Checkin[]
  taskCompletions TaskCompletion[]
  verifications   VerificationRecord[] @relation("VerifiedBy")

  @@map("users")
}

model Product {
  id              String        @id @default(cuid())
  app             String        // "抖音"
  title           String
  subtitle        String
  description     String
  category        String        // "limited" | "today" | "zero"
  pointsPrice     Int
  cashPrice       Decimal       @db.Decimal(10, 2)
  originalPrice   Decimal?      @db.Decimal(10, 2)
  stock           Int           @default(0)
  tags            String[]
  expiresAt       DateTime?
  status          ProductStatus @default(ACTIVE)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  orders  Order[]
  coupons Coupon[]

  @@map("products")
}

model Order {
  id         String      @id @default(cuid())
  userId     String
  productId  String
  pointsPaid Int
  cashPaid   Decimal     @db.Decimal(10, 2)
  status     OrderStatus @default(PENDING)
  paidAt     DateTime?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  user    User    @relation(fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id])
  coupon  Coupon?

  @@map("orders")
}

model Coupon {
  id        String       @id @default(cuid())
  code      String       @unique
  userId    String
  orderId   String       @unique
  productId String
  status    CouponStatus @default(ACTIVE)
  expiresAt DateTime
  createdAt DateTime     @default(now())

  user    User    @relation(fields: [userId], references: [id])
  order   Order   @relation(fields: [orderId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  verifications VerificationRecord[]

  @@map("coupons")
}

model Checkin {
  id       String   @id @default(cuid())
  userId   String
  dayIndex Int      // 连续签到第几天 (1-4)
  reward   Int      // 该次签到获得的积分
  date     DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("checkins")
}

model TaskCompletion {
  id     String   @id @default(cuid())
  userId String
  taskId String   // "browse" | "purchase" | "share" | content id
  reward Int
  date   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("task_completions")
}

model VerificationRecord {
  id         String   @id @default(cuid())
  couponId   String
  verifiedBy String
  verifiedAt DateTime @default(now())

  coupon   Coupon @relation(fields: [couponId], references: [id])
  verifier User   @relation("VerifiedBy", fields: [verifiedBy], references: [id])

  @@map("verification_records")
}
```

---

## 四、tRPC Router 设计

```
appRouter
├── product
│   ├── list(category?: "limited"|"today"|"zero")  → Product[]       [公开, IP 限流 60/min]
│   ├── byId(id: string)                           → Product         [公开]
│   ├── manageList()                                → Product[]       [商户]
│   ├── create(input)                               → Product         [商户]
│   ├── update(id, input)                           → Product         [商户]
│   └── delete(id)                                  → void            [商户]
│
├── order
│   ├── purchase(productId)                         → Order + Coupon  [需登录, 扣积分+创建订单+生成券码]
│   ├── completePayment(orderId, provider, txHash?) → Order           [需登录]
│   ├── cancel(orderId)                             → Order           [需登录]
│   ├── myOrders()                                  → Order[]         [需登录, 含 product + coupon]
│   ├── allOrders()                                 → Order[]         [商户]
│   └── refund(orderId)                             → Order           [商户]
│
├── points
│   ├── getStatus()      → { points, checkedInToday, nextDayIndex, todayTasks[] }  [需登录]
│   ├── checkin()         → { ok, dayIndex, reward, points }                        [需登录]
│   └── completeTask(taskId) → { reward, points }                                  [需登录]
│
├── user
│   ├── me()             → User + _count{orders, coupons, referrals}  [需登录]
│   ├── updateProfile(name?, phone?)                                   [需登录]
│   ├── myCoupons()      → Coupon[] (含 product)                      [需登录]
│   ├── referrals()      → User[] (被邀请人)                          [需登录]
│   └── dashboardStats() → { totalOrders, totalRevenue, ... }         [商户]
│
└── verify
    ├── verifyCoupon(code) → VerificationRecord  [商户]
    └── recentRecords()    → VerificationRecord[]  [商户]
```

### tRPC 上下文

```typescript
// trpc/init.ts
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({ headers: opts.headers });
  return { prisma, redis, session, user: session?.user ?? null, headers: opts.headers };
};

// 四级 procedure
publicProcedure      // IP 限流 60 req/60s
protectedProcedure   // 需登录 + user 限流 30 req/60s
merchantProcedure    // role = MERCHANT | ADMIN
sensitiveProcedure   // 更严格限流
```

### 签到奖励规则

```
连续签到天数 → 积分奖励：
  第 1 天 → 200
  第 2 天 → 3000
  第 3 天 → 300
  第 4 天 → 500
断签重置为第 1 天。
```

### VIP 等级体系

```
VIP0 (普通会员)  →   0+ 积分  → 基础兑换
VIP1            → 200+ 积分  → 基础兑换, 每日签到 +200
VIP2            → 500+ 积分  → 全部 VIP1, 限时折扣
VIP3            → 1200+ 积分 → 全部 VIP2, 优先购资格, 专属折扣
VIP4            → 2000+ 积分 → 全部 VIP3, 抢先看, 双倍积分日
```

### 日常任务

```
| ID       | 标题              | 奖励  | 触发方式               |
|----------|-------------------|-------|----------------------|
| checkin  | 每日签到           | 200   | 调用 checkin mutation |
| browse   | 浏览抖音 50 秒     | 100   | openApp + completeTask |
| purchase | 完成一次兑换       | 100   | 须今日有 PAID 订单     |
| share    | 分享权益到好友      | 80    | clipboard + completeTask |
```

---

## 五、页面详细规格

### 5.1 首页 `/`

**文件**: `app/(consumer)/page.tsx` — `"use client"`

**数据**:
- `trpc.product.list({ category: "limited" })` → 限时神券
- `trpc.product.list({ category: "today" })`   → 今日值得兑
- `trpc.product.list({ category: "zero" })`    → 0 元兑
- `trpc.user.me` → 会员等级、积分、券包数
- 静态 mock：`banners[]`, `hotPosts[]`, `hotRanking[]`

**布局**（从上到下）:

#### 1) 顶部标题区

```
┌─────────────────────────────────────────┐
│ [小字] Discount Hub                  [VIP3 按钮→/member] │
│ [大字] 今日精选                                         │
└─────────────────────────────────────────┘
```

#### 2) Hero Banner + 快捷入口 (`xl:grid-cols-[1.45fr_0.95fr]`)

```
┌──────────────────────────┬──────────────────┐
│  Banner 轮播 (深色30px圆角)│  搜索条 →/coupons │
│  · 标题/副标题/CTA按钮     │  ┌────┬────┐    │
│  · 9秒自动切换             │  │会员 │券包 │    │
│  · 底部 3 格统计：         │  │任务 │     │    │
│    会员等级/积分/券包数量    │  ├────┼────┤    │
│                           │  │邀请 │账户 │    │
│                           │  │有礼 │资料 │    │
│                           │  └────┴────┘    │
└──────────────────────────┴──────────────────┘
```

#### 3) 限时神券区

```
标题: "限时神券" + 副标题 + Countdown(6h)
布局: 横向滚动(移动) / grid-cols-2~4(桌面)
卡片:
  ┌──────────────────────┐
  │ [深色渐变头部]         │
  │  Badge(app) ... Tag   │
  │  标题(白色大字)        │
  ├──────────────────────┤
  │ 副标题                │
  │ 兑换价                │
  │ 300积分 + ¥10.00      │
  │ 库存 9    去兑换       │
  └──────────────────────┘
  点击 → /scroll/[id]
```

#### 4) 今日值得兑区 — 同上卡片样式

#### 5) 0 元兑专区 — 同上卡片样式

#### 6) 底部双栏 (`xl:grid-cols-[1.2fr_360px]`)

```
┌─────────────────────┬──────────────┐
│  福利攻略 (hotPosts) │ 热门兑换榜    │
│  · 标题+摘要+app tag │  TOP 5 列表   │
│  · 每条可点击        │  排名+名称+热度│
└─────────────────────┴──────────────┘
```

---

### 5.2 会员中心 `/member`

**文件**: `app/(consumer)/member/page.tsx` — `"use client"`

**数据**:
- `trpc.points.getStatus()` → 签到状态、已完成任务列表
- `trpc.user.me()` → 积分、VIP 等级
- `trpc.order.myOrders()` → 判断今日是否有已付款订单
- `trpc.points.checkin` mutation
- `trpc.points.completeTask` mutation
- 静态 mock：`earnContents[]`

**布局**:

#### 1) 顶部标题区

```
[小字] Member Center            [VIP 等级] Dialog 按钮
[大字] 会员中心
```

#### 2) Hero 会员卡 + 侧边统计 (`xl:grid-cols-[1.35fr_0.95fr]`)

```
┌────────────────────────┬─────────────────┐
│ [深色 Hero 卡片]         │ 连续签到: 2 天   │
│  当前等级  VIP3          │ 今日任务: 2/4    │
│  当前积分  1,280         │ 当前等级: VIP3   │
│  ┌──────────────────┐   │ 距离升级: 720 分  │
│  │ 进度条 → VIP4     │   │                 │
│  │ 权益 badges       │   │                 │
│  └──────────────────┘   │                 │
└────────────────────────┴─────────────────┘
```

#### 3) 连续签到区

```
标题: "连续签到" + 副标题 + [立即签到] 按钮

┌─────┬─────┬─────┬─────┐
│第1天 │第2天 │第3天 │第4天 │
│+200  │+3000│+300 │+500 │
│  ✓   │  ✓  │  ✫  │  ✫  │
└─────┴─────┴─────┴─────┘
已完成=深色背景  未完成=浅色
```

#### 4) 日常任务 + 看内容赚积分 (`xl:grid-cols-[1.15fr_0.85fr]`)

```
┌─────────────────────────┬──────────────────┐
│ 日常积分任务              │ 看内容赚积分      │
│ ┌───────────────────┐   │ ┌──────────────┐ │
│ │ 📅 每日签到         │   │ │[深色Play图]   │ │
│ │ 每日首次签到 +200   │   │ │ 标题          │ │
│ │            [已完成] │   │ │ app   +30积分 │ │
│ ├───────────────────┤   │ └──────────────┘ │
│ │ 👁 浏览抖音 50秒    │   │ ┌──────────────┐ │
│ │ +100      [去完成]  │   │ │ ...          │ │
│ ├───────────────────┤   │ └──────────────┘ │
│ │ 🛒 完成一次兑换     │   │                  │
│ │ +100      [去兑换]  │   │                  │
│ ├───────────────────┤   │                  │
│ │ 📤 分享权益到好友   │   │                  │
│ │ +80       [去完成]  │   │                  │
│ └───────────────────┘   │                  │
└─────────────────────────┴──────────────────┘
```

#### 5) VIP 等级弹窗 (Dialog)

```
DialogTitle: "VIP 等级体系"
逐级展示 VIP0~VIP4 卡片:
  当前等级 → 深色背景 + "当前等级" Badge
  其他等级 → 浅色背景
  每级: 名称 / 所需积分 / 权益 badges
```

---

### 5.3 我的 `/profile`

**文件**: `app/(consumer)/profile/page.tsx` — `"use client"`

**数据**:
- `trpc.user.me()` → 用户资料 + `_count{orders, coupons, referrals}`
- `trpc.user.referrals()` → 邀请记录列表
- `trpc.order.myOrders()` → 订单历史
- `trpc.user.updateProfile` mutation
- `signOut()` 来自 `@/lib/auth-client`
- 静态 mock：`inviteBenefits[]`

**布局**:

#### 1) 顶部标题区

```
[小字] Profile                   [复制邀请] 按钮
[大字] 我的
```

#### 2) Hero 用户卡 + 侧边统计 (`xl:grid-cols-[1.2fr_320px]`)

```
┌────────────────────────────┬──────────┐
│ [深色 Hero 卡]               │ 累计邀请 │
│  Avatar(首字母) + 用户名      │    3    │
│  VIP3 badge · 1,280 积分     │ 累计订单 │
│              [去赚积分→/member]│    5    │
│                              │ 我的券包 │
│                              │    2    │
└────────────────────────────┴──────────┘
```

#### 3) 邀请好友 + 邀请记录 (`xl:grid-cols-[1.1fr_0.9fr]`)

```
┌────────────────────────────┬──────────────────────┐
│ 邀请好友                     │ 邀请记录              │
│ ┌───────────┬────────────┐ │ · 用户名 + 注册时间   │
│ │ 邀请码      │ 邀请链接    │ │   [已注册] badge     │
│ │ JZ8K-2F9Q  │ https://.. │ │ · ...               │
│ └───────────┴────────────┘ │ 空状态: "还没有邀请记录"│
│ badges: 积分优惠券/抖音钻石.. │                      │
│              [立即邀请] 按钮  │                      │
└────────────────────────────┴──────────────────────┘
```

#### 4) 订单记录

```
最近 5 条:
┌──────────────────────────────────────┐
│ 📦 通用八折卷              [已付款]    │
│    抖音 · 2026/4/10 14:30            │
│    300 积分 + ¥10.00    券码: COUP... │
├──────────────────────────────────────┤
│ ...                                  │
└──────────────────────────────────────┘
超过 5 条显示 "仅展示最近 5 条，共 N 条订单"
```

#### 5) 资料编辑 + 账户信息 (`xl:grid-cols-[0.95fr_1.05fr]`)

```
┌────────────────────┬──────────────────────┐
│ 资料编辑            │ 账户信息              │
│  昵称: [Input]      │  📧 邮箱: xxx@xx.com │
│  手机号: [Input]     │  📱 手机号: 未设置    │
│  [保存资料] 按钮     ├──────────────────────┤
│                    │ 菜单列表              │
│                    │  ⚙ 账户设置    >      │
│                    │  🔔 消息通知    >      │
│                    │  ❓ 帮助中心    >      │
│                    │  📄 服务条款    >      │
└────────────────────┴──────────────────────┘
```

#### 6) 退出登录

```
红色系按钮，全宽 rounded-2xl
调用 signOut() → 跳转 /login → toast "已退出登录"
```

#### 7) 版本号

```
居中灰色小字: "版本 1.0.0"
```

---

## 六、辅助页面

### 6.1 券包页 `/coupons`

- Tabs 过滤: 全部 / 未使用 / 已使用 / 已过期
- 券码卡片: Ticket 图标 + 标题 + app + 有效期 + 券码 + 操作按钮
- 点击卡片弹出 Dialog: 券码详情 + FakeQr + 复制券码 / 立即使用
- 数据: `trpc.user.myCoupons()`

### 6.2 商品详情 `/scroll/[id]`

- 数据: `trpc.product.byId(id)`
- 展示: 商品信息 + 购买按钮 → PurchaseFlowDialog
- PurchaseFlowDialog: 多步骤 (确认→支付→完成→券码展示)

### 6.3 登录 `/login`

- Better Auth email/password
- 支持 inviteCode query param 绑定邀请关系

---

## 七、商户端页面 (`/dashboard`, `/products`, `/orders`, `/verify`, `/settings`)

路由组 `(merchant)` — layout.tsx 做服务端 session 校验，需 `MERCHANT` 或 `ADMIN` 角色。

| 页面 | 功能 |
|------|------|
| `/dashboard` | 数据看板: 总订单/总收入/活跃用户/今日签到 |
| `/products` | 商品 CRUD: 表格列表 + 创建/编辑 Dialog |
| `/orders` | 订单管理: 筛选/搜索/退款操作 |
| `/verify` | 券码核销: 输入券码 → 验证 → 记录 |
| `/settings` | 店铺设置: 基础信息编辑 |

---

## 八、静态 Mock 数据

以下数据作为 Banner / 攻略 / 榜单的静态展示，不走数据库：

```typescript
// data/mock.ts

export const banners: BannerItem[] = [
  { id: "b1", title: "今晚 20:00 限时神卷上新", subtitle: "诱惑优惠，先到先得", cta: "立刻开抢", scrollId: "s-douyin-8off" },
  { id: "b2", title: "新用户首充礼", subtitle: "满减券叠加，最高立省 100", cta: "查看推荐", scrollId: "s-douyin-first-topup" },
  { id: "b3", title: "0 元兑专区", subtitle: "积分即兑，秒到账", cta: "去逛逛", scrollId: "s-douyin-1000-diamond" },
];

export const hotPosts = [
  { id: "p1", title: "今天刷到的隐藏福利，真的香", excerpt: "限时神卷叠加后到手价太离谱了…", likeText: "2.4w", app: "抖音" },
  { id: "p2", title: "0 元兑专区怎么用最划算", excerpt: "签到拿积分，三天就能换到钻石包。", likeText: "1.1w", app: "抖音" },
  { id: "p3", title: "今日值得兑：首充礼的正确打开方式", excerpt: "别直接买，先领券再叠加，立省更多。", likeText: "8.7k", app: "抖音" },
];

export const hotRanking = [
  { rank: 1, name: "抖音 VIP 周卡", hot: "热度 98" },
  { rank: 2, name: "抖音 VIP 年卡", hot: "热度 95" },
  { rank: 3, name: "通用八折卷", hot: "热度 92" },
  { rank: 4, name: "新用户首充礼", hot: "热度 88" },
  { rank: 5, name: "1000 钻石", hot: "热度 84" },
];

export const inviteBenefits = ["积分优惠券", "抖音钻石", "限时神卷优先购资格", "专属折扣加成"];

export const earnContents: EarnContentItem[] = [
  { id: "c1", title: "你养龙虾了吗？openclaw 爆火出圈", subtitle: "去抖音观看", app: "抖音", rewardPoints: 30 },
  { id: "c2", title: "三分钟看懂：限时神卷叠加玩法", subtitle: "去抖音观看", app: "抖音", rewardPoints: 30 },
  { id: "c3", title: "新用户首充礼到底值不值？", subtitle: "去抖音观看", app: "抖音", rewardPoints: 40 },
  { id: "c4", title: "0 元兑专区隐藏福利：连续签到 4 天直接起飞", subtitle: "去抖音观看", app: "抖音", rewardPoints: 50 },
];
```

---

## 九、关键交互流程

### 购买流程

```
用户点击商品 → /scroll/[id] → 点击"立即兑换"
→ PurchaseFlowDialog 弹出
  Step 1: 确认商品信息 + 积分/现金价格
  Step 2: 选择支付方式 (Stripe/PayPal/USDT 等)
  Step 3: 调用 trpc.order.purchase → 扣积分 + 创建订单
  Step 4: 完成 → 展示券码 + FakeQr
→ 券码自动进入"券包"
→ 触发 window.dispatchEvent("jz:purchaseSuccess") → 会员页任务自动检查
```

### 签到流程

```
会员页点击"立即签到"
→ trpc.points.checkin mutation
→ 服务端判断：今日是否已签到 / 是否连续 / dayIndex 计算
→ 返回 { ok, dayIndex, reward, points }
→ 客户端 toast + invalidateQueries 刷新
```

### 券码核销（商户端）

```
商户输入券码 → trpc.verify.verifyCoupon
→ 校验: coupon.status === ACTIVE + 未过期
→ 更新 coupon.status = USED
→ 创建 VerificationRecord
→ 返回核销结果
```

---

## 十、目录结构

```
apps/web/src/
├── app/
│   ├── layout.tsx              # 全局 layout (fonts, metadata, Providers)
│   ├── globals.css             # Tailwind + CSS 变量
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (consumer)/
│   │   ├── layout.tsx          # ConsumerNav + main 容器
│   │   ├── loading.tsx
│   │   ├── page.tsx            # 首页
│   │   ├── coupons/page.tsx    # 券包
│   │   ├── member/page.tsx     # 会员中心
│   │   ├── profile/page.tsx    # 我的
│   │   └── scroll/[id]/page.tsx # 商品详情
│   ├── (merchant)/
│   │   ├── layout.tsx          # 服务端 role 校验 + MerchantShell
│   │   ├── dashboard/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── products/page.tsx
│   │   ├── settings/page.tsx
│   │   └── verify/page.tsx
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── trpc/[trpc]/route.ts
│       └── payments/notify/[provider]/route.ts
├── components/
│   ├── providers.tsx           # TRPCReactProvider + ThemeProvider + Sonner
│   ├── ConsumerNav.tsx         # 消费者导航 (桌面顶栏 + 移动底栏)
│   ├── MerchantShell.tsx       # 商户端侧边栏 shell
│   ├── Countdown.tsx
│   ├── FakeQr.tsx
│   ├── PurchaseFlowDialog.tsx
│   └── ui/                    # shadcn/ui 组件
├── data/
│   └── mock.ts                # 静态 mock 数据
├── lib/
│   ├── auth.ts                # Better Auth 服务端配置
│   ├── auth-client.ts         # Better Auth 客户端
│   ├── prisma.ts              # PrismaClient + pg adapter
│   ├── redis.ts
│   ├── rate-limit.ts
│   ├── utils.ts               # cn() 等工具
│   └── payment/               # 支付抽象层
├── stores/
│   └── user.ts                # Zustand store
├── trpc/
│   ├── init.ts                # context + procedures
│   ├── client.tsx             # 客户端 tRPC provider
│   ├── server.tsx             # 服务端 tRPC (RSC)
│   ├── types.ts               # RouterOutputs 类型导出
│   ├── query-client.ts
│   └── routers/
│       ├── _app.ts
│       ├── product.ts
│       ├── order.ts
│       ├── verify.ts
│       ├── points.ts
│       └── user.ts
└── generated/prisma/          # Prisma 生成的客户端
```

---

## 十一、设计稿补充：完整购买流程（6 个屏幕）

> 来自线框稿 Row 1 右半部分，覆盖从商品详情到支付成功/失败的完整链路。

### 11.1 商品详情页 `/scroll/[id]`

```
┌─────────────────────────────┐
│ ← 返回                      │
│                             │
│  [cover 图片占位]            │
│                             │
│  抖音平台                    │
│  通用8折券                   │
│                             │
│  倒计时: 6:30:59 秒后失效     │
│                             │
│  抖音平台折扣直充30折优惠，    │
│  仅可、月卡、年卡、享卡       │
│  全品类，用于全品牌30折码     │
│                             │
│  300积分+¥10元  ¥90元(划线)   │
│                             │
│  ─── 规格说明 ───            │
│  50元起                     │
│  10件起买                    │
│                             │
│  ─── 购买须知 ───            │
│  1.购买方式：在x-pass平台操作  │
│  2.进入到该平台充值页面-新增   │
│    绑定手机号进行充值操作，    │
│    核销成功后                 │
│  3.每人限购一张               │
│                             │
│  ┌───────────────────────┐  │
│  │       立即购买          │  │
│  └───────────────────────┘  │
│                             │
│  购买数量  [+] 50 [-]       │
└─────────────────────────────┘
```

**关键字段**:
- `product.title` / `product.app` / `product.description`
- 倒计时基于 `product.expiresAt`
- 价格展示: `pointsPrice` 积分 + `cashPrice` 元，原价 `originalPrice` 划线
- 规格说明: `minAmount`（50元起）、`minQuantity`（10件起买）
- 购买须知: `product.purchaseNotes` 富文本/数组
- 底部固定「立即购买」按钮 + 数量选择器

### 11.2 订单确认页（购买弹窗 Step 1）

```
┌─────────────────────────────┐
│         抖音平台通用8折券      │
│                             │
│  购买数量          ×1        │
│  订单价格          ¥10       │
│  消耗积分          300       │
│                             │
│  ─── 选择支付方式 ───        │
│                             │
│  ● 支付宝                   │
│  ○ 微信支付                  │
│  ○ PayPay                   │
│  ○ 银联卡                    │
│                             │
│  ┌───────────────────────┐  │
│  │       立即支付          │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**关键交互**:
- 展示: 商品名、购买数量、订单价格（现金部分）、消耗积分
- 支付方式 radio：支付宝 / 微信支付 / PayPay / 银联卡
- 点击「立即支付」→ 调用 `trpc.order.purchase` → 跳转待支付或直接完成

### 11.3 待支付页

```
┌─────────────────────────────┐
│           待支付              │
│  请在30分钟内完成支付          │
│                             │
│  ┌─────────────────────┐    │
│  │  通用8折券            │    │
│  │  抖音平台通用8折券     │    │
│  └─────────────────────┘    │
│                             │
│  购买数量          ×1        │
│  订单价格          ¥10       │
│  消耗积分          300       │
│                             │
│  订单时间   2026.03.11 13:22 │
│  流水号     128768393777728  │
│  订单号     1XP76839         │
│                             │
│  ┌───────────────────────┐  │
│  │       立即支付          │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**关键字段**:
- 30 分钟支付倒计时（超时自动取消订单）
- 展示订单号 `order.id`、流水号、创建时间
- 底部重新发起支付按钮

### 11.4 支付成功页

```
┌─────────────────────────────┐
│         支付成功              │
│                             │
│  抖音平台通用8折券            │
│  ┌──────────────┐  实付 ¥10  │
│  │  通用8折券     │  消耗积分 300│
│  └──────────────┘  ×1       │
│                             │
│  ┌──────────────────────┐   │
│  │                      │   │
│  │     [QR Code 二维码]   │   │
│  │                      │   │
│  └──────────────────────┘   │
│                             │
│  券码: XP1233888  [复制]     │
│  3.20号到期                  │
│                             │
│  ┌───────────────────────┐  │
│  │     打开APP使用         │  │
│  └───────────────────────┘  │
│                             │
│  订单时间   2026.03.11 13:22 │
│  流水号     128768393777728  │
│  订单号     1XP76839         │
│                             │
│  ─── 使用须知 ───            │
│  该券一经出售不可退款，        │
│  券码具有有效期限             │
└─────────────────────────────┘
```

**关键交互**:
- 展示实付金额、消耗积分、购买数量
- **QR 码**：基于 `coupon.code` 生成（FakeQr 组件）
- **券码**：可复制到剪贴板
- **到期时间**：`coupon.expiresAt`
- 「打开APP使用」→ 调用 `openApp(product.app)` 跳转对应平台
- 使用须知：固定文案 "该券一经出售不可退款，券码具有有效期限"

### 11.5 支付失败页

```
┌─────────────────────────────┐
│           待支付              │
│  请在30分钟内完成支付          │
│                             │
│                             │
│         兑换失败              │
│                             │
│     积分余额不足扣款失败       │
│                             │
│                             │
│                             │
└─────────────────────────────┘
```

**异常状态枚举**:
- `INSUFFICIENT_POINTS` — 积分余额不足扣款失败
- `STOCK_EXHAUSTED` — 库存不足
- `PAYMENT_TIMEOUT` — 支付超时（30分钟）
- `PAYMENT_FAILED` — 第三方支付失败
- 失败后可返回重试或取消订单

### 11.6 订单详情页（从券包/订单列表进入）

```
┌─────────────────────────────┐
│ ← 返回                      │
│                             │
│  通用8折券                   │
│  抖音平台通用8折券            │
│                             │
│  购买数量          ×1        │
│  消耗积分          300       │
│                             │
│  ─── 使用须知 ───            │
│  ...                        │
└─────────────────────────────┘
```

---

## 十二、设计稿补充：帖子/内容详情页（小红书风格）

> 来自线框稿 Row 2 上方 — 帖子卡片点击后的详情页。

### 12.1 帖子详情页 `/post/[id]`

```
┌─────────────────────────────┐
│ ← 返回                 1/3  │
│                             │
│  [帖子封面大图，支持多图轮播]  │
│                             │
│  这是一篇帖子的标题            │
│  字数限制40个字可支持换行      │
│  1行                        │
│                             │
│  1.如需充值请联系下 联系需至   │
│    https://baidu.com 站内联系│
│    并发起充值操作              │
│                             │
├─────────────────────────────┤
│  输入你的想法              🔗 │
│               分享  收藏  评论 │
└─────────────────────────────┘
```

**功能点**:
- 多图轮播（`1/3` 页码指示器）
- 标题 + 正文（限制字数 / 支持换行）
- 底部固定栏：评论输入框 + 分享/收藏/评论 三个操作图标
- 数据模型需要新增 `Post` 模型（见下方补充）

### 12.2 新增数据模型

```prisma
model Post {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   @db.Text
  images    String[] // 多图 URL 数组
  likeCount Int      @default(0)
  app       String?  // 关联的 app 平台
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id])
  comments Comment[]

  @@map("posts")
}

model Comment {
  id        String   @id @default(cuid())
  postId    String
  userId    String
  content   String   @db.VarChar(200)
  createdAt DateTime @default(now())

  post Post @relation(fields: [postId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@map("comments")
}
```

### 12.3 新增 tRPC Router

```
appRouter.post
├── list(page?, limit?)           → Post[] (分页, 含 user + _count.comments)  [公开]
├── byId(id)                      → Post (含 user + comments[].user)          [公开]
├── create(title, content, images) → Post                                     [需登录]
├── like(id)                       → { likeCount }                            [需登录]
└── comment(postId, content)       → Comment                                  [需登录]
```

---

## 十三、设计稿补充：邀请好友独立页

> 来自线框稿 Row 2 右侧 — 会员中心进入的专门邀请页面 + 微信分享卡片。

### 13.1 邀请好友页 `/invite`

```
┌─────────────────────────────┐
│ ← 邀请好友                   │
│                             │
│  邀请好友                    │
│  您将获得以下奖               │
│                             │
│  ┌────┬────┬────┐           │
│  │VIP1│VIP2│VIP3│VIP4│VIP5  │ ← 等级对应不同奖励
│  │300 │200 │200 │100 │100   │
│  └────┴────┴────┘           │
│                             │
│  邀请奖励                    │
│  ● 邀请成功        ¥10000积分 │
│  ● 优惠券                    │
│  ● 30钻石                    │
│                             │
│  1.购买方式：在 x-pass 平台   │
│    操作充值...               │
│  2.进入平台充值页面-绑定手机号 │
│  3.每人限购一张               │
│                             │
│  ┌───────────────────────┐  │
│  │   复制邀请码 & 分享链接  │  │
│  └───────────────────────┘  │
│                             │
│  ─── 邀请记录 ───            │
│  🖼 用户A    邀请成功         │
│  ...                        │
│                             │
│  到期10/30 剩余奖励  盈XX usdt│
└─────────────────────────────┘
```

**功能点**:
- 按 VIP 等级展示不同邀请奖励系数
- 邀请奖励明细：积分 / 优惠券 / 钻石（虚拟货币）
- 邀请规则说明
- 底部邀请记录列表
- 「复制邀请码」按钮 — 复制到剪贴板 + toast
- 奖励到期时间 + 累计奖励（支持 USDT 显示）

### 13.2 微信分享卡片

```
┌─────────────────────────────┐
│  微信内                      │
│  ┌───────────────────────┐  │
│  │ X-Pass送您一张限量卡，  │  │
│  │ 点击在点击领取       🖼 │  │
│  │ 每位新用户仅限领取1张   │  │
│  │ X-Pass                │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**实现方式**:
- 基于微信 JS-SDK `wx.updateAppMessageShareData` 或 Open Graph 标签
- 分享链接指向 `/login?inviteCode=XXX`
- 需要在 `app/api/og/route.tsx` 生成动态 OG 图片

---

## 十四、设计稿补充：「我的」页面增强

> 来自线框稿 Row 3 左侧 — 比当前生产版多出的功能区块。

### 14.1 完整「我的」页面布局

```
┌─────────────────────────────┐
│  🖼 头像                     │
│  这是用户昵称                 │
│  ID:111111                  │
│  VIP · 余额300/500 · X-X年到期│ ← 新增：到期时间、余额进度
│                      [续费按钮]│
│                             │
│  ─── 我的订单 ───            │
│  ┌──────┬──────┬──────┐     │
│  │待付款 │待使用 │已使用  │     │ ← 三状态入口（设计稿明确）
│  └──────┴──────┴──────┘     │
│                             │
│  ┌───┬───┬───┐              │
│  │⭐  │❤️  │👁  │              │ ← 新增：我的收藏/我的推广/我的足迹
│  │收藏│推广│足迹│              │
│  └───┴───┴───┘              │
│                             │
│  ─── 申请代理 ───            │
│  半价成为官方代理，获取更多收益│
│                     [查看详情]│ ← 新增：代理申请入口
│                             │
│  设置                    >   │
│  关于我们                 >   │ ← 新增菜单项
│  联系客服                 >   │ ← 新增菜单项
│                             │
│  [退出登录]                   │
│                             │
│  🏠首页    🔥X热点    😊我的   │ ← 底部三个 tab（设计稿为三 tab）
└─────────────────────────────┘
```

**与当前生产版差异**:

| 功能 | 当前生产版 | 设计稿新增 |
|------|----------|----------|
| 订单入口 | 订单记录列表 | **三状态 tab 入口**（待付款/待使用/已使用） |
| 快捷入口 | 无 | **我的收藏/我的推广/我的足迹** 三宫格 |
| 代理申请 | 无 | **申请代理卡片**（跳转代理申请流程） |
| VIP 显示 | VIP badge + 积分 | **余额进度条 + 到期时间 + 续费按钮** |
| 菜单项 | 账户设置/消息通知/帮助中心/服务条款 | **设置/关于我们/联系客服** |
| 底部 tab | 4个 tab | **3个 tab**（首页/X热点/我的） |

### 14.2 新增路由

```
/orders?tab=pending     → 待付款订单列表
/orders?tab=unused      → 待使用订单列表
/orders?tab=used        → 已使用订单列表
/favorites              → 我的收藏
/promotions             → 我的推广
/footprints             → 我的足迹
/apply-agent            → 申请代理
/about                  → 关于我们
/contact                → 联系客服
```

### 14.3 新增数据模型

```prisma
model Favorite {
  id        String   @id @default(cuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@unique([userId, productId])
  @@map("favorites")
}

model Footprint {
  id        String   @id @default(cuid())
  userId    String
  productId String
  viewedAt  DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  product Product @relation(fields: [productId], references: [id])

  @@map("footprints")
}
```

---

## 十五、设计稿补充：代理商申请 + 代理商端

> 来自线框稿 Row 3 — 完整的代理商（分销商）系统。

### 15.1 申请代理流程 `/apply-agent`

**多步骤表单**（顶部 step bar）:

```
  审核  →  审批  →  审核通过  →  导航部署
```

#### Step 1: 填写资料

```
┌─────────────────────────────┐
│  申请代理                    │
│  [审核] → 审批 → 审核通过 → 导航│
│                             │
│  姓名:  请输入真实的姓名       │
│                             │
│  区域:  请输入当前所在区域     │
│                             │
│  代理平台: 请输入代理的平台名称│
│  如YOUTUBE,TikTok,X,         │
│  Instagram,weibo             │
│                             │
│  酒店风格: [已上传]           │ ← 资质文件上传
│                             │
│  ┌───────────────────────┐  │
│  │       审核+            │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │       提交+            │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

#### Step 2: 审批中

```
┌─────────────────────────────┐
│  申请代理                    │
│  审核 → [审批] → 审核通过 → 导航│
│                             │
│  姓名: 张三                  │
│                             │
│  区域: 中国, 北京, 朝阳       │
│                             │
│  代理平台: YOUTUBE, TikTok,   │
│  X, Instagram, weibo         │
│                             │
│  酒店风格: [已上传]           │
│                             │
│  ┌───────────────────────┐  │
│  │       审核中            │  │
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │       提交中            │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### 15.2 新增数据模型

```prisma
enum AgentStatus { PENDING  REVIEWING  APPROVED  REJECTED  DEPLOYED }

model AgentApplication {
  id             String      @id @default(cuid())
  userId         String      @unique
  realName       String
  region         String      // "中国,北京,朝阳"
  platforms      String[]    // ["YOUTUBE","TikTok","X","Instagram","weibo"]
  qualificationUrl String?   // 上传的资质文件 URL
  status         AgentStatus @default(PENDING)
  reviewNote     String?
  reviewedAt     DateTime?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@map("agent_applications")
}
```

### 15.3 代理商首页 `/agent`（审核通过后）

```
┌─────────────────────────────┐
│  代理商首页                   │
│                             │
│  ┌──────────┬──────────┐    │
│  │折扣88折碟 │ 请以88折碟 │    │
│  │          │          │    │
│  │折扣88折   │折扣88折通用│    │
│  │通用券     │券         │    │
│  │¥0元      │90元起     │    │
│  ├──────────┼──────────┤    │
│  │折扣88折碟 │ 请以88折碟 │    │
│  │          │          │    │
│  │折扣88折   │折扣88折通用│    │
│  │通用券     │券         │    │
│  │¥0元      │90元起     │    │
│  └──────────┴──────────┘    │
│                             │
│  折扣88折通用券  折扣88折通用券 │
│  90元起        90元起        │
└─────────────────────────────┘
```

**功能**:
- 代理专属价格（批发价，与普通消费者不同）
- 产品网格展示（2列）
- 点击进入代理商购买详情页

### 15.4 代理商批量购买

```
┌─────────────────────────────┐
│  抖音平台通用8折券             │
│                             │
│  购买数量          ×200      │ ← 批量购买
│  订单价格          ¥2000     │ ← 批发价
│                             │
│  ─── 选择支付方式 ───        │
│  ● 支付宝                   │
│  ○ 微信支付                  │
│  ○ PayPay                   │
│  ○ 银联卡                    │
│                             │
│  ┌───────────────────────┐  │
│  │       立即支付          │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### 15.5 代理商支付成功

```
┌─────────────────────────────┐
│         支付成功              │
│                             │
│  抖音平台通用8折券            │
│  ┌──────────┐  实付 ¥2000   │
│  │ 通用8折券  │  ×50         │
│  └──────────┘               │
│                             │
│  发货状态:     已发货         │
│  发货数量:     50            │
│                             │
│  [查看兑换券]                 │
│                             │
│  订单时间  2026.03.11 13:22  │
│  流水号    128768393777728   │
│  订单号    1XP76839          │
│                             │
│  ─── 使用须知 ───            │
│  该券一经出售不可退款，        │
│  券码具有有效期限             │
└─────────────────────────────┘
```

**差异点**:
- 批量购买后展示「发货状态」和「发货数量」
- 「查看兑换券」→ 跳转券码列表管理

### 15.6 代理商订单管理 `/agent/orders`

```
┌───────────────────────────────────────────┐
│  订单号: XXX                               │
│                                           │
│  ┌──────┬──────────┬────┬──────┐          │
│  │ 平台  │  券码     │ 价格│ 状态  │          │
│  ├──────┼──────────┼────┼──────┤          │
│  │ 抖音  │XP1234555│ 45 │待核销 │          │
│  │ 抖音  │XP930091 │ 45 │待核销 │          │
│  │ 抖音  │XP9067778│ 45 │待核销 │          │
│  │ 抖音  │XP9XUUIO │ 45 │待核销 │          │
│  │ 抖音  │XP9308899│ 45 │待核销 │          │
│  └──────┴──────────┴────┴──────┘          │
│                                           │
│  订单时间   2026.03.11 13:22               │
│  流水号     128768393777728                │
│  订单号     1XP76839                       │
│                                           │
│  该券一经出售不可退款，券码具有效限制         │
└───────────────────────────────────────────┘
```

**功能**:
- 表格展示：平台 / 券码 / 单价 / 状态
- 券码状态：待核销 / 已核销 / 已过期
- 代理商可逐张分发券码给下游客户

### 15.7 新增 tRPC Router

```
appRouter.agent
├── apply(realName, region, platforms, qualificationUrl?)  → AgentApplication  [需登录]
├── myApplication()     → AgentApplication | null                              [需登录]
├── products()          → Product[] (代理专属价格)                              [代理商]
├── bulkPurchase(productId, quantity)  → Order + Coupon[]                      [代理商]
├── myOrders()          → Order[] (含批量券码列表)                              [代理商]
├── myCoupons(orderId?) → Coupon[] (某个订单下的所有券码)                        [代理商]

appRouter.admin  (管理员审核)
├── pendingApplications()           → AgentApplication[]                      [管理员]
├── reviewApplication(id, approve, note?)  → AgentApplication                 [管理员]
```

---

## 十六、设计稿补充：签到弹窗增强

> 来自线框稿 Row 2 — 签到成功后的两种弹窗变体。

### 16.1 签到成功弹窗（含提醒）

```
┌─────────────────────────────┐
│                             │
│       ┌──────────────┐      │
│       │   签到成功     │      │
│       │              │      │
│       │ 完成签到获得   │      │
│       │ 200积分奖励   │      │
│       │              │      │
│       │ 明日签到获得   │      │
│       │ 加倍奖励300积分│      │
│       │              │      │
│       │ [🔔 开启签到提醒]│     │ ← 新增：推送通知开关
│       │              │      │
│       │ [去完成任务]   │      │ ← 新增：快捷跳转
│       └──────────────┘      │
│                             │
└─────────────────────────────┘
```

**两种变体**:
1. 首次签到：显示「开启签到提醒」按钮 → 请求浏览器通知权限
2. 已开启提醒：显示「去完成任务」按钮 → 滚动到日常任务区域

**实现**:
- 使用 Dialog 组件
- 签到成功后展示当日奖励 + 明日预期奖励
- 「开启签到提醒」→ `Notification.requestPermission()` + 注册 Service Worker 定时推送
- 「去完成任务」→ `scrollIntoView` 到任务区域 或 关闭弹窗

---

## 十七、设计稿补充：底部导航差异

> 设计稿中底部 tab 为**三个**而非当前生产版的四个。

### 设计稿 Tab 结构

```
┌────────┬────────┬────────┐
│  🏠     │  🔥     │  😊    │
│  首页   │ X热点   │  我的   │
└────────┴────────┴────────┘
```

| Tab | 说明 | 对应路由 |
|-----|------|--------|
| 首页 | 商品首页（限时神券、今日值得兑、0元兑、攻略、榜单） | `/` |
| X热点 | 小红书风格帖子信息流（热帖、内容赚积分） | `/feed` |
| 我的 | 个人中心（订单、收藏、邀请、代理、设置） | `/profile` |

**与当前生产版的差异**:
- 当前 4 tab：首页 / 券包 / 会员 / 我的
- 设计稿 3 tab：首页 / X热点 / 我的
- **券包** → 从「我的」页面入口进入（订单中查看）
- **会员中心** → 从首页 Hero 区域入口进入
- **X热点** → 新增的内容信息流 tab（取代「券包」和「会员」的独立 tab 位置）

### X热点 Tab `/feed`

```
┌─────────────────────────────┐
│  300积分                     │ ← 顶部显示当前积分
│                             │
│  ┌────┬────┬────┬────┬────┐ │
│  │VIP1│VIP2│VIP3│VIP4│VIP5│ │ ← VIP 等级积分兑换比展示
│  │300 │200 │200 │100 │100 │ │
│  └────┴────┴────┴────┴────┘ │
│                             │
│  邀请奖励                    │
│  ... (同邀请页)              │
│                             │
│  ─── 热帖 / 攻略 ───        │
│  4  ▓ 折扣87折通用8折碟      │
│     300积分   [去兑换]       │
│  5  ▓ 折扣87折通用8折碟      │
│     200积分   [去兑换]       │
│  6  ▓ 折扣87折通用8折碟      │
│     200积分   [去兑换]       │
│                             │
│  🏠首页    🔥X热点    😊我的   │
└─────────────────────────────┘
```

**功能**:
- 顶部积分余额
- VIP 等级卡片（横向滚动）
- 邀请奖励快捷入口
- 帖子/攻略信息流列表
- 点击帖子 → `/post/[id]`
- 点击商品卡 → `/scroll/[id]`

---

## 十八、设计稿补充：Product 模型字段扩展

根据设计稿中商品详情页的规格说明和购买须知，需要扩展 Product 模型：

```prisma
model Product {
  // ... 原有字段 ...

  // ─── 设计稿新增 ───
  coverImage     String?    // 封面图 URL
  minAmount      Decimal?   @db.Decimal(10, 2)  // 最低金额（"50元起"）
  minQuantity    Int?       // 最低购买数量（"10件起买"）
  purchaseNotes  String[]   // 购买须知（数组，每条一段）
  usageNotes     String?    // 使用须知固定文案
  agentPrice     Decimal?   @db.Decimal(10, 2)  // 代理商专属价
  agentMinQty    Int?       // 代理商起购量
}
```

---

## 十九、设计稿补充：Order 模型字段扩展

根据待支付页和支付成功页的字段展示：

```prisma
model Order {
  // ... 原有字段 ...

  // ─── 设计稿新增 ───
  serialNo       String?    @unique  // 流水号 "128768393777728"
  paymentMethod  String?    // "alipay" | "wechat" | "paypay" | "unionpay"
  quantity       Int        @default(1)  // 购买数量
  expiresAt      DateTime?  // 支付截止时间（创建后 30 分钟）
  deliveryStatus String?    // 代理商订单: "pending" | "shipped"
  deliveryCount  Int?       // 代理商订单: 发货数量

  coupons Coupon[]  // 一对多（批量购买产生多张券码）
}
```

---

## 二十、完整路由表更新

根据设计稿，完整消费者端路由表应为：

```
(consumer) 路由组
├── /                    首页（限时神券、今日值得兑、0元兑、攻略、榜单）
├── /feed                X热点（帖子信息流 + VIP卡 + 邀请入口）
├── /post/[id]           帖子详情（多图轮播 + 评论）
├── /scroll/[id]         商品详情（倒计时 + 规格 + 购买须知 + 立即购买）
├── /coupons             券包（全部/未使用/已使用/已过期 + 券码详情弹窗）
├── /member              会员中心（签到 + 日常任务 + 看内容赚积分 + VIP弹窗）
├── /invite              邀请好友（奖励规则 + 记录列表 + 分享按钮）
├── /profile             我的（订单入口 + 收藏/推广/足迹 + 代理入口 + 设置）
├── /orders              订单列表（tab: 待付款/待使用/已使用）
├── /orders/[id]         订单详情（支付信息 + 券码 + QR）
├── /favorites           我的收藏
├── /promotions          我的推广
├── /footprints          我的足迹
├── /apply-agent         申请代理（多步骤表单）
├── /about               关于我们
└── /contact             联系客服

(agent) 路由组 — 代理商审核通过后
├── /agent               代理商首页（批发价产品网格）
├── /agent/orders        代理商订单管理（含券码表格）
└── /agent/orders/[id]   代理商订单详情（批量券码列表）

(merchant) 路由组 — 不变
├── /dashboard
├── /products
├── /orders
├── /verify
└── /settings

(admin) 路由组 — 新增
├── /admin/agents        代理商申请审核列表
└── /admin/agents/[id]   审核详情（通过/拒绝）
```

---

## 二十一、支付方式配置

设计稿明确的 4 种支付方式：

```typescript
export const PAYMENT_METHODS = [
  { id: "alipay",   label: "支付宝",   icon: AlipayIcon,   enabled: true },
  { id: "wechat",   label: "微信支付",  icon: WechatIcon,   enabled: true },
  { id: "paypay",   label: "PayPay",   icon: PayPayIcon,   enabled: true },
  { id: "unionpay", label: "银联卡",   icon: UnionPayIcon,  enabled: true },
] as const;
```

**支付流程**:
1. 用户选择支付方式 → `trpc.order.purchase({ productId, quantity, paymentMethod })`
2. 服务端创建订单（状态 PENDING）→ 设置 30 分钟超时
3. 调用对应支付 provider 创建支付链接/二维码
4. 用户完成支付 → webhook 回调 `/api/payments/notify/[provider]`
5. 更新订单状态 PAID → 自动生成券码 → 扣除积分
6. 超时未支付 → 定时任务标记 CANCELLED → 回退积分

---

## 二十二、补充：分类商品列表页（限时/推荐/0元兑）

> 原始提示词明确：「用户点击任意限时神卷**跳转到限时神卷页面，展示全部神卷**」。
> 首页各 section 仅展示 3~4 张精选卡片，点击 section 标题或「查看全部」进入独立列表页。

### 22.1 新增路由

```
/category/limited       限时神券 — 全部列表
/category/today         今日值得兑 — 全部列表
/category/zero          0 元兑 — 全部列表
```

### 22.2 分类列表页 `/category/[slug]`

```
┌─────────────────────────────┐
│ ← 返回                      │
│                             │
│  限时神券                    │
│  倒计时结束后将自动下架       │
│                     05:30:59│
│                             │
│  ┌──────────┬──────────┐    │
│  │ 通用八折卷 │ VIP 周卡  │    │
│  │ 抖音      │ 抖音     │    │
│  │ 立省50元   │ 会员特惠  │    │
│  │ 可用9张    │ 可用3张   │    │
│  │300积分+¥10│260积分+¥12│    │
│  │ [去兑换]   │ [去兑换]  │    │
│  ├──────────┼──────────┤    │
│  │ 通用折扣包 │ VIP 年卡  │    │
│  │ ...       │ ...     │    │
│  │ [去兑换]   │ [去兑换]  │    │
│  └──────────┴──────────┘    │
└─────────────────────────────┘
```

**关键行为**:
- 首页 section 标题右侧新增「查看全部 →」链接
- 列表页 2 列（移动端）/ 3~4 列（桌面端）网格铺满所有商品
- 每张卡片底部有**「去兑换」按钮**，点击跳转 `/scroll/[id]`
- 限时神券页顶部始终展示全局倒计时
- 支持下拉加载更多（或分页）

---

## 二十三、补充：支付方式扩展（5 种）

> 原始提示词明确 **5 种支付方式**：支付宝、微信支付、银联卡、PayPal、加密货币。
> 设计稿线框中 PayPay 应为 PayPal 误写。以原始需求为准，共 5 种。

### 23.1 完整支付方式配置

```typescript
export const PAYMENT_METHODS = [
  { id: "alipay",   label: "支付宝",   enabled: true  },
  { id: "wechat",   label: "微信支付",  enabled: true  },
  { id: "unionpay", label: "银联卡",   enabled: true  },
  { id: "paypal",   label: "PayPal",  enabled: true  },
  { id: "crypto",   label: "加密货币",  enabled: true  },
] as const;
```

### 23.2 加密货币支付 Provider

```typescript
// lib/payment/providers/crypto.ts
// 支持 USDT-TRC20 等稳定币支付
interface CryptoPaymentConfig {
  network: "trc20" | "erc20" | "bep20";
  token: "USDT" | "USDC";
  receiverAddress: string;
  confirmations: number;
}
```

**加密货币支付流程**:
1. 用户选择「加密货币」→ 展示收款地址 + 金额 + 网络选择（TRC20/ERC20）
2. 用户链上转账 → 前端轮询或 WebSocket 监听确认
3. 达到确认数后 → webhook 更新订单状态
4. 超时未到账 → 加密货币可延长至 24 小时（区别于法币 30 分钟）

### 23.3 Payment Provider 注册表更新

```typescript
// lib/payment/registry.ts
export const paymentProviders = {
  alipay:   new AlipayProvider(),
  wechat:   new WechatProvider(),
  unionpay: new UnionPayProvider(),
  paypal:   new PayPalProvider(),
  crypto:   new CryptoProvider(),
} as const;
```

---

## 二十四、补充：购买交互细节规范

> 原始提示词中强调的 UI 细节，确保实现时不遗漏。

### 24.1 「立即购买」按钮始终置底

```
商品详情页底部固定操作栏（sticky bottom），不随页面滚动：

┌─────────────────────────────────────┐
│ 购买数量 [−] 1 [+]    [  立即购买  ] │
└─────────────────────────────────────┘

实现:
- position: fixed bottom-0 / sticky
- 安全区适配: pb-[env(safe-area-inset-bottom)]
- 背景: bg-white/95 backdrop-blur border-t
- 按钮: 主色 rounded-full，占右侧 ~60% 宽度
```

### 24.2 失效时间强调展示

```
商品详情页倒计时要求「加大」显示：

  6:30:59 秒后失效

实现:
- 字号: text-3xl sm:text-4xl font-bold
- 颜色: text-red-500（红色警示）
- 位置: 商品标题下方，视觉焦点区
- 到期后自动切换为「已过期」灰色状态，禁用购买按钮
```

### 24.3 价格展示规范

```
  300积分 + ¥10元   ¥90元(划线)

实现:
- 积分价: text-2xl font-bold text-primary（最突出）
- 现金价: text-lg text-slate-700
- 原价: text-sm text-slate-400 line-through
- 三者同行展示
```

### 24.4 购买须知固定三条

```
商品详情页底部固定规则说明结构：

  ─── 购买须知 ───
  1. 购买方式：在平台操作购买
  2. 兑换核销：进入对应平台充值页面，绑定手机号进行充值操作，核销成功后即生效
  3. 限购一张：每人每个商品限购一张

实现: product.purchaseNotes: string[]（默认 fallback 以上三条）
```

### 24.5 支付弹窗信息层级

```
支付确认弹窗展示顺序（从上到下）：

  1. 商品名（券名）         — text-lg font-semibold
  2. 购买数量     ×1        — 右对齐
  3. 订单价格     ¥10       — 右对齐
  4. 消耗积分     300       — 右对齐，主色强调
  5. ─── 分割线 ───
  6. 选择支付方式            — 5 个 radio 选项
  7. ─── 分割线 ───
  8. [     立即支付     ]    — 全宽按钮
```

### 24.6 支付成功页信息层级

```
支付成功后展示顺序（从上到下）：

  1. ✅ 支付成功              — 大标题
  2. 商品卡片（缩略）          — 券名 + 平台
  3. 实付 / 消耗积分 / 数量     — 三列统计
  4. [QR Code 二维码]          — 居中大尺寸
  5. 券码: XP1233888 [复制]    — 可复制
  6. 到期时间                  — 红色警示
  7. [  打开APP使用  ]         — 全宽按钮，调用 openApp
  8. 订单时间 / 流水号 / 订单号  — 信息列表
  9. ─── 使用须知 ───
  10. 该券一经出售不可退款，券码具有有效期请及时兑换
```

---

## 二十五、补充：首页左上角用户信息展示

> 原始提示词：「左上角首页文字改为用户会员等级，logo+名称+vip等级+到期日期」

### 25.1 首页 Header 布局

```
┌──────────────────────────────────────┐
│ 🟣 Discount Hub                      │
│    VIP3 · 到期 2026-12-31      [续费] │
│                                      │
│    今日精选                            │
└──────────────────────────────────────┘

点击 VIP 区域 → 跳转 /member（VIP等级和任务系统）
```

**展示字段**:
- Logo 图标（渐变色方块）+ 平台名
- VIP 等级 badge: `VIP${user.vipLevel}`
- 到期日期: `user.vipExpiresAt`（需新增字段）
- 可选续费按钮

### 25.2 User 模型新增字段

```prisma
model User {
  // ... 原有字段 ...
  vipExpiresAt  DateTime?  // VIP 到期时间
}
```

---

## 二十六、补充：主题变体（暗色 / 亮色双主题）

> 原始 demo 使用「红紫黑色风格配色」，生产版使用明亮 slate 风格。
> 建议保留双主题，用户可在设置页面切换。

### 26.1 暗色主题 CSS 变量（红紫黑 demo 原始风格）

```css
[data-theme="dark"] {
  --bg: #0b0b10;
  --panel: #12121a;
  --panel2: #161625;
  --text: #f5f5f7;
  --text-muted: #b6b6c2;
  --border: rgba(255, 255, 255, 0.12);
  --primary: #ff2d55;
  --primary-hover: #ff4d6d;
  --accent: #8a2be2;
  --accent-hover: #9b4dff;
  --gradient-primary: linear-gradient(135deg, #ff2d55 0%, #8a2be2 100%);
  --shadow-glow: 0 0 24px rgba(255, 45, 85, 0.2), 0 0 32px rgba(138, 43, 226, 0.18);
}
```

### 26.2 亮色主题 CSS 变量（生产版风格）

```css
[data-theme="light"] {
  --app-card: #ffffff;
  --app-card-border: #e2e8f0;
  --app-card-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  --app-hero-bg: #0f172a;
  --app-hero-border: rgba(255, 255, 255, 0.08);
  --app-heading: #0f172a;
  --app-text-muted: #94a3b8;
  --app-strong: #334155;
  --app-soft: #f8fafc;
  --app-nav-bg: #ffffff;
  --app-nav-active-bg: #0f172a;
  --app-nav-active-text: #ffffff;
}
```

### 26.3 实现方式

- 使用 `next-themes` 的 `ThemeProvider`（已在项目中）
- 在「设置」页面提供主题切换开关
- 默认跟随系统 `system`，可手动选择 `light` / `dark`
- 所有组件使用 CSS 变量而非硬编码颜色值

---

## 二十七、完整路由表（最终版）

```
(consumer) 路由组
├── /                         首页（Banner + 限时神券 + 今日值得兑 + 0元兑 + 攻略 + 榜单）
├── /feed                     X热点（帖子信息流 + VIP卡 + 邀请入口）
├── /category/[slug]          分类列表页（limited / today / zero 全部商品）
├── /scroll/[id]              商品详情（倒计时 + 规格 + 购买须知 + 固定底部购买栏）
├── /post/[id]                帖子详情（多图轮播 + 评论 + 分享/收藏）
├── /coupons                  券包（Tabs 筛选 + 券码详情弹窗 + FakeQr）
├── /member                   会员中心（签到 + 任务 + 赚积分 + VIP弹窗）
├── /invite                   邀请好友（VIP奖励系数 + 邀请记录 + 分享按钮）
├── /profile                  我的（订单入口 + 收藏/推广/足迹 + 代理入口 + 设置）
├── /orders                   订单列表（tab: 待付款 / 待使用 / 已使用）
├── /orders/[id]              订单详情（支付信息 + 券码 + QR）
├── /favorites                我的收藏
├── /promotions               我的推广
├── /footprints               我的足迹
├── /apply-agent              申请代理（多步骤表单）
├── /about                    关于我们
└── /contact                  联系客服

(agent) 路由组 — 代理商
├── /agent                    代理商首页（批发价产品网格）
├── /agent/orders             代理商订单管理（含券码表格）
└── /agent/orders/[id]        代理商订单详情（批量券码列表）

(merchant) 路由组 — 商户
├── /dashboard                数据看板
├── /products                 商品管理
├── /orders                   订单管理
├── /verify                   券码核销
└── /settings                 店铺设置

(admin) 路由组 — 管理员
├── /admin/agents             代理商申请审核列表
└── /admin/agents/[id]        审核详情
```
