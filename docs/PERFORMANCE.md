# Performa & skala (dashboard Next.js)

Ringkasan keputusan dari audit 2026-11-04 dan cara menjaganya. Angka diukur di MySQL lokal (bukan produksi); pakai sebagai
perbandingan relatif.

## Prinsip

- **Biaya utama = jumlah query per aksi pengguna**, bukan SSR. Satu muat dashboard dulu 140 query (38 tulis); kini 17–35.
- **Role/`isActive` tidak pernah di-cache lintas request** (pencabutan akses harus langsung berlaku). Guard
  `requireVillageApiContext` masih 2 query/request; opsi lanjutan: `relationJoins` Prisma atau Redis dengan invalidasi.
- Cache memori per proses (`lib/cache/ttl-cache.ts`) **hanya** untuk hasil mahal yang sama untuk semua pengguna satu desa
  dan boleh basi puluhan detik. PM2 menjalankan 8 worker: cache tidak dibagi antarproses, jadi jangan dipakai untuk keputusan izin.

## Lapisan cache & TTL

| Apa | Di mana | TTL | Catatan |
|---|---|---|---|
| Ringkasan dashboard | `app/api/dashboard/stats/route.ts` | 30 dtk / desa / proses | izin & langganan tetap dicek tiap request |
| Sinkron notifikasi | `lib/notifications/syncAdminNotifications.ts` | 30 dtk / desa / proses | rekonsiliasi selisih, bukan upsert per baris |
| Statistik penduduk | `app/api/statistics/route.ts` | 5 mnt / desa / proses | memuat warga hidup sekali per TTL |
| Add-on modul | `lib/modules/require-module.ts` | tanpa cache | tulis hanya bila ada yang kedaluwarsa |

## Layout dashboard statis

`app/(app)/layout.tsx` **tidak boleh** memakai `headers()`, `cookies()`, `auth()`, atau Prisma: itu membuat seluruh area `(app)`
dinamis lagi. Pengecekan sesi/area ada di `AppLayoutClient` (klien), izin per akun dari `GET /api/account/permissions`.

- Halaman SERVER di `(app)` yang membaca DB langsung **wajib** memanggil `requireVillagePageAccess("<segmen>")`
  (`lib/permissions/server-page-guard.ts`). Layout tidak lagi menjadi penjaga izin modul. Saat ini: `arsip`, `galeri-desa`, `ukm`.
- Halaman klien aman: datanya lewat API yang menjaga izin sendiri (401/403).
- Cek klasifikasi setelah build: `/dashboard`, `/data-warga`, `/keuangan` harus `○` (statis); `/arsip`, `/ukm`, `/galeri-desa` `ƒ`.

## Paginasi

Pakai `parsePageParams` (`lib/http/pagination.ts`) untuk query `page`/`pageSize` dari klien: membatasi `pageSize`, menolak
`NaN`/negatif, dan membatasi `page`. Batas saat ini: warga 200, perangkat 100, potensi 100.

## Indeks

`residents(villageId, createdAt DESC)` (urutan bawaan daftar warga): halaman pertama desa 50.000 warga 114 ms → 0,08 ms.
SQL manual + rollback: `PHASE10_RESIDENT_CREATEDAT_INDEX_MIGRATION.sql` / `..._ROLLBACK.sql` (identik dengan `prisma db push`).

## Cookie sesi

`lib/session-slim.ts` membuang `accessToken`/`refreshToken` (tidak dipakai kode web) dan menyisakan kolom `village` yang dipakai
klien. Cookie sesi terkirim di SETIAP request; 1.545 → 627 byte. Dijalankan di callback `jwt`, jadi sesi lama ikut mengecil.
Data desa lengkap tidak ada di cookie: ambil dari API.

## Gambar

`images.remotePatterns` dibangun dari `lib/image-hosts.ts` (Spaces/CDN dari env, Unsplash, domain Klandesa). Host tambahan
tanpa ubah kode: set `NEXT_IMAGE_REMOTE_HOSTS="cdn.contoh.id,**.contoh.net"` **saat build**. Gambar dari host lain tampil rusak
(optimizer menolak dengan 400).

## SessionProvider

`SessionProvider` ada di layout `(app)`, bukan root: halaman publik (landing, blog, website desa) tidak memanggil
`/api/auth/session`. Komponen publik hanya boleh memakai `signIn()/signOut()/getSession()`, **bukan** `useSession()`.

## Nginx (contoh — uji di staging dulu, belum diterapkan)

HTML statis `(app)` dikirim dengan `Cache-Control: s-maxage=31536000`. **Jangan** `proxy_cache` HTML area `(app)` (atau purge saat
deploy), agar tidak ada HTML basi yang merujuk chunk lama. Yang aman dan bermanfaat:

```nginx
# Aset build berhash: cache panjang
location /_next/static/ { proxy_pass http://127.0.0.1:2042; add_header Cache-Control "public, max-age=31536000, immutable"; }

# Optimizer gambar: batasi laju per IP (biaya CPU)
limit_req_zone $binary_remote_addr zone=nextimg:10m rate=10r/s;
location /_next/image { limit_req zone=nextimg burst=30 nodelay; proxy_pass http://127.0.0.1:2042; }

# Website desa publik (subdomain/domain tenant): microcache tanpa cookie sesi, kunci = host + URI
proxy_cache_path /var/cache/nginx/tenant levels=1:2 keys_zone=tenant:20m max_size=500m inactive=10m;
# di server block tenant (BUKAN my.klandesa.com):
#   proxy_cache tenant;  proxy_cache_key "$host$request_uri";
#   proxy_cache_valid 200 60s;  proxy_cache_use_stale updating error timeout;  proxy_cache_lock on;
#   proxy_cache_bypass $http_authorization $cookie_next_auth_session_token;
```

## Sisa pekerjaan

- Guard API 2 query/request (lihat Prinsip). `findMany` tanpa `take` yang tersisa: `arsip/page.tsx`, `galeri-desa/page.tsx`,
  `ukm/page.tsx`, `api/digital-archives`, `api/announcements`, `api/citizen-reports`, `api/forum-threads`, `api/ukm-products`.
- Klien: SWR/TanStack Query, `next/dynamic` untuk recharts/xlsx/tiptap, pindahkan CSS `driver.js` dari root layout.
