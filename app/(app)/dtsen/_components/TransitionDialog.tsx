"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { OUTCOME_LABEL, STATUS_LABEL, type Status } from "@/lib/dtsen/catalog";
import { SELECT_CLASS } from "./ProposalFormDialog";

const LABELS: Record<string, string> = {
  ids: "Usulan", to: "Tahap", verifiedAt: "Tanggal verifikasi", verifiedBy: "Pemverifikasi", verificationNote: "Hasil verifikasi", musdesAt: "Tanggal musyawarah", musdesRef: "Nomor berita acara",
  forwardedAt: "Tanggal diteruskan", forwardedRef: "Nomor surat pengantar", outcome: "Hasil", outcomeAt: "Tanggal hasil", outcomeNote: "Catatan",
};

const COPY: Partial<Record<Status, { title: string; text: string; submit: string }>> = {
  TERVERIFIKASI: { title: "Catat hasil verifikasi lapangan", text: "Isi setelah petugas desa mengunjungi rumah tangga dan memeriksa kondisinya.", submit: "Simpan verifikasi" },
  DISETUJUI_MUSDES: { title: "Disetujui musyawarah desa", text: "Satu berita acara dapat berlaku untuk banyak usulan sekaligus.", submit: "Tandai disetujui" },
  DITOLAK_MUSDES: { title: "Tidak disetujui musyawarah desa", text: "Usulan berhenti di desa dan tercatat sebagai riwayat.", submit: "Tandai tidak disetujui" },
  DITERUSKAN: { title: "Teruskan ke Dinas Sosial", text: "Catat surat pengantar yang dikirim ke Dinas Sosial kabupaten/kota.", submit: "Tandai diteruskan" },
  SELESAI: { title: "Catat hasil dari Dinas Sosial", text: "Hasil akhir hanya dicatat; desil ditetapkan pemerintah pusat.", submit: "Simpan hasil" },
  DIBATALKAN: { title: "Batalkan usulan", text: "Usulan yang dibatalkan tetap tersimpan sebagai riwayat.", submit: "Batalkan usulan" },
};

export function TransitionDialog({ ids, to, onClose, onDone }: { ids: number[]; to: Status; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<{ id: number; reason: string }[]>([]);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const c = COPY[to] ?? { title: STATUS_LABEL[to], text: "", submit: "Simpan" };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<{ moved: number[]; skipped: { id: number; reason: string }[] }>("/api/dtsen/usulan/transisi", "POST", { ...f, ids, to });
    if (!r) return;
    if (r.skipped.length) {
      setSkipped(r.skipped);
      return;
    }
    onDone();
  }

  const date = (k: string, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`tr-${k}`}>{label} *</Label>
      <Input {...fieldA11y(`tr-${k}`, errors[k])} className="h-11" type="date" value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
      <FieldError id={`tr-${k}`} message={errors[k]} />
    </div>
  );
  const text = (k: string, label: string, required = true, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`tr-${k}`}>{label}{required ? " *" : ""}</Label>
      <Input {...fieldA11y(`tr-${k}`, errors[k])} className="h-11" value={f[k] ?? ""} maxLength={150} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} />
      <FieldError id={`tr-${k}`} message={errors[k]} />
    </div>
  );
  const area = (k: string, label: string, required = true) => (
    <div className="space-y-1.5">
      <Label htmlFor={`tr-${k}`}>{label}{required ? " *" : ""}</Label>
      <Textarea {...fieldA11y(`tr-${k}`, errors[k])} rows={3} value={f[k] ?? ""} maxLength={1000} onChange={(e) => set(k, e.target.value)} />
      <FieldError id={`tr-${k}`} message={errors[k]} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
          <DialogDescription>
            {ids.length} usulan dipilih. {c.text}
          </DialogDescription>
        </DialogHeader>
        {skipped.length ? (
          <div className="space-y-3">
            <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
              <p className="font-medium">Sebagian usulan tidak dapat diproses:</p>
              <ul className="list-disc pl-5">
                {skipped.map((s) => <li key={s.id}>Usulan #{s.id}: {s.reason}</li>)}
              </ul>
            </div>
            <DialogFooter>
              <Button type="button" className="min-h-11" onClick={onDone}>Mengerti</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {to === "TERVERIFIKASI" ? (<>{date("verifiedAt", "Tanggal verifikasi")}{text("verifiedBy", "Nama pemverifikasi")}{area("verificationNote", "Hasil verifikasi lapangan")}</>) : null}
            {to === "DISETUJUI_MUSDES" || to === "DITOLAK_MUSDES" ? (<>{date("musdesAt", "Tanggal musyawarah desa")}{text("musdesRef", "Nomor berita acara musyawarah")}</>) : null}
            {to === "DITERUSKAN" ? (<>{date("forwardedAt", "Tanggal diteruskan")}{text("forwardedRef", "Nomor surat pengantar")}</>) : null}
            {to === "SELESAI" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="tr-outcome">Hasil *</Label>
                  <select {...fieldA11y("tr-outcome", errors.outcome)} className={SELECT_CLASS} value={f.outcome ?? ""} onChange={(e) => set("outcome", e.target.value)}>
                    <option value="">Pilih hasil…</option>
                    {(Object.keys(OUTCOME_LABEL) as (keyof typeof OUTCOME_LABEL)[]).map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
                  </select>
                  <FieldError id="tr-outcome" message={errors.outcome} />
                </div>
                {date("outcomeAt", "Tanggal hasil")}
                {text("outcomeNote", "Catatan hasil", false)}
              </>
            ) : null}
            {to === "DIBATALKAN" ? area("outcomeNote", "Alasan pembatalan") : null}
            <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
              <Button type="submit" variant={to === "DIBATALKAN" ? "destructive" : "default"} className="min-h-11" disabled={busy}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {busy ? "Memproses…" : c.submit}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
