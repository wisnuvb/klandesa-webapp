/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type DataTableColumn } from "@/components/ui/data-table";
import { Edit, Eye, Trash2 } from "lucide-react";
import { calculateAge } from "@/utils";
import { Resident } from "@prisma/client";

interface CreateColumnsParams {
  onView: (resident: Resident) => void;
  onEdit: (resident: Resident) => void;
  onDelete?: (resident: Resident) => void;
}

export const createDataWargaColumns = ({
  onView,
  onEdit,
  onDelete,
}: CreateColumnsParams): DataTableColumn<Resident>[] => [
  {
    key: "no",
    header: "#",
    cell: (_row, idx) => idx + 1,
    width: 56,
    align: "center",
  },
  { key: "name", header: "Nama", sortable: true },
  {
    key: "nik",
    header: "NIK",
    sortable: true,
    className: "font-mono text-xs",
  },
  {
    key: "kk",
    header: "No. KK",
    sortable: true,
    className: "font-mono text-xs",
  },
  {
    key: "gender",
    header: "Jenis Kelamin",
    sortable: true,
    cell: ({ gender }) => (
      <Badge variant={gender === "Laki-laki" ? "default" : "secondary"}>
        {gender === "Laki-laki" ? "Laki-laki" : "Perempuan"}
      </Badge>
    ),
  },
  {
    key: "birthDate",
    header: "Usia",
    sortable: true,
    cell: (w) => `${calculateAge(w.birthDate as any)} Tahun`,
  },
  {
    key: "education",
    header: "Pendidikan",
    cell: (w) => w.education ?? "-",
  },
  {
    key: "occupation",
    header: "Pekerjaan",
    cell: (w) => w.occupation ?? "-",
  },
  {
    key: "maritalStatus",
    header: "Status",
    sortable: true,
    cell: (w) => w.maritalStatus,
  },
  {
    key: "actions",
    header: <span className="block text-right">Aksi</span>,
    className: "text-right",
    cell: (row) => (
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => onView(row)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50"
          onClick={() => onEdit(row)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    ),
  },
];
