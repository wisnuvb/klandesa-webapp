#!/usr/bin/env bash
# Driver emulator Android untuk app mobile Klandesa (build native debug, BUKAN Expo Go).
# Jalankan dari mana saja: .claude/skills/run-klandesa-mobile/driver.sh <perintah> [arg]
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE="$(cd "$HERE/../../.." && pwd)"
ROOT="$(cd "$MOBILE/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$JAVA_HOME/bin:$PATH"

AVD="${AVD:-Pixel_3a_API_34_extension_level_7_arm64-v8a}"
PKG=id.klandesa.app.dev
METRO_PORT="${METRO_PORT:-8187}"          # 8081 biasanya dipakai Metro milik pemilik; jangan disentuh
API_PORT=2042
IMG_PORT=8099
WORK="${WORK:-${TMPDIR:-/tmp}/klandesa-mobile-driver}"
SHOTS="${SHOTS:-$WORK/shots}"
mkdir -p "$WORK" "$SHOTS"

tsx() { (cd "$ROOT" && NODE_PATH="$ROOT/node_modules" npx --no-install tsx --tsconfig tsconfig.json "$@"); }
booted() { [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; }
dump() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb exec-out cat /sdcard/ui.xml; }

cmd="${1:-help}"; shift || true
case "$cmd" in
  emu-up)   # nyalakan emulator dengan 4 inti/4 GB (AVD bawaan 1 inti/1,5 GB membuat sistem macet)
    if ! booted; then
      (nohup emulator -avd "$AVD" -no-snapshot-save -no-boot-anim -netdelay none -netspeed full -gpu auto -memory 4096 -cores 4 >"$WORK/emulator.log" 2>&1 &)
      sleep 5; adb wait-for-device
      for _ in $(seq 1 90); do booted && break; sleep 3; done
    fi
    booted && echo "emulator siap: $(adb devices | awk 'NR==2{print $1}')" || { echo "emulator gagal boot, lihat $WORK/emulator.log"; exit 1; } ;;

  seed)     # 45 postingan + akun warga `ujiemulator` + staf uji.emulator@klandesa.test (kata sandi di keluaran JSON)
    (cd "$HERE" && nohup node imgserver.mjs >"$WORK/imgserver.log" 2>&1 </dev/null &)
    tsx "$HERE/seed.ts" ;;

  app-up)   # build + pasang + jalankan (prebuild otomatis membuat android/ yang di-gitignore); pertama kali ±5-10 menit
    curl -s -o /dev/null -m 5 "http://localhost:$API_PORT/api/mobile/v1/social/config" || { echo "backend :$API_PORT mati; jalankan 'npm run dev' di root repo"; exit 1; }
    booted || { echo "emulator belum nyala: jalankan emu-up"; exit 1; }
    adb reverse tcp:$API_PORT tcp:$API_PORT >/dev/null; adb reverse tcp:$IMG_PORT tcp:$IMG_PORT >/dev/null
    cd "$MOBILE"
    export EXPO_PUBLIC_API_URL="http://localhost:$API_PORT" EXPO_NO_TELEMETRY=1
    (nohup npx expo run:android --port "$METRO_PORT" --device emulator-5554 >"$WORK/build.log" 2>&1 &)
    for _ in $(seq 1 200); do
      grep -q "BUILD SUCCESSFUL" "$WORK/build.log" 2>/dev/null && break
      grep -qE "BUILD FAILED|error:" "$WORK/build.log" 2>/dev/null && { tail -30 "$WORK/build.log"; exit 1; }
      sleep 5
    done
    for _ in $(seq 1 60); do grep -q "Bundled" "$WORK/build.log" 2>/dev/null && break; sleep 5; done
    echo "app jalan (Metro :$METRO_PORT, log $WORK/build.log)" ;;

  relaunch) adb shell am force-stop $PKG; sleep 2; adb shell am start -n $PKG/.MainActivity >/dev/null; sleep "${1:-25}"; echo "relaunch ok" ;;
  reset)    adb shell pm clear $PKG >/dev/null; adb reverse tcp:$API_PORT tcp:$API_PORT >/dev/null; adb reverse tcp:$IMG_PORT tcp:$IMG_PORT >/dev/null
            adb shell am start -n $PKG/.MainActivity >/dev/null; sleep "${1:-30}"; echo "data app dihapus, app dibuka" ;;

  ss)       out="$SHOTS/${1:-shot}.png"; adb exec-out screencap -p >"$out"; echo "$out" ;;
  texts)    dump | node "$HERE/ui.mjs" texts ;;
  tap)      adb shell input tap "$1" "$2" ;;
  tap-text) xy=$(dump | node "$HERE/ui.mjs" find "$1") || { echo "tidak ada elemen memuat: $1"; exit 1; }
            adb shell input tap $xy; echo "tap '$1' @ $xy" ;;
  swipe)    # swipe up|down [panjang]  -- gulir isi layar
            case "${1:-up}" in up) adb shell input swipe 540 1700 540 500 600;; down) adb shell input swipe 540 600 540 1500 500;; esac ;;
  type)     adb shell input text "$(printf '%s' "$1" | sed 's/ /%s/g')" ;;
  key)      adb shell input keyevent "$1" ;;       # mis. KEYCODE_BACK, KEYCODE_ENTER
  font)     adb shell settings put system font_scale "${1:-1.0}" ;;   # 1.5 untuk uji huruf besar; kembalikan ke 1.0 setelahnya

  clean)    tsx "$HERE/clean.ts"; pkill -f "node imgserver.mjs" || true ;;
  down)     pkill -f "expo run:android --port $METRO_PORT" || true; pkill -f "expo.*start.*$METRO_PORT" || true
            pkill -f "node imgserver.mjs" || true; adb shell settings put system font_scale 1.0 2>/dev/null || true
            echo "Metro $METRO_PORT & image server berhenti (emulator dibiarkan; 'adb emu kill' untuk mematikan)" ;;
  *)        sed -n '2,3p' "$0"; echo "perintah: emu-up seed app-up relaunch reset ss texts tap tap-text swipe type key font clean down" ;;
esac
