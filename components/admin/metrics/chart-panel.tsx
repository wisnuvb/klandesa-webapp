"use client";

import { useId, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "./shared";

// recharts dimuat lazy (audit performa); Skeleton setinggi grafik agar tidak ada lonjakan tata letak.
const chartSkeleton = () => <Skeleton className="h-[260px] w-full" />;
const RevenueBarChart = dynamic(() => import("./charts").then((m) => m.RevenueBarChart), { ssr: false, loading: chartSkeleton });
const GrowthChart = dynamic(() => import("./charts").then((m) => m.GrowthChart), { ssr: false, loading: chartSkeleton });

export type TableColumn<R> = { header: string; align?: "left" | "right"; cell: (row: R) => ReactNode };

/**
 * Pembungkus grafik yang ramah akses: ringkasan teks selalu terlihat, grafik punya label bacaan layar,
 * dan tombol "Lihat sebagai tabel" menampilkan data yang sama sebagai tabel.
 */
export function ChartPanel<R>({
  summary, rows, columns, rowKey, isEmpty, emptyTitle, emptyHint, chart, tableCaption,
}: {
  summary: string;
  rows: R[];
  columns: Array<TableColumn<R>>;
  rowKey: (row: R) => string;
  isEmpty: boolean;
  emptyTitle: string;
  emptyHint?: string;
  chart: ReactNode;
  tableCaption: string;
}) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  if (isEmpty) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p id={`${id}-summary`} className="text-sm text-muted-foreground">{summary}</p>
        <Button
          type="button" variant="outline" size="sm" className="min-h-10 shrink-0 gap-1.5"
          aria-pressed={asTable} aria-controls={`${id}-view`} onClick={() => setAsTable((v) => !v)}
        >
          {asTable ? <BarChart3 className="size-4" aria-hidden="true" /> : <Table2 className="size-4" aria-hidden="true" />}
          {asTable ? "Lihat sebagai grafik" : "Lihat sebagai tabel"}
        </Button>
      </div>
      <div id={`${id}-view`}>
        {asTable ? (
          <div className="max-h-72 overflow-auto rounded-md border">
            <Table>
              <caption className="sr-only">{tableCaption}</caption>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.header} scope="col" className={c.align === "right" ? "text-right" : undefined}>{c.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={rowKey(r)}>
                    {columns.map((c) => (
                      <TableCell key={c.header} className={c.align === "right" ? "text-right tabular-nums" : "tabular-nums"}>{c.cell(r)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div role="img" aria-labelledby={`${id}-summary`}>{chart}</div>
        )}
      </div>
    </div>
  );
}

export { RevenueBarChart, GrowthChart };
