"use client";

import { useCallback, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Can } from "@/components/permissions/Can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableFetchResult,
} from "@/components/ui/data-table";
import { fetchPkkList } from "../_lib/pkk-table-fetch";

export type DasawismaRow = {
  id: number;
  rt: string;
  rw: string;
  leaderName: string;
  memberCount: number;
  sessionCount: number;
};

export type SessionRow = {
  id: number;
  sessionDate: string;
  location: string;
  dasawismaId: number | null;
  dasawisma: { label: string } | null;
  visitCount: number;
};

export type StuntingResident = {
  id: number;
  name: string;
  nik: string;
  rt: string | null;
  rw: string | null;
  birthDate: string;
};

export type VisitRow = {
  id: number;
  sessionId: number;
  sessionDate: string;
  sessionLocation: string;
  residentId: number;
  residentName: string;
  residentNik: string;
  weightKg: number | null;
  heightCm: number | null;
  isStunting: boolean;
  notes: string | null;
};

type TableRefreshProps = {
  tableRefreshKey?: unknown;
};

type DasawismaDataTableProps = TableRefreshProps & {
  saving: boolean;
  onDelete: (id: number) => void | Promise<void>;
};

export function DasawismaDataTable({
  tableRefreshKey,
  saving,
  onDelete,
}: DasawismaDataTableProps) {
  const fetchData = useCallback(
    (params: DataTableFetchParams): Promise<DataTableFetchResult<DasawismaRow>> =>
      fetchPkkList<DasawismaRow>("/api/pkk/dasawisma", params),
    [],
  );

  const columns = useMemo<DataTableColumn<DasawismaRow>[]>(
    () => [
      {
        key: "rw",
        header: "RT/RW",
        sortable: true,
        cell: (row) => (
          <span>
            RT {row.rt} / RW {row.rw}
          </span>
        ),
      },
      {
        key: "leaderName",
        header: "Ketua",
        sortable: true,
        cell: (row) => row.leaderName,
      },
      {
        key: "memberCount",
        header: "Anggota",
        sortable: true,
        align: "center",
        cell: (row) => row.memberCount,
      },
      {
        key: "sessionCount",
        header: "Sesi Posyandu",
        sortable: true,
        align: "center",
        cell: (row) => row.sessionCount,
      },
      {
        key: "actions",
        header: "Aksi",
        align: "right",
        cell: (row) => (
          <Can resource="pkk" action="delete">
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => void onDelete(row.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </Can>
        ),
      },
    ],
    [onDelete, saving],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Dasawisma</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<DasawismaRow>
          columns={columns}
          fetchData={fetchData}
          rowKey={(row) => row.id}
          manualRefreshKey={tableRefreshKey}
          initialPageSize={10}
          initialSort={{ key: "rw", order: "asc" }}
          emptyState="Belum ada data dasawisma."
        />
      </CardContent>
    </Card>
  );
}

export function PosyanduSessionsDataTable({ tableRefreshKey }: TableRefreshProps) {
  const fetchData = useCallback(
    (params: DataTableFetchParams): Promise<DataTableFetchResult<SessionRow>> =>
      fetchPkkList<SessionRow>("/api/pkk/posyandu/sessions", params),
    [],
  );

  const columns = useMemo<DataTableColumn<SessionRow>[]>(
    () => [
      {
        key: "sessionDate",
        header: "Tanggal",
        sortable: true,
        cell: (row) => row.sessionDate,
      },
      {
        key: "location",
        header: "Lokasi",
        sortable: true,
        cell: (row) => row.location,
      },
      {
        key: "dasawisma",
        header: "Dasawisma",
        cell: (row) => row.dasawisma?.label ?? "—",
      },
      {
        key: "visitCount",
        header: "Kunjungan",
        sortable: true,
        align: "center",
        cell: (row) => row.visitCount,
      },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sesi Posyandu</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<SessionRow>
          columns={columns}
          fetchData={fetchData}
          rowKey={(row) => row.id}
          manualRefreshKey={tableRefreshKey}
          initialPageSize={10}
          initialSort={{ key: "sessionDate", order: "desc" }}
          emptyState="Belum ada sesi posyandu."
        />
      </CardContent>
    </Card>
  );
}

export function StuntingResidentsDataTable({ tableRefreshKey }: TableRefreshProps) {
  const fetchData = useCallback(
    (
      params: DataTableFetchParams,
    ): Promise<DataTableFetchResult<StuntingResident>> =>
      fetchPkkList<StuntingResident>("/api/pkk/stunting-residents", params),
    [],
  );

  const columns = useMemo<DataTableColumn<StuntingResident>[]>(
    () => [
      {
        key: "name",
        header: "Nama",
        sortable: true,
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "nik",
        header: "NIK",
        sortable: true,
        cell: (row) => <span className="font-mono text-xs">{row.nik}</span>,
      },
      {
        key: "rt",
        header: "RT/RW",
        sortable: true,
        cell: (row) =>
          row.rt && row.rw ? `RT ${row.rt} / RW ${row.rw}` : "—",
      },
      {
        key: "birthDate",
        header: "Tgl Lahir",
        sortable: true,
        cell: (row) => row.birthDate,
      },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balita Stunting (data warga)</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<StuntingResident>
          columns={columns}
          fetchData={fetchData}
          rowKey={(row) => row.id}
          manualRefreshKey={tableRefreshKey}
          initialPageSize={10}
          initialSort={{ key: "name", order: "asc" }}
          emptyState="Tidak ada warga dengan flag stunting."
        />
      </CardContent>
    </Card>
  );
}

export function StuntingVisitsDataTable({ tableRefreshKey }: TableRefreshProps) {
  const fetchData = useCallback(
    (params: DataTableFetchParams): Promise<DataTableFetchResult<VisitRow>> =>
      fetchPkkList<VisitRow>("/api/pkk/posyandu/visits", params, {
        stunting: "1",
      }),
    [],
  );

  const columns = useMemo<DataTableColumn<VisitRow>[]>(
    () => [
      {
        key: "sessionDate",
        header: "Tanggal Sesi",
        sortable: true,
        cell: (row) => row.sessionDate,
      },
      {
        key: "residentName",
        header: "Warga",
        sortable: true,
        cell: (row) => row.residentName,
      },
      {
        key: "weightKg",
        header: "Berat (kg)",
        sortable: true,
        align: "center",
        cell: (row) => row.weightKg ?? "—",
      },
      {
        key: "heightCm",
        header: "Tinggi (cm)",
        sortable: true,
        align: "center",
        cell: (row) => row.heightCm ?? "—",
      },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kunjungan Posyandu — Stunting</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable<VisitRow>
          columns={columns}
          fetchData={fetchData}
          rowKey={(row) => row.id}
          manualRefreshKey={tableRefreshKey}
          initialPageSize={10}
          initialSort={{ key: "sessionDate", order: "desc" }}
          emptyState="Belum ada kunjungan dengan flag stunting."
        />
      </CardContent>
    </Card>
  );
}
