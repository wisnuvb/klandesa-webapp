#!/usr/bin/env bash
# Restart hanya app klandesa-webapp — jangan sentuh proses PM2 lain di server yang sama.
set -euo pipefail

PM2_APP="${PM2_APP:-klandesa-webapp}"

if ! pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  echo "App '$PM2_APP' belum terdaftar di PM2. Jalankan sekali:"
  echo "  pm2 start ecosystem.config.js --only $PM2_APP --env production"
  echo "  pm2 save"
  exit 1
fi

pm2 restart ecosystem.config.js --only "$PM2_APP" --env production --update-env
echo "PM2: $PM2_APP restarted (proses lain tidak disentuh)."
