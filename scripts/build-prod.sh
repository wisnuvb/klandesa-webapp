#!/usr/bin/env bash
# Build production di server yang sama dengan PM2 (next start).
# Kalau TypeScript/webpack kena SIGKILL (exit 137), pakai: yarn deploy:prod (build lokal + upload .next).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PM2_APP="${PM2_APP:-klandesa-webapp}"
PM2_REGISTERED=0

if command -v pm2 >/dev/null 2>&1 && pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  PM2_REGISTERED=1
  echo "==> Stop PM2 $PM2_APP (sementara)"
  pm2 stop "$PM2_APP" || true
fi

if [ "${CLEAN_BUILD:-}" = "1" ]; then
  echo "==> Clean .next penuh (CLEAN_BUILD=1)"
  rm -rf .next
elif [ "${CLEAN_CACHE:-}" = "1" ]; then
  echo "==> Bersihkan .next/cache (CLEAN_CACHE=1)"
  rm -rf .next/cache
else
  echo "==> Pakai .next existing (incremental, tanpa hapus cache)"
fi

if [ "${SKIP_LINT:-}" != "1" ]; then
  echo "==> ESLint"
  rm -rf .next/types
  yarn lint
fi

echo "==> Next.js build"
yarn build:next

if [ "$PM2_REGISTERED" = "1" ]; then
  echo "==> Restart PM2 $PM2_APP"
  bash scripts/pm2-restart.sh
fi

echo "==> Build selesai"
