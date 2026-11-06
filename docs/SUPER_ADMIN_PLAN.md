# Konsol Super Admin (Owner) Klandesa — Rencana & Kontrak

Dibuat 2026-11-06. Tujuan: halaman `/admin` jadi konsol owner untuk (1) memantau revenue & statistik, (2) troubleshoot data
sederhana lintas desa, (3) intervensi akun (reset sandi, nonaktifkan, paksa keluar, dll) dengan jejak audit lengkap.

## Kondisi awal (sebelum pekerjaan ini)
`/admin` sudah punya: desa, mitra, referral, pemda, kanal pembayaran, blog, templat. Sisi akun: hanya endpoint kredit AI tanpa UI.
Belum ada: reset sandi/nonaktifkan akun pengguna desa, pencarian lintas desa, detail desa, dasbor revenue, jejak audit platform,
2FA, manajemen admin platform.

## Keputusan
- Reset sandi = **kirim tautan atur sandi** ke email pengguna (sudah ada: `deliverAccessLink` di `lib/rbac/access-links.ts`).
  TIDAK PERNAH menampilkan/menetapkan sandi. Bila email gagal terkirim, tautan manual dikembalikan SEKALI ke admin (jangan simpan/log).
- Impersonasi penuh ("masuk sebagai desa") **tidak dibuat** (risiko besar). Gantinya: **Inspektur Desa baca-saja** di halaman
  Desa 360 (ringkasan, akun, kesehatan data, aktivitas) dengan data pribadi disamarkan.
- Aksi berisiko: konfirmasi ulang sandi admin (`requireStepUp`) + alasan wajib + jejak audit (`auditPlatform`).
- Tidak ada deploy / commit / `prisma db push` ke DB bersama dalam pekerjaan ini. SQL migrasi: `docs/PHASE13_SUPER_ADMIN_MIGRATION.sql` (+ROLLBACK).

## Fondasi yang SUDAH ada (jangan diubah tanpa lapor; baca dulu)
| Berkas | Fungsi |
|---|---|
| `prisma/schema.prisma` | `PlatformAuditLog`, `PlatformAuthToken`, kolom 2FA di `PlatformUser` (`totpSecretEnc`, `totpEnabledAt`, `recoveryCodeHashes`). **Hanya pemilik rencana ini yang mengubah skema**; butuh kolom/tabel baru → minta lewat laporan akhir. |
| `app/api/admin/_auth.ts` → `requirePlatformSession(req)` | Guard wajib SEMUA rute `/api/admin/*`. Mengembalikan `{ok, admin:{platformUserId,email,name,role}}`. |
| `lib/platform/audit.ts` | `auditPlatform(req, actor, entry)` (gagal ≠ batal) dan `auditPlatformStrict` (melempar). Aktor: `{platformUserId: auth.admin.platformUserId, email: auth.admin.email}`. |
| `lib/platform/step-up.ts` | `requireStepUp(platformUserId, body.confirmPassword)` → `{ok:true}` atau `{ok:false,response}` (403/429). |
| `components/admin/StepUpDialog.tsx` | Dialog klien standar: dampak + alasan + sandi → `onConfirm({confirmPassword, reason})`; lempar Error untuk menampilkan pesan di dialog. |
| `lib/rbac/access-links.ts`, `lib/session-version.ts` | Tautan atur sandi; `sessionVersion++` mencabut sesi web. |
| `lib/mobile/rate-limit.ts` | `checkRateLimitDb(limiterKey(...), {max, windowMs})`. |
| `components/layout/Sidebar.tsx` | Menu platform SUDAH memuat: `/admin` (Dasbor Owner), `/admin/akun`, `/admin/desa`, `/admin/pendapatan`, `/admin/mitra`, `/admin/blog`, `/admin/pembayaran`, `/admin/audit`, `/admin/keamanan`. Jangan edit lagi (lapor bila butuh item). |

## Aturan wajib untuk SETIAP endpoint/halaman baru
1. Rute di `app/api/admin/**` memakai `requirePlatformSession` di AWAL setiap handler (tes `tests/api-guard-coverage.test.ts` memeriksanya).
2. Mutasi berisiko: parse body → `requireStepUp(admin.platformUserId, body.confirmPassword)` → validasi `reason` (string 5–300 karakter) →
   lakukan aksi → `auditPlatform(...)`. Aksi yang mengeluarkan akses (tautan atur sandi, 2FA) memakai `auditPlatformStrict` SEBELUM efek.
3. Membaca data pribadi sensitif (NIK utuh, telepon, email penuh warga) = tindakan beraudit (`*.view_sensitive`) + step-up. Bawaan: disamarkan.
4. Jejak audit & respons: JANGAN memuat sandi, token, tautan atur sandi, hash, secret 2FA, NIK utuh.
5. Semua daftar BERBATAS (`take` ≤ 100, paginasi kursor/halaman); pencarian memakai kolom berindeks atau awalan; tanpa `findMany` tanpa batas.
   Hitungan agregat memakai `groupBy`/`count`, bukan memuat baris. Query berat dibungkus cache singkat (`lib/ttl-cache`).
6. Nilai dari input divalidasi (angka bulat positif, enum, panjang). Mutasi memakai transaksi bila lebih dari satu tulis.
7. Pesan galat & UI Bahasa Indonesia. Jangan bocorkan stack/SQL.
8. Aksi pada akun yang menjadi target: tolak bila target = diri sendiri untuk aksi "nonaktifkan admin platform" (tidak boleh mengunci diri), dan jangan biarkan admin platform aktif terakhir dinonaktifkan/diturunkan.

## Katalog aksi audit (gunakan nama ini; tambah bila perlu lalu catat di sini)
`account.reset_link`, `account.deactivate`, `account.activate`, `account.force_logout`, `account.change_email`, `account.change_role`, `account.ai_credits`,
`account.unlock`, `account.view_sensitive`, `citizen.reset_code`, `citizen.unlock`, `resident.view_sensitive`,
`village.subscription_extend`, `village.subscription_set`, `village.deactivate`, `village.activate`, `village.view_sensitive`,
`admin.create`, `admin.invite`, `admin.deactivate`, `admin.activate`, `admin.force_logout`, `admin.reset_link`, `admin.2fa_enable`, `admin.2fa_disable`, `admin.2fa_reset`, `admin.2fa_recovery_regenerate`, `admin.password_change`, `admin.login`, `admin.login_failed`, `admin.unlock`, `account.search`, `resident.search`,
`partner.*`, `disbursement.*`, `payment_channel.*`, `referral.*`, `theme_pack.*`, `app_template.*`, `blog.*`, `regional_user.*` (retrofit rute lama).

## Paket kerja & kepemilikan berkas (tidak boleh tumpang tindih)
| Paket | Isi | Berkas milik |
|---|---|---|
| **A. Pusat Akun** | Cari akun lintas desa (pengguna desa, akun warga mobile) + warga baca-saja; detail; aksi intervensi | `app/api/admin/accounts/**`, `app/(app)/admin/akun/**`, `lib/platform/accounts/**`, `components/admin/accounts/**`; migrasi UI `api/admin/users/[id]/ai-credits` ke aksi di Pusat Akun (rute lama dipertahankan) |
| **B. Desa 360** | Detail desa, langganan (perpanjang/ubah paket/status), aktif/nonaktif desa, Inspektur Desa baca-saja, kesehatan data, tagihan desa, aktivitas | `app/api/admin/villages/[id]/**`, `app/(app)/admin/desa/**` (tambah `[id]/page.tsx`, tautkan baris daftar), `lib/platform/villages/**`, `components/admin/villages/**` |
| **C. Dasbor Owner & Pendapatan** | KPI, revenue, langganan jatuh tempo, pertumbuhan, konversi trial, komisi mitra, penggunaan | `app/api/admin/overview/**`, `app/api/admin/revenue/**`, `app/(app)/admin/page.tsx` (tulis ulang), `app/(app)/admin/pendapatan/**`, `lib/platform/metrics/**`, `components/admin/metrics/**` |
| **D. Keamanan & Admin Platform** | TOTP 2FA (pendaftaran, login, pemulihan), keamanan login platform, kelola admin platform (undang/nonaktifkan/paksa keluar/reset), atur sandi admin, penampil jejak audit | `lib/platform/totp.ts`, `lib/platform/admins/**`, `app/api/admin/security/**`, `app/api/admin/platform-users/**`, `app/api/admin/audit/**`, `app/api/auth/login/route.ts` (HANYA cabang platform), `auth.ts` (HANYA bagian kredensial platform), `app/auth/**` (halaman atur sandi admin & kode 2FA), `app/(app)/admin/keamanan/**`, `app/(app)/admin/audit/**`, `components/admin/security/**` |
| **E. Retrofit audit rute lama** | Tambah `auditPlatform` ke semua mutasi `/api/admin/*` yang sudah ada + temuan celah | rute lama: `partners`, `partner-applications`, `disbursements`, `payment-channels`, `referrals`, `regional-users`, `theme-packs`, `app-templates`, `blog`, `villages/route.ts`, `kepatuhan` |

Berkas bersama yang TIDAK boleh diedit paket mana pun (lapor ke pemilik rencana): `prisma/schema.prisma`, `package.json`, `components/layout/Sidebar.tsx`, `lib/platform/audit.ts`, `lib/platform/step-up.ts`.
Daftar tes: JANGAN edit `package.json`; sebutkan nama berkas tes baru di laporan, pemilik rencana menambahkannya ke `test:unit`.

## Antarmuka (UI)
Ikuti pola halaman `/admin/*` yang ada (client component + shadcn: Card, Table, Tabs, Badge, Dialog, Sheet) dan token tema (tanpa hex mentah).
Gunakan skill `ui-ux-pro-max` sebelum menulis UI. Prinsip: padat-data tapi terbaca; angka `tabular-nums`; aksi merusak = tombol merah + `StepUpDialog`;
status tidak hanya warna (ikon/teks); label formulir terlihat; target sentuh ≥ 40px; responsif 375px (tabel → kartu/scroll terkontrol); state muat (skeleton),
kosong, galat-dengan-ulangi; fokus terlihat; `aria-live` untuk hasil aksi; grafik wajib punya ringkasan teks/tabel alternatif dan di-lazy-load (`next/dynamic`).

## Pengujian
- Murni: `node --import tsx --test tests/<nama>.test.ts`. Render: `tests/*.test.tsx` (ikuti pola yang ada).
- Integrasi memakai MySQL scratch BERSAMA yang sudah menyala dengan skema terbaru:
  `KEP_TEST_DATABASE_URL=mysql://root@127.0.0.1:3399/klandesa_scratch_sa node --import tsx --test tests/<nama>.integration.test.ts`
  (nama DB wajib memuat `scratch`/`test`). Jangan hentikan/inisialisasi ulang MySQL itu; pakai email/kode unik per tes (agen lain berbagi DB). Bersihkan data tes sendiri.
- Tipe: `npx tsc --noEmit` (hook penulisan berkas juga menjalankannya; galat di berkas milik paket lain bisa bersifat sementara). Lint: `npx eslint <berkas>`.
- Setiap rute baru: tes 401 tanpa sesi, 403 tanpa step-up, validasi input, jejak audit tertulis, isolasi (tidak bocor data sensitif).

## Aturan kerja bersama (worktree dipakai bersama)
Jangan `git commit/stash/checkout/restore/reset`, jangan `prisma format`/`db push` ke DB selain scratch, jangan `pnpm install`, jangan sentuh berkas milik paket lain.
Cek `git status` sebelum menganggap perubahan "milik Anda" saja. Tulis berkas baru; edit berkas lama seminimal mungkin.

## Operasional (Paket D: 2FA & admin platform)
**Kunci 2FA.** Rahasia TOTP disimpan terenkripsi AES-256-GCM (`platform_users.totpSecretEnc`, format `v1.<base64url>`, terikat ke id akun). Kunci diturunkan
(HKDF-SHA256, label `klandesa/platform-2fa/v1`) dari `PLATFORM_TOTP_KEY` bila diset (opsional), selain itu dari `AUTH_SECRET`/`NEXTAUTH_SECRET`.
Bila rahasia server berganti, rahasia TOTP tersimpan menjadi TIDAK TERBACA (gagal tertutup: kode TOTP ditolak). Kode pemulihan (hash SHA-256 80-bit,
tidak bergantung pada rahasia server) tetap berlaku. **Sebelum merotasi `AUTH_SECRET` produksi**: set dulu `PLATFORM_TOTP_KEY` = nilai `AUTH_SECRET` lama
(2FA tidak terdampak), atau siapkan reset 2FA seluruh admin lewat skrip di bawah.

**Owner kehilangan perangkat 2FA.**
1. Punya kode pemulihan: masuk dengan sandi + kode pemulihan (sekali pakai) di kolom kode halaman masuk, lalu Keamanan > nonaktifkan/daftar ulang 2FA, buat ulang kode.
2. Ada admin platform lain: admin itu membuka Keamanan > Admin platform > aksi "Reset 2FA" (sandi + alasan; sesi korban dicabut; tercatat `admin.2fa_reset`).
3. Satu-satunya admin tanpa kode pemulihan: di server (butuh akses shell + DB) jalankan
   `npx tsx scripts/platform-reset-2fa.ts <email>` (pratinjau) lalu `... <email> --yes`. Skrip menghapus 2FA, mencabut semua sesi, dan menulis `admin.2fa_reset`
   (aktor `cli:<pengguna OS>`). Kata sandi tidak disentuh. Setelah masuk, daftarkan ulang 2FA dan simpan kode pemulihan di tempat terpisah (mis. pengelola sandi).
4. Sandi juga hilang & tidak ada admin lain: admin platform tidak punya "lupa sandi" publik. Buat admin baru lewat `prisma/seed.ts` (`PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` baru)
   atau SQL langsung, lalu undang/aktifkan ulang akun lama dari konsol.

**Batas laju.** Login: batas IP/IP+email/email yang ada berlaku juga untuk cabang platform. Kode 2FA salah: 5 per admin per 15 menit dan 12 per IP per 15 menit,
diperiksa SEBELUM kode dinilai (setelah terkunci, kode benar pun ditolak 429). Satu langkah TOTP hanya sekali pakai (kunci `platform-totp-step:*` di `mobile_rate_limits`).
Jejak `admin.login_failed` dibatasi 5 pertama per 15 menit lalu tiap kelipatan 10.

**Pembatas atomik (F2).** Step-up (8/10 menit per admin) dan kode 2FA (5/15 menit per admin + 12/15 menit per IP) memakai RESERVASI atomik (`reserveAttempt` di
`lib/platform/admins/login-guard.ts`): hitungan naik SEBELUM sandi/kode dinilai, jadi permintaan paralel tidak bisa menilai lebih dari batas. Sukses menghapus hitungan admin
(dan mengembalikan satu jatah IP); admin sah yang selang-seling salah/benar tidak pernah terkunci. Batas per-email login (`web-login-email`, 60/30 menit lintas IP) kini hanya
menghitung KEGAGALAN sandi dan TIDAK berlaku untuk admin platform (hanya per-IP dan per-IP+email), supaya pihak asing tak bisa mengunci owner.

**Admin sah terkunci (429 padahal kode/sandi benar).** Admin platform lain: Keamanan > Admin platform > aksi "Buka kunci login" (sandi + kode 2FA bila aktif + alasan; tercatat
`admin.unlock`). Menghapus kunci per-admin (kode 2FA, kegagalan login, step-up) dan per-email. Kunci per-IP / per-IP+email memuat IP (tidak bisa dihitung ulang) dan hangus sendiri
dalam 10-15 menit. Reset 2FA lewat konsol/skrip juga membuka kunci ini. Tidak ada admin lain: tunggu 15 menit atau jalankan `npx tsx scripts/platform-reset-2fa.ts <email> --yes`
(juga membuka kunci, tetapi menghapus 2FA).

**Step-up + 2FA.** Admin ber-2FA wajib menyertakan `totpCode` (TOTP/pemulihan) di body SETIAP aksi berisiko (selain ganti sandi/2FA yang sudah memintanya sendiri). Server: `403
{code:"STEP_UP_TOTP_REQUIRED"}` bila kosong, `403 {code:"STEP_UP_TOTP_INVALID"}` bila salah/terpakai. Satu langkah TOTP sekali pakai per ruang (login dan step-up terpisah).
Rute baru yang memakai `requireStepUp` WAJIB meneruskan `{ totpCode: body.totpCode, req }` sebagai argumen ke-3; `StepUpDialog` mengirim `totpCode` di `onConfirm`.
Wajib-2FA belum dipaksa (keputusan produk); kartu Keamanan menampilkan peringatan bila belum aktif.

**Tautan atur sandi admin** memakai fragmen URL (`/auth/atur-sandi-admin#token=...`): tidak masuk log akses proxy. Halaman membaca fragmen di klien, menghapusnya dari bilah alamat,
lalu memeriksa lewat `POST /api/auth/platform/atur-sandi/peek` (token di body). Tautan lama berformat `?token=` tetap berfungsi.

**Bentuk login.** `POST /api/auth/login` menerima field opsional `totpCode` (TOTP 6 digit atau kode pemulihan). Admin ber-2FA tanpa kode: `401 {code:"TOTP_REQUIRED"}` (hanya setelah
sandi benar); kode salah: `401 {code:"TOTP_INVALID"}`; terkunci: `429 {code:"RATE_LIMITED"}`. Admin tanpa 2FA dan semua jenis akun lain: respons tidak berubah.

