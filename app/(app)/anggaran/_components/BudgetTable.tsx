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
import { Edit, Eye, Trash2 } from "lucide-react";
import type { VillageBudget } from "../_lib/types";
import { formatCurrency } from "../_lib/currency";
import { getRowTotals } from "../_lib/calculations";

type BudgetTableProps = {
  filteredData: VillageBudget[];
  totalCount: number;
  onViewDetail: (budget: VillageBudget) => void;
  onEdit: (budget: VillageBudget) => void;
  onDelete: (id: number) => void | Promise<void>;
};

export function BudgetTable(props: BudgetTableProps) {
  const { filteredData, totalCount, onViewDetail, onEdit, onDelete } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Anggaran Desa</CardTitle>
        <p className="text-sm text-muted-foreground">
          Menampilkan {filteredData.length} dari {totalCount} data anggaran
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12.5">#</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead>Total Pendapatan</TableHead>
                <TableHead>Total Anggaran</TableHead>
                <TableHead>Total Realisasi</TableHead>
                <TableHead>Sisa Anggaran</TableHead>
                <TableHead>% Realisasi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Tidak ada data yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((budget, index) => {
                  const { totalBudgetRow, totalRealizationRow, percentageRow } =
                    getRowTotals(budget);

                  return (
                    <TableRow key={budget.id} className="hover:bg-muted/50">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Badge variant="default">{budget.year}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(budget.revenue)}
                      </TableCell>
                      <TableCell>{formatCurrency(totalBudgetRow)}</TableCell>
                      <TableCell>{formatCurrency(totalRealizationRow)}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(budget.remaining_budget)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            percentageRow >= 80
                              ? "default"
                              : percentageRow >= 50
                                ? "secondary"
                                : "outline"
                          }
                          className={
                            percentageRow >= 80
                              ? "bg-green-500"
                              : percentageRow >= 50
                                ? "bg-amber-500"
                                : ""
                          }
                        >
                          {percentageRow.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => onViewDetail(budget)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-50"
                            onClick={() => onEdit(budget)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => void onDelete(budget.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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

