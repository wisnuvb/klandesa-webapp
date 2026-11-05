# Performa & skala (dashboard Next.js)

Ringkasan keputusan dari audit 2026-11-04 dan cara menjaganya. Angka diukur di MySQL lokal (bukan produksi); pakai sebagai
perbandingan relatif.

## Prinsip

- **Biaya utama = jumlah query per aksi pengguna**, bukan SSR. Satu muat dashboard dulu 140 query (38 tulis); kini 17–35.
- **Role/`isActive`/versi sesi tidak pernah di-cache lintas request** (pencabutan akses harus langsung berlaku). Guard
  `requireVillageApiContext` memakai Prisma `relationJoins` (generator `previewFeatures`): akun + desa dalam **1 query** (dulu 2;
  diukur 400 panggilan serentak 317 → 88 ms, hasil identik). Konsekuensi deploy: `prisma generate` wajib di folder rilis (sudah
  bagian prosedur) karena klien Prisma berubah.
- Cache memori per proses (`lib/cache/ttl-cache.ts`) **hanya** untuk hasil mahal yang sama untuk semua pengguna satu desa
  dan boleh basi puluhan detik. PM2 menjalankan 8 worker: cache tidak dibagi antarproses, jadi jangan dipakai untuk keputusan izin.

## Lapisan cache & TTL

| Apa | Di mana | TTL | Catatan |
|---|---|---|---|
| Ringkasan dashboard | `app/api/dashboard/stats/route.ts` | 30 dtk / desa / proses | izin & langganan tetap dicek tiap request |
| Sinkron notifikasi | `lib/notifications/syncAdminNotifications.ts` | 30 dtk / desa / proses | rekonsiliasi selisih, bukan upsert per baris |
| Statistik penduduk | `app/api/statistics/route.ts` | 5 mnt / desa / proses | memuat warga hidup sekali per TTL |
| Add-on modul | `lib/modules/require-module.ts` | tanpa cache | tulis hanya bila ada yang kedaluwarsa |
| Hitungan kualitas KK/NIK (`?summary=1`) | `app/api/kependudukan/kualitas[/nik]/route.ts` | 1 mnt / desa / proses | hanya untuk spanduk Data Warga; daftar kerja penuh tetap segar |
| Agregat dasbor wilayah (demografi, SDGs, adopsi, keuangan, layanan, GIS) | `lib/regional-aggregate.ts` | 5 mnt / (lingkup + daftar desa) / proses | lingkup & status akun tetap dibaca dari DB tiap request |
| Daftar warga hidup (statistik per kategori) | `app/api/statistics/residents-by-category/route.ts` | 1 mnt / desa / proses | maks 6 desa, tidak disimpan bila >20.000 warga |

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

`residents(villageId, updatedAt DESC)`, `transactions(villageId, createdAt DESC)`, `mail_requests(villageId, createdAt DESC)`,
`mail_requests(villageId, status, requestDate DESC)`, `mail_services(villageId, templateCategory)`: melayani query yang jalan di tiap
muat halaman (aktivitas terbaru, sinkron notifikasi, daftar surat). SQL + rollback: `PHASE11_SHELL_QUERY_INDEXES_MIGRATION.sql` /
`..._ROLLBACK.sql` (identik dengan `prisma db push`; diverifikasi `migrate diff` kosong, rollback→migrasi bolak-balik). Status langganan di shell
(`/api/billing/status`, ±10 query) di-cache klien 45 dtk (dulu 3 dtk) dan rute tidak lagi membaca ulang desa kecuali ada transisi langganan.
Font Inter/Literata dimuat lewat `<link>` + preconnect di `app/layout.tsx` (bukan `@import` di CSS: rantai HTML→CSS→CSS Google→woff2).
Impor warga massal memakai konkurensi UPDATE 3 (pool Prisma per worker hanya 5).

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

## Lapisan data klien

`lib/client/fetch-cache.ts`: dedupe GET serentak + cache memori per-tab **opt-in** (`ttlMs`/`staleMs`) dengan stale-while-revalidate.
Cache dikunci per akun (`setFetchCacheScope` di `AppLayoutClient`, dikosongkan saat login/logout/ganti akun; respons akun lama yang
terlambat tidak boleh masuk). `/api/account/permissions` dan non-GET tidak pernah di-cache. `useApiGet(url, { ttlMs, staleMs })`:
tanpa opsi perilakunya sama seperti dulu (+ dedupe serentak); `reload()` selalu ke jaringan. Dipakai di shell untuk
`/api/app-build-id`, `/api/billing/status` (TTL 3 dtk, dilewati bila baru keluar dari `/billing`/onboarding), `/api/coop/access`.
Belum ada halaman yang memakai opsi cache; ±190 pemanggil `fetch` lain belum dimigrasi.

## Pustaka berat (lazy)

Grafik recharts dimuat lewat `next/dynamic` (`ssr:false`) dengan `Skeleton` setinggi grafik asli: `dashboard/_components/DashboardCharts`,
`statistik/_components/StatistikCharts`, `keuangan/_components/tabs/KeuanganCharts`, `mitra/komisi/_components/KomisiTypeChart`.
xlsx di klien dimuat lewat `await import("xlsx")` (impor warga, IDM); route server tetap statis. CSS tur driver.js hanya dimuat di
layout `(app)`. **Aturan:** jangan impor nilai dari barrel `lib/gis/map` di komponen non-lazy (menyeret maplibre ke bundel awal).

## Daftar & batas pengaman

`lib/http/list-cap.ts`: batas 2.000 baris yang WAJIB melapor `truncated` + `total` dan memberi tahu di UI (dipakai `/api/announcements`,
`/api/ukm-products`). Sengaja TIDAK dibatasi karena klien mencari/menghitung statistik atas seluruh daftar (memotongnya menyembunyikan
data): `/api/citizen-reports`, `/api/forum-threads`, halaman server `arsip`, `galeri-desa`, `ukm`. Mengubahnya butuh pencarian +
agregat sisi server dan uji klik.

## Sisa pekerjaan / temuan terbuka

- Daftar warga di formulir PKK hanya 200 warga pertama (`/api/residents?pageSize=200`): desa >200 warga tidak bisa memilih sisanya;
  perlu pemilih warga yang bisa dicari (`components/app/ResidentPicker`).
- `app/api/digital-archives`: `parseInt` pada `take`/`skip` bisa `NaN` → 500 (pakai `parsePageParams`).
- CSS peta (`maplibre-gl.css`, `mapbox-gl-draw.css`) hanya di `app/globals.css` yang impornya dikomentari di root layout: periksa tampilan peta.
- `motion` (29 berkas): `LazyMotion` + `m` dapat memangkas runtime; `components/ui/chart.tsx` tidak dipakai (kode mati).
- Nginx (bagian di atas) belum diterapkan.
