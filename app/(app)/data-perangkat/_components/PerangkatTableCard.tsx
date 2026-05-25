import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityTableCard } from "@/components/app/patterns";
import { calculateAge } from "@/utils";
import { Edit, Eye, Trash2 } from "lucide-react";
import type { OfficialRow } from "../_lib/types";
import { getPositionBadgeVariant } from "../_lib/formatting";

type PerangkatTableCardProps = {
  isLoading: boolean;
  rows: OfficialRow[];
  totalPerangkat: number;
  isSubmittingAction: boolean;
  onDetail: (official: OfficialRow) => void;
  onEdit: (official: OfficialRow) => void;
  onDelete: (official: OfficialRow) => void | Promise<void>;
};

export function PerangkatTableCard(props: PerangkatTableCardProps) {
  const {
    isLoading,
    rows,
    totalPerangkat,
    isSubmittingAction,
    onDetail,
    onEdit,
    onDelete,
  } = props;

  return (
    <EntityTableCard
      title="Daftar Perangkat Desa"
      description={
        isLoading
          ? "Memuat data perangkat..."
          : `Menampilkan ${rows.length} dari ${totalPerangkat} perangkat desa`
      }
      loading={isLoading}
      loadingMessage="Memuat data perangkat..."
      rows={rows}
      rowKey={(row) => row.id}
      columns={[
        {
          id: "index",
          header: "#",
          className: "w-12.5",
          cell: (_row, index) => index + 1,
        },
        {
          id: "name",
          header: "Nama",
          cell: (row) => <span className="font-medium">{row.name}</span>,
        },
        {
          id: "nik",
          header: "NIK",
          cell: (row) => <span className="font-mono text-xs">{row.nik}</span>,
        },
        {
          id: "position",
          header: "Jabatan",
          cell: (row) => (
            <Badge variant={getPositionBadgeVariant(row.position?.level || 5)}>
              {row.position?.name ?? "Tidak Diketahui"}
            </Badge>
          ),
        },
        {
          id: "gender",
          header: "Jenis Kelamin",
          cell: (row) => (
            <Badge variant={row.gender === "M" ? "default" : "secondary"}>
              {row.gender === "M" ? "Laki-laki" : "Perempuan"}
            </Badge>
          ),
        },
        {
          id: "age",
          header: "Usia",
          cell: (row) =>
            row.birthDate ? `${calculateAge(row.birthDate)} Tahun` : "-",
        },
        {
          id: "education",
          header: "Pendidikan",
          cell: (row) => <span className="text-sm">{row.education || "-"}</span>,
        },
        {
          id: "phone",
          header: "No. Telepon",
          cell: (row) => <span className="text-sm">{row.phone || "-"}</span>,
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => (
            <Badge
              variant={
                row.status?.toLowerCase() === "active" ? "default" : "secondary"
              }
            >
              {row.status?.toLowerCase() === "active" ? "Aktif" : "Tidak Aktif"}
            </Badge>
          ),
        },
        {
          id: "actions",
          header: "Aksi",
          className: "text-right",
          cell: (row) => (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => onDetail(row)}
                disabled={isSubmittingAction}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50"
                onClick={() => onEdit(row)}
                disabled={isSubmittingAction}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => void onDelete(row)}
                disabled={isSubmittingAction}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ),
        },
      ]}
      footer={
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Halaman 1 dari 1</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      }
    />
  );
}
