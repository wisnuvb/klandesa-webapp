#!/usr/bin/env bash
# Sembunyikan file env selain .env.production (Next.js / Prisma masih baca .env bawaan).
# Usage: source scripts/env-stash.sh && env_stash_begin && ... && env_stash_end

ENV_STASH_DIR=""
declare -a ENV_STASH_RESTORE=()

env_stash_begin() {
  ENV_STASH_DIR="$(mktemp -d)"
  local files=(
    .env
    .env.local
    .env.development
    .env.development.local
    .env.production.local
  )
  local f
  for f in "${files[@]}"; do
    if [ -f "$f" ]; then
      mv "$f" "$ENV_STASH_DIR/"
      ENV_STASH_RESTORE+=("$f")
    fi
  done
}

env_stash_end() {
  rm -f .env

  local f
  for f in "${ENV_STASH_RESTORE[@]}"; do
    mv "$ENV_STASH_DIR/$(basename "$f")" "$f" 2>/dev/null || true
  done

  if [ -n "$ENV_STASH_DIR" ]; then
    rmdir "$ENV_STASH_DIR" 2>/dev/null || rm -rf "$ENV_STASH_DIR"
  fi
  ENV_STASH_DIR=""
  ENV_STASH_RESTORE=()
}

env_stash_trap() {
  trap 'env_stash_end' EXIT
}

require_env_production() {
  if [ ! -f .env.production ]; then
    echo "ERROR: .env.production wajib ada untuk build/deploy production."
    echo "  Salin template: cp .env.production.example .env.production"
    echo "  Isi nilai production (NEXT_PUBLIC_*, DATABASE_URL, AUTH_SECRET, dll.)."
    exit 1
  fi
}
