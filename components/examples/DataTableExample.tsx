/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo } from "react";
import {
  DataTable,
  DataTableColumn,
  DataTableFetchParams,
  DataTableFetchResult,
} from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";

type Person = {
  id: number;
  name: string;
  id_number: string;
  family_card_number: string;
  gender: "M" | "F";
};

function makeMockData(): Person[] {
  const genders: Array<"M" | "F"> = ["M", "F"];
  const rows: Person[] = [];
  for (let i = 1; i <= 137; i++) {
    rows.push({
      id: i,
      name: `Warga ${i.toString().padStart(3, "0")}`,
      id_number: String(1000000000000000 + i),
      family_card_number: String(2000000000000000 + i),
      gender: genders[i % 2],
    });
  }
  return rows;
}

const MOCK = makeMockData();

async function mockFetch(
  params: DataTableFetchParams
): Promise<DataTableFetchResult<Person>> {
  // simulate network
  await new Promise((r) => setTimeout(r, 400));

  let data = [...MOCK];
  if (params.search) {
    const q = params.search.toLowerCase();
    data = data.filter((d) =>
      [d.name, d.id_number, d.family_card_number]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }
  if (params.sortKey) {
    const dir = params.sortOrder === "desc" ? -1 : 1;
    data.sort((a: any, b: any) => {
      const va = a[params.sortKey!];
      const vb = b[params.sortKey!];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }

  const total = data.length;
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize;
  const rows = data.slice(start, end);
  return { rows, total };
}

export default function DataTableExample() {
  const columns = useMemo<DataTableColumn<Person>[]>(
    () => [
      {
        key: "no",
        header: "#",
        cell: (_row, idx) => idx + 1,
        width: 56,
        align: "center",
      },
      {
        key: "name",
        header: "Nama",
        sortable: true,
        className: "min-w-[180px]",
      },
      {
        key: "id_number",
        header: "NIK",
        sortable: true,
        className: "font-mono",
      },
      { key: "family_card_number", header: "No. KK", className: "font-mono" },
      { key: "gender", header: "JK", className: "w-[80px]", align: "center" },
    ],
    []
  );

  return (
    <Card className="p-4">
      <h3 className="text-base font-semibold mb-3">
        Contoh DataTable (Server Pagination)
      </h3>
      <DataTable<Person>
        columns={columns}
        fetchData={mockFetch}
        initialPageSize={10}
        initialSort={{ key: "name", order: "asc" }}
        rowKey={(r) => r.id}
      />
    </Card>
  );
}
