"use client";

import { useCallback, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Can } from "@/components/permissions/Can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableFetchResult,
} from "@/components/ui/data-table";
import {
  ASSET_CONDITION_LABELS,
  ASSET_TYPE_LABELS,
  DISASTER_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  labelOf,
} from "@/lib/gis/labels";
import { fetchClientPagedList } from "../_lib/gis-client-list";
import { fetchGisList } from "../_lib/gis-table-fetch";

export type AssetRow = {
  id: number;
  name: string;
  assetType: string;
  lat: number | null;
  lng: number | null;
  condition: string;
  rt: string | null;
  rw: string | null;
};

export type ProjectRow = {
  id: number;
  title: string;
  projectType: string;
  status: string;
  budget: number | null;
  lat: number | null;
  lng: number | null;
};

export type DisasterRow = {
  id: number;
  name: string;
  disasterType: string;
  riskLevel: string;
  lat: number | null;
  lng: number | null;
  rt: string | null;
  rw: string | null;
  status: string;
};

export type HeatCell = {
  rt: string;
  rw: string;
  compositeScore: number | null;
  label: string;
};

type TableRefreshProps = {
  tableRefreshKey?: unknown;
};

type AssetsDataTableProps = TableRefreshProps & {
  saving: boolean;
  onDelete: (id: number) => void | Promise<void>;
  toolbar?: React.ReactNode;
};

export function AssetsDataTable({
  tableRefreshKey,
  saving,
  onDelete,
  toolbar,
}: AssetsDataTableProps) {
  const fetchData = useCallback(
    (params: DataTableFetchParams): Promise<DataTableFetchResult<AssetRow>> =>
      fetchGisList<AssetRow>("/api/gis/assets", params),
    [],
  );

  const columns = useMemo<DataTableColumn<AssetRow>[]>(
    () => [
      {
        key: "name",
        header: "Nama",
        sortable: true,
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "assetType",
        header: "Tipe",
        sortable: true,
        cell: (row) => labelOf(ASSET_TYPE_LABELS, row.assetType),
      },
      {
        key: "condition",
        header: "Kondisi",
        sortable: true,
        cell: (row) => (
          <Badge variant="outline">
            {labelOf(ASSET_CONDITION_LABELS, row.condition)}
          </Badge>
        ),
      },
      {
        key: "rt",
        header: "RT/RW",
        sortable: true,
        cell: (row) => (
          <span>
            {row.rt ?? "—"}/{row.rw ?? "—"}
          </span>
        ),
      },
      {
        key: "lat",
        header: "Koordinat",
        sortable: true,
        cell: (row) =>
          row.lat != null && row.lng != null ? (
            <span className="text-xs tabular-nums">
              {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "actions",
        header: "",
        cell: (row) => (
          <Can resource="gis" action="delete">
            <Button
              variant="ghost"
              size="icon"
              disabled={saving}
              onClick={() => void onDelete(row.id)}
              aria-label={`Hapus ${row.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Can>
        ),
      },
    ],
    [onDelete, saving],
  );

  return (
    <DataTable
      columns={columns}
      fetchData={fetchData}
      rowKey={(row) => row.id}
      manualRefreshKey={tableRefreshKey}
      toolbar={toolbar}
      emptyState={
        <p className="text-sm text-muted-foreground py-6 text-center">
          Belum ada aset infrastruktur. Tambahkan aset untuk ditampilkan di peta.
        </p>
      }
    />
  );
}

type ProjectsDataTableProps = TableRefreshProps & {
  toolbar?: React.ReactNode;
};

export function ProjectsDataTable({
  tableRefreshKey,
  toolbar,
}: ProjectsDataTableProps) {
  const fetchData = useCallback(
    (params: DataTableFetchParams): Promise<DataTableFetchResult<ProjectRow>> =>
      fetchGisList<ProjectRow>("/api/gis/projects", params),
    [],
  );

  const columns = useMemo<DataTableColumn<ProjectRow>[]>(
    () => [
      {
        key: "title",
        header: "Judul",
        sortable: true,
        cell: (row) => <span className="font-medium">{row.title}</span>,
      },
      {
        key: "projectType",
        header: "Tipe",
        sortable: true,
        cell: (row) => labelOf(PROJECT_TYPE_LABELS, row.projectType),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (row) => labelOf(PROJECT_STATUS_LABELS, row.status),
      },
      {
        key: "budget",
        header: "Anggaran",
        sortable: true,
        align: "right",
        cell: (row) =>
          row.budget != null
            ? new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(row.budget)
            : "—",
      },
      {
        key: "lat",
        header: "Koordinat",
        sortable: true,
        cell: (row) =>
          row.lat != null && row.lng != null ? (
            <span className="text-xs tabular-nums">
              {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
            </span>
          ) : (
            "—"
          ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      fetchData={fetchData}
      rowKey={(row) => row.id}
      manualRefreshKey={tableRefreshKey}
      toolbar={toolbar}
      emptyState={
        <p className="text-sm text-muted-foreground py-6 text-center">
          Belum ada proyek infrastruktur tercatat.
        </p>
      }
    />
  );
}

type DisastersDataTableProps = TableRefreshProps & {
  saving: boolean;
  onDelete: (id: number) => void | Promise<void>;
  toolbar?: React.ReactNode;
};

export function DisastersDataTable({
  tableRefreshKey,
  saving,
  onDelete,
  toolbar,
}: DisastersDataTableProps) {
  const fetchData = useCallback(
    (params: DataTableFetchParams): Promise<DataTableFetchResult<DisasterRow>> =>
      fetchClientPagedList<DisasterRow>(
        "/api/lingkungan/disaster-points",
        params,
        ["name", "disasterType", "riskLevel", "status", "rt", "rw"],
      ),
    [],
  );

  const columns = useMemo<DataTableColumn<DisasterRow>[]>(
    () => [
      {
        key: "name",
        header: "Lokasi",
        sortable: true,
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        key: "disasterType",
        header: "Jenis",
        sortable: true,
        cell: (row) => labelOf(DISASTER_TYPE_LABELS, row.disasterType),
      },
      {
        key: "riskLevel",
        header: "Risiko",
        sortable: true,
        cell: (row) => (
          <Badge
            variant={
              row.riskLevel === "high" || row.riskLevel === "extreme"
                ? "destructive"
                : "outline"
            }
          >
            {labelOf(RISK_LEVEL_LABELS, row.riskLevel)}
          </Badge>
        ),
      },
      {
        key: "rt",
        header: "RT/RW",
        sortable: true,
        cell: (row) => (
          <span>
            {row.rt ?? "—"}/{row.rw ?? "—"}
          </span>
        ),
      },
      {
        key: "lat",
        header: "Koordinat",
        sortable: true,
        cell: (row) =>
          row.lat != null && row.lng != null ? (
            <span className="text-xs tabular-nums">
              {row.lat.toFixed(5)}, {row.lng.toFixed(5)}
            </span>
          ) : (
            "—"
          ),
      },
      {
        key: "actions",
        header: "",
        cell: (row) => (
          <Can resource="lingkungan" action="delete">
            <Button
              variant="ghost"
              size="icon"
              disabled={saving}
              onClick={() => void onDelete(row.id)}
              aria-label={`Hapus ${row.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Can>
        ),
      },
    ],
    [onDelete, saving],
  );

  return (
    <DataTable
      columns={columns}
      fetchData={fetchData}
      rowKey={(row) => row.id}
      manualRefreshKey={tableRefreshKey}
      toolbar={toolbar}
      emptyState={
        <p className="text-sm text-muted-foreground py-6 text-center">
          Belum ada titik risiko bencana. Tambahkan dari peta atau tombol di atas.
        </p>
      }
    />
  );
}

export function HeatmapTable({ rows }: { rows: HeatCell[] }) {
  const fetchData = useCallback(
    (params: DataTableFetchParams): Promise<DataTableFetchResult<HeatCell>> => {
      const q = params.search?.toLowerCase().trim() ?? "";
      let filtered = rows;

      if (q) {
        filtered = rows.filter((h) =>
          [h.rt, h.rw, h.label, h.compositeScore?.toString()].some((v) =>
            String(v ?? "").toLowerCase().includes(q),
          ),
        );
      }

      if (params.sortKey && params.sortOrder) {
        const key = params.sortKey as keyof HeatCell;
        filtered = [...filtered].sort((a, b) =>
          compareHeatCell(a[key], b[key], params.sortOrder!),
        );
      }

      const total = filtered.length;
      const start = (params.page - 1) * params.pageSize;
      const pageRows = filtered.slice(start, start + params.pageSize);

      return Promise.resolve({ rows: pageRows, total });
    },
    [rows],
  );

  const columns = useMemo<DataTableColumn<HeatCell>[]>(
    () => [
      {
        key: "rt",
        header: "RT",
        sortable: true,
        cell: (row) => row.rt,
      },
      {
        key: "rw",
        header: "RW",
        sortable: true,
        cell: (row) => row.rw,
      },
      {
        key: "compositeScore",
        header: "Skor",
        sortable: true,
        cell: (row) => (
          <span className="tabular-nums">{row.compositeScore ?? "—"}</span>
        ),
      },
      {
        key: "label",
        header: "Status",
        sortable: true,
        cell: (row) => row.label,
      },
    ],
    [],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Skor SDGs per RT/RW</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <DataTable
          columns={columns}
          fetchData={fetchData}
          rowKey={(row, i) => `${row.rt}-${row.rw}-${i}`}
          manualRefreshKey={rows}
          emptyState={
            <p className="text-sm text-muted-foreground py-6 text-center">
              Data heatmap SDGs per RT/RW belum tersedia.
            </p>
          }
        />
      </CardContent>
    </Card>
  );
}

function compareHeatCell(
  a: string | number | null,
  b: string | number | null,
  order: "asc" | "desc",
) {
  const dir = order === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * dir;
  }
  return String(a).localeCompare(String(b), "id") * dir;
}
