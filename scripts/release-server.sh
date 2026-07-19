#!/usr/bin/env bash
# Release di server TANPA build Next.js (hemat RAM — build dari lokal via yarn deploy:prod).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Git pull"
git pull --ff-only origin main

echo "==> Yarn install"
yarn --frozen-lockfile 2>/dev/null || yarn

PM2_APP="${PM2_APP:-klandesa-webapp}"
echo "==> Stop PM2 $PM2_APP (hemat RAM untuk prisma)"
pm2 stop "$PM2_APP" 2>/dev/null || true

echo "==> Prisma db push + generate"
bash scripts/db-push-prod.sh

echo "==> Restart PM2"
bash scripts/pm2-restart.sh

echo "==> Release server selesai (tanpa build)."
echo "    Untuk deploy kode UI/API terbaru, jalankan dari mesin lokal: yarn deploy:prod"
