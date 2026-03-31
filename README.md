# 折扣中心

团购优惠券 & 虚拟物品购物核销平台 —— 支持 C 端消费者购券 + B 端商家核销。

## 功能概览

**消费者端（C 端）**
- 浏览团购优惠券 / 虚拟商品
- 积分 + 现金混合支付下单
- 我的订单 / 优惠券管理
- 会员等级、签到、积分任务

**商家端（B 端）**
- 商品上架与库存管理
- 扫码 / 验证码核销
- 订单管理与数据看板

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 |
| 样式 | Tailwind CSS 4 + shadcn/ui + Radix |
| API | tRPC v11 + TanStack Query |
| 数据库 | PostgreSQL + Prisma 7 |
| 认证 | Better Auth |
| 缓存 | Redis (ioredis) |
| 校验 | Zod 4 + React Hook Form |
| 状态 | Zustand |
| 构建 | Turborepo + pnpm |
| 语言 | TypeScript 6 |

## 项目结构

```
├── apps/
│   └── web/              # Next.js 主应用（C 端 + B 端）
│       ├── prisma/        # Prisma schema
│       └── src/
│           ├── app/       # App Router 页面
│           │   ├── (auth)/       # 登录 / 注册
│           │   ├── (consumer)/   # 消费者页面
│           │   └── (merchant)/   # 商家后台
│           ├── components/ # UI 组件
│           ├── lib/        # 认证、数据库、Redis 等
│           └── trpc/       # tRPC 路由与客户端
├── packages/
│   ├── db/               # 数据库客户端（Supabase）
│   └── shared/           # 共享类型、Schema、工具函数
└── demo/                 # 早期原型（Vite + React）
```

## 快速开始

### 前置要求

- Node.js >= 18.18
- pnpm >= 10
- PostgreSQL
- Redis

### 安装与运行

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp apps/web/.env.example apps/web/.env
# 编辑 apps/web/.env，填入你的数据库连接等配置

# 生成 Prisma Client & 迁移数据库
cd apps/web
pnpm dlx prisma generate
pnpm dlx prisma db push
cd ../..

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 即可。

## 许可证

[AGPL-3.0](LICENSE)
