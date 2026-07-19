#!/usr/bin/env bash
# Prisma db push di server production (.env di server).
# Prod memakai db push (bukan migrate deploy) — skema sudah hidup sebelum migrate baseline.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env wajib ada di server ($ROOT)."
  exit 1
fi

echo "==> prisma db push"
# --skip-generate: generate dijalankan terpisah (sering OOM jika digabung saat PM2 masih aktif).
npx prisma db push --skip-generate

if [ "${SKIP_PRISMA_GENERATE:-}" = "1" ]; then
  echo "==> prisma generate dilewati (SKIP_PRISMA_GENERATE=1 — client di-upload dari mesin lokal)"
  exit 0
fi

echo "==> prisma generate"
# Batasi heap agar tidak memicu OOM killer saat PM2 / MySQL masih pakai RAM.
NODE_OPTIONS="${PRISMA_NODE_OPTIONS:---max-old-space-size=768}" npx prisma generate
