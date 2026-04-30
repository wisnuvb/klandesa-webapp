# API lanes (ringkas)

| Lane | Auth | Contoh path | Catatan |
|------|------|-------------|--------|
| App desa | Cookie NextAuth + `requireVillageApiContext` | Kebanyakan `/api/*` data desa | Desa dari `users.villageId` di DB; tanpa fallback anonim. |
| Regional | Sesi NextAuth + `isRegionalAccount` | `/api/regional/*`, UI `/wilayah` | Bukan modul `requireVillageApiContext`. |
| Koperasi | `loadCoopApiContext*` | `/api/coop/*` | Menolak akun regional; RBAC anggota. |
| Kiosk | Header `x-kiosk-key` | `/api/kiosk/requests` (POST), dll. | Bukan sesi admin. |
| Publik / webhook | Tanpa sesi atau tanda tangan khusus | `partner-applications`, `billing/linkqu/callback`, `attendance/scan` | Hardening terpisah. |

Helper utama: [`lib/api-village-context.ts`](../lib/api-village-context.ts).  
`resolveVillage` di [`lib/village.ts`](../lib/village.ts): fallback implisit (DEFAULT_VILLAGE_CODE / desa pertama) **mati di production** kecuali `ALLOW_RESOLVE_VILLAGE_IMPLICIT_FALLBACK=1`.
