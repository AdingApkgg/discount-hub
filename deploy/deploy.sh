#!/usr/bin/env bash
set -euo pipefail

# ─── Discount Hub - Server Deploy Script ─────────────
# Usage:  ./deploy/deploy.sh [branch]
# Prereqs: Node 22+, pnpm, PostgreSQL, Redis, systemd
# ──────────────────────────────────────────────────────

APP_DIR="/opt/discount-hub"
BRANCH="${1:-main}"
REPO="https://github.com/AdingApkgg/discount-hub.git"
SERVICE="discount-hub-web"
MIGRATE_SERVICE="discount-hub-migrate"
USER="discount-hub"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; exit 1; }

# ─── Pre-flight checks ──────────────────────────────

command -v node  >/dev/null || err "node not found"
command -v pnpm  >/dev/null || err "pnpm not found"
command -v git   >/dev/null || err "git not found"

[[ -f "$APP_DIR/.env" ]] || err "$APP_DIR/.env not found. Copy .env.production.example and fill in values."

# ─── Step 1: Create system user (first run only) ────

if ! id "$USER" &>/dev/null; then
  log "Creating system user: $USER"
  sudo useradd --system --shell /usr/sbin/nologin --home-dir "$APP_DIR" "$USER"
fi

# ─── Step 2: Clone or pull ───────────────────────────

if [[ ! -d "$APP_DIR/.git" ]]; then
  log "Cloning repo into $APP_DIR ..."
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER":"$USER" "$APP_DIR"
  sudo -u "$USER" git clone --branch "$BRANCH" --depth 1 "$REPO" "$APP_DIR"
else
  log "Pulling latest ($BRANCH) ..."
  cd "$APP_DIR"
  sudo -u "$USER" git fetch origin "$BRANCH"
  sudo -u "$USER" git reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR"

# ─── Step 3: Install deps ───────────────────────────

log "Installing dependencies ..."
sudo -u "$USER" pnpm install --frozen-lockfile

# ─── Step 4: Generate Prisma client ─────────────────

log "Generating Prisma client ..."
sudo -u "$USER" pnpm --filter web exec prisma generate

# ─── Step 5: Run database migrations ────────────────

log "Running database migrations ..."
sudo -u "$USER" bash -c "source $APP_DIR/.env && npx prisma migrate deploy --schema apps/web/prisma/schema.prisma"

# ─── Step 6: Build ──────────────────────────────────

log "Building Next.js (standalone) ..."
sudo -u "$USER" bash -c "source $APP_DIR/.env && pnpm --filter web build"

# ─── Step 7: Copy static assets into standalone ─────

log "Copying static assets ..."
sudo -u "$USER" cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
if [[ -d apps/web/public ]]; then
  sudo -u "$USER" cp -r apps/web/public apps/web/.next/standalone/apps/web/public
fi

# ─── Step 8: Install systemd units ──────────────────

log "Installing systemd services ..."
sudo cp deploy/discount-hub-web.service /etc/systemd/system/
sudo cp deploy/discount-hub-migrate.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE"

# ─── Step 9: Restart ────────────────────────────────

log "Restarting $SERVICE ..."
sudo systemctl restart "$SERVICE"

# ─── Step 10: Health check ──────────────────────────

sleep 3
if systemctl is-active --quiet "$SERVICE"; then
  log "Deploy complete! $SERVICE is running."
  log "Check status:  sudo systemctl status $SERVICE"
  log "View logs:     sudo journalctl -u $SERVICE -f"
else
  err "$SERVICE failed to start. Check: sudo journalctl -u $SERVICE -n 50"
fi
