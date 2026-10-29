# Review Keamanan API `/api/mobile/v1` — 2026-10-22

Cakupan: 56 route di `app/api/mobile/v1/*` dan pustaka `lib/mobile/*` (auth, sesi, RBAC staf, IDOR, rate limit, unggahan, sosial desa, hapus akun).
Metode: **tinjauan kode statis + tes unit**. Belum ada uji dinamis (tidak ada server/DB yang dijalankan), uji penetrasi, atau uji beban. Hasil di bawah adalah apa yang terlihat di kode, bukan jaminan keamanan menyeluruh — ulangi pada staging sebelum membuka ke warga.

## Ringkasan
- **Ditemukan 3 masalah tinggi, 7 sedang** → seluruhnya **sudah diperbaiki di commit ini** (kecuali yang ditandai *terbuka*).
- Kontrol akses antar-akun (IDOR): **tidak ditemukan celah**. Setiap pembacaan/ubahan yang memakai `id` dari klien didahului pencarian yang dibatasi `villageId` dan pemilik (`residentId`/`accountId`/`authorId`), atau memakai `updateMany` dengan kondisi yang sama.
- Setiap route selain 9 endpoint publik yang disengaja (`config`, `villages/search`, `auth/login|refresh|logout|register/*|password/reset`) memanggil `requireMobileContext`/`requireStaff`/`requireSocial`.

## Temuan dan status

| # | Tingkat | Temuan | Status |
|---|---------|--------|--------|
| H1 | Tinggi | **Rate limit di memori tidak efektif di produksi.** `ecosystem.config.js` memakai PM2 *cluster* 8 worker; tiap worker punya penghitung sendiri, jadi batas login/registrasi/reset efektif ×8 dan hilang saat restart. | **Diperbaiki**: tabel `mobile_rate_limits` + `checkRateLimitDb` (atomik, lintas worker) dipakai untuk login, registrasi, reset password, hapus akun, lihat NIK, kode aktivasi, kuota unggah. Migrasi `20261022150000`. |
| H2 | Tinggi | **IP klien bisa dipalsukan.** `clientIp` mengambil entri *pertama* `X-Forwarded-For`, yang dikendalikan klien bila Nginx hanya menambahkan ke daftar. Penyerang bisa mengganti IP tiap percobaan dan melewati batas per-IP. | **Diperbaiki**: utamakan `X-Real-IP`, fallback entri *terakhir* XFF. **Wajib di server:** Nginx `proxy_set_header X-Real-IP $remote_addr;`. |
| H3 | Tinggi | **Hapus akun tidak menghapus konten sosial** (postingan, komentar, like, simpanan, blokir, laporan) dan foto di penyimpanan — bertentangan dengan halaman `/hapus-akun` dan syarat Google Play/UU PDP. | **Diperbaiki**: dihapus dalam satu transaksi, hitungan like/komentar pada postingan orang lain dihitung ulang, foto postingan dihapus dari Spaces (best-effort). Foto laporan tetap sebagai arsip desa (dinyatakan di halaman penghapusan). |
| M1 | Sedang | **Enumerasi username** lewat respons login: pesan "dikunci", `attemptsLeft`, dan status berbeda hanya muncul untuk akun yang ada. | **Diperbaiki**: satu pesan 401 untuk semua kegagalan (tak dikenal / salah / terkunci), tanpa `attemptsLeft`; batas per (IP+identitas) berlaku sama untuk identitas ada maupun tidak. |
| M2 | Sedang | **Login perangkat desa tanpa pelindung brute-force** selain batas IP; waktu respons berbeda untuk email tak dikenal (tanpa `bcrypt`). | **Diperbaiki**: batas per (IP+email) lewat DB, perbandingan hash tiruan untuk email tak dikenal. |
| M3 | Sedang | **Kunci JWT mobile = `AUTH_SECRET`** (dipakai juga oleh sesi web). Dipisahkan hanya oleh `aud`. | **Diperbaiki**: kunci turunan HMAC khusus mobile; token bertanda `AUTH_SECRET` langsung ditolak (ada tes). |
| M4 | Sedang | **Unggahan tanpa kuota harian**: 30 presign/10 menit × 2,5 MB per akun dapat menghabiskan penyimpanan; objek yatim tak pernah dihapus. | **Diperbaiki sebagian**: kuota 40 foto/hari/akun; foto dihapus saat postingan/akun dihapus. *Terbuka*: foto yang diunggah lalu tidak pernah dipakai (yatim) belum dibersihkan — buat job pembersih periodik (hapus objek `mobile-*` yang tidak direferensikan > 24 jam). |
| M5 | Sedang | **Spam permohonan surat** tanpa batas harian (membanjiri staf dengan push). | **Diperbaiki**: maks 10 permohonan/hari/warga. |
| M6 | Sedang | **Penarikan data massal lewat Cari Warga** (60 pencarian/mnt × 20 hasil) oleh akun staf yang bocor. | **Diperbaiki sebagian**: 30/mnt per staf, setiap pencarian dicatat di AuditLog (tanpa isi kueri). *Terbuka*: pantau log `search` yang tidak wajar; pertimbangkan batas per hari. |
| M7 | Sedang | **Backup Android** dapat menyertakan data aplikasi (token tersimpan). | **Diperbaiki**: `android.allowBackup: false`. |
| L1 | Rendah | Kode aktivasi yang sudah "diklaim" hangus bila pembuatan akun melempar error. | **Diperbaiki** (pemakaian dikembalikan). Ditambah batas tebak 8×/jam per NIK. |
| L2 | Rendah | QR absensi ditandatangani dengan `"your-secret-key"` bila `AUTH_SECRET` kosong → bisa dipalsukan (warisan kode web). | **Diperbaiki (mobile + web)**: fallback dihapus dari `lib/auth.ts` dan `/api/attendance/{qr,scan,check-in}`; semua memakai `requireAuthSecret()` yang gagal tertutup (login/QR menjawab 500/503, verifikasi token menolak) bila `AUTH_SECRET`/`NEXTAUTH_SECRET` kosong di produksi. Dicek saat dipakai, bukan saat modul dimuat, jadi `next build` tanpa env tetap jalan. |
| L3 | Rendah | HTML surat (`contentHtml`, dibuat di web dari isian termasuk teks warga) dicetak di perangkat tanpa sanitasi. | **Diperbaiki**: dibungkus CSP `default-src 'none'` sehingga skrip/iframe/koneksi keluar tidak berjalan. *Disarankan*: escape isian warga saat HTML surat dirakit di web. |
| L4 | Rendah | Tabel sesi/penghitung tumbuh tanpa batas. | **Diperbaiki**: pembersihan oportunistik (sesi > 30 hari kedaluwarsa/dicabut, penghitung > 24 jam). |

## Risiko yang diterima / dicatat (tidak diubah)
1. **Akses token 15 menit setelah dicabut.** Logout/reset password mencabut refresh token; access token yang sudah terbit tetap berlaku ≤ 15 menit. Status akun/peran/desa diperiksa ulang di DB pada *setiap* permintaan, jadi akun yang dinonaktifkan langsung terkunci.
2. **Registrasi mandiri memakai NIK + tanggal lahir + nama ibu.** Kerabat yang tahu ketiganya bisa mendaftar atas nama seseorang. Mitigasi ada (mode persetujuan desa, batas 5×/jam per NIK lintas worker, audit, NIK tidak pernah tampil penuh). Rekomendasi desa pilot: mode `approval` + kode aktivasi sebagai jalur utama.
3. **Pencarian desa publik** (`villages/search`) mengungkap daftar desa pelanggan ke siapa saja (≥3 huruf, 40/mnt). Diperlukan untuk pendaftaran; pertimbangkan hanya menampilkan desa yang tidak `closed`.
4. **Absensi GPS dipercaya dari klien** (`accuracy`, `mocked`). Aplikasi lokasi palsu yang menyembunyikan flag `mocked` tidak terdeteksi. Perlu Play Integrity bila absensi dipakai untuk tunjangan.
5. **Penghentian massal oleh 3 akun** (3 laporan menyembunyikan konten): akun warga harus terverifikasi; moderator bisa memulihkan. Risiko brigading rendah di skala desa.
6. **Foto Spaces berACL publik** dengan nama acak (UUID). Tidak bisa ditebak, tetapi siapa pun yang memegang URL bisa membukanya. Pindah ke bucket privat + URL bertanda tangan bila ada kebutuhan privasi lebih ketat.
7. **Ukuran body JSON tidak dibatasi di aplikasi.** Batasi di Nginx (`client_max_body_size 1m` untuk `/api/mobile/`).
8. **Tidak ada pin sertifikat TLS** di app (cukup untuk HTTPS standar; lalu lintas cleartext diblokir Android di build rilis).

## Checklist sebelum uji lapangan
- [ ] `AUTH_SECRET` terisi di server (≥ 32 karakter acak). Tanpa ini token mobile tidak bisa dibuat dan QR absensi mobile ditolak.
- [ ] Nginx: `proxy_set_header X-Real-IP $remote_addr;` dan jangan meneruskan `X-Real-IP` dari klien; `client_max_body_size 1m;` untuk `/api/mobile/`.
- [ ] Terapkan 6 migrasi **berurutan** di staging dulu: `20261022100000` → `110000` → `120000` → `130000` → `140000` → `150000`.
- [ ] `SPACES_*` terisi; CORS bucket mengizinkan `PUT` dari app (app native tidak butuh origin, tetapi uji unggah foto); `EXPO_ACCESS_TOKEN` untuk push (opsional tetapi disarankan).
- [ ] Uji manual per peran: warga A tidak bisa membuka `/mail/requests/{id}`, `/reports/{id}`, `/social/posts/{id}` milik warga lain/desa lain; staf desa A tidak bisa mengakses data desa B (coba mengganti `{id}`).
- [ ] Uji ketahanan login: 9 percobaan salah dari satu IP harus 429 seragam untuk username ada maupun tidak ada; cek tidak ada beda pesan.
- [ ] Hapus akun uji: pastikan postingan, komentar, like, dan foto hilang.
- [x] Fallback `"your-secret-key"` sudah dihapus (web & mobile). **Catatan rilis:** token login web lama yang ditandatangani dengan kunci bawaan tidak berlaku lagi; pengguna perlu login ulang, dan QR absensi yang masih tampil di layar perlu dimuat ulang.


## Tambahan 2026-10-24 (Fase B dan C) — belum ditinjau ulang secara dinamis
Route baru: `village/profile|budget-summary`, `benefits/mine`, `me/data-changes`, `staff/village-info`, `staff/data-changes[/:id/decision]`, `rt/*`, `staff/rt-assignments[/:id]`, halaman publik `/verifikasi-surat/<token>`. Ditinjau lewat kode dan tes unit saja.
- Semua route memakai `requireMobileContext`/`requireStaff`/`requireRt`; query selalu memuat `villageId` dari token, bukan dari klien. `requireRt` membaca penugasan RT dari DB di setiap permintaan (pencabutan berlaku langsung).
- RT lain / RW lain / desa lain mendapat 404 yang sama dengan "tidak ada" (tidak membocorkan keberadaan permohonan).
- NIK/KK selalu tersamar di semua DTO RT dan antrean koreksi. `benefits/mine` mengambil NIK dari akun.
- Koreksi data: kolom identitas tidak diterapkan otomatis; kolom otomatis dibatasi daftar putih di server.
- Token verifikasi surat: HMAC dari `AUTH_SECRET` (kunci turunan khusus), perbandingan waktu-konstan, pesan gagal tunggal. Halaman publik tanpa pembatas laju; pertimbangkan batas di Nginx bila ada penyalahgunaan.
- Terbuka: `rt/residents` memberi daftar warga RT (tersamar); pencarian dibatasi 40/menit tetapi belum dicatat di AuditLog (RT bukan akun staf). Pertimbangkan tabel audit untuk akses RT.

## Tambahan 2026-10-29 (Iuran & Kas) — belum ditinjau dinamis
Route baru: `fees/*` (jadwal, tagihan, pembayaran, kas, rekap, laporan; `?scope=rt|desa`), `me/fees`, `me/fees/:id/claim`, `me/fees/kas`, `cron/fees`.
- Pelaku dari token: `scope=rt` → `requireRt` (penugasan RT dari DB), `scope=desa` → `requireStaff("finance")`. Semua akses jadwal/tagihan/pembayaran melalui `ownSchedule/ownCharge` (cakupan RT/RW atau desa); di luar cakupan = 404 yang sama dengan tidak ada.
- Warga hanya melihat/melapor tagihan KK miliknya (`kk` dari data akun, villageId dari token). Nominal pembayaran dibatasi sisa tagihan; laporan menunggu maks. 3 per tagihan; konfirmasi bersyarat (hanya satu yang berhasil) dan tidak boleh melebihi nominal tagihan.
- URL foto bukti/nota/QRIS hanya dari unggahan desa ini (`mobile-fees`); kuota unggah harian yang sama.
- Kas yang dibatalkan tidak dihapus (jejak), dan tidak dihitung. CSV menetralkan rumus (`=`, `+`, `-`, `@`).
- Terbuka: tidak ada AuditLog untuk aksi Ketua RT (bukan akun staf); pembayaran/penghapusan oleh bendahara hanya tercatat di kolom `recordedBy*`. Job `cron/fees` memakai `CRON_SECRET` (bandingkan string biasa, sama dengan job lain).
- Uang: Klandesa tidak memegang dana; tidak ada pembayaran online.

## Tambahan 2026-10-29 (penutupan celah) — belum ditinjau dinamis
- **Selesai:** aksi Ketua RT (setuju/tolak surat) dan seluruh aksi iuran/kas (jadwal, catat/konfirmasi/tolak bayar, bebaskan, kas, batal kas) kini masuk `audit_logs`.
  Staf lewat `userId`; Ketua RT lewat `metadata.actor` (`{type:"rt", residentId, name, rt, rw}`) karena `AuditLog.userId` hanya untuk staf. Kegagalan mencatat tidak menggagalkan aksi (sama dengan audit staf).
- **Selesai:** `CRON_SECRET` dibandingkan dengan `timingSafeEqual` (hash SHA-256 kedua sisi, jadi panjang tidak bocor). Berlaku untuk `cron/fees` dan `cron/sync-regional-news`.
- Route baru web `GET /api/iuran/overview`: sesi desa + izin `rtrw` + modul `partisipasi-rtrw`; hanya agregat per RT/desa (tanpa nama warga).
- Route baru `GET /api/regional/mobile-usage`: sesi regional, hanya desa yang ikut agregat; hanya jumlah akun.
- Route baru `POST /api/mobile/v1/telemetry/crash` (publik, tanpa login): dibatasi 20/menit/IP (di memori per worker) dan 16 KB; teks disamarkan di server (email, token, deret angka ≥ 9 digit) dan hanya ditulis ke log (`mobile_crash`), tidak ke DB. Risiko: bisa dibanjiri laporan palsu yang mengisi log (dampak rendah); pertimbangkan pembatas di Nginx.
- Terbuka: pembatas laju crash memakai memori per worker (batas efektif = batas × jumlah worker).
