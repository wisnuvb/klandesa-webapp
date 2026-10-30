#!/usr/bin/env bash
# Kirim HANYA key env tertentu dari .env.production lokal ke .env server prod, lalu reload PM2.
# Tanpa build & tanpa deploy kode. Nilai env tidak pernah dicetak (hanya status NEW/CHANGED/SAME).
#
# Usage:
#   pnpm env:push:prod LINKQU_PIN LINKQU_CLIENT_ID      # tampilkan status, minta konfirmasi, terapkan
#   pnpm env:push:prod --dry-run LINKQU_PIN             # hanya tampilkan status, tidak mengubah apa pun
#   pnpm env:push:prod --yes LINKQU_PIN                 # lewati konfirmasi
#
# Pengaman: backup .env server (~/backups, chmod 600) -> tulis atomik -> pm2 reload ->
# cek semua instance online + HTTP 200 -> bila gagal, .env dikembalikan dari backup otomatis.
# Key NEXT_PUBLIC_* ditolak (nilainya ditanam saat build, bukan saat runtime).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DEPLOY_SERVER="${DEPLOY_SERVER:-ubuntu@139.99.125.212}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/html/klandesa/klandesa-webapp}"
PM2_APP="${PM2_APP:-klandesa-webapp}"
APP_PORT="${APP_PORT:-2042}"
ENV_FILE="${ENV_FILE:-.env.production}"

DRY_RUN=0
ASSUME_YES=0
KEYS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    -*) echo "Opsi tidak dikenal: $arg" >&2; exit 2 ;;
    *) KEYS+=("$arg") ;;
  esac
done

if [ "${#KEYS[@]}" -eq 0 ]; then
  echo "Sebutkan key yang mau dikirim, contoh: pnpm env:push:prod LINKQU_PIN LINKQU_CLIENT_ID" >&2
  exit 2
fi
[ -f "$ENV_FILE" ] || { echo "ERROR: $ENV_FILE tidak ada." >&2; exit 1; }

PATCH="$(mktemp)"
trap 'rm -f "$PATCH"' EXIT
chmod 600 "$PATCH"

for key in "${KEYS[@]}"; do
  [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || { echo "ERROR: nama key tidak valid: $key" >&2; exit 1; }
  case "$key" in NEXT_PUBLIC_*)
    echo "ERROR: $key adalah NEXT_PUBLIC_* (ditanam saat build) — butuh build ulang, bukan push env." >&2
    exit 1 ;;
  esac
  count="$(grep -cE "^${key}=" "$ENV_FILE" || true)"
  [ "$count" = "1" ] || { echo "ERROR: $key muncul $count kali di $ENV_FILE (harus tepat 1)." >&2; exit 1; }
  line="$(grep -E "^${key}=" "$ENV_FILE")"
  value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"; value="${value%\'}"; value="${value#\'}"
  [ -n "$value" ] || { echo "ERROR: $key kosong di $ENV_FILE." >&2; exit 1; }
  printf '%s\n' "$line" >> "$PATCH"
done

PATCH_B64="$(base64 < "$PATCH" | tr -d '\n')"

# Skrip sisi server dikirim lewat stdin (bukan argumen) supaya nilai tidak muncul di daftar proses.
REMOTE_BODY='
set -euo pipefail
export PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH"
cd "$DEPLOY_PATH"
[ -f .env ] || { echo "ERROR: .env tidak ada di $DEPLOY_PATH" >&2; exit 1; }

patch="$(mktemp)"; newenv=""
trap '"'"'rm -f "$patch" "$newenv"'"'"' EXIT
printf %s "$PATCH_B64" | base64 -d > "$patch"

getval() { grep -E "^$1=" "$2" | head -1 | cut -d= -f2- | sed -e "s/^[\"'"'"']//" -e "s/[\"'"'"']$//" || true; }

changed=0
for key in $KEYS; do
  new="$(getval "$key" "$patch")"
  if ! grep -qE "^$key=" .env; then st=NEW; changed=1
  elif [ "$(getval "$key" .env)" = "$new" ]; then st=SAME
  else st=CHANGED; changed=1; fi
  echo "  $key: $st"
done

[ "$MODE" = "status" ] && exit 0
[ "$changed" = "1" ] || { echo "Tidak ada perubahan; selesai."; exit 0; }

mkdir -p ~/backups
backup="$HOME/backups/klandesa-env-$(date +%Y%m%d%H%M%S).bak"
cp -p .env "$backup"; chmod 600 "$backup"
echo "Backup: $backup"

newenv="$(mktemp .env.new.XXXXXX)"
awk -v patchfile="$patch" '"'"'
  BEGIN { while ((getline l < patchfile) > 0) { i = index(l, "="); k = substr(l, 1, i - 1); val[k] = l; order[++n] = k } }
  {
    i = index($0, "="); k = (i > 0) ? substr($0, 1, i - 1) : ""
    if (k in val) { if (!(k in done)) { print val[k]; done[k] = 1 } ; next }
    print
  }
  END { for (j = 1; j <= n; j++) if (!(order[j] in done)) print val[order[j]] }
'"'"' .env > "$newenv"
chmod --reference=.env "$newenv"
for key in $KEYS; do
  [ "$(grep -cE "^$key=" "$newenv")" = "1" ] || { echo "ERROR: verifikasi $key gagal; .env tidak diubah." >&2; exit 1; }
done
mv "$newenv" .env; newenv=""

rollback() {
  echo "GAGAL — mengembalikan .env dari backup" >&2
  cp -p "$backup" .env
  pm2 reload ecosystem.config.js --only "$PM2_APP" --env production --update-env >/dev/null 2>&1 || true
}

pm2 reload ecosystem.config.js --only "$PM2_APP" --env production --update-env >/dev/null 2>&1 || { rollback; exit 1; }
sleep 10
online="$(pm2 jlist 2>/dev/null | node -e '"'"'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s).filter(p=>p.name===process.argv[1]);console.log(a.filter(p=>p.pm2_env.status==="online").length+"/"+a.length)})'"'"' "$PM2_APP")"
code="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$APP_PORT/auth/signin" || true)"
echo "PM2 online: $online ; HTTP $code"
on="${online%/*}"; tot="${online#*/}"
if [ "$code" != "200" ] || [ "$on" != "$tot" ] || [ "$tot" = "0" ]; then rollback; exit 1; fi
echo "Selesai: env diterapkan."
'

run_remote() {
  { printf 'PATCH_B64=%q\nKEYS=%q\nMODE=%q\nDEPLOY_PATH=%q\nPM2_APP=%q\nAPP_PORT=%q\n' \
      "$PATCH_B64" "${KEYS[*]}" "$1" "$DEPLOY_PATH" "$PM2_APP" "$APP_PORT"
    printf '%s\n' "$REMOTE_BODY"
  } | ssh -o BatchMode=yes "$DEPLOY_SERVER" 'bash -s'
}

echo "==> Status key vs .env server ($DEPLOY_SERVER:$DEPLOY_PATH/.env)"
run_remote status

[ "$DRY_RUN" = "1" ] && { echo "(dry-run: tidak ada yang diubah)"; exit 0; }

if [ "$ASSUME_YES" != "1" ]; then
  read -r -p "Terapkan ke server prod? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Dibatalkan."; exit 1; }
fi

echo "==> Terapkan"
run_remote apply
