#!/usr/bin/env bash
# Build di mesin lokal, upload .next + Prisma client ke server prod, db push + restart PM2.
# Dipakai kalau proses berat di server kena SIGKILL / OOM (exit 137) — build Next.js atau prisma generate.
#
# Usage:
#   yarn deploy:prod
#   DEPLOY_SERVER=ubuntu@host DEPLOY_PATH=/path/to/app yarn deploy:prod
#
# Pastikan perubahan sudah di-push ke origin/main sebelum deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEPLOY_SERVER="${DEPLOY_SERVER:-ubuntu@139.99.125.212}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/html/klandesa/klandesa-webapp}"
PM2_APP="${PM2_APP:-klandesa-webapp}"
GIT_BRANCH="${GIT_BRANCH:-main}"

ssh_cmd() {
  ssh -o BatchMode=yes "$DEPLOY_SERVER" "export PATH=\"\$HOME/.nvm/versions/node/v22.21.1/bin:\$PATH\"; source \"\$HOME/.nvm/nvm.sh\" 2>/dev/null; $*"
}

if [ "${SKIP_LINT:-}" != "1" ]; then
  echo "==> Lint (lokal)"
  rm -rf .next/types
  yarn lint
fi

echo "==> Next.js build (lokal, env: .env.production saja)"
yarn build:next

if [ ! -f .next/BUILD_ID ]; then
  echo "ERROR: .next/BUILD_ID tidak ada — build lokal gagal."
  exit 1
fi

echo "==> Git pull + yarn di server (deps & prisma schema sync)"
if ! ssh_cmd "cd '$DEPLOY_PATH' && git pull --ff-only origin '$GIT_BRANCH'"; then
  echo ""
  echo "ERROR: git pull di server gagal."
  echo "  Pastikan perubahan sudah di-push ke origin/$GIT_BRANCH."
  echo "  Jika remote pakai HTTPS, pertimbangkan SSH di server:"
  echo "    cd $DEPLOY_PATH && git remote set-url origin git@github.com:wisnuvb/klandesa-webapp.git"
  exit 1
fi

ssh_cmd "cd '$DEPLOY_PATH' && (yarn --frozen-lockfile 2>/dev/null || yarn)"

echo "==> Prisma generate (lokal — client di-upload ke server, hindari OOM di server)"
npx prisma generate

echo "==> Upload deploy scripts ke server"
rsync -az \
  scripts/db-push-prod.sh \
  scripts/pm2-restart.sh \
  scripts/release-server.sh \
  "$DEPLOY_SERVER:$DEPLOY_PATH/scripts/"

echo "==> Stop PM2 $PM2_APP di server (hemat RAM untuk prisma db push)"
ssh_cmd "pm2 stop '$PM2_APP' 2>/dev/null || true"

echo "==> Prisma db push di server (generate dari lokal, bukan di server)"
ssh_cmd "cd '$DEPLOY_PATH' && SKIP_PRISMA_GENERATE=1 bash scripts/db-push-prod.sh"

echo "==> Upload Prisma client ke server"
rsync -az \
  node_modules/.prisma/ \
  "$DEPLOY_SERVER:$DEPLOY_PATH/node_modules/.prisma/"

if [ -d .next/dev ]; then
  dev_mb="$(du -sm .next/dev | awk '{print $1}')"
  echo "==> Lewati .next/dev (${dev_mb}MB) — output next dev, bukan production"
fi

echo "==> Upload .next ke server (runtime only — tanpa cache/dev/types/diagnostics)"
echo "    Dikirim: BUILD_ID, server/, static/, manifest JSON, dll."
echo "    Dilewati: cache/, dev/, types/, diagnostics/, trace*, *.nft.json"
rsync -az --delete --progress \
  --exclude 'dev/' \
  --exclude 'cache/' \
  --exclude 'types/' \
  --exclude 'diagnostics/' \
  --exclude 'trace' \
  --exclude 'trace-build' \
  --exclude '*.nft.json' \
  --exclude '*.map' \
  .next/ "$DEPLOY_SERVER:$DEPLOY_PATH/.next/"

echo "==> Bersihkan cache/dev lama di server"
ssh_cmd "rm -rf '$DEPLOY_PATH/.next/dev' '$DEPLOY_PATH/.next/cache' '$DEPLOY_PATH/.next/types' '$DEPLOY_PATH/.next/diagnostics'"

echo "==> Restart PM2 $PM2_APP"
ssh_cmd "cd '$DEPLOY_PATH' && bash scripts/pm2-restart.sh"

echo "==> Deploy selesai ($DEPLOY_SERVER:$DEPLOY_PATH)"
