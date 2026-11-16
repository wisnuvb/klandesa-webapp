"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDown, ExternalLink, FileSpreadsheet, FileText, Info, Loader2, TriangleAlert } from "lucide-react";
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
  formatAgeParts,
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
const ageText = (p: Person) =>
  p.age === null ? "-" : formatAgeParts({ years: p.age, months: p.ageMonths ?? 0, days: p.ageDays ?? 0 });
const personNote = (p: Person) => [p.isPregnant ? "Hamil" : null, p.maritalStatus, p.moveDate ? `Pindah ${tanggal(p.moveDate)}` : null].filter(Boolean).join(" · ");
const personLine = (p: Person) => [genderCode(p.gender), ageText(p), areaText(p)].filter((x) => x && x !== "-").join(" · ");

/** Nama warga: tautan ke rincian di tab baru bila boleh membuka Data Warga, selain itu teks biasa. */
function PersonName({ p }: { p: Person }) {
  return (
    <Can resource="residents" action="read" fallback={<span>{p.name}</span>}>
      <a
        href={`/data-warga?detail=${p.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {p.name}
        <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="sr-only">(rincian warga, dibuka di tab baru)</span>
      </a>
    </Can>
  );
}

type Paged = { url: string; people: Person[]; total: number; next: number | null; error: string | null; moreLoading: boolean };

/**
 * Daftar bertahap: halaman pertama dimuat saat url berubah, halaman berikutnya lewat loadMore (tambah ke bawah).
 * Hasil basi (url sudah berganti) dibuang. `loading` diturunkan dari url yang belum terjawab, tanpa setState sinkron di effect.
 */
function usePagedList(baseUrl: string | null) {
  const [state, setState] = useState<Paged | null>(null);

  useEffect(() => {
    if (!baseUrl) return;
    const ctrl = new AbortController();
    fetch(`${baseUrl}&offset=0`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Partial<SasaranList> & { error?: string };
        if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Gagal memuat daftar warga");
        setState({ url: baseUrl, people: body.people ?? [], total: body.total ?? 0, next: body.nextOffset ?? null, error: null, moreLoading: false });
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setState({ url: baseUrl, people: [], total: 0, next: null, error: e instanceof Error ? e.message : "Gagal memuat daftar warga", moreLoading: false });
      });
    return () => ctrl.abort();
  }, [baseUrl]);

  const current = baseUrl && state?.url === baseUrl ? state : null;
  const next = current?.next ?? null;
  const moreLoading = current?.moreLoading ?? false;

  const loadMore = useCallback(() => {
    if (!baseUrl || next === null || moreLoading) return;
    setState((p) => (p && p.url === baseUrl ? { ...p, moreLoading: true, error: null } : p));
    fetch(`${baseUrl}&offset=${next}`, { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as Partial<SasaranList> & { error?: string };
        if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Gagal memuat daftar warga");
        setState((p) => (p && p.url === baseUrl ? { ...p, people: [...p.people, ...(body.people ?? [])], total: body.total ?? p.total, next: body.nextOffset ?? null, moreLoading: false } : p));
      })
      .catch((e) => setState((p) => (p && p.url === baseUrl ? { ...p, moreLoading: false, error: e instanceof Error ? e.message : "Gagal memuat daftar warga" } : p)));
  }, [baseUrl, next, moreLoading]);

  return { data: current, loading: Boolean(baseUrl) && current === null, loadMore };
}

function ResidentsDialog({ cell, status, onClose }: { cell: SasaranCell | null; status: SasaranStatus; onClose: () => void }) {
  const url = cell
    ? `/api/pkk/sasaran/warga?group=${encodeURIComponent(cell.group)}&status=${status}&limit=50${cell.area !== null ? `&area=${encodeURIComponent(cell.area)}` : ""}`
    : null;
  const { data, loading, loadMore } = usePagedList(url);

  // Gulir otomatis: saat penanda di dasar daftar terlihat, muat halaman berikutnya. Tombol di bawahnya tetap ada sebagai jalur keyboard/pembaca layar.
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, data?.next, data?.people.length]);

  return (
    <Dialog open={cell !== null} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{cell?.title}</DialogTitle>
          <DialogDescription>
            {data && !data.error
              ? `${data.total} warga (${SASARAN_STATUS_LABEL[status].toLowerCase()})${data.next !== null ? `, ditampilkan ${data.people.length}` : ""}. NIK tidak ditampilkan.`
              : "Daftar nama warga di kelompok ini."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p role="status" className="flex items-center gap-2 p-4 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            Memuat daftar…
          </p>
        ) : null}
        {data?.error ? (
          <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <p>{data.error}</p>
            {data.people.length > 0 ? (
              <Button type="button" variant="outline" className="min-h-11" onClick={loadMore} disabled={data.next === null}>
                Coba muat lagi
              </Button>
            ) : null}
          </div>
        ) : null}

        {data && !data.error && data.people.length === 0 ? <p className="p-4 text-center text-muted-foreground">Tidak ada warga di kelompok ini.</p> : null}
        {data && data.people.length > 0 ? (
          <>
            {/* Ponsel: daftar bertumpuk (tabel 5 kolom terlalu sempit). Layar lebar: tabel. */}
            <ul className="divide-y sm:hidden">
              {data.people.map((p) => (
                <li key={p.id} className="space-y-0.5 py-2">
                  <p className="font-medium"><PersonName p={p} /></p>
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
                      <TableCell className="whitespace-normal font-medium"><PersonName p={p} /></TableCell>
                      <TableCell>{genderCode(p.gender)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{ageText(p)}</TableCell>
                      <TableCell className="whitespace-nowrap">{areaText(p)}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{personNote(p) || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.next !== null ? (
              <div ref={sentinel} className="flex flex-col items-center gap-2 py-2">
                <p role="status" className="text-sm text-muted-foreground">
                  {data.moreLoading ? "Memuat lebih banyak…" : `Menampilkan ${data.people.length} dari ${data.total}`}
                </p>
                <Button type="button" variant="outline" className="min-h-11" onClick={loadMore} disabled={data.moreLoading}>
                  {data.moreLoading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                  Tampilkan {Math.min(50, data.total - data.people.length)} berikutnya
                </Button>
              </div>
            ) : (
              <p className="py-1 text-center text-sm text-muted-foreground">Semua {data.total} warga sudah ditampilkan.</p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
