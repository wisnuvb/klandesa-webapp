"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildSubmitBody,
  emptyForm,
  FAMILY_ROLES,
  MUTASI_TYPES,
  TYPE_META,
  usesExistingResident,
  type MutasiForm,
} from "@/lib/kependudukan/mutasi-labels";
import type { ActionResult } from "../_hooks/useMutasi";
import { ResidentPicker } from "@/components/app/ResidentPicker";
import { SearchSelect } from "@/components/ui/search-select";

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

function Field({ id, label, hint, children, required }: { id: string; label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function MutasiFormDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (body: Record<string, unknown>) => Promise<ActionResult> }) {
  const [f, setF] = useState<MutasiForm>(emptyForm());
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const set = <K extends keyof MutasiForm>(k: K, v: MutasiForm[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (errors.length) summaryRef.current?.focus();
  }, [errors]);

  const existing = usesExistingResident(f);
  const isBirth = f.type === "BIRTH";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const built = buildSubmitBody(f);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setSaving(true);
    const r = await onSubmit(built.body);
    setSaving(false);
    if (r.ok) onOpenChange(false);
    else setErrors(r.errors);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (saving ? undefined : onOpenChange(o))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Catat mutasi penduduk</DialogTitle>
          <DialogDescription>Pengajuan belum mengubah data warga. Data baru berubah setelah pejabat desa menyetujuinya.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5" noValidate>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Jenis mutasi</legend>
            <div role="radiogroup" aria-label="Jenis mutasi" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MUTASI_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={f.type === t}
                  onClick={() => setF({ ...emptyForm(t), effectiveDate: f.effectiveDate })}
                  className={`min-h-11 rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    f.type === t ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                  }`}
                >
                  {TYPE_META[t].title}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{TYPE_META[f.type].help}</p>
          </fieldset>

          <Field id="mutasi-tanggal" label={isBirth ? "Tanggal lahir" : "Tanggal kejadian"} required>
            <Input id="mutasi-tanggal" type="date" max={today} className="h-11" value={f.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
          </Field>

          {f.type === "MOVE_IN" ? (
            <div role="radiogroup" aria-label="Siapa yang datang" className="grid grid-cols-2 gap-2">
              {[
                { v: true, t: "Warga yang pernah pindah, kembali" },
                { v: false, t: "Warga baru dari luar desa" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  role="radio"
                  aria-checked={f.returning === o.v}
                  onClick={() => set("returning", o.v)}
                  className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    f.returning === o.v ? "border-primary bg-primary/10 font-medium" : "bg-background hover:bg-muted"
                  }`}
                >
                  {o.t}
                </button>
              ))}
            </div>
          ) : null}

          {existing ? <ResidentPicker label="Warga" value={f.resident} onChange={(r) => set("resident", r)} /> : null}

          {f.type === "DEATH" ? (
            <>
              <Field id="mutasi-sebab" label="Sebab meninggal (boleh dikosongkan)">
                <Input id="mutasi-sebab" className="h-11" value={f.cause} onChange={(e) => set("cause", e.target.value)} />
              </Field>
              <Field id="mutasi-akta" label="Nomor surat/akta kematian (boleh dikosongkan)">
                <Input id="mutasi-akta" className="h-11" value={f.certificateNumber} onChange={(e) => set("certificateNumber", e.target.value)} />
              </Field>
            </>
          ) : null}

          {f.type === "MOVE_OUT" ? (
            <>
              <Field id="mutasi-tujuan" label="Pindah ke mana" required>
                <Input id="mutasi-tujuan" className="h-11" value={f.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Contoh: Kec. Gubeng, Surabaya" />
              </Field>
              <Field id="mutasi-alasan" label="Alasan (boleh dikosongkan)">
                <Input id="mutasi-alasan" className="h-11" value={f.reason} onChange={(e) => set("reason", e.target.value)} />
              </Field>
            </>
          ) : null}

          {f.type === "KK_CHANGE" ? (
            <>
              <Field id="mutasi-kk-tujuan" label="Nomor KK tujuan" hint="16 angka. Boleh diketik dengan spasi." required>
                <Input id="mutasi-kk-tujuan" inputMode="numeric" className="h-11" value={f.toKk} onChange={(e) => set("toKk", e.target.value)} />
              </Field>
              <Field id="mutasi-peran" label="Hubungan dalam KK yang baru" required>
                <SearchSelect id="mutasi-peran" className={SELECT_CLASS} value={f.newFamilyRole} onChange={(e) => set("newFamilyRole", e.target.value)}>
                  <option value="">Pilih…</option>
                  {FAMILY_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </SearchSelect>
              </Field>
            </>
          ) : null}

          {f.type === "MOVE_IN" ? (
            <Field id="mutasi-asal" label="Datang dari mana" required>
              <Input id="mutasi-asal" className="h-11" value={f.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Contoh: Kab. Malang" />
            </Field>
          ) : null}

          {!existing && (isBirth || f.type === "MOVE_IN") ? (
            <fieldset className="space-y-4 rounded-md border p-4">
              <legend className="px-1 text-sm font-medium">{isBirth ? "Data bayi" : "Data warga baru"}</legend>
              <Field id="mutasi-nama" label="Nama lengkap" required>
                <Input id="mutasi-nama" className="h-11" value={f.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field id="mutasi-jk" label="Jenis kelamin" required>
                <SearchSelect id="mutasi-jk" className={SELECT_CLASS} value={f.gender} onChange={(e) => set("gender", e.target.value as MutasiForm["gender"])}>
                  <option value="">Pilih…</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </SearchSelect>
              </Field>
              <Field id="mutasi-tempat" label="Tempat lahir" required>
                <Input id="mutasi-tempat" className="h-11" value={f.birthplace} onChange={(e) => set("birthplace", e.target.value)} />
              </Field>
              {!isBirth ? (
                <Field id="mutasi-lahir" label="Tanggal lahir" required>
                  <Input id="mutasi-lahir" type="date" max={today} className="h-11" value={f.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
                </Field>
              ) : null}
              <Field
                id="mutasi-nik"
                label={isBirth ? "NIK (boleh menyusul)" : "NIK"}
                hint={isBirth ? "Kosongkan bila belum terbit. NIK diisi lagi saat pengajuan disetujui." : "NIK tidak disimpan di catatan mutasi. Diisi lagi saat pengajuan disetujui."}
                required={!isBirth}
              >
                <Input id="mutasi-nik" inputMode="numeric" maxLength={16} className="h-11" value={f.nik} onChange={(e) => set("nik", e.target.value)} />
              </Field>
              <Field id="mutasi-kk" label="Nomor KK" hint={isBirth ? "Isi KK, atau isi NIK ibu di bawah agar KK ditemukan otomatis." : undefined} required={!isBirth}>
                <Input id="mutasi-kk" inputMode="numeric" className="h-11" value={f.kk} onChange={(e) => set("kk", e.target.value)} />
              </Field>
              {isBirth ? (
                <Field id="mutasi-ibu" label="NIK ibu (bila KK belum diisi)" hint="Dipakai hanya untuk mencari KK dan nama ibu, tidak disimpan.">
                  <Input id="mutasi-ibu" inputMode="numeric" maxLength={16} className="h-11" value={f.motherNik} onChange={(e) => set("motherNik", e.target.value)} />
                </Field>
              ) : null}
              <Field id="mutasi-hubungan" label="Hubungan dalam KK">
                <SearchSelect id="mutasi-hubungan" className={SELECT_CLASS} value={f.familyRole} onChange={(e) => set("familyRole", e.target.value)}>
                  {FAMILY_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </SearchSelect>
              </Field>
              {!isBirth ? (
                <>
                  <Field id="mutasi-agama" label="Agama" hint="Bila dikosongkan, diambil dari KK tujuan.">
                    <Input id="mutasi-agama" className="h-11" value={f.religion} onChange={(e) => set("religion", e.target.value)} />
                  </Field>
                  <Field id="mutasi-alamat" label="Alamat" hint="Bila dikosongkan, diambil dari KK tujuan.">
                    <Input id="mutasi-alamat" className="h-11" value={f.address} onChange={(e) => set("address", e.target.value)} />
                  </Field>
                </>
              ) : null}
            </fieldset>
          ) : null}

          {errors.length ? (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
              <p className="font-medium">Belum bisa dikirim:</p>
              <ul className="list-disc pl-5">
                {errors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={saving}>
              {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {saving ? "Mengirim…" : "Kirim pengajuan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
