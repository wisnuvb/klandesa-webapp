# DataTable (Server-driven)

Reusable table component with server pagination, sorting, and search.

Path: components/ui/data-table.tsx

## Props

- columns: Column definitions (key, header, sortable?, cell?)
- fetchData(params): Promise<{ rows, total }>
- initialPageSize?: number
- initialSort?: { key, order }
- initialSearch?: string
- filters?: Record<string, unknown>
- rowKey?: (row, index) => key
- toolbar?: ReactNode (custom right-side controls)
- emptyState?: ReactNode
- pageSizeOptions?: number[]
- manualRefreshKey?: unknown (refetch when changes)

## Quick usage

```tsx
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableFetchResult,
} from "@/components/ui/data-table";

type Row = { id: number; name: string };

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", sortable: true },
];

async function fetcher(
  params: DataTableFetchParams,
): Promise<DataTableFetchResult<Row>> {
  const res = await fetch(`/api/rows?` + new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortKey: params.sortKey ?? "",
    sortOrder: params.sortOrder ?? "",
    search: params.search ?? "",
  }));
  return res.json();
}

export default function Page() {
  return (
    <DataTable<Row>
      columns={columns}
      fetchData={fetcher}
      initialPageSize={10}
      initialSort={{ key: "name", order: "asc" }}
      rowKey={(r) => r.id}
    />
  );
}
```

See components/examples/DataTableExample.tsx for a ready-to-run mock example.
