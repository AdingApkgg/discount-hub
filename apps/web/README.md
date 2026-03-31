# Discount Hub — Web App

C2B2C 虚拟优惠券交易平台的 Web 端应用。消费者可以用积分或现金购买优惠券，商家可以核销券码。

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **语言**: TypeScript 6
- **API**: tRPC v11 + TanStack React Query
- **数据库**: PostgreSQL + Prisma 7
- **认证**: Better Auth (邮箱密码登录)
- **缓存**: Redis (ioredis)
- **样式**: Tailwind CSS 4 + Radix UI + shadcn/ui
- **状态管理**: Zustand 5
- **校验**: Zod 4
- **构建**: Turborepo + Turbopack

## 快速开始

### 前置条件

- Node.js >= 18.18.0
- pnpm 10.x
- PostgreSQL (本地或远程)
- Redis (可选，用于分布式锁和缓存)

### 环境变量

复制 `.env.example` 到 `.env` 并填写：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/discount_hub"
BETTER_AUTH_SECRET="your-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"  # 可选
```

### 安装与运行

```bash
# 在 monorepo 根目录
pnpm install

# 推送数据库 schema
pnpm --filter web run db:push

# 填充测试数据
pnpm --filter web run db:seed

# 启动开发服务器
pnpm dev
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 (Turbopack) |
| `pnpm build` | 构建生产版本 |
| `pnpm lint` | 运行 ESLint |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm --filter web run db:push` | 推送 Prisma schema 到数据库 |
| `pnpm --filter web run db:migrate` | 运行数据库迁移 |
| `pnpm --filter web run db:seed` | 填充测试数据 |
| `pnpm --filter web run db:studio` | 打开 Prisma Studio |

## 项目结构

```
apps/web/
├── prisma/
│   ├── schema.prisma    # 数据库模型定义
│   └── seed.ts          # 测试数据填充脚本
├── src/
│   ├── app/
│   │   ├── (auth)/      # 登录/注册页面
│   │   ├── (consumer)/  # 消费者端页面
│   │   ├── (merchant)/  # 商家端页面
│   │   └── api/         # API 路由
│   ├── components/      # UI 组件
│   ├── data/            # Mock 数据 (开发用)
│   ├── lib/             # 核心库 (auth, prisma, redis)
│   └── trpc/            # tRPC 路由和客户端
│       └── routers/     # product, order, verify, points, user
└── prisma.config.ts     # Prisma 7 配置
```

## 核心功能

- **商品浏览**: 按分类 (限时/今日推荐/零元购) 浏览优惠券商品
- **积分+现金购买**: 已预留支付宝、微信、银联、PayPal、VISA、USDT TRC20 等支付接口，并接好支付会话层
- **券码生成**: 购买后自动生成唯一券码
- **商家核销**: 商家扫码或输入验证码完成核销 (Redis 分布式锁防重复)
- **签到系统**: 4 天循环签到，递增积分奖励
- **任务系统**: 完成日常任务获取积分
- **VIP 等级**: 根据积分自动升级
- **邀请返利**: 邀请码体系，推荐有奖
