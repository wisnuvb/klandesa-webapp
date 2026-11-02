"use client";

import { Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, fieldA11y } from "@/components/app/FormErrorSummary";
import { Field, SelectField, TextField } from "./fields";
import type { FamilyHeader } from "@/lib/kependudukan/family";
import { RESIDENCY_STATUS_LABEL } from "@/lib/residents/extra-fields";
import type { ExistingHousehold } from "@/lib/kependudukan/family-service";

export function StepKeluarga({ header, errors, existing, onChange }: {
  header: FamilyHeader;
  errors: Record<string, string>;
  existing: ExistingHousehold | null;
  onChange: (patch: Partial<FamilyHeader>) => void;
}) {
  const kkDigits = header.kk.replace(/\D/g, "").length;
  const arrival = header.arrival;
  const setArrival = (p: Partial<FamilyHeader["arrival"]>) => onChange({ arrival: { ...arrival, ...p } });
  return (
    <div className="space-y-6">
      <section aria-labelledby="kk-h" className="space-y-4">
        <h3 id="kk-h" className="text-lg font-semibold">
          Kartu Keluarga
        </h3>
        <TextField id="kk" label="Nomor Kartu Keluarga" required value={header.kk} onChange={(v) => onChange({ kk: v.replace(/\D/g, "").slice(0, 16) })} error={errors.kk} inputMode="numeric" maxLength={16} className="font-mono" hint={`${kkDigits}/16 digit. Keluarga yang KK-nya sudah ada akan ditambahi anggota baru.`} />

        {existing ? (
          <div role="status" className="flex gap-3 rounded-md border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-50">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              KK ini sudah terdaftar{existing.headName ? ` (kepala keluarga ${existing.headName})` : " tanpa kepala keluarga"} dengan {existing.activeMembers} anggota aktif. Anggota yang Anda masukkan akan <strong>ditambahkan</strong> ke KK ini.
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="address" className="text-sm font-medium">
            Alamat <span aria-hidden="true" className="text-destructive">*</span>
            <span className="sr-only"> (wajib)</span>
          </label>
          <Textarea {...fieldA11y("address", errors.address)} rows={2} maxLength={500} value={header.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="Jalan, nomor rumah, dan keterangan lain sesuai KK" />
          <FieldError id="address" message={errors.address} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField id="rt" label="RT" value={header.rt} onChange={(v) => onChange({ rt: v })} error={errors.rt} maxLength={10} />
          <TextField id="rw" label="RW" value={header.rw} onChange={(v) => onChange({ rw: v })} error={errors.rw} maxLength={10} />
          <TextField id="hamlet" label="Dusun" value={header.hamlet} onChange={(v) => onChange({ hamlet: v })} error={errors.hamlet} maxLength={100} />
        </div>
      </section>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">Jenis pencatatan</legend>
        {[
          { v: false, title: "Data warga yang sudah tinggal di desa", desc: "Pendataan keluarga yang sudah lama menetap." },
          { v: true, title: "Keluarga baru datang dari luar desa", desc: "Tercatat sebagai Datang pada laporan LAMPID." },
        ].map((o) => (
          <label key={String(o.v)} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 ${arrival.enabled === o.v ? "border-primary bg-primary/5" : ""}`}>
            <input type="radio" name="arrival-mode" className="mt-1 size-4" checked={arrival.enabled === o.v} onChange={() => setArrival({ enabled: o.v })} />
            <span>
              <span className="block font-medium">{o.title}</span>
              <span className="block text-sm text-muted-foreground">{o.desc}</span>
            </span>
          </label>
        ))}
        {arrival.enabled ? (
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
            <TextField id="arrivalDate" label="Tanggal datang" required type="date" value={arrival.date} onChange={(v) => setArrival({ date: v })} error={errors.arrivalDate} />
            <SelectField id="arrivalStatus" label="Status kependudukan" required value={arrival.residencyStatus} onChange={(v) => setArrival({ residencyStatus: v === "TIDAK_TETAP" ? "TIDAK_TETAP" : "TETAP" })} options={Object.entries(RESIDENCY_STATUS_LABEL)} error={errors.arrivalStatus} />
            <div className="sm:col-span-2">
              <Field id="arrivalOrigin" label="Alamat atau daerah asal" error={errors.arrivalOrigin}>
                <Textarea {...fieldA11y("arrivalOrigin", errors.arrivalOrigin)} rows={2} maxLength={500} value={arrival.origin} onChange={(e) => setArrival({ origin: e.target.value })} placeholder="Contoh: Jl. Melati 5, Kec. Wonokromo, Kota Surabaya" />
              </Field>
            </div>
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}
