# Discount Hub 部署指南

支持两种生产部署方式：Vercel（推荐快速上线）和自有服务器（systemd）。

---

## 方式一：Vercel

### 前提

- GitHub 仓库已连接 Vercel
- 已有 PostgreSQL（如 Supabase / Neon）和 Redis（如 Upstash）云服务

### 步骤

1. 在 Vercel 项目 Settings → Environment Variables 中配置：

   ```
   DATABASE_URL=postgresql://user:pass@host:5432/discount_hub
   REDIS_URL=redis://default:pass@host:6379
   BETTER_AUTH_SECRET=<openssl rand -base64 32>
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

2. 推送到 `main` 分支，Vercel 自动构建部署。

3. 首次部署后手动执行一次数据库迁移：

   ```bash
   # 本地执行，DATABASE_URL 指向生产库
   DATABASE_URL="postgresql://..." npx prisma migrate deploy --schema apps/web/prisma/schema.prisma
   ```

4. （可选）填充初始数据：

   ```bash
   DATABASE_URL="postgresql://..." pnpm --filter web db:seed
   ```

`vercel.json` 已配好，无需额外调整。

---

## 方式二：自有服务器（systemd）

### 系统要求

- Ubuntu 22.04+ / Debian 12+
- Node.js 22+
- pnpm 10+
- PostgreSQL 16+
- Redis 7+

### 首次部署

#### 1. 安装基础服务

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs

# pnpm
corepack enable && corepack prepare pnpm@10.6.5 --activate

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Redis
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
```

#### 2. 创建数据库

```bash
sudo -u postgres psql -c "CREATE USER discount WITH PASSWORD 'your-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE discount_hub OWNER discount;"
```

#### 3. 配置环境变量

```bash
sudo mkdir -p /opt/discount-hub
sudo cp apps/web/.env.production.example /opt/discount-hub/.env
sudo nano /opt/discount-hub/.env
```

填入实际值：

```env
DATABASE_URL=postgresql://discount:your-strong-password@localhost:5432/discount_hub
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=<openssl rand -base64 32 的输出>
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### 4. 执行部署脚本

```bash
sudo ./deploy/deploy.sh main
```

脚本会自动完成：创建系统用户 → 拉代码 → 安装依赖 → Prisma generate → 数据库迁移 → 构建 → 安装 systemd 服务 → 启动。

### 后续更新

```bash
cd /opt/discount-hub
sudo ./deploy/deploy.sh main
```

### 常用命令

```bash
# 查看状态
sudo systemctl status discount-hub-web

# 查看日志（实时）
sudo journalctl -u discount-hub-web -f

# 重启
sudo systemctl restart discount-hub-web

# 停止
sudo systemctl stop discount-hub-web
```

### Nginx 反向代理（推荐）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

用 Certbot 申请免费 SSL：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## CI/CD 自动部署

GitHub Actions 已配置好。推送到 `main` 后自动跑 lint → typecheck → test → build。

如需 CI 推完自动部署到服务器：

1. 在 GitHub 仓库 Settings → Secrets 添加：
   - `DEPLOY_HOST` — 服务器 IP
   - `DEPLOY_USER` — SSH 用户名
   - `DEPLOY_KEY` — SSH 私钥

2. 在 Settings → Variables 添加：
   - `DEPLOY_ENABLED` = `true`

之后每次 push main 都会自动 SSH 到服务器执行 `deploy.sh`。
