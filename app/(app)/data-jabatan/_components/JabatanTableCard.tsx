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
import { Edit, Trash2, Users } from "lucide-react";
import type { Jabatan } from "../_lib/types";
import {
  formatCurrency,
  getLevelBadgeVariant,
  getLevelName,
} from "../_lib/formatting";

type JabatanTableCardProps = {
  isLoading: boolean;
  rows: Jabatan[];
};

export function JabatanTableCard(props: JabatanTableCardProps) {
  const { isLoading, rows } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Jabatan</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Memuat data..." : `Menampilkan ${rows.length} jabatan`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12.5">#</TableHead>
                <TableHead>Nama Jabatan</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Tunjangan</TableHead>
                <TableHead>Jumlah Pegawai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Tidak ada data yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((jabatan, index) => (
                  <TableRow key={jabatan.id} className="hover:bg-muted/50">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{jabatan.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">
                      {jabatan.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getLevelBadgeVariant(jabatan.level)}>
                        {getLevelName(jabatan.level)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(jabatan.salary)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatCurrency(jabatan.allowance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {jabatan.total_staff}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={jabatan.isActive ? "default" : "secondary"}>
                        {jabatan.isActive ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
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

