"use client";

import { ChevronLeft, ChevronRight, Eye, Inbox, Loader2, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ageLabel, CHANNEL_LABEL, CheckBadge, formatDate, RtBadge, StatusBadge, type QueueRow } from "./shared";

export function RequestTable({
  rows,
  loading,
  error,
  filtered,
  page,
  pageSize,
  total,
  onPage,
  onOpen,
  onRetry,
}: {
  rows: QueueRow[];
  loading: boolean;
  error: string | null;
  filtered: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onOpen: (row: QueueRow) => void;
  onRetry: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const cols = 6;

  return (
    <div className="space-y-3" aria-busy={loading}>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Pemohon</TableHead>
              <TableHead>Jenis surat &amp; keperluan</TableHead>
              <TableHead>Diajukan</TableHead>
              <TableHead>Saluran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols} className="py-12 text-center">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" aria-label="Memuat" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={cols} className="py-10 text-center">
                  <p className="text-destructive">{error}</p>
                  <Button variant="outline" className="mt-3" onClick={onRetry}>Coba lagi</Button>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols} className="py-12 text-center text-muted-foreground">
                  {filtered ? <SearchX className="mx-auto mb-2 h-8 w-8" aria-hidden /> : <Inbox className="mx-auto mb-2 h-8 w-8" aria-hidden />}
                  <p className="font-medium text-foreground">{filtered ? "Tidak ada permohonan yang cocok" : "Belum ada permohonan surat"}</p>
                  <p className="text-sm">{filtered ? "Ubah atau atur ulang filter untuk melihat lebih banyak." : "Permohonan dari warga (aplikasi, portal, kiosk) akan muncul di sini."}</p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                return (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(r)}>
                    <TableCell>
                      <p className="font-medium">{r.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{r.nik}</p>
                      {r.rtLabel ? <p className="text-xs text-muted-foreground">{r.rtLabel}</p> : null}
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <p className="font-medium">{r.mailType}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{r.purpose}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{r.requestNumber}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <p>{formatDate(r.requestDate)}</p>
                      <p className={r.status === "PENDING" && r.ageDays > 7 ? "text-xs font-medium text-red-700" : "text-xs text-muted-foreground"}>
                        {r.status === "PENDING" ? ageLabel(r.ageDays) : r.processedDate ? `Diputus ${formatDate(r.processedDate)}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CHANNEL_LABEL[r.channel] ?? r.channel}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={r.status} />
                        <RtBadge row={r} />
                        <CheckBadge row={r} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); onOpen(r); }} aria-label={`Tinjau permohonan ${r.requestNumber} atas nama ${r.name}`}>
                        <Eye className="h-4 w-4" aria-hidden /> Tinjau
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <p className="text-sm text-muted-foreground" role="status">
          {loading ? "Memuat…" : total === 0 ? "0 permohonan" : `Menampilkan ${from}–${to} dari ${total} permohonan`}
        </p>
        <nav className="flex items-center gap-2" aria-label="Halaman">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => onPage(page - 1)} disabled={page <= 1 || loading}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Sebelumnya
          </Button>
          <span className="text-sm tabular-nums">Halaman {page} dari {totalPages}</span>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => onPage(page + 1)} disabled={page >= totalPages || loading}>
            Berikutnya <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </nav>
      </div>
    </div>
  );
}
