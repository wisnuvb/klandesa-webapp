# Integrasi Pemerintah — Klandesa

Layer `lib/integrations/` memakai **adapter pattern** untuk export/sinkronisasi data desa ke format standar Kemendesa.

## Adapter Tersedia

| ID | Label | Arah | Format |
|---|---|---|---|
| `residents_kemendesa` | Data Penduduk | export | CSV, JSON |
| `apbdes_siskeudes` | APBDes → Siskeudes | export | CSV, JSON |
| `sdgs_portal` | Skor SDGs Desa Portal | push | JSON |
| `prodeskel` | Profil Desa Prodeskel | export | CSV, JSON |

## API

- `GET /api/integrations/adapters` — daftar adapter
- `POST /api/integrations/export` — unduh export (`adapterId`, `format`)
- `POST /api/integrations/sync` — jalankan sinkronisasi + tulis log
- `GET /api/integrations/logs` — riwayat sinkronisasi
- `POST /api/integrations/logs/[id]/retry` — retry log gagal

## UI

Halaman **Sinkronisasi Data** (`/sinkronisasi-data`) — export, sync, log, retry.

## Permission

Resource `integrations` — admin/sekretaris: `crud_export`; kepala desa/staff: `read`.

## Catatan

- Bridge API live Siskeudes/Prodeskel memerlukan kredensial resmi; MVP saat ini fokus **export schema standar** + log audit.
- Kode desa IDM bisa diatur di Pengaturan Desa (`integrations.idmVillageCode`).
