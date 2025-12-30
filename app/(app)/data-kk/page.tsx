"use client";

import { useCallback, useMemo, useState } from "react";
import { Eye, Users as UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailKKModal } from "@/components/modals/DetailKKModal";
import {
  DataTable,
  DataTableColumn,
  DataTableFetchParams,
  DataTableFetchResult,
} from "@/components/ui/data-table";

type KKSummary = {
  id: string;
  family_card_number: string;
  kepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  hamlet: string;
  jumlahAnggota: number;
};

async function fetchKKSummaries(
  params: DataTableFetchParams
): Promise<DataTableFetchResult<KKSummary>> {
  const url = new URL("/api/kk", window.location.origin);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));
  if (params.sortKey) url.searchParams.set("sortKey", params.sortKey);
  if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
  if (params.search) url.searchParams.set("search", params.search);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) throw new Error("Gagal memuat data KK");
  const data = await res.json();
  return data as DataTableFetchResult<KKSummary>;
}

type AnggotaKeluarga = {
  id: number;
  name: string;
  id_number: string;
  gender: "M" | "F";
  birthplace: string;
  date_of_birth: string;
  religion_id: number;
  education_id: number;
  job_id: number;
  marital_status: string;
  status_family: string;
  is_live: string;
  role: string;
};

type KartuKeluargaDetail = {
  id: string;
  family_card_number: string;
  kepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  hamlet: string;
  jumlahAnggota: number;
  anggotaKeluarga: AnggotaKeluarga[];
};

export default function DataKK() {
  const [selectedKK, setSelectedKK] = useState<KartuKeluargaDetail | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetail = useCallback(async (kkNumber: string) => {
    try {
      const res = await fetch(`/api/kk/${kkNumber}`);
      if (!res.ok) throw new Error("Gagal memuat detail KK");
      const data = await res.json();
      setSelectedKK(data as KartuKeluargaDetail);
      setIsModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const columns = useMemo<DataTableColumn<KKSummary>[]>(
    () => [
      {
        key: "no",
        header: "#",
        cell: (_row, idx) => idx + 1,
        width: 56,
        align: "center",
      },
      {
        key: "family_card_number",
        header: "No. Kartu Keluarga",
        sortable: true,
        className: "font-mono text-xs",
      },
      {
        key: "kepalaKeluarga",
        header: "Kepala Keluarga",
        sortable: true,
        className: "font-medium",
      },
      { key: "alamat", header: "Alamat", className: "text-sm" },
      {
        key: "rt_rw",
        header: "RT/RW",
        cell: (row) => (
          <Badge variant="outline">
            {row.rt}/{row.rw}
          </Badge>
        ),
      },
      { key: "hamlet", header: "Dusun", className: "text-sm" },
      {
        key: "jumlahAnggota",
        header: "Jumlah Anggota",
        sortable: true,
        cell: (row) => (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
            <UsersIcon className="h-3 w-3 mr-1" />
            {row.jumlahAnggota} Orang
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Aksi",
        align: "right",
        cell: (row) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => handleViewDetail(row.family_card_number)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {/* <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button> */}
          </div>
        ),
      },
    ],
    [handleViewDetail]
  );

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      {/* <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>

            <Button variant="outline" className="gap-2 hidden">
              <Upload className="h-4 w-4" />
              Upload Excel
            </Button>

            <Button className="gap-2 bg-primary hover:bg-primary/90 hidden">
              <Plus className="h-4 w-4" />
              Tambah KK
            </Button>
          </div>
        </CardContent>
      </Card> */}

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Kartu Keluarga</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<KKSummary>
            columns={columns}
            fetchData={fetchKKSummaries}
            initialPageSize={10}
            initialSort={{ key: "family_card_number", order: "asc" }}
            rowKey={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedKK && (
        <DetailKKModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedKK(null);
          }}
          kkData={selectedKK}
        />
      )}
    </div>
  );
}
