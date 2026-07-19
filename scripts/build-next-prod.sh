#!/usr/bin/env bash
# Next.js build production — hanya memuat .env.production (bukan .env / .env.local).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=env-stash.sh
source "$ROOT/scripts/env-stash.sh"
require_env_production
env_stash_begin
env_stash_trap

echo "==> Next.js build (env: .env.production saja)"
NODE_ENV=production exec "$ROOT/node_modules/.bin/next" build "$@"
