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
