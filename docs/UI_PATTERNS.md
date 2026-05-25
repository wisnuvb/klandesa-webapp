# Pola UI — Klandesa App

Panduan lapisan komponen dashboard desa (`app/(app)`).

## Lapisan

| Folder | Gunakan untuk |
|--------|----------------|
| [`components/ui/`](../components/ui/) | Primitif shadcn (Button, Card, Dialog, Table) — tanpa logic bisnis |
| [`components/app/patterns/`](../components/app/patterns/) | Komposit halaman CRUD (toolbar, metric, async state) |
| [`components/app/{domain}/`](../components/app/) | Modul domain shared (data-warga, potensi) |
| `app/(app)/{modul}/_components/` | UI khusus satu route |

## Pola halaman modul

```
MetricGrid → ListPageToolbar → EntityTableCard → Dialog (form/export)
```

Bungkus halaman dengan `AsyncState` jika fetch client-side.

## Komponen patterns

### MetricGrid / MetricCard

Kartu statistik dashboard.

```tsx
import { MetricGrid, type MetricItem } from "@/components/app/patterns";

const items: MetricItem[] = [
  { title: "Populasi", value: "1.234", icon: Users, accent: "blue" },
];
<MetricGrid items={items} />
```

### ListPageToolbar

Search, filter, export, tombol tambah.

```tsx
import { ListPageToolbar } from "@/components/app/patterns";

<ListPageToolbar
  searchPlaceholder="Cari..."
  searchQuery={q}
  onSearchChange={setQ}
  onAdd={() => setOpen(true)}
  filters={[{ id: "year", element: <YearSelect /> }]}
/>
```

### AsyncState

Loading, error, empty untuk seluruh halaman atau section.

```tsx
import { AsyncState } from "@/components/app/patterns";

<AsyncState loading={loading} error={error} onRetry={reload}>
  {children}
</AsyncState>
```

### EntityTableCard

Tabel dalam Card dengan empty/loading state generik.

```tsx
import { EntityTableCard } from "@/components/app/patterns";

<EntityTableCard
  title="Daftar Perangkat"
  description={`Menampilkan ${rows.length} data`}
  loading={loading}
  columns={[
    { id: "name", header: "Nama", cell: (row) => row.name },
    { id: "actions", header: "Aksi", className: "text-right", cell: (row) => <Actions row={row} /> },
  ]}
  rows={rows}
  rowKey={(row) => row.id}
/>
```

Untuk pagination server-side, prefer [`components/ui/data-table.tsx`](../components/ui/data-table.tsx) (lihat `DATATABLE.md`).

### ExportDialog

Dialog export generik.

```tsx
import { ExportDialog } from "@/components/app/patterns";

<ExportDialog
  open={exportOpen}
  onOpenChange={setExportOpen}
  title="Export Data Warga"
  filtersSlot={<GenderFilter />}
  onExport={async (format) => { /* fetch export API */ }}
/>
```

## Form

- Gunakan **react-hook-form** + [`components/ui/form-fields.tsx`](../components/ui/form-fields.tsx)
- Hindari `useState` manual untuk form besar (legacy: `data-warga/FormDialog` — migrasi bertahap)

## Permission UI

```tsx
import { Can } from "@/components/permissions/Can";

<Can resource="residents" action="create">
  <Button>Tambah warga</Button>
</Can>
```

## Modul referensi

| Modul | Contoh file |
|-------|-------------|
| Keuangan | `app/(app)/keuangan/` |
| Koperasi | `app/(app)/koperasi/` |
| BUMDes | `app/(app)/bumdes/` |
| PKK | `app/(app)/pkk/` |
| SDGs | `app/(app)/sdgs/` |

Struktur folder modul baru:

```
app/(app)/{modul}/
  page.tsx
  _hooks/use{Modul}.ts
  _lib/types.ts
  _components/
lib/{modul}/
  access.ts
  schemas.ts
app/api/{modul}/
```

Daftar modul & status: [`lib/modules/registry.ts`](../lib/modules/registry.ts).
