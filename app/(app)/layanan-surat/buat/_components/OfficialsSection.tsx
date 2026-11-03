"use client";

import { memo, useState } from "react";
import { PenLine } from "lucide-react";
import { GolonganSelect } from "@/components/app/GolonganSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateNip } from "@/lib/letters/nip";
import { OFFICIAL_LABELS, type OfficialId } from "@/lib/letters/registry";
import type { ComposerState, PreviewContext } from "../_utils/composer";

const FIELD = "space-y-1.5 rounded-md transition-shadow motion-reduce:transition-none data-[lc-flash=1]:ring-2 data-[lc-flash=1]:ring-ring data-[lc-flash=1]:ring-offset-2";

/**
 * Nama, pangkat/golongan, dan NIP penandatangan (urutan seperti tercetak di bawah tanda tangan). Bawaannya dari Pengaturan Desa (tampil sebagai petunjuk di kotak kosong);
 * mengisi kotak ini hanya menimpa untuk surat ini, tidak mengubah Pengaturan Desa.
 */
export const OfficialsSection = memo(function OfficialsSection({
  officials,
  values,
  defaults,
  onChange,
}: {
  officials: ReadonlyArray<OfficialId>;
  values: ComposerState["officials"];
  defaults: PreviewContext["pejabat"];
  onChange: (id: OfficialId, key: "nama" | "golongan" | "nip", value: string) => void;
}) {
  // Galat NIP baru tampil setelah kolomnya ditinggalkan, supaya tidak muncul saat masih mengetik.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  if (officials.length === 0) return null;
  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <PenLine className="h-4 w-4" aria-hidden="true" />
        Penandatangan
      </legend>
      {officials.map((id) => {
        const label = OFFICIAL_LABELS[id];
        const base = defaults[id];
        const v = values[id] ?? { nama: "", golongan: "", nip: "" };
        const namaId = `official-${id}-nama`;
        const golonganId = `official-${id}-golongan`;
        const nipId = `official-${id}-nip`;
        const helpId = `official-${id}-help`;
        const nipErrId = `official-${id}-nip-err`;
        const nipError = touched[id] ? validateNip(v.nip) : null;
        return (
          <div key={id} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div data-lc-field="" className={`${FIELD} sm:col-span-2`}>
                <Label htmlFor={namaId}>Nama {label}</Label>
                <Input
                  id={namaId}
                  className="pointer-coarse:h-11"
                  autoComplete="off"
                  aria-describedby={helpId}
                  placeholder={base.nama || "Belum diisi di Pengaturan Desa"}
                  value={v.nama}
                  onChange={(e) => onChange(id, "nama", e.target.value)}
                />
              </div>
              <div data-lc-field="" className={FIELD}>
                <Label htmlFor={golonganId}>Pangkat/golongan {label}</Label>
                <GolonganSelect
                  id={golonganId}
                  aria-describedby={helpId}
                  placeholder={base.golongan ? `${base.golongan} (dari Pengaturan Desa)` : "Pilih pangkat/golongan"}
                  clearLabel="Kosongkan (pakai data Pengaturan Desa)"
                  value={v.golongan}
                  onChange={(next) => onChange(id, "golongan", next)}
                />
              </div>
              <div data-lc-field="" className={FIELD}>
                <Label htmlFor={nipId}>NIP {label}</Label>
                <Input
                  id={nipId}
                  className="pointer-coarse:h-11"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={40}
                  aria-invalid={nipError ? true : undefined}
                  aria-describedby={nipError ? `${nipErrId} ${helpId}` : helpId}
                  placeholder={base.nip || "Tanpa NIP"}
                  value={v.nip}
                  onChange={(e) => onChange(id, "nip", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, [id]: true }))}
                />
                {nipError ? (
                  <p id={nipErrId} role="alert" className="text-xs font-medium text-destructive">
                    {nipError}
                  </p>
                ) : null}
              </div>
            </div>
            <p id={helpId} className="text-xs text-muted-foreground">
              Kosongkan untuk memakai data dari{" "}
              <a href="/pengaturan-desa" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                Pengaturan Desa<span className="sr-only"> (dibuka di tab baru)</span>
              </a>
              , tempat data {label} cukup diisi sekali. Isian di sini hanya berlaku untuk surat ini.
            </p>
          </div>
        );
      })}
    </fieldset>
  );
});
