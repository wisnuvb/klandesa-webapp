import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityTableCard } from "@/components/app/patterns";
import { calculateAge } from "@/utils";
import Link from "next/link";
import { Edit, Eye, Trash2, UserPlus } from "lucide-react";
import type { OfficialRow } from "../_lib/types";
import { AccountStatusBadge } from "./AccountStatusBadge";
import { getPositionBadgeVariant } from "../_lib/formatting";
import { AttachmentCountBadge } from "@/components/app/attachments/AttachmentsSection";
import { useAttachmentCounts } from "@/components/app/attachments/useAttachments";

type PerangkatTableCardProps = {
  isLoading: boolean;
  rows: OfficialRow[];
  totalPerangkat: number;
  isSubmittingAction: boolean;
  onDetail: (official: OfficialRow) => void;
  onEdit: (official: OfficialRow) => void;
  onDelete: (official: OfficialRow) => void | Promise<void>;
  /** Hanya Admin Desa: boleh membuat akun dan membuka Akses Pengguna. */
  canManageAccounts: boolean;
  onCreateAccount: (official: OfficialRow) => void;
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
    canManageAccounts,
    onCreateAccount,
  } = props;

  const counts = useAttachmentCounts("OFFICIAL", rows.map((r) => r.id));

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
          cell: (row) => (
            <span className="inline-flex items-center gap-2 font-medium">
              {row.name}
              <AttachmentCountBadge count={counts[row.id] ?? 0} />
            </span>
          ),
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
          id: "account",
          header: "Akun Dashboard",
          cell: (row) => {
            const state = row.accountState ?? "none";
            const canCreate = canManageAccounts && state === "none" && row.status?.toLowerCase() === "active";
            return (
              <div className="flex flex-wrap items-center gap-2">
                <AccountStatusBadge state={state} />
                {canCreate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => onCreateAccount(row)}
                    disabled={isSubmittingAction}
                    aria-label={`Buat akun untuk ${row.name}`}
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    Buat akun
                  </Button>
                )}
                {canManageAccounts && state !== "none" && (
                  <Link
                    href="/akses-pengguna"
                    className="text-xs font-medium text-primary underline underline-offset-2"
                    aria-label={`Kelola akses ${row.name}`}
                  >
                    Kelola
                  </Link>
                )}
              </div>
            );
          },
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
