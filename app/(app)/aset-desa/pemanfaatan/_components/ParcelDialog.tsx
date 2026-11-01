"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { SELECT_CLASS, type LandResponse, type LandRow } from "./types";

const LABELS: Record<string, string> = {
  areaSqm: "Luas",
  rightKind: "Jenis bukti hak",
  rightNumber: "Nomor bukti hak",
  rightIssuedOn: "Tanggal terbit",
  usage: "Status pemanfaatan",
  address: "Letak",
  boundaryNorth: "Batas utara",
  boundaryEast: "Batas timur",
  boundarySouth: "Batas selatan",
  boundaryWest: "Batas barat",
  rightHolder: "Atas nama",
  persilNo: "Nomor persil",
  letterCNo: "Nomor Letter C",
  usageNote: "Keterangan pemanfaatan",
  notes: "Catatan",
};

type Form = Record<string, string>;
const init = (r: LandRow): Form => ({
  areaSqm: r.parcel?.areaSqm.replace(/\.00$/, "") ?? "",
  address: r.parcel?.address ?? r.location ?? "",
  boundaryNorth: r.parcel?.boundaryNorth ?? "",
  boundaryEast: r.parcel?.boundaryEast ?? "",
  boundarySouth: r.parcel?.boundarySouth ?? "",
  boundaryWest: r.parcel?.boundaryWest ?? "",
  rightKind: r.parcel?.rightKind ?? "BELUM_ADA",
  rightNumber: r.parcel?.rightNumber ?? "",
  rightHolder: r.parcel?.rightHolder ?? "",
  rightIssuedOn: r.parcel?.rightIssuedOn ?? "",
  persilNo: r.parcel?.persilNo ?? "",
  letterCNo: r.parcel?.letterCNo ?? "",
  usage: r.parcel?.usage ?? "TIDAK_DIMANFAATKAN",
  usageNote: r.parcel?.usageNote ?? "",
  notes: r.parcel?.notes ?? "",
});

export function ParcelDialog({ row, terms, onClose, onSaved }: { row: LandRow; terms: LandResponse["terms"]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>(() => init(row));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const text = (k: string, label: string, props: { max?: number; type?: string; hint?: string; required?: boolean } = {}) => (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={`tanah-${k}`}>
        {label}
        {props.required ? " *" : ""}
      </Label>
      <Input {...fieldA11y(`tanah-${k}`, errors[k])} className="h-11" type={props.type ?? "text"} maxLength={props.max} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
      {props.hint ? <p className="text-sm text-muted-foreground">{props.hint}</p> : null}
      <FieldError id={`tanah-${k}`} message={errors[k]} />
    </div>
  );

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/aset-desa/tanah/${row.itemId}`, "PUT", { ...f, rightIssuedOn: f.rightIssuedOn || null });
    if (r) onSaved();
  }
  const registered = ["SHM", "SHP", "HPL", "SHGB"].includes(f.rightKind);

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-words">Data tanah: {row.name}</DialogTitle>
          <DialogDescription>Luas, batas, bukti hak, dan status pemanfaatan. Tanda * wajib diisi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("areaSqm", "Luas (m2)", { required: true, max: 14, hint: "Contoh: 1250 atau 1250,5" })}
            {text("address", "Letak (blok, dusun, jalan)", { max: 255 })}
          </div>
          <fieldset className="min-w-0 space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Batas-batas</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("boundaryNorth", "Sebelah utara", { max: 200 })}
              {text("boundaryEast", "Sebelah timur", { max: 200 })}
              {text("boundarySouth", "Sebelah selatan", { max: 200 })}
              {text("boundaryWest", "Sebelah barat", { max: 200 })}
            </div>
          </fieldset>
          <fieldset className="min-w-0 space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Bukti hak</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="tanah-rightKind">Jenis bukti hak *</Label>
                <SearchSelect {...fieldA11y("tanah-rightKind", errors.rightKind)} className={SELECT_CLASS} value={f.rightKind} onChange={(e) => set("rightKind", e.target.value)}>
                  {Object.entries(terms.rightKinds).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </SearchSelect>
                <FieldError id="tanah-rightKind" message={errors.rightKind} />
              </div>
              {text("rightNumber", registered ? "Nomor sertipikat *" : "Nomor bukti hak", { max: 80 })}
              {text("rightHolder", "Atas nama", { max: 150 })}
              {text("rightIssuedOn", "Tanggal terbit", { type: "date" })}
              {text("persilNo", "Nomor persil", { max: 40 })}
              {text("letterCNo", "Nomor Letter C", { max: 40 })}
            </div>
            <p className="text-sm text-muted-foreground">Istilah jenis bukti hak belum diverifikasi ke teks resmi; catat sesuai yang tertera di dokumen. Letter C atau girik bukan sertipikat: sebaiknya didaftarkan ke Kantor Pertanahan.</p>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="tanah-usage">Status pemanfaatan *</Label>
              <SearchSelect {...fieldA11y("tanah-usage", errors.usage)} className={SELECT_CLASS} value={f.usage} onChange={(e) => set("usage", e.target.value)}>
                {Object.entries(terms.usages).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </SearchSelect>
              <FieldError id="tanah-usage" message={errors.usage} />
            </div>
            {text("usageNote", "Keterangan pemanfaatan", { max: 300 })}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tanah-notes">Catatan</Label>
            <Textarea {...fieldA11y("tanah-notes", errors.notes)} rows={2} maxLength={500} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
            <FieldError id="tanah-notes" message={errors.notes} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
