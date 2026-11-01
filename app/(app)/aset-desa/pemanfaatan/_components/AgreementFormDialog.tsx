"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { SELECT_CLASS, sqm, type AgreementView, type ObjectOption, type Terms } from "./types";

const LABELS: Record<string, string> = {
  itemId: "Objek",
  kind: "Jenis pemanfaatan",
  lesseeName: "Pihak yang memanfaatkan",
  lesseeKind: "Perorangan/badan",
  lesseeAddress: "Alamat",
  lesseeContact: "Kontak",
  purpose: "Peruntukan",
  objectNote: "Uraian objek",
  leasedAreaSqm: "Luas yang dimanfaatkan",
  startOn: "Tanggal mulai",
  endOn: "Tanggal berakhir",
  periodUnit: "Periode pembayaran",
  amount: "Besaran",
  accountCode: "Rekening pendapatan",
  agreementNo: "Nomor perjanjian",
  signedOn: "Tanggal tanda tangan",
  tenantDuties: "Tanggung jawab biaya",
  forceMajeureIncluded: "Force majeure",
  otherTerms: "Ketentuan lain",
  perdesNo: "Nomor Peraturan Desa",
  perdesDate: "Tanggal Peraturan Desa",
  regencyPermitNo: "Nomor izin Bupati/Wali Kota",
  regencyPermitDate: "Tanggal izin",
  appraisalRef: "Rujukan penilaian",
};

type Form = Record<string, string | boolean>;
const empty = (itemId: number | null): Form => ({
  itemId: itemId === null ? "" : String(itemId),
  kind: "SEWA",
  lesseeName: "",
  lesseeKind: "PERORANGAN",
  lesseeAddress: "",
  lesseeContact: "",
  purpose: "",
  objectNote: "",
  leasedAreaSqm: "",
  startOn: "",
  endOn: "",
  periodUnit: "TAHUN",
  amount: "",
  accountCode: "",
  agreementNo: "",
  signedOn: "",
  tenantDuties: "",
  forceMajeureIncluded: false,
  otherTerms: "",
  perdesNo: "",
  perdesDate: "",
  regencyPermitNo: "",
  regencyPermitDate: "",
  appraisalRef: "",
});
const fromView = (a: AgreementView): Form => ({
  itemId: String(a.itemId),
  kind: a.kind,
  lesseeName: a.lesseeName,
  lesseeKind: a.lesseeKind,
  lesseeAddress: a.lesseeAddress ?? "",
  lesseeContact: a.lesseeContact ?? "",
  purpose: a.purpose ?? "",
  objectNote: a.objectNote ?? "",
  leasedAreaSqm: a.leasedAreaSqm?.replace(/\.00$/, "") ?? "",
  startOn: a.startOn,
  endOn: a.endOn,
  periodUnit: a.periodUnit,
  amount: a.amount.replace(/\.00$/, ""),
  accountCode: a.accountCode,
  agreementNo: a.agreementNo ?? "",
  signedOn: a.signedOn ?? "",
  tenantDuties: a.tenantDuties,
  forceMajeureIncluded: a.forceMajeureIncluded,
  otherTerms: a.otherTerms ?? "",
  perdesNo: a.perdesNo ?? "",
  perdesDate: a.perdesDate ?? "",
  regencyPermitNo: a.regencyPermitNo ?? "",
  regencyPermitDate: a.regencyPermitDate ?? "",
  appraisalRef: a.appraisalRef ?? "",
});

/** Buat draf baru (edit = null, itemId opsional) atau ubah draf yang ada. */
export function AgreementFormDialog({ draft, itemId, terms, onClose, onSaved }: { draft: AgreementView | null; itemId: number | null; terms: Terms; onClose: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState<Form>(() => (draft ? fromView(draft) : empty(itemId)));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const objects = useApiGet<{ items: ObjectOption[] }>(draft ? null : "/api/aset-desa/pemanfaatan/objek");
  const set = (patch: Form) => setF((p) => ({ ...p, ...patch }));
  const s = (k: string) => String(f[k] ?? "");
  const kind = terms.kinds[s("kind")];
  const picked = objects.data?.items.find((o) => String(o.id) === s("itemId"));

  const text = (k: string, label: string, p: { max?: number; type?: string; hint?: string; required?: boolean } = {}) => (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={`pj-${k}`}>
        {label}
        {p.required ? " *" : ""}
      </Label>
      <Input {...fieldA11y(`pj-${k}`, errors[k])} className="h-11" type={p.type ?? "text"} maxLength={p.max} value={s(k)} onChange={(e) => set({ [k]: e.target.value })} />
      {p.hint ? <p className="text-sm text-muted-foreground">{p.hint}</p> : null}
      <FieldError id={`pj-${k}`} message={errors[k]} />
    </div>
  );
  const pick = (k: string, label: string, options: [string, string][], p: { required?: boolean; disabled?: boolean; onChange?: (v: string) => void; hint?: string; placeholder?: string } = {}) => (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={`pj-${k}`}>
        {label}
        {p.required ? " *" : ""}
      </Label>
      <SearchSelect {...fieldA11y(`pj-${k}`, errors[k])} className={SELECT_CLASS} disabled={p.disabled} value={s(k)} onChange={(e) => (p.onChange ? p.onChange(e.target.value) : set({ [k]: e.target.value }))}>
        {p.placeholder ? <option value="">{p.placeholder}</option> : null}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </SearchSelect>
      {p.hint ? <p className="text-sm text-muted-foreground">{p.hint}</p> : null}
      <FieldError id={`pj-${k}`} message={errors[k]} />
    </div>
  );

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...f, itemId: draft ? undefined : Number(f.itemId) || null };
    const r = await submit<{ agreement: AgreementView }>(draft ? `/api/aset-desa/pemanfaatan/${draft.id}` : "/api/aset-desa/pemanfaatan", draft ? "PATCH" : "POST", body);
    if (r) onSaved(r.agreement.id);
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{draft ? "Ubah draf perjanjian" : "Perjanjian pemanfaatan baru"}</DialogTitle>
          <DialogDescription>Disimpan sebagai draf lebih dulu. Tagihan baru dibuat setelah perjanjian diberlakukan dan syarat wajibnya lengkap. Tanda * wajib diisi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <fieldset className="min-w-0 space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Objek dan jenis</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {draft ? (
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm font-medium">Objek</p>
                  <p className="break-words text-sm">{draft.itemName}</p>
                </div>
              ) : (
                pick("itemId", "Objek (dari buku inventaris)", (objects.data?.items ?? []).map((o) => [String(o.id), `${o.name} (${o.categoryLabel})`]), { required: true, placeholder: objects.loading ? "Memuat…" : "Pilih objek…", hint: picked ? `Luas tercatat: ${sqm(picked.areaSqm)}${picked.needsAppraisal ? ". Tanah/bangunan perlu penilaian (Pasal 30)." : ""}` : undefined, onChange: (v) => { const o = objects.data?.items.find((x) => String(x.id) === v); set({ itemId: v, ...(o && !s("accountCode") ? { accountCode: o.defaultAccount } : {}) }); } })
              )}
              {pick("kind", "Jenis pemanfaatan", Object.entries(terms.kinds).map(([k, v]) => [k, v.label]), { required: true, hint: kind ? `${kind.basis}.` : undefined })}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Pihak yang memanfaatkan</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("lesseeName", "Nama", { required: true, max: 150 })}
              {pick("lesseeKind", "Perorangan atau badan", Object.entries(terms.lesseeKinds), { required: true })}
              {text("lesseeAddress", "Alamat", { max: 255 })}
              {text("lesseeContact", "Kontak (telepon)", { max: 40 })}
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Jangka waktu dan nilai</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("startOn", "Tanggal mulai", { type: "date", required: true })}
              {text("endOn", "Tanggal berakhir", { type: "date", required: true, hint: kind ? `Paling lama ${kind.maxYears} tahun. Harus kelipatan utuh dari periode pembayaran.` : undefined })}
              {pick("periodUnit", "Periode pembayaran", Object.entries(terms.periodUnits), { required: true })}
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="pj-amount">Besaran per periode (Rp) *</Label>
                <CurrencyInput {...fieldA11y("pj-amount", errors.amount)} inputClassName="h-11" value={s("amount")} onValueChange={(d) => set({ amount: d })} />
                <p className="text-sm text-muted-foreground">{s("periodUnit") === "SEKALI" ? "Jumlah total yang dibayar di awal." : "Jatuh tempo setiap awal periode."}</p>
                <FieldError id="pj-amount" message={errors.amount} />
              </div>
              {pick("accountCode", "Rekening pendapatan (APB Desa)", terms.accounts.map((a) => [a.code, `${a.code} ${a.name}`]), { placeholder: "Otomatis menurut golongan objek", hint: "Penerimaan dicatat di Buku Kas Umum pada rekening ini." })}
              {text("leasedAreaSqm", "Luas yang dimanfaatkan (m2)", { max: 14, hint: "Kosongkan bila seluruh objek." })}
            </div>
            {text("purpose", "Peruntukan", { max: 200 })}
            {text("objectNote", "Uraian bagian objek yang dimanfaatkan", { max: 300 })}
          </fieldset>

          <fieldset className="min-w-0 space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Dasar dan kelengkapan (wajib sebelum berlaku)</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("agreementNo", "Nomor surat perjanjian", { max: 100 })}
              {text("signedOn", "Tanggal penandatanganan", { type: "date" })}
              {text("perdesNo", "Nomor Peraturan Desa pemanfaatan", { max: 100, hint: "Pemanfaatan ditetapkan dalam Perdes (Pasal 11 ayat 3)." })}
              {text("perdesDate", "Tanggal Peraturan Desa", { type: "date" })}
              {text("regencyPermitNo", kind?.needsRegencyPermit ? "Nomor izin Bupati/Wali Kota *" : "Nomor izin Bupati/Wali Kota", { max: 100, hint: kind?.needsRegencyPermit ? "Wajib untuk jenis ini (Pasal 17)." : "Tidak diwajibkan untuk sewa; isi bila peraturan daerah mensyaratkan." })}
              {text("regencyPermitDate", "Tanggal izin", { type: "date" })}
              {text("appraisalRef", "Rujukan penilaian (Penilai Pemerintah/Publik)", { max: 150, hint: "Untuk tanah/bangunan (Pasal 30)." })}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pj-tenantDuties">Tanggung jawab penyewa atas biaya operasional dan pemeliharaan</Label>
              <Textarea {...fieldA11y("pj-tenantDuties", errors.tenantDuties)} rows={2} maxLength={500} value={s("tenantDuties")} onChange={(e) => set({ tenantDuties: e.target.value })} />
              <FieldError id="pj-tenantDuties" message={errors.tenantDuties} />
            </div>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={f.forceMajeureIncluded === true} onChange={(e) => set({ forceMajeureIncluded: e.target.checked })} />
              <span>Surat perjanjian memuat ketentuan keadaan di luar kemampuan para pihak (force majeure), hak dan kewajiban para pihak.</span>
            </label>
            <FieldError id="pj-forceMajeureIncluded" message={errors.forceMajeureIncluded} />
            <div className="space-y-1.5">
              <Label htmlFor="pj-otherTerms">Persyaratan lain</Label>
              <Textarea {...fieldA11y("pj-otherTerms", errors.otherTerms)} rows={2} maxLength={1000} value={s("otherTerms")} onChange={(e) => set({ otherTerms: e.target.value })} />
              <FieldError id="pj-otherTerms" message={errors.otherTerms} />
            </div>
          </fieldset>

          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Menyimpan…" : "Simpan draf"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
