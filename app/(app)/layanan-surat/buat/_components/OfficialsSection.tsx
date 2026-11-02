"use client";

import { memo } from "react";
import { PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OFFICIAL_LABELS, type OfficialId } from "@/lib/letters/registry";
import type { ComposerState, PreviewContext } from "../_utils/composer";

const FIELD = "space-y-1.5 rounded-md transition-shadow motion-reduce:transition-none data-[lc-flash=1]:ring-2 data-[lc-flash=1]:ring-ring data-[lc-flash=1]:ring-offset-2";

/**
 * Nama dan NIP penandatangan. Bawaannya dari Pengaturan Desa (tampil sebagai petunjuk di kotak kosong);
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
  onChange: (id: OfficialId, key: "nama" | "nip", value: string) => void;
}) {
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
        const v = values[id] ?? { nama: "", nip: "" };
        const namaId = `official-${id}-nama`;
        const nipId = `official-${id}-nip`;
        const helpId = `official-${id}-help`;
        return (
          <div key={id} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div data-lc-field="" className={FIELD}>
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
                <Label htmlFor={nipId}>NIP {label}</Label>
                <Input
                  id={nipId}
                  className="pointer-coarse:h-11"
                  autoComplete="off"
                  aria-describedby={helpId}
                  placeholder={base.nip || "Tanpa NIP"}
                  value={v.nip}
                  onChange={(e) => onChange(id, "nip", e.target.value)}
                />
              </div>
            </div>
            <p id={helpId} className="text-xs text-muted-foreground">
              Kosongkan untuk memakai data dari Pengaturan Desa. Isian di sini hanya berlaku untuk surat ini.
            </p>
          </div>
        );
      })}
    </fieldset>
  );
});
