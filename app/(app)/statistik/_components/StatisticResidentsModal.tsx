"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableFetchResult,
} from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateAge } from "@/utils";

export type StatisticListDimension =
  | "occupation"
  | "marital_status"
  | "religion"
  | "education"
  | "blood_type"
  | "gender"
  | "hamlet"
  | "age_range"
  | "health";

export type StatisticResidentRow = {
  id: number;
  name: string;
  nik: string;
  kk: string | null;
  gender: string;
  birthDate: string;
  occupation: string | null;
  maritalStatus: string | null;
  religion: string | null;
  education: string | null;
  bloodType: string | null;
  hamlet: string | null;
  rt: string | null;
  rw: string | null;
};

const DIMENSION_TITLE: Record<StatisticListDimension, string> = {
  occupation: "Pekerjaan",
  marital_status: "Status perkawinan",
  religion: "Agama",
  education: "Pendidikan",
  blood_type: "Golongan darah",
  gender: "Jenis kelamin",
  hamlet: "Wilayah / dusun",
  age_range: "Kelompok usia",
  health: "Kesehatan",
};

const DIMENSION_DETAIL_HEADER: Record<StatisticListDimension, string> = {
  occupation: "Pekerjaan (data)",
  marital_status: "Status perkawinan",
  religion: "Agama",
  education: "Pendidikan",
  blood_type: "Golongan darah",
  gender: "Jenis kelamin",
  hamlet: "Dusun",
  age_range: "Usia",
  health: "Catatan",
};

const DIMENSION_DESCRIPTION: Record<StatisticListDimension, string> = {
  occupation:
    "Pengelompokan mengikuti normalisasi pekerjaan yang sama dengan grafik statistik.",
  marital_status:
    "Status perkawinan sesuai data kependudukan (kosong ditampilkan sebagai Tidak Diketahui).",
  religion:
    "Agama sesuai data kependudukan (kosong ditampilkan sebagai Tidak Diketahui).",
  education:
    "Tingkat pendidikan mengikuti normalisasi yang sama dengan grafik statistik.",
  blood_type:
    "Golongan darah sesuai data (kosong ditampilkan sebagai Tidak Diketahui).",
  gender: "Filter berdasarkan jenis kelamin di data registrasi.",
  hamlet:
    "Wilayah mengikuti field dusun (kosong ditampilkan sebagai Tidak Diketahui).",
  age_range:
    "Rentang usia dihitung dari tanggal lahir dengan kelompok yang sama seperti grafik.",
  health:
    "Kategori sesuai flag kesehatan pada data penduduk (disabilitas, BPJS, dll.).",
};

interface StatisticResidentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension: StatisticListDimension | null;
  categoryLabel: string | null;
}

function formatWilayah(row: StatisticResidentRow): string {
  const parts: string[] = [];
  if (row.hamlet) parts.push(row.hamlet);
  const rtRw =
    row.rt && row.rw
      ? `RT ${row.rt} / RW ${row.rw}`
      : row.rt
        ? `RT ${row.rt}`
        : row.rw
          ? `RW ${row.rw}`
          : "";
  if (rtRw) parts.push(rtRw);
  return parts.join(" · ") || "-";
}

export function StatisticResidentsModal({
  open,
  onOpenChange,
  dimension,
  categoryLabel,
}: StatisticResidentsModalProps) {
  const [genderFilter, setGenderFilter] = useState("semua");

  const columns = useMemo<DataTableColumn<StatisticResidentRow>[]>(() => {
    if (!dimension) return [];

    const detailHeader = DIMENSION_DETAIL_HEADER[dimension];

    const detailSortKey =
      dimension === "occupation"
        ? "occupation"
        : dimension === "marital_status"
          ? "maritalStatus"
          : dimension === "religion"
            ? "religion"
            : dimension === "education"
              ? "education"
              : dimension === "blood_type"
                ? "bloodType"
                : dimension === "gender"
                  ? "gender"
                  : dimension === "hamlet"
                    ? "hamlet"
                    : dimension === "age_range"
                      ? "birthDate"
                      : dimension === "health"
                        ? "occupation"
                        : "name";

    const detailCell = (row: StatisticResidentRow) => {
      switch (dimension) {
        case "occupation":
          return (
            <span
              className="line-clamp-2 max-w-[200px]"
              title={row.occupation ?? undefined}
            >
              {row.occupation ?? "-"}
            </span>
          );
        case "marital_status":
          return row.maritalStatus ?? "-";
        case "religion":
          return row.religion ?? "-";
        case "education":
          return row.education ?? "-";
        case "blood_type":
          return row.bloodType ?? "-";
        case "gender":
          return row.gender;
        case "hamlet":
          return (
            <span className="line-clamp-2 max-w-[220px]">
              {formatWilayah(row)}
            </span>
          );
        case "age_range":
          return `${calculateAge(row.birthDate)} tahun`;
        case "health":
          return (
            <span className="line-clamp-2 max-w-[180px] text-muted-foreground">
              {row.occupation ?? "—"}
            </span>
          );
        default:
          return "-";
      }
    };

    const cols: DataTableColumn<StatisticResidentRow>[] = [
      {
        key: "no",
        header: "#",
        width: 48,
        align: "center",
        cell: (_row, idx) => idx + 1,
      },
      { key: "name", header: "Nama", sortable: true },
      {
        key: "nik",
        header: "NIK",
        sortable: true,
        className: "font-mono text-xs max-w-[140px]",
      },
    ];

    if (dimension !== "gender") {
      cols.push({
        key: "gender",
        header: "Jenis Kelamin",
        sortable: true,
        cell: ({ gender }) => (
          <Badge variant={gender === "Laki-laki" ? "default" : "secondary"}>
            {gender === "Laki-laki" ? "Laki-laki" : "Perempuan"}
          </Badge>
        ),
      });
    }

    if (dimension !== "age_range") {
      cols.push({
        key: "birthDate",
        header: "Usia",
        sortable: true,
        cell: ({ birthDate }) => `${calculateAge(birthDate)} th`,
      });
    }

    cols.push({
      key: detailSortKey,
      header: detailHeader,
      sortable: dimension !== "health",
      cell: detailCell,
    });

    if (dimension !== "hamlet") {
      cols.push({
        key: "hamlet",
        header: "Wilayah",
        sortable: true,
        cell: (row) => (
          <span className="text-sm text-muted-foreground max-w-[220px] line-clamp-2">
            {formatWilayah(row)}
          </span>
        ),
      });
    }

    return cols;
  }, [dimension]);

  const fetchData = useCallback(
    async (
      params: DataTableFetchParams,
    ): Promise<DataTableFetchResult<StatisticResidentRow>> => {
      if (!dimension || !categoryLabel) return { rows: [], total: 0 };

      const sp = new URLSearchParams();
      sp.set("dimension", dimension);
      sp.set("category", categoryLabel);
      sp.set("page", String(params.page));
      sp.set("pageSize", String(params.pageSize));
      if (params.search) sp.set("search", params.search);
      if (params.sortKey) sp.set("sortKey", params.sortKey);
      if (params.sortOrder) sp.set("sortOrder", params.sortOrder);

      const gf = params.filters?.gender as string | undefined;
      if (gf && gf !== "semua") sp.set("gender", gf);

      const res = await fetch(
        `/api/statistics/residents-by-category?${sp.toString()}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "Gagal memuat data",
        );
      }
      const json = await res.json();
      return {
        rows: json.rows as StatisticResidentRow[],
        total: json.total as number,
      };
    },
    [dimension, categoryLabel],
  );

  const dimLabel = dimension ? DIMENSION_TITLE[dimension] : "";
  const desc = dimension ? DIMENSION_DESCRIPTION[dimension] : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden gap-4">
        <DialogHeader>
          <DialogTitle>
            Penduduk — {dimLabel ? `${dimLabel}: ` : ""}
            {categoryLabel ?? "—"}
          </DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-[280px] overflow-auto">
          {dimension && categoryLabel ? (
            <DataTable<StatisticResidentRow>
              key={`${dimension}-${categoryLabel}-${open}`}
              columns={columns}
              fetchData={fetchData}
              initialPageSize={10}
              rowKey={(row) => row.id}
              filters={{ gender: genderFilter }}
              toolbar={
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua jenis kelamin</SelectItem>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              }
              emptyState="Tidak ada penduduk untuk filter ini."
              pageSizeOptions={[5, 10, 20, 50]}
              className="border-0"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
