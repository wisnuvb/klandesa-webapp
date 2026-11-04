# RBAC — Klandesa Desa

Dokumen ini menjelaskan sistem permission desa di Klandesa setelah Phase 0.

## Ringkasan

| Lapisan | Lokasi | Fungsi |
|---------|--------|--------|
| Role desa | [`lib/permissions/roles.ts`](../lib/permissions/roles.ts) | `admin`, `village_head`, `secretary`, `staff` |
| Resource | [`lib/permissions/resources.ts`](../lib/permissions/resources.ts) | Modul: `residents`, `finance`, `pkk`, … |
| Action | [`lib/permissions/actions.ts`](../lib/permissions/actions.ts) | `read`, `create`, `update`, `delete`, `approve`, `export` |
| Matriks | [`lib/permissions/matrix.ts`](../lib/permissions/matrix.ts) | Role × resource × action |
| API auto-guard | [`lib/permissions/api-route-map.ts`](../lib/permissions/api-route-map.ts) | Map path → resource |
| Context + guard | [`lib/api-village-context.ts`](../lib/api-village-context.ts) | `requireVillageApiContext` + permission |

## Izin per akun (fleksibel) — Phase 1

Role = **templat awal**. Admin dapat menyesuaikan izin tiap akun di atas bawaan role, sehingga dua staf ber-role sama bisa berbeda wewenang.

```
izin efektif = (bawaan role ∪ grant) − deny        // per resource × aksi
```

- Disimpan di `User.permissionOverrides` (JSON): `{"grant":{"finance":["create"]},"deny":{"residents":["delete"]}}`. NULL = ikut bawaan role.
- Logika murni: [`lib/permissions/overrides.ts`](../lib/permissions/overrides.ts) (`parsePermissionOverrides`, `applyOverridesToActions`, `diffToOverrides`). Input dibersihkan: resource/aksi tak dikenal dibuang; bila aksi sama ada di grant dan deny, **deny menang**.
- **Admin selalu penuh**: penyesuaian pada akun admin diabaikan (tidak bisa mengunci diri sendiri).
- **Tanpa "Lihat" = tanpa akses** pada resource itu (aksi lain tidak berlaku).
- Resource `rbac` (kelola akun) **tidak bisa didelegasikan** (`NON_DELEGABLE_RESOURCES`); hanya admin lewat bawaan role.
- `roleCan(resource, action, who)` / `getAllowedActions` menerima `VillageRole` (bawaan matriks) **atau** akun `{ role, permissionOverrides }`. Kode baru wajib memberi akun lengkap (mis. `ctx.dbUser`, `ctx.session.user`, konteks mobile), bukan role string saja, kalau tidak penyesuaian diabaikan.
- `requireVillageApiContext` mengisi `session.user.role` dan `session.user.permissionOverrides` **dari DB tiap permintaan** (bukan JWT), jadi `canVillageUser(session, …)` otomatis ikut. Perubahan admin berlaku di permintaan berikutnya.
- Mobile staf: `requireMobileContext` membawa `permissionOverrides` di `ctx`.
- Katalog label/grup modul untuk UI: [`lib/permissions/catalog.ts`](../lib/permissions/catalog.ts). Aksi yang ditawarkan di UI = gabungan aksi yang dipakai role mana pun di matriks (tidak ada tombol palsu). **Resource baru wajib masuk `PERMISSION_CATALOG`** (dites).

### Halaman Akses Pengguna (`/akses-pengguna`, hanya admin)

- API: `GET/POST /api/rbac/users`, `PATCH /api/rbac/users/[id]` (peran, izin, aktif/nonaktif, reset kata sandi). Semua dijaga resource `rbac`.
- Pagar di [`lib/rbac/accounts.ts`](../lib/rbac/accounts.ts): tidak bisa mengubah peran/izin/status/kata sandi akun sendiri; desa selalu punya ≥1 admin aktif; semua query dibatasi `villageId`; penautan perangkat↔akun atomik (dua permintaan bersamaan → satu yang jadi).
- Akun dibuat **dari perangkat desa** (`Official.userId`), dari halaman ini atau opsional di form Data Perangkat (toggle "Buat akun login", hanya terlihat admin; server memeriksa izin `rbac` sebelum perangkat dibuat). Peran awal bawaan: **staf**. Admin menyesuaikan izin kemudian.
- **Tidak ada kata sandi sementara.** Akun baru dibuat dengan sandi acak yang tak diketahui siapa pun, lalu pemilik menerima email berisi **tautan sekali pakai** untuk membuat kata sandinya sendiri (lihat [EMAIL.md](EMAIL.md)). Admin tidak pernah melihat kata sandi. Bila email gagal terkirim, tautan ditampilkan sekali kepada admin untuk disampaikan manual. Akun berstatus "Menunggu aktivasi" sampai tautan dipakai. Pengguna menggantinya sendiri di `/profil` (`POST /api/account/password`) atau lewat "Lupa kata sandi" (`/auth/lupa-sandi`).
- Email akun baru harus unik **lintas semua lane** (user desa, mitra, referral, platform, regional; `isEmailTakenAnywhere`). Login mencari `users` dulu dan portal mitra otomatis tertaut lewat email yang sama, jadi email bentrok = pengambilalihan portal mitra atau penguncian pemilik aslinya.
- Reset oleh admin **mencabut sandi lama seketika** (diganti sandi acak) dan mencabut sesi seluler staf (`MobileSession`); ganti/atur sandi juga mencabut sesi seluler. Sesi web (JWT) tetap sampai kedaluwarsa, tetapi API memeriksa DB tiap permintaan.
- Penjaga "admin terakhir" berjalan dalam transaksi dengan `SELECT … FOR UPDATE` (dites balapan dua admin).
- Perangkat dihapus/berhenti/pensiun → akun loginnya dinonaktifkan otomatis (kecuali admin; admin ditangani manual di halaman ini).
- Perubahan dicatat di audit log (`users`).

### Penjagaan halaman

- Server: `app/(app)/layout.tsx` membaca role+penyesuaian dari DB; muat penuh ke modul tanpa izin "Lihat" → redirect ke `/dashboard?akses=ditolak`.
- Klien: [`PageAccessGuard`](../components/permissions/PageAccessGuard.tsx) menutup halaman saat pindah halaman tanpa muat ulang. Ini hanya UX; **penegakan sebenarnya di API (403)**.
- Sidebar, `usePermissions`, dan `<Can>` memakai izin efektif dari `PermissionsProvider`.

### Batasan yang diketahui

- Sesi JWT tetap hidup sampai kedaluwarsa, tetapi setiap API memeriksa `isActive`, role, dan penyesuaian dari DB, jadi pencabutan efektif segera untuk data. Menu di tab yang sedang terbuka baru menyesuaikan setelah muat ulang.
- Lane koperasi (`/api/coop/*`) kini memakai role dari DB, bukan JWT. Rute yang memakai `requireVillagePermissionResponse` di luar `requireVillageApiContext` wajib memakai `sessionWithFreshPermissions` (lib/rbac/fresh-session.ts).
- BUMDes punya aturan tambahan "dikelola admin/kades"; bila admin menyesuaikan izin BUMDes sebuah akun, penyesuaian itulah yang berlaku (lihat `canManageBumdes`).

### Pencabutan sesi web saat kata sandi berubah

- `users.sessionVersion` (bawaan 0) **naik** setiap kata sandi berubah: ganti sendiri (`/api/account/password`), atur lewat tautan email (`/api/auth/atur-sandi`), dan reset oleh admin. JWT web mencatat versinya saat login (klaim `sv`, hanya akun desa). Versi yang berbeda dari DB → **401 `SESSION_REVOKED`** di `requireVillageApiContext`, lane koperasi, `sessionWithFreshPermissions`, dan penjaga halaman server; klien (`RemotePermissionsProvider`) lalu `signOut` ke `/auth/signin?sesi=berakhir`.
- **Jangan** memakai `iat` JWT untuk ini: NextAuth menerbitkan ulang cookie (iat baru) setiap sesi dibaca, sehingga cookie curian akan lolos. Karena itu versi disimpan di DB dan hanya naik lewat peristiwa kata sandi.
- JWT lama tanpa `sv` dianggap 0 = bawaan DB, jadi tidak ada yang terkeluar saat rilis; baru berlaku setelah kata sandi akun itu pertama kali berubah.
- Mengganti kata sandi sendiri juga mengeluarkan sesi yang sedang dipakai (pengguna diarahkan masuk ulang). Sengaja: menerbitkan ulang cookie dari klien akan membuka jalan menghidupkan sesi usang.
- Akun regional/mitra/platform (tabel lain) belum punya mekanisme ini.

## Lane akun (bukan matriks desa)

| Lane | Guard |
|------|-------|
| Desa | `requireVillageApiContext` + matriks permission |
| Koperasi | [`lib/coop/access.ts`](../lib/coop/access.ts) + `CoopAppRole` |
| BUMDes | [`lib/bumdes/access.ts`](../lib/bumdes/access.ts) |
| Platform | [`app/api/admin/_auth.ts`](../app/api/admin/_auth.ts) — wajib `platform_admin` |
| Mitra | [`lib/partner-session.ts`](../lib/partner-session.ts) |
| Regional | [`lib/regional-session.ts`](../lib/regional-session.ts) |

## Matriks desa (ringkas)

| Resource | admin | village_head | secretary | staff |
|----------|-------|--------------|-------------|-------|
| residents | CRUD+export | read | CRUD | CRUD |
| finance | CRUD+export | read+approve | read | read |
| settings / website | CRUD / CRUD | read | read / read | read / read |
| pkk | CRUD | read | CRUD | CRUD |
| bumdes | CRUD | read+approve | read | read |
| sdgs | read | read | read | read |
| billing | CRUD | read | read | read |

Definisi lengkap: [`lib/permissions/matrix.ts`](../lib/permissions/matrix.ts).

## API — auto-guard

Setiap route yang memanggil `requireVillageApiContext(req)` otomatis dicek permission berdasarkan path + method HTTP:

- `GET` → `read`
- `POST` → `create`
- `PUT` / `PATCH` → `update`
- `DELETE` → `delete`

Contoh mapping:

| Path | Resource |
|------|----------|
| `/api/residents/*` | `residents` |
| `/api/residents/export` | `residents` + `export` |
| `/api/finance/*` | `finance` |
| `/api/pkk/*` | `pkk` |
| `/api/sdgs/*` | `sdgs` |

Path **excluded** (hanya auth lane, tanpa matriks): `/api/admin`, `/api/coop`, `/api/bumdes`, `/api/partner`, `/api/auth`, `/api/kiosk/requests`, dll. — lihat `RBAC_EXCLUDED_PREFIXES` di [`api-route-map.ts`](../lib/permissions/api-route-map.ts).

### Menambah route baru

1. Tambah prefix di `ROUTE_RULES` (`lib/permissions/api-route-map.ts`)
2. Tambah resource di `PERMISSION_RESOURCES` jika modul baru
3. Update matriks di `matrix.ts`
4. Daftarkan modul di [`lib/modules/registry.ts`](../lib/modules/registry.ts)

## UI

- Hook: [`hooks/use-permissions.ts`](../hooks/use-permissions.ts)
- Conditional render: [`components/permissions/Can.tsx`](../components/permissions/Can.tsx)

```tsx
import { Can } from "@/components/permissions/Can";

<Can resource="finance" action="create">
  <Button>Tambah transaksi</Button>
</Can>
```

Sidebar desa difilter via [`lib/modules/sidebar-menu.ts`](../lib/modules/sidebar-menu.ts) — menu hanya muncul jika role punya action `read` pada resource modul.

## Prisma enum

Role desa masih `String` di DB; validasi via `normalizeVillageRole()` di TypeScript. Migrasi enum Prisma ditunda agar tidak break data existing.

## Testing manual

1. Login sebagai **admin** — akses penuh billing, pengaturan, website
2. Login sebagai **staff** — tidak melihat billing/pengaturan di sidebar; API `POST /api/billing/checkout` → 403
3. Login sebagai **secretary** — CRUD PKK, read finance
