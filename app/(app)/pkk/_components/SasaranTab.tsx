"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDown, FileSpreadsheet, FileText, Info, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Can } from "@/components/permissions/Can";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiGet } from "@/hooks/useApiGet";
import {
  SASARAN_COLUMNS,
  SASARAN_STATUSES,
  SASARAN_STATUS_LABEL,
  areaLabel,
  type SasaranReport,
  type SasaranStatus,
} from "@/lib/pkk/sasaran";
import type { SasaranList } from "@/lib/pkk/sasaran-data";
import { buildSasaranSheet, sasaranCsv, sasaranFileName, sasaranNotes } from "@/lib/pkk/sasaran-export";
import { downloadBlob } from "@/lib/statistics/download";
import { SasaranTable, type SasaranCell } from "./SasaranTable";

type Report = SasaranReport & { status: SasaranStatus; terpotong: boolean };

const STATUS_HINT: Record<SasaranStatus, string> = {
  aktif: "Warga hidup yang belum tercatat pindah. Inilah sasaran posyandu desa.",
  pindah: "Warga yang sudah tercatat pindah dari desa. Untuk memeriksa data, bukan untuk sasaran posyandu.",
  semua: "Warga aktif dan yang sudah pindah digabung.",
};

const tanggal = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function SasaranTab() {
  const [status, setStatus] = useState<SasaranStatus>("aktif");
  // Stale-while-revalidate: pindah tab/filter terasa instan, angka tetap disegarkan di latar belakang.
  const { data, loading, error, reload } = useApiGet<Report>(`/api/pkk/sasaran?status=${status}`, { staleMs: 60_000 });
  const { data: session } = useSession();
  const villageName = session?.user?.village?.name || session?.user?.villageCode || "Desa";
  const [cell, setCell] = useState<SasaranCell | null>(null);
  const [exporting, setExporting] = useState(false);

  const exportSheet = async (format: "excel" | "csv") => {
    if (!data) return;
    setExporting(true);
    try {
      const at = new Date(data.dihitungPada);
      const sheet = buildSasaranSheet(data, villageName, at, data.status);
      if (format === "csv") {
        downloadBlob(new Blob([sasaranCsv(sheet)], { type: "text/csv;charset=utf-8" }), sasaranFileName(villageName, "csv", at, data.status));
      } else {
        // xlsx cukup besar; baru dimuat saat benar-benar dipakai.
        const XLSX = await import("xlsx");
        const book = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sheet);
        ws["!cols"] = [{ wch: 22 }, { wch: 14 }, ...SASARAN_COLUMNS.map(() => ({ wch: 16 }))];
        XLSX.utils.book_append_sheet(book, ws, "Data sasaran");
        const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
        downloadBlob(
          new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          sasaranFileName(villageName, "xlsx", at, data.status),
        );
      }
      toast.success("Data sasaran diunduh.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh data sasaran");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Jumlah warga per RT di tiap kelompok sasaran posyandu, dihitung dari data kependudukan. Klik sebuah angka untuk melihat daftar namanya.
        </p>
        <Can resource="pkk" action="export">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-h-11" disabled={!data || exporting}>
                {exporting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                Unduh rekap
                <ChevronDown aria-hidden="true" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void exportSheet("excel")}>
                <FileSpreadsheet aria-hidden="true" className="size-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportSheet("csv")}>
                <FileText aria-hidden="true" className="size-4" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Can>
      </div>

      <div className="space-y-2">
        <div role="group" aria-label="Status warga" className="flex flex-wrap gap-2">
          {SASARAN_STATUSES.map((s) => (
            <Button
              key={s}
              type="button"
              variant={status === s ? "default" : "outline"}
              aria-pressed={status === s}
              className="min-h-11"
              onClick={() => setStatus(s)}
            >
              {SASARAN_STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
        {status === "aktif" ? (
          <p className="text-sm text-muted-foreground">{STATUS_HINT[status]}</p>
        ) : (
          // Bukan tampilan sasaran: beri penanda yang tidak bisa terlewat (ikon + teks, bukan warna saja).
          <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/60 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold">{SASARAN_STATUS_LABEL[status]}.</strong> {STATUS_HINT[status]}
            </span>
          </p>
        )}
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Menghitung data sasaran…
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {data && data.rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          {data.status === "pindah"
            ? "Belum ada warga yang tercatat pindah."
            : "Belum ada data warga. Tambahkan warga di menu Data Warga, lalu sasaran posyandu akan terhitung di sini."}
        </p>
      ) : null}

      {data && data.rows.length > 0 ? (
        <>
          <SasaranTable report={data} caption={`Data sasaran posyandu per RT, status warga: ${SASARAN_STATUS_LABEL[data.status]}`} onOpen={setCell} />

          <div className="space-y-1 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Info aria-hidden="true" className="size-4" />
              Cara membaca
            </p>
            <ul className="list-disc space-y-1 pl-6">
              {sasaranNotes(data.status).map((n) => (
                <li key={n}>{n}</li>
              ))}
              <li>† = kolom tumpang tindih.</li>
              {data.tanpaRt > 0 ? (
                <li>
                  {data.tanpaRt} warga belum punya RT di data kependudukan, sehingga masuk baris &ldquo;Tanpa RT&rdquo;. Lengkapi RT-nya agar sasaran tiap RT akurat
                  <Can resource="residents" action="read">
                    {" "}
                    (<Link href="/data-warga" className="font-medium text-foreground underline underline-offset-4">buka Data Warga</Link>)
                  </Can>
                  .
                </li>
              ) : null}
              {data.usiaTidakValid > 0 ? (
                <li>{data.usiaTidakValid} warga bertanggal lahir tidak valid (kosong atau di masa depan), tidak masuk kelompok usia.</li>
              ) : null}
              {data.terpotong ? <li>Jumlah warga melebihi batas hitung, angka di atas belum lengkap.</li> : null}
            </ul>
          </div>
        </>
      ) : null}

      <ResidentsDialog cell={cell} status={status} onClose={() => setCell(null)} />
    </div>
  );
}

type Person = SasaranList["people"][number];
const genderCode = (g: string) => (/^l/i.test(g) ? "L" : /^(p|w)/i.test(g) ? "P" : "-");
const areaText = (p: Person) => areaLabel(p.rw, p.rt).replace(/^Tanpa RT\/RW$/, "-");
const personNote = (p: Person) => [p.isPregnant ? "Hamil" : null, p.maritalStatus, p.moveDate ? `Pindah ${tanggal(p.moveDate)}` : null].filter(Boolean).join(" · ");
const personLine = (p: Person) => [genderCode(p.gender), p.age === null ? null : `${p.age} th`, areaText(p)].filter((x) => x && x !== "-").join(" · ");

function ResidentsDialog({ cell, status, onClose }: { cell: SasaranCell | null; status: SasaranStatus; onClose: () => void }) {
  const url = cell
    ? `/api/pkk/sasaran/warga?group=${encodeURIComponent(cell.group)}&status=${status}${cell.area !== null ? `&area=${encodeURIComponent(cell.area)}` : ""}`
    : null;
  const { data, loading, error } = useApiGet<SasaranList>(url);

  return (
    <Dialog open={cell !== null} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{cell?.title}</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.total} warga (${SASARAN_STATUS_LABEL[status].toLowerCase()})${data.terpotong ? `, ditampilkan ${data.people.length} pertama` : ""}. NIK tidak ditampilkan.`
              : "Daftar nama warga di kelompok ini."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p role="status" className="flex items-center gap-2 p-4 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            Memuat daftar…
          </p>
        ) : null}
        {error ? <p role="alert" className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">{error}</p> : null}

        {data && data.people.length === 0 ? <p className="p-4 text-center text-muted-foreground">Tidak ada warga di kelompok ini.</p> : null}
        {data && data.people.length > 0 ? (
          <>
            {/* Ponsel: daftar bertumpuk (tabel 5 kolom terlalu sempit). Layar lebar: tabel. */}
            <ul className="divide-y sm:hidden">
              {data.people.map((p) => (
                <li key={p.id} className="space-y-0.5 py-2">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{personLine(p)}</p>
                  {personNote(p) ? <p className="text-sm text-muted-foreground">{personNote(p)}</p> : null}
                </li>
              ))}
            </ul>
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Nama</TableHead>
                    <TableHead scope="col">L/P</TableHead>
                    <TableHead scope="col" className="text-right">Usia</TableHead>
                    <TableHead scope="col">RT / RW</TableHead>
                    <TableHead scope="col">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.people.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-normal font-medium">{p.name}</TableCell>
                      <TableCell>{genderCode(p.gender)}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.age === null ? "-" : `${p.age} th`}</TableCell>
                      <TableCell>{areaText(p)}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{personNote(p) || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
