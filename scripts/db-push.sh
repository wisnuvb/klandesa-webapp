#!/usr/bin/env bash
# Prisma db push untuk lokal — membutuhkan .env (Prisma tidak memuat .env.production).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "ERROR: file .env tidak ditemukan."
  echo "  Prisma CLI hanya membaca .env (bukan .env.local / .env.production)."
  if [ -f .env.production ]; then
    echo "  Saran: ekstrak DATABASE_URL dari .env.production, contoh:"
    echo "    grep -E '^(DB_|DATABASE_URL=)' .env.production > .env"
  else
    echo "  Saran: salin template lalu isi DATABASE_URL:"
    echo "    cp .env.production.example .env"
  fi
  exit 1
fi

if ! grep -qE '^DATABASE_URL=' .env; then
  echo "ERROR: DATABASE_URL belum di-set di .env."
  exit 1
fi

exec npx prisma db push "$@"
