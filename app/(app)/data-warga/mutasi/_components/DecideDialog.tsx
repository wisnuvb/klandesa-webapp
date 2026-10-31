"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { describeMutation, formatTanggal, needsNikOnApprove, type MutasiItemView } from "@/lib/kependudukan/mutasi-labels";
import type { ActionResult } from "../_hooks/useMutasi";

export type Decision = { item: MutasiItemView; mode: "approve" | "reject" } | null;

export function DecideDialog({
  decision,
  onClose,
  onApprove,
  onReject,
}: {
  decision: Decision;
  onClose: () => void;
  onApprove: (id: string, nik?: string) => Promise<ActionResult>;
  onReject: (id: string, reason: string) => Promise<ActionResult>;
}) {
  const [nik, setNik] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!decision) return null;
  const { item, mode } = decision;
  const askNik = mode === "approve" && needsNikOnApprove(item);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (askNik && !/^\d{16}$/.test(nik.replace(/\D/g, ""))) errs.push("NIK harus 16 angka.");
    if (mode === "reject" && !reason.trim()) errs.push("Alasan penolakan wajib diisi.");
    if (errs.length) return setErrors(errs);
    setSaving(true);
    const r = mode === "approve" ? await onApprove(item.id, askNik ? nik.replace(/\D/g, "") : undefined) : await onReject(item.id, reason.trim());
    setSaving(false);
    if (r.ok) onClose();
    else setErrors(r.errors);
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !saving ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "approve" ? "Setujui mutasi ini?" : "Tolak pengajuan ini?"}</DialogTitle>
          <DialogDescription>
            {describeMutation(item)} · {formatTanggal(item.effectiveDate)}
            {mode === "approve" ? ". Setelah disetujui, data warga langsung diperbarui." : ". Data warga tidak berubah."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          {askNik ? (
            <div className="space-y-1.5">
              <Label htmlFor="decide-nik">NIK warga baru</Label>
              <Input id="decide-nik" inputMode="numeric" maxLength={20} className="h-11" value={nik} onChange={(e) => setNik(e.target.value)} />
              <p className="text-sm text-muted-foreground">16 angka. NIK dicocokkan dengan tanggal lahir dan jenis kelamin, dan tidak disimpan di catatan mutasi.</p>
            </div>
          ) : null}
          {mode === "reject" ? (
            <div className="space-y-1.5">
              <Label htmlFor="decide-alasan">Alasan penolakan</Label>
              <Textarea id="decide-alasan" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          ) : null}
          {errors.length ? (
            <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <ul className="list-disc pl-5">
                {errors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" variant={mode === "reject" ? "destructive" : "default"} disabled={saving}>
              {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {mode === "approve" ? "Ya, setujui" : "Tolak pengajuan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
