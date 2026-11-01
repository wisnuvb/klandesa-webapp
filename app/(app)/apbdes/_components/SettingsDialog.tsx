"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { Overview } from "./shared";

const FIELDS = [
  { key: "bankName", label: "Nama bank", max: 100, hint: "Bank penyimpan rekening kas desa" },
  { key: "bankBranch", label: "Cabang bank", max: 100, hint: "" },
  { key: "bankAccountNo", label: "Nomor rekening kas desa", max: 50, hint: "" },
  { key: "villageHeadName", label: "Nama kepala desa", max: 150, hint: "Tampil di tanda tangan laporan" },
  { key: "secretaryName", label: "Nama sekretaris desa", max: 150, hint: "" },
  { key: "treasurerName", label: "Nama kaur keuangan", max: 150, hint: "" },
] as const;

export function SettingsDialog({ year, settings, onClose, onSaved }: { year: number; settings: Overview["settings"]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map((x) => [x.key, settings[x.key] ?? ""])));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const labels = Object.fromEntries(FIELDS.map((x) => [x.key, x.label]));
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pengaturan tahun anggaran {year}</DialogTitle>
          <DialogDescription>Rekening kas desa dan nama penandatangan yang dicetak pada laporan.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await submit(`/api/apbdes/pengaturan?year=${year}`, "PUT", f)) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={labels} />
          {FIELDS.map((x) => (
            <div key={x.key} className="space-y-1.5">
              <Label htmlFor={`set-${x.key}`}>{x.label}</Label>
              <Input {...fieldA11y(`set-${x.key}`, errors[x.key])} className="h-11" maxLength={x.max} value={f[x.key]} onChange={(e) => setF((p) => ({ ...p, [x.key]: e.target.value }))} />
              {x.hint ? <p className="text-sm text-muted-foreground">{x.hint}</p> : null}
              <FieldError id={`set-${x.key}`} message={errors[x.key]} />
            </div>
          ))}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
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
