"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import type { Row } from "./types";

type Archive = { id: string; title: string; fileName: string; year: number | null };

export function RecordDialog({ row, year, onClose, onDone }: { row: Row; year: number; onClose: () => void; onDone: () => void }) {
  const rec = row.record;
  const [status, setStatus] = useState<"DRAF" | "TERKIRIM">(rec?.status === "DRAF" ? "DRAF" : "TERKIRIM");
  const [sentOn, setSentOn] = useState(rec?.sentOn ?? localToday());
  const [referenceNo, setReferenceNo] = useState(rec?.referenceNo ?? "");
  const [note, setNote] = useState(rec?.note ?? "");
  const [archiveId, setArchiveId] = useState(rec?.archiveId ?? "");
  const [query, setQuery] = useState("");
  const [archives, setArchives] = useState<Archive[]>(row.archive ? [{ id: row.archive.id, title: row.archive.title, fileName: "", year: null }] : []);
  const [searching, setSearching] = useState(false);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/kepatuhan/arsip?q=${encodeURIComponent(query)}`, { cache: "no-store" }).catch(() => null);
      const j = res?.ok ? ((await res.json().catch(() => null)) as { items: Archive[] } | null) : null;
      setSearching(false);
      if (!j) return;
      setArchives((prev) => {
        const keep = prev.find((a) => a.id === archiveId);
        return keep && !j.items.some((a) => a.id === keep.id) ? [keep, ...j.items] : j.items;
      });
    }, query ? 300 : 0);
    return () => clearTimeout(t);
    // archiveId sengaja tidak jadi dependensi: memilih berkas tak perlu memicu pencarian ulang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const ok = await submit("/api/kepatuhan/catatan", "POST", { year, itemKey: row.key, status, sentOn: status === "TERKIRIM" ? sentOn : undefined, referenceNo, note, archiveId: archiveId || undefined });
    if (ok) onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="break-words">Catat pengiriman: {row.title}</DialogTitle>
          <DialogDescription>
            {row.autoDerived && row.status === "TERKIRIM" ? "Status butir ini sudah terbaca dari data sistem. Catatan di sini hanya menambah bukti (nomor surat atau berkas)." : "Catat bila laporan dikirim atau diumumkan di luar aplikasi. Bukti kirim membantu saat pemeriksaan."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ status: "Status", sentOn: "Tanggal", referenceNo: "Nomor bukti", note: "Catatan", archiveId: "Berkas bukti", itemKey: "Butir" }} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Status *</legend>
            <div className="flex flex-wrap gap-3">
              {([["TERKIRIM", row.doneLabel], ["DRAF", "Masih draf"]] as const).map(([v, l]) => (
                <label key={v} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3">
                  <input type="radio" name="kp-status" value={v} checked={status === v} onChange={() => setStatus(v)} className="size-4" />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          {status === "TERKIRIM" ? (
            <div className="space-y-1.5">
              <Label htmlFor="kp-sent">Tanggal {row.doneLabel.toLowerCase()} *</Label>
              <Input id="kp-sent" type="date" className="h-11 w-full sm:w-56" max={localToday()} value={sentOn} onChange={(e) => setSentOn(e.target.value)} aria-invalid={Boolean(errors.sentOn)} aria-describedby={errors.sentOn ? "kp-sent-err" : undefined} />
              {errors.sentOn ? <p id="kp-sent-err" className="text-sm text-destructive">{errors.sentOn}</p> : null}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="kp-ref">Nomor surat pengantar / tanda terima</Label>
            <Input id="kp-ref" className="h-11" maxLength={150} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} aria-describedby="kp-ref-help" />
            <p id="kp-ref-help" className="text-xs text-muted-foreground">Contoh: 140/012/Des/2026. Boleh dikosongkan.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kp-note">Catatan</Label>
            <Textarea id="kp-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="kp-q">Berkas bukti dari Arsip Digital</Label>
            <Input id="kp-q" className="h-11" placeholder="Cari judul atau nama berkas" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
            <SearchSelect id="kp-archive" className={SELECT_CLASS} value={archiveId} onChange={(e) => setArchiveId(e.target.value)} aria-label="Pilih berkas bukti" placeholder={searching ? "Mencari…" : "Tanpa berkas"} emptyText="Tidak ada berkas">
              <option value="">Tanpa berkas</option>
              {archives.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}{a.fileName ? ` (${a.fileName})` : ""}
                </option>
              ))}
            </SearchSelect>
            {errors.archiveId ? <p className="text-sm text-destructive">{errors.archiveId}</p> : null}
            <p className="text-xs text-muted-foreground">Unggah berkas lebih dulu di menu Arsip Digital, lalu pilih di sini.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
