import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Card>
      <CardHeader>
        <CardTitle>Daftar Perangkat Desa</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Memuat data perangkat..."
            : `Menampilkan ${rows.length} dari ${totalPerangkat} perangkat desa`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12.5">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Jenis Kelamin</TableHead>
                <TableHead>Usia</TableHead>
                <TableHead>Pendidikan</TableHead>
                <TableHead>No. Telepon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {isLoading ? "Memuat data perangkat..." : "Tidak ada data yang ditemukan"}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((perangkat, index) => (
                  <TableRow key={perangkat.id} className="hover:bg-muted/50">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{perangkat.name}</TableCell>
                    <TableCell className="font-mono text-xs">{perangkat.nik}</TableCell>
                    <TableCell>
                      <Badge
                        variant={getPositionBadgeVariant(perangkat.position?.level || 5)}
                      >
                        {perangkat.position?.name ?? "Tidak Diketahui"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={perangkat.gender === "M" ? "default" : "secondary"}>
                        {perangkat.gender === "M" ? "Laki-laki" : "Perempuan"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {perangkat.birthDate ? `${calculateAge(perangkat.birthDate)} Tahun` : "-"}
                    </TableCell>
                    <TableCell className="text-sm">{perangkat.education || "-"}</TableCell>
                    <TableCell className="text-sm">{perangkat.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          perangkat.status?.toLowerCase() === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {perangkat.status?.toLowerCase() === "active" ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => onDetail(perangkat)}
                          disabled={isSubmittingAction}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50"
                          onClick={() => onEdit(perangkat)}
                          disabled={isSubmittingAction}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => void onDelete(perangkat)}
                          disabled={isSubmittingAction}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

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
      </CardContent>
    </Card>
  );
}

