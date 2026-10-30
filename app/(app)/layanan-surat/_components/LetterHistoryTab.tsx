"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, Copy, FileArchive, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LetterHistory } from "../types";
import { useLetterHistory } from "../_hooks/useLetterHistory";
import { V2LetterDialog } from "./LazyDialogs";

const STATUS_LABEL: Record<string, string> = { all: "Semua status", completed: "Selesai", draft: "Draf", archived: "Arsip" };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

function statusMeta(status: LetterHistory["status"]) {
  switch (status) {
    case "completed": return { variant: "default" as const, label: "Selesai" };
    case "draft": return { variant: "secondary" as const, label: "Draf" };
    default: return { variant: "outline" as const, label: "Arsip" };
  }
}

/** Surat dari format lama: tampilkan isian yang tersimpan saja. */
function LegacyLetterNotice({ letter }: { letter: LetterHistory }) {
  const entries = Object.entries(letter.form_data || {}).filter(([, v]) => typeof v === "string" && v.trim() !== "");
  return (
    <div className="space-y-4 font-sans text-sm">
      <div role="note" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-950">
        <p className="font-medium">Surat ini dibuat dengan format lama; pratinjau tidak tersedia.</p>
        <p>Isian yang pernah diisi tetap tersimpan dan ditampilkan di bawah. Untuk membuat surat serupa, mulai dari tab Buat Surat.</p>
      </div>
      {entries.length > 0 && (
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(10rem,14rem)_1fr]">
          {entries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k.replace(/_/g, " ").toLowerCase()}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function LetterHistoryTab() {
  const router = useRouter();
  const h = useLetterHistory();
  const [selectedLetter, setSelectedLetter] = useState<LetterHistory | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [v2LetterId, setV2LetterId] = useState<number | null>(null);

  /** Hanya draf yang bisa diubah (di halaman komposer); "buat surat sejenis" membuka jenis suratnya. Surat format lama hanya bisa dilihat. */
  const isCurrent = (l: LetterHistory) => l.schema_version === 2;
  const canEdit = (l: LetterHistory) => isCurrent(l) && l.status === "draft";
  const editLetter = (l: LetterHistory) => router.push(`/layanan-surat/buat?surat=${l.id}`);
  const duplicateLetter = (l: LetterHistory) => router.push(`/layanan-surat/buat?templateId=${l.template_id}`);

  const handlePreviewLetter = (letter: LetterHistory) => {
    // Surat dokumen v2: isi diambil dari server saat dibuka (daftar tidak membawa dokumen).
    if (isCurrent(letter)) {
      setV2LetterId(letter.id);
      return;
    }
    setSelectedLetter(letter);
    setShowPreview(true);
  };

  const filtered = h.queryInput.trim() !== "" || h.status !== "all" || h.category !== "all";
  const start = (h.page - 1) * h.pageSize;
  const iconBtn = "h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11";

  return (
    <div className="space-y-3">
      {/* Satu baris alat: cari, saring, ringkasan */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-xs">
          <label htmlFor="cari-riwayat" className="sr-only">Cari surat</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="cari-riwayat"
            type="search"
            placeholder="Cari nomor, jenis, atau pemohon..."
            className="bg-input-background pl-9"
            value={h.queryInput}
            onChange={(e) => h.setQueryInput(e.target.value)}
          />
        </div>
        <Select value={h.status} onValueChange={h.setStatus}>
          <SelectTrigger className="w-full md:w-36" aria-label="Saring menurut status">
            <SelectValue>{STATUS_LABEL[h.status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={h.category} onValueChange={h.setCategory}>
          <SelectTrigger className="w-full md:w-44" aria-label="Saring menurut kategori">
            <SelectValue>{h.category === "all" ? "Semua kategori" : h.category}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {h.categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground md:ml-auto" aria-live="polite">
          {h.counts.all} surat · {h.counts.completed} selesai · {h.counts.draft} draf
        </p>
      </div>

      {h.error && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6 text-sm">
            <p role="alert" className="text-destructive">{h.error}</p>
            <Button variant="outline" size="sm" onClick={h.retry}>Coba lagi</Button>
          </CardContent>
        </Card>
      )}

      {!h.loaded && h.loading && !h.error && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <p role="status">Memuat riwayat surat...</p>
          </CardContent>
        </Card>
      )}

      {h.loaded && h.total === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <FileArchive className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h3 className="mb-1 font-semibold">{filtered ? "Tidak ada surat ditemukan" : "Belum ada surat"}</h3>
            <p className="text-sm text-muted-foreground">
              {filtered ? "Coba ubah saringan atau kata kunci pencarian." : "Surat yang Anda buat akan muncul di sini."}
            </p>
          </CardContent>
        </Card>
      )}

      {h.items.length > 0 && (
        <Card className={h.loading ? "opacity-60 transition-opacity motion-reduce:transition-none" : "transition-opacity motion-reduce:transition-none"} aria-busy={h.loading}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Nomor surat</TableHead>
                  <TableHead>Jenis surat</TableHead>
                  <TableHead>Pemohon</TableHead>
                  <TableHead className="hidden lg:table-cell">Kategori</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Tanggal</TableHead>
                  <TableHead className="hidden xl:table-cell">Dibuat oleh</TableHead>
                  <TableHead className="w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {h.items.map((letter) => {
                  const { variant, label } = statusMeta(letter.status);
                  return (
                    <TableRow key={letter.id} className="hover:bg-muted/50">
                      <TableCell className="py-2 font-mono text-xs">{letter.letter_number || "—"}</TableCell>
                      <TableCell className="max-w-64 py-2">
                        <button
                          type="button"
                          className="block max-w-full truncate text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title={letter.template_name}
                          onClick={() => handlePreviewLetter(letter)}
                        >
                          {letter.template_name}
                        </button>
                      </TableCell>
                      <TableCell className="max-w-48 truncate py-2" title={letter.applicant_nik ? `NIK ${letter.applicant_nik}` : undefined}>
                        {letter.applicant_name || "—"}
                      </TableCell>
                      <TableCell className="hidden py-2 lg:table-cell"><Badge variant="outline">{letter.template_category}</Badge></TableCell>
                      <TableCell className="py-2"><Badge variant={variant}>{label}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap py-2 text-sm">{formatDate(letter.created_at)}</TableCell>
                      <TableCell className="hidden py-2 text-sm xl:table-cell">{letter.created_by}</TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className={iconBtn} title="Lihat / cetak" aria-label={`Lihat surat ${letter.template_name}`} onClick={() => handlePreviewLetter(letter)}>
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          {canEdit(letter) && (
                            <Button variant="ghost" size="icon" className={iconBtn} title="Lanjutkan draf" aria-label={`Lanjutkan draf ${letter.template_name}`} onClick={() => editLetter(letter)}>
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          {isCurrent(letter) && (
                            <Button variant="ghost" size="icon" className={iconBtn} title="Buat surat sejenis" aria-label={`Buat surat sejenis ${letter.template_name}`} onClick={() => duplicateLetter(letter)}>
                              <Copy className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {h.total > h.pageSize && (
        <nav aria-label="Halaman riwayat" className="flex items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            {start + 1}–{Math.min(start + h.pageSize, h.total)} dari {h.total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 pointer-coarse:min-h-11" disabled={h.page <= 1 || h.loading} onClick={() => h.setPage(h.page - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Sebelumnya
            </Button>
            <span className="text-muted-foreground">Halaman {h.page} / {h.pageCount}</span>
            <Button variant="outline" size="sm" className="gap-1 pointer-coarse:min-h-11" disabled={h.page >= h.pageCount || h.loading} onClick={() => h.setPage(h.page + 1)}>
              Berikutnya <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}

      {/* Surat format lama: hanya isian tersimpan yang bisa dilihat */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedLetter?.template_name}</DialogTitle>
            <DialogDescription>Nomor {selectedLetter?.letter_number || "-"}</DialogDescription>
          </DialogHeader>
          {selectedLetter && <LegacyLetterNotice letter={selectedLetter} />}
          <div className="flex justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      <V2LetterDialog
        letterId={v2LetterId}
        open={v2LetterId !== null}
        onOpenChange={(open) => {
          if (!open) setV2LetterId(null);
        }}
      />
    </div>
  );
}
