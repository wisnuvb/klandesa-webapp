# Fase 2.1: Kunci API per desa

Tanggal: 2026-10-31. Status: **dikode dan teruji (MySQL sementara); skema diterapkan ke DB lokal; BELUM di produksi.**
Induk: [PLATFORM_STRATEGY.md](PLATFORM_STRATEGY.md) §5 (konsep i) dan §6 Fase 2 butir 1.

## Tujuan
Alat buatan AI/pengembang membaca data desa lewat jalur resmi yang aman, bukan lewat Google Form atau spreadsheet.
Tahap ini hanya **fondasi**: kunci + scope + jejak + pembatas laju + satu endpoint identitas. Data sungguhan menyusul di `/api/v1/*` (Fase 2.2).

## Prinsip yang ditegakkan (tangga kepercayaan 1)
- Kunci `kld_` + 40 karakter acak (240 bit). **Rahasia tidak disimpan**: hanya SHA-256 dan awalan 12 karakter. Rahasia muncul sekali di respons pembuatan.
- Satu kunci = satu desa. Konteks desa selalu diturunkan dari kunci, tidak pernah dari parameter klien.
- Scope baca-saja per kelompok data (`lib/api-keys/scopes.ts`); scope tulis belum ada. NIK/KK/telepon wajib tersamar di endpoint data.
- Berumur terbatas (30/90/365 hari atau tanpa batas, bawaan 90), bisa dicabut seketika, maksimal 10 kunci aktif per desa.
- Setiap pemakaian yang bisa diatribusikan (termasuk ditolak: dicabut, kedaluwarsa, kurang akses, kena batas) dicatat di `api_access_logs`, dilihat admin desa, dibuang setelah 90 hari (pembersihan oportunistik, tanpa cron).
- Langganan desa harus aktif. Batas laju 120 permintaan/menit/kunci (di memori proses; dengan PM2 cluster batas efektif dikali jumlah proses).
- Respons galat berbentuk tetap: `{ "error": { "code", "message" } }` dengan kode `unauthorized | key_revoked | key_expired | insufficient_scope | subscription_inactive | rate_limited`.

## Berkas
| | |
|---|---|
| Skema | `ApiKey`, `ApiAccessLog` di `prisma/schema.prisma`; SQL: `PHASE2_API_KEYS_MIGRATION.sql` (hanya CREATE), rollback `PHASE2_API_KEYS_ROLLBACK.sql` |
| Pustaka | `lib/api-keys/{scopes,keys,rate-limit,auth}.ts` (`requireApiKey(req, scope)`) |
| Pengelolaan (sesi admin) | `/api/developer/keys` (GET, POST), `/api/developer/keys/[id]` (DELETE = cabut), `/api/developer/access-log`; dipetakan ke sumber daya `integrations` dan modul `sinkronisasi-data`; admin saja |
| Publik | `/api/v1/me` (kunci sah mana pun) |
| Layar | `/sinkronisasi-data/akses-api` (buat, cabut, jejak, cara memakai) |
| Tes | `tests/api-keys.test.ts` (unit), `tests/api-keys.integration.test.ts` (MySQL: 12 tes) |

## Keputusan dan batasan
- Kunci dipakai dari **server**, bukan browser: tidak ada CORS. Layar memperingatkan hal ini.
- Endpoint `/api/v1/*` memakai `requireApiKey` (terdaftar sebagai guard di `tests/api-guard-coverage.test.ts`); endpoint data berikutnya wajib menyebut scope yang diminta.
- Perubahan kunci tercatat di AuditLog (`create`/`revoke`), tanpa rahasia.

## Berikutnya (Fase 2.2)
`/api/v1` baca-saja untuk enam kelompok scope, penyamaran PII di satu tempat, paginasi kursor, OpenAPI + `llms.txt`.

## Fase 2.2: `/api/v1` data baca-saja (2026-10-31)

Sepuluh endpoint GET, semuanya lewat `requireApiKey(req, scope)`; daftar dan bentuknya satu sumber di `lib/api-v1/spec.ts`.

| Endpoint | Akses | Catatan |
|---|---|---|
| `/api/v1/me` | kunci sah mana pun | identitas kunci |
| `/api/v1/penduduk`, `/penduduk/{id}` | `kependudukan:read` | NIK/KK 4 digit terakhir; tahun lahir + umur (bukan tanggal lahir); filter q, rt, rw, dusun, familyRole, status |
| `/api/v1/keluarga`, `/keluarga/{id}`, `/wilayah` | `kependudukan:read` | 409 `feature_not_enabled` bila fitur Keluarga belum diaktifkan desa |
| `/api/v1/perangkat` | `perangkat:read` | aktif saja; tanpa NIK/telepon/email/alamat |
| `/api/v1/pengumuman` | `pengumuman:read` | hanya yang tayang |
| `/api/v1/potensi` | `potensi:read` | aktif saja; tanpa pendapatan/nilai produksi |
| `/api/v1/statistik` | `statistik:read` | agregat saja |
| `/api/v1/anggaran` | `anggaran:read` | per kategori per tahun; yang dibatalkan tidak dihitung; tanpa transaksi |
| `/api/v1/openapi.json`, `/api/v1/llms.txt` | publik | dokumentasi saja, dibangkitkan dari `spec.ts` |

Paginasi kursor id (`limit` 1–100, `page.nextCursor`); galat `{ error: { code, message } }`.

**Penyamaran terpusat:** kolom yang boleh keluar ditentukan di `lib/api-v1/views.ts` (`*_SELECT` + fungsi `*View`); kolom lain tidak pernah diambil dari DB. Tidak dibuka sama sekali: alamat, telepon, email, tanggal lahir lengkap, NIK orang tua, agama, status perkawinan, kesehatan/disabilitas, penghasilan, desil, foto.

**Tes statis** (`tests/api-v1.test.ts`) menggagalkan CI bila: daftar `ENDPOINTS` tak sama dengan berkas rute; rute tak memanggil `requireApiKey` dengan scope di spesifikasi; ada handler selain GET, `include:`, tulis/raw, `findMany` tanpa `select`, atau `villageId` dari klien. Tes integrasi (`tests/api-v1.integration.test.ts`, 11 tes MySQL) memeriksa kebocoran NIK/alamat/telepon, isolasi antar-desa, paginasi lintas halaman, dan cakupan akses.

Belum: webhook keluar, tabel/kolom kustom, scope tulis (tulis-sebagai-usulan), buka-samar per kolom (tangga 2), CORS/token jangka pendek untuk aplikasi browser.
