---
name: run-klandesa-mobile
description: Build, run, drive, and screenshot the Klandesa mobile app (Expo/React Native) on the Android emulator as a native dev build (not Expo Go). Use when asked to run, start, test on emulator/HP, tap through, or screenshot the mobile app (Warga feed, staff Beranda, login).
---

Aplikasi mobile Klandesa (`mobile/`, Expo SDK 58, expo-router) dijalankan sebagai **build native debug** di emulator Android, bukan Expo Go. Kendalinya `driver.sh` (adb + uiautomator). Path di bawah relatif terhadap `mobile/`; backend Next.js ada di root repo.

Diverifikasi di macOS (Apple Silicon), emulator Pixel 3a API 34, 2026-10-29. iOS belum dicoba (Xcode tidak terpasang).

## Prasyarat
- Android SDK di `~/Library/Android/sdk` dengan AVD `Pixel_3a_API_34_extension_level_7_arm64-v8a` (ganti lewat env `AVD`), JDK 17 (zulu-17).
- Backend dev hidup di `:2042` (`npm run dev` di root repo) dan DB MySQL lokal berisi desa id 1. `app-up` menolak jalan kalau backend mati.
- `npx tsx` tersedia di root (dipakai `seed`/`clean`).

## Jalur agen (pakai ini)
```bash
D=.claude/skills/run-klandesa-mobile/driver.sh
$D emu-up                 # emulator 4 inti/4 GB (±25 dtk bila sudah di-cache)
$D seed                   # 45 postingan + akun uji; juga menyalakan image server :8099
$D app-up                 # expo run:android pada Metro :8187; build pertama berminat menit
$D ss 01-launch           # screenshot -> $TMPDIR/klandesa-mobile-driver/shots/01-launch.png (path dicetak); lihat dengan Read
$D texts                  # semua teks/content-desc di layar + koordinat pusatnya
$D tap-text "Masuk"       # tap elemen berdasar label (persis > berakhiran > memuat)
$D tap 579 742; $D type ujiemulator; $D key KEYCODE_BACK; $D swipe up|down
$D font 1.5               # uji huruf besar (kembalikan: $D font 1.0)
$D relaunch | $D reset    # force-stop+buka | hapus data app (kembali ke layar awal)
$D clean; $D down         # hapus data uji; matikan Metro 8187 + image server
```
Login warga uji: kolom "Email" menerima username **`ujiemulator`**, password **`UjiEmulator#2026`**. Staf: `uji.emulator@klandesa.test`, password sama. Langkah login yang terbukti: `tap 579 742` → `type ujiemulator` → `tap 548 1010` → `type 'UjiEmulator#2026'` → `key KEYCODE_BACK` (tutup keyboard) → `tap-text "Masuk"` → Beranda warga. Lalu `tap-text "Warga"` → layar Aturan komunitas → `tap-text "Saya setuju"` → feed "Untuk Anda | Terbaru". `tap-text "Suka"` mengubah label jadi "Batal suka, 30 suka" (dari 29).

Selalu **lihat** screenshot (Read pada PNG). Koordinat adb dalam piksel asli (1080×2220), sedangkan tampilan gambar diperkecil ×0,9 — pakai `texts` untuk koordinat, jangan menebak dari gambar.

## Jalur manusia
`cd mobile && EXPO_PUBLIC_API_URL=http://localhost:2042 npx expo run:android`, lalu `adb reverse tcp:2042 tcp:2042`. Tidak berguna tanpa layar.

## Gotchas
- **Jangan Metro 8081.** Itu milik pemilik; driver memakai `:8187` dan hanya mematikan miliknya sendiri.
- **API lewat `localhost` + `adb reverse`.** `mobile/.env` menunjuk IP LAN (`192.168.1.2`), tidak terjangkau emulator; `app-up` menimpa `EXPO_PUBLIC_API_URL=http://localhost:2042` hanya untuk proses build. Gambar uji juga lewat `adb reverse :8099`.
- **AVD bawaan 1 inti/1,5 GB** → ANR berantai, app tidak mau start. `emu-up` memaksa `-memory 4096 -cores 4` lewat argumen (konfigurasi AVD tidak diubah). Bila emulator macet/mati paksa, hapus `~/.android/avd/*.avd/*.lock` dan `pkill -f qemu` sebelum `emu-up`.
- **App lain di emulator bisa memunculkan dialog ANR** dan menutupi layar (mis. `com.example.intifit`): `adb shell am force-stop <paket>` lalu buka app lagi.
- `uiautomator` tidak melihat isi `Text` yang kosong dan melaporkan tombol sebagai `", Masuk"` (ikon + label); `tap-text` mengurus ini dengan peringkat kecocokan. Subjudul yang memuat kata sama ("Masuk untuk mengurus…") bukan target.
- `adb shell input text` tidak mendukung spasi mentah (driver mengganti dengan `%s`); karakter seperti `#` aman.
- **Ubah font scale saat app terbuka** memunculkan LogBox "multiple navigation containers" (`fontScale` tidak ada di `configChanges`; bukan bug fitur). Ubah font lalu `relaunch`.
- `seed` menolak jalan bila data uji sudah ada ("jalankan clean dulu"). Data hanya menyentuh penulis id ≥ 900001, akun `ujiemulator`, dan email uji; `clean` menghapus semuanya.
- Jangan pipe `driver.sh` ke `tail` untuk perintah yang menyalakan proses latar (`seed`, `emu-up`): pipa bisa menggantung sampai proses anak berhenti. Alihkan ke berkas (`> out.txt 2>&1 </dev/null`).
- `android/` hasil prebuild ada di `.gitignore`; jangan di-commit.

## Troubleshooting
- `adb: device not found` → emulator mati; `emu-up`.
- `backend :2042 mati` → jalankan `npm run dev` di root repo.
- Layar putih / "Unable to load script" → Metro 8187 mati atau `adb reverse` hilang; `app-up` ulang (cepat, build sudah ter-cache).
- `BUILD FAILED` → ekor `build.log` dicetak otomatis; log penuh di `$TMPDIR/klandesa-mobile-driver/build.log`.
