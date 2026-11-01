"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FieldError, FormErrorSummary } from "@/components/app/FormErrorSummary";
import { VerificationTag } from "@/components/app/kepatuhan/shared";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { describeRule, ruleFromRow, EVENT_LABEL } from "@/lib/kepatuhan/catalog";

type Entry = { id: number; itemKey: string; fromYear: number; disabled: boolean; title: string | null; recipient: string | null; ruleKind: string | null; yearOffset: number | null; month: number | null; day: number | null; event: string | null; amount: number | null; unit: string | null; verification: string; basis: string | null; note: string | null };
type Catalog = {
  builtin: { key: string; title: string; group: string; versions: { fromYear: number; rule: string; basis: string; verification: string; perYear: boolean }[] }[];
  global: Entry[];
  regency: Entry[];
  canEdit: boolean;
  reason: string | null;
};

const ruleText = (e: Entry): string => {
  if (e.disabled) return "Butir dimatikan";
  const r = ruleFromRow(e);
  return r ? describeRule(r) : "-";
};

export function KatalogPanel({ onChanged }: { onChanged: () => void }) {
  const { data, loading, error, reload } = useApiGet<Catalog>("/api/regional/kepatuhan/katalog");
  const [adding, setAdding] = useState(false);
  const title = (k: string) => data?.builtin.find((b) => b.key === k)?.title ?? k;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Katalog tenggat</CardTitle>
        <CardDescription>
          Tenggat bawaan dibaca dari peraturan dan berlaku per tahun anggaran. Kabupaten dapat menimpanya (mis. batas penyampaian ke kabupaten lebih awal dari batas pusat) atau menambah butir sendiri; penimpaan hanya berlaku untuk desa di kabupaten ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && !data ? (
          <p role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Memuat katalog…
          </p>
        ) : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        {data ? (
          <>
            <section aria-labelledby="kt-kab-h" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id="kt-kab-h" className="font-semibold">Penimpaan kabupaten ini</h3>
                {data.canEdit ? (
                  <Button type="button" className="min-h-11" onClick={() => setAdding(true)}>
                    <Plus aria-hidden="true" />
                    Tambah atau timpa tenggat
                  </Button>
                ) : null}
              </div>
              {!data.canEdit ? <p className="text-sm text-muted-foreground">{data.reason ?? "Akun ini hanya dapat membaca katalog."}</p> : null}
              {data.regency.length ? (
                <ul className="divide-y rounded-lg border">
                  {data.regency.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="break-words font-medium">{e.title ?? title(e.itemKey)} <span className="font-normal text-muted-foreground">· berlaku sejak TA {e.fromYear}</span></p>
                        <p>{ruleText(e)}</p>
                        {e.basis ? <p className="break-words text-muted-foreground">Dasar: {e.basis}</p> : null}
                        <VerificationTag v={e.verification} />
                      </div>
                      {data.canEdit ? <ConfirmDelete buttonText="Hapus" label={`Hapus penimpaan ${e.title ?? title(e.itemKey)} sejak ${e.fromYear}`} title="Hapus penimpaan?" description="Tenggat butir ini kembali ke katalog platform/bawaan untuk semua desa di kabupaten ini." url={`/api/regional/kepatuhan/katalog?id=${e.id}`} onDone={() => { reload(); onChanged(); }} /> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada penimpaan. Semua desa memakai katalog bawaan.</p>
              )}
            </section>

            <section aria-labelledby="kt-bw-h" className="space-y-2">
              <h3 id="kt-bw-h" className="font-semibold">Katalog bawaan dan sumbernya</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[40rem] text-sm">
                  <caption className="sr-only">Butir laporan wajib bawaan dengan tenggat dan dasar hukumnya</caption>
                  <thead className="bg-muted text-left">
                    <tr>
                      <th scope="col" className="px-3 py-2">Butir</th>
                      <th scope="col" className="px-3 py-2">Tenggat (sejak tahun anggaran)</th>
                      <th scope="col" className="px-3 py-2">Dasar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.builtin.map((b) =>
                      b.versions.map((v) => (
                        <tr key={`${b.key}-${v.fromYear}`}>
                          <td className="px-3 py-2 align-top break-words">{b.title}<span className="block text-xs text-muted-foreground">{b.group}</span></td>
                          <td className="px-3 py-2 align-top">{v.rule}{v.fromYear > 2000 ? <span className="block text-xs text-muted-foreground">sejak TA {v.fromYear}{v.perYear ? ", aturan per tahun" : ""}</span> : null}</td>
                          <td className="px-3 py-2 align-top break-words">{v.basis}<span className="mt-1 block"><VerificationTag v={v.verification} /></span></td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
              {data.global.length ? <p className="text-sm text-muted-foreground">Ada {data.global.length} penimpaan tingkat platform yang berlaku untuk semua desa (tampil pada kalender desa dengan sumber &ldquo;Katalog platform&rdquo;).</p> : null}
            </section>
          </>
        ) : null}
      </CardContent>
      {adding && data ? (
        <EditDialog
          builtin={data.builtin}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            reload();
            onChanged();
          }}
        />
      ) : null}
    </Card>
  );
}

const NEW_KEY = "__NEW__";

function EditDialog({ builtin, onClose, onDone }: { builtin: Catalog["builtin"]; onClose: () => void; onDone: () => void }) {
  const thisYear = new Date().getFullYear();
  const [itemSel, setItemSel] = useState(builtin[0]?.key ?? NEW_KEY);
  const [custom, setCustom] = useState("");
  const [title, setTitle] = useState("");
  const [recipient, setRecipient] = useState("");
  const [fromYear, setFromYear] = useState(String(thisYear));
  const [disabled, setDisabled] = useState(false);
  const [ruleKind, setRuleKind] = useState("FIXED");
  const [yearOffset, setYearOffset] = useState("0");
  const [month, setMonth] = useState("3");
  const [day, setDay] = useState("31");
  const [event, setEvent] = useState("RKPDES_ENACTED");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("MONTH");
  const [basis, setBasis] = useState("");
  const [note, setNote] = useState("");
  const [verification, setVerification] = useState("K");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const isNew = itemSel === NEW_KEY;
  const verificationValue = isNew ? verification : "K";

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { itemKey: isNew ? `KAB-${custom.trim().toUpperCase()}` : itemSel, fromYear: Number(fromYear), disabled, title: title || undefined, recipient: recipient || undefined, basis, note, verification: verificationValue };
    if (!disabled) {
      body.ruleKind = ruleKind;
      if (ruleKind === "FIXED") Object.assign(body, { yearOffset: Number(yearOffset), month: Number(month), day: Number(day) });
      if (ruleKind === "AFTER_EVENT") Object.assign(body, { event, amount: Number(amount), unit });
    }
    if (await submit("/api/regional/kepatuhan/katalog", "PUT", body)) onDone();
  }

  const fld = (id: string, err?: string) => ({ id, "aria-invalid": err ? true : undefined, "aria-describedby": err ? `${id}-err` : undefined });

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah atau timpa tenggat</DialogTitle>
          <DialogDescription>Berlaku untuk semua desa di kabupaten ini, sejak tahun anggaran yang dipilih, sampai ada penimpaan yang lebih baru.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ itemKey: "Butir", fromYear: "Tahun mulai", title: "Judul", recipient: "Penerima", basis: "Dasar", verification: "Label", ruleKind: "Jenis tenggat", yearOffset: "Tahun tenggat", day: "Tanggal", event: "Peristiwa", amount: "Jumlah", unit: "Satuan", note: "Catatan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="kt-item">Butir laporan *</Label>
            <SearchSelect id="kt-item" className={SELECT_CLASS} value={itemSel} onChange={(e) => setItemSel(e.target.value)}>
              {builtin.map((b) => (
                <option key={b.key} value={b.key}>{b.title}</option>
              ))}
              <option value={NEW_KEY}>Butir baru buatan kabupaten…</option>
            </SearchSelect>
            <FieldError id="kt-item" message={errors.itemKey} />
          </div>
          {isNew ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="kt-code">Kode (huruf besar/angka) *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">KAB-</span>
                  <Input {...fld("kt-code", errors.itemKey)} className="h-11" maxLength={26} value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kt-title">Judul laporan *</Label>
                <Input {...fld("kt-title", errors.title)} className="h-11" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
                <FieldError id="kt-title" message={errors.title} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="kt-rcp">Ditujukan kepada</Label>
                <Input id="kt-rcp" className="h-11" maxLength={200} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kt-from">Berlaku sejak tahun anggaran *</Label>
              <Input {...fld("kt-from", errors.fromYear)} type="number" inputMode="numeric" className="h-11" value={fromYear} onChange={(e) => setFromYear(e.target.value)} />
              <FieldError id="kt-from" message={errors.fromYear} />
            </div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-end">
              <input type="checkbox" className="size-4" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
              Matikan butir ini
            </label>
          </div>
          {!disabled ? (
            <fieldset className="min-w-0 space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Tenggat</legend>
              <div className="space-y-1.5">
                <Label htmlFor="kt-kind">Jenis tenggat *</Label>
                <SearchSelect id="kt-kind" className={SELECT_CLASS} value={ruleKind} onChange={(e) => setRuleKind(e.target.value)}>
                  <option value="FIXED">Tanggal tetap</option>
                  <option value="AFTER_EVENT">Sekian waktu setelah peristiwa</option>
                  <option value="NONE">Tanpa tanggal (hanya dilacak)</option>
                </SearchSelect>
                <FieldError id="kt-kind" message={errors.ruleKind} />
              </div>
              {ruleKind === "FIXED" ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="kt-yo">Tahun tenggat *</Label>
                    <SearchSelect id="kt-yo" className={SELECT_CLASS} value={yearOffset} onChange={(e) => setYearOffset(e.target.value)}>
                      <option value="-1">Tahun sebelum tahun anggaran</option>
                      <option value="0">Tahun anggaran itu sendiri</option>
                      <option value="1">Tahun setelah tahun anggaran</option>
                    </SearchSelect>
                    <FieldError id="kt-yo" message={errors.yearOffset} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="kt-day">Tanggal *</Label>
                    <Input {...fld("kt-day", errors.day)} type="number" inputMode="numeric" min={1} max={31} className="h-11" value={day} onChange={(e) => setDay(e.target.value)} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="kt-month">Bulan *</Label>
                    <SearchSelect id="kt-month" className={SELECT_CLASS} value={month} onChange={(e) => setMonth(e.target.value)}>
                      {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </SearchSelect>
                  </div>
                  <div className="sm:col-span-3"><FieldError id="kt-day" message={errors.day} /></div>
                </div>
              ) : null}
              {ruleKind === "AFTER_EVENT" ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="kt-amt">Jumlah *</Label>
                    <Input {...fld("kt-amt", errors.amount)} type="number" inputMode="numeric" min={0} max={366} className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <FieldError id="kt-amt" message={errors.amount} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="kt-unit">Satuan *</Label>
                    <SearchSelect id="kt-unit" className={SELECT_CLASS} value={unit} onChange={(e) => setUnit(e.target.value)}>
                      <option value="MONTH">bulan</option>
                      <option value="WORKDAY">hari kerja</option>
                    </SearchSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="kt-ev">Setelah *</Label>
                    <SearchSelect id="kt-ev" className={SELECT_CLASS} value={event} onChange={(e) => setEvent(e.target.value)}>
                      {Object.entries(EVENT_LABEL).map(([k, l]) => (
                        <option key={k} value={k}>{l}</option>
                      ))}
                    </SearchSelect>
                  </div>
                </div>
              ) : null}
            </fieldset>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="kt-basis">{disabled ? "Alasan dan rujukan mematikan butir (nomor peraturan/pasal) *" : "Dasar (nomor peraturan/pasal) *"}</Label>
            <Input {...fld("kt-basis", errors.basis)} className="h-11" maxLength={300} placeholder="Contoh: Perbup 12/2026 Pasal 5" value={basis} onChange={(e) => setBasis(e.target.value)} />
            <FieldError id="kt-basis" message={errors.basis} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kt-ver">Label</Label>
            <SearchSelect id="kt-ver" className={SELECT_CLASS} value={verificationValue} onChange={(e) => setVerification(e.target.value)}>
              <option value="K">K · ketetapan kabupaten (dihitung sebagai kewajiban)</option>
              {isNew ? <option value="R">R · belum diverifikasi (hanya informasi)</option> : null}
            </SearchSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kt-note">Catatan</Label>
            <Textarea id="kt-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>Batal</Button>
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
