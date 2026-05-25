"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type EntityTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  className?: string;
};

type EntityTableCardProps<T> = {
  title: string;
  description?: string;
  columns: EntityTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  footer?: ReactNode;
};

export function EntityTableCard<T>({
  title,
  description,
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = "Tidak ada data yang ditemukan",
  loadingMessage = "Memuat data...",
  footer,
}: EntityTableCardProps<T>) {
  const colSpan = columns.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map((col) => (
                  <TableHead key={col.id} className={col.className}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {loading ? loadingMessage : emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={rowKey(row, index)} className="hover:bg-muted/50">
                    {columns.map((col) => (
                      <TableCell key={col.id} className={col.className}>
                        {col.cell(row, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}
