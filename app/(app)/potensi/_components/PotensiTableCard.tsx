"use client";

import { Edit, Eye, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VillagePotential } from "../_lib/types";

type PotensiTableCardProps = {
  potentialList: VillagePotential[];
  isLoading: boolean;
  onViewDetail: (potential: VillagePotential) => void;
  onEdit: (potential: VillagePotential) => void;
  onDelete: (id: number) => void;
};

export function PotensiTableCard(props: PotensiTableCardProps) {
  const { potentialList, isLoading, onViewDetail, onEdit, onDelete } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Potensi Desa</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Memuat data..." : `Menampilkan ${potentialList.length} data potensi desa`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12.5">#</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead>Populasi</TableHead>
                <TableHead>KK</TableHead>
                <TableHead>Luas (Ha)</TableHead>
                <TableHead>Lahan Pertanian</TableHead>
                <TableHead>Perkebunan</TableHead>
                <TableHead>Hutan</TableHead>
                <TableHead>Pendidikan</TableHead>
                <TableHead>Kesehatan</TableHead>
                <TableHead>Wisata</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : potentialList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    Tidak ada data yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                potentialList.map((potential, index) => (
                  <TableRow key={potential.id} className="hover:bg-muted/50">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      <Badge variant="default">{potential.year}</Badge>
                    </TableCell>
                    <TableCell>{potential.population.toLocaleString()}</TableCell>
                    <TableCell>{potential.households.toLocaleString()}</TableCell>
                    <TableCell>{potential.area.toLocaleString()}</TableCell>
                    <TableCell>{potential.agricultureLand} Ha</TableCell>
                    <TableCell>{potential.plantationLand} Ha</TableCell>
                    <TableCell>{potential.forestArea} Ha</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{potential.educationFacilities}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{potential.healthFacilities}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{potential.tourismSpots}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => onViewDetail(potential)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(potential)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(potential.id)}
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

