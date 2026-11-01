"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localToday } from "@/lib/form-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { ResidentPicker } from "@/components/app/ResidentPicker";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { DANGER_SIGNS, PROVIDERS } from "@/lib/kia/catalog";
import type { PregnancyBrief, VisitView } from "@/lib/kia/service";
import type { ResidentPick } from "@/lib/kependudukan/mutasi-labels";

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
const today = localToday;
export const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const FOOTER = (busy: boolean, onClose: () => void, label: string) => (
  <DialogFooter className="gap-2 sm:gap-2">
    <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
      Batal
    </Button>
    <Button type="submit" className="min-h-11" disabled={busy}>
      {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
      {label}
    </Button>
  </DialogFooter>
);

export function RegisterDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [pick, setPick] = useState<ResidentPick | null>(null);
  const [lmp, setLmp] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Daftarkan ibu hamil</DialogTitle>
          <DialogDescription>Hari perkiraan lahir (HPL) dihitung otomatis dari HPHT, yaitu HPHT + 280 hari.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await submit("/api/pkk/kia", "POST", { residentId: pick?.id, lmpDate: lmp })) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ residentId: "Warga", lmpDate: "HPHT" }} />
          <ResidentPicker value={pick} onChange={setPick} label="Cari ibu (nama atau NIK)" />
          <FieldError id="rg-resident" message={errors.residentId} />
          <div className="space-y-1.5">
            <Label htmlFor="rg-lmp">Hari pertama haid terakhir (HPHT) *</Label>
            <Input {...fieldA11y("rg-lmp", errors.lmpDate)} className="h-11" type="date" max={today()} value={lmp} onChange={(e) => setLmp(e.target.value)} />
            <FieldError id="rg-lmp" message={errors.lmpDate} />
          </div>
          {FOOTER(busy, onClose, "Daftarkan")}
        </form>
      </DialogContent>
    </Dialog>
  );
}

const NUM_FIELDS = [
  { k: "weightKg", label: "Berat badan (kg)", step: "0.1" },
  { k: "systolic", label: "Tekanan darah atas (mmHg)", step: "1" },
  { k: "diastolic", label: "Tekanan darah bawah (mmHg)", step: "1" },
  { k: "upperArmCm", label: "LiLA (cm)", step: "0.1" },
  { k: "fundalHeightCm", label: "Tinggi fundus (cm)", step: "0.1" },
  { k: "fetalHeartRate", label: "Denyut jantung janin (/menit)", step: "1" },
  { k: "hemoglobin", label: "Hb (g/dL)", step: "0.1" },
  { k: "ironTablets", label: "Tablet tambah darah diberikan", step: "1" },
] as const;

export function VisitDialog({ pregnancy, onClose, onSaved }: { pregnancy: Pick<PregnancyBrief, "id" | "name" | "lmpDate">; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, string>>({ visitDate: today(), provider: "BIDAN" });
  const [signs, setSigns] = useState<Set<string>>(new Set());
  const [flags, setFlags] = useState({ tetanusGiven: false, ultrasound: false });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const labels: Record<string, string> = { visitDate: "Tanggal", provider: "Pemeriksa", dangerSigns: "Tanda bahaya", note: "Catatan", ...Object.fromEntries(NUM_FIELDS.map((x) => [x.k, x.label])) };
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat kunjungan: {pregnancy.name}</DialogTitle>
          <DialogDescription>Isi hanya yang diperiksa. Trimester dihitung dari HPHT ({day(pregnancy.lmpDate)}).</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await submit(`/api/pkk/kia/${pregnancy.id}/kunjungan`, "POST", { ...f, ...flags, dangerSigns: [...signs] })) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={labels} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vs-date">Tanggal kunjungan *</Label>
              <Input {...fieldA11y("vs-date", errors.visitDate)} className="h-11" type="date" max={today()} min={pregnancy.lmpDate} value={f.visitDate} onChange={(e) => set("visitDate", e.target.value)} />
              <FieldError id="vs-date" message={errors.visitDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vs-provider">Pemeriksa *</Label>
              <select {...fieldA11y("vs-provider", errors.provider)} className={SELECT_CLASS} value={f.provider} onChange={(e) => set("provider", e.target.value)}>
                {Object.entries(PROVIDERS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <FieldError id="vs-provider" message={errors.provider} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {NUM_FIELDS.map((x) => (
              <div key={x.k} className="space-y-1.5">
                <Label htmlFor={`vs-${x.k}`}>{x.label}</Label>
                <Input {...fieldA11y(`vs-${x.k}`, errors[x.k])} className="h-11" type="number" inputMode="decimal" step={x.step} value={f[x.k] ?? ""} onChange={(e) => set(x.k, e.target.value)} />
                <FieldError id={`vs-${x.k}`} message={errors[x.k]} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={flags.tetanusGiven} onChange={(e) => setFlags((p) => ({ ...p, tetanusGiven: e.target.checked }))} />Imunisasi TT diberikan</label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={flags.ultrasound} onChange={(e) => setFlags((p) => ({ ...p, ultrasound: e.target.checked }))} />Dengan USG</label>
          </div>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Tanda bahaya yang dilaporkan</legend>
            {Object.entries(DANGER_SIGNS).map(([k, v]) => (
              <label key={k} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={signs.has(k)} onChange={(e) => setSigns((s) => { const n = new Set(s); if (e.target.checked) n.add(k); else n.delete(k); return n; })} />
                {v}
              </label>
            ))}
            <FieldError id="vs-signs" message={errors.dangerSigns} />
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="vs-note">Catatan</Label>
            <Input {...fieldA11y("vs-note", errors.note)} className="h-11" maxLength={300} value={f.note ?? ""} onChange={(e) => set("note", e.target.value)} />
            <FieldError id="vs-note" message={errors.note} />
          </div>
          {FOOTER(busy, onClose, "Simpan kunjungan")}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EndDialog({ pregnancy, onClose, onSaved }: { pregnancy: Pick<PregnancyBrief, "id" | "name">; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ status: "BERSALIN", endedAt: today(), endNote: "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Akhiri kehamilan: {pregnancy.name}</DialogTitle>
          <DialogDescription>Setelah diakhiri, kunjungan antenatal baru tidak dapat dicatat untuk kehamilan ini.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await submit(`/api/pkk/kia/${pregnancy.id}/akhiri`, "POST", f)) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ status: "Hasil", endedAt: "Tanggal", endNote: "Keterangan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="en-status">Hasil *</Label>
            <select {...fieldA11y("en-status", errors.status)} className={SELECT_CLASS} value={f.status} onChange={(e) => setF((p) => ({ ...p, status: e.target.value }))}>
              <option value="BERSALIN">Sudah bersalin</option>
              <option value="KEGUGURAN">Keguguran</option>
            </select>
            <FieldError id="en-status" message={errors.status} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="en-date">Tanggal kejadian *</Label>
            <Input {...fieldA11y("en-date", errors.endedAt)} className="h-11" type="date" max={today()} value={f.endedAt} onChange={(e) => setF((p) => ({ ...p, endedAt: e.target.value }))} />
            <FieldError id="en-date" message={errors.endedAt} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="en-note">Tempat dan penolong persalinan / keterangan</Label>
            <Input {...fieldA11y("en-note", errors.endNote)} className="h-11" maxLength={300} value={f.endNote} onChange={(e) => setF((p) => ({ ...p, endNote: e.target.value }))} />
            <FieldError id="en-note" message={errors.endNote} />
          </div>
          {FOOTER(busy, onClose, "Akhiri kehamilan")}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DetailDialog({ id, name, canWrite, canDelete, onClose, onVisit, onEnd, onDeleted }: { id: number; name: string; canWrite: boolean; canDelete: boolean; onClose: () => void; onVisit: () => void; onEnd: () => void; onDeleted: () => void }) {
  const { data, loading, error } = useApiGet<{ pregnancy: PregnancyBrief; endNote: string | null; endedAt: string | null; visits: VisitView[] }>(`/api/pkk/kia/${id}`);
  const p = data?.pregnancy;
  const del = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>Riwayat kunjungan antenatal. Penanda bukan diagnosis; rujukan oleh bidan atau dokter.</DialogDescription>
        </DialogHeader>
        {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat…</p> : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        {p && data ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">HPHT</dt><dd>{day(p.lmpDate)}</dd></div>
              <div><dt className="text-muted-foreground">HPL</dt><dd>{day(p.edd)}</dd></div>
              <div><dt className="text-muted-foreground">Usia kehamilan</dt><dd>{p.weeks} minggu {p.days} hari (trimester {p.trimester})</dd></div>
              <div><dt className="text-muted-foreground">Kunjungan</dt><dd>{p.plan.total} dari 6 yang dianjurkan</dd></div>
            </dl>
            <ul className="grid grid-cols-3 gap-2 text-center text-sm" aria-label="Kunjungan per trimester">
              {([1, 2, 3] as const).map((t) => (
                <li key={t} className="rounded-md border p-2">
                  <p className="text-muted-foreground">Trimester {t}</p>
                  <p className="font-semibold tabular-nums">{p.plan.perTrimester[t].done}/{p.plan.perTrimester[t].target}</p>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">Dua kunjungan dianjurkan oleh dokter (trimester 1 {p.plan.doctorTrimester1 ? "sudah" : "belum"}, trimester 3 {p.plan.doctorTrimester3 ? "sudah" : "belum"}).</p>
            {p.status !== "HAMIL" ? <p className="rounded-md bg-muted p-3 text-sm">{p.status === "BERSALIN" ? "Sudah bersalin" : "Keguguran"}{data.endedAt ? ` pada ${day(data.endedAt)}` : ""}{data.endNote ? `. ${data.endNote}` : ""}</p> : null}
            {p.flags.length > 0 ? (
              <ul className="space-y-1 rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                {p.flags.map((x) => <li key={x}>{x}</li>)}
              </ul>
            ) : null}
            {data.visits.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada kunjungan tercatat.</p> : (
              <ul className="space-y-2">
                {data.visits.map((v) => (
                  <li key={v.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{day(v.visitDate)} <span className="font-normal text-muted-foreground">· minggu {v.weeks} · trimester {v.trimester} · {PROVIDERS[v.provider as keyof typeof PROVIDERS] ?? v.provider}{v.ultrasound ? " · USG" : ""}</span></p>
                    <p className="text-muted-foreground">
                      {[v.weightKg !== null ? `BB ${v.weightKg} kg` : null, v.bloodPressure ? `TD ${v.bloodPressure}` : null, v.upperArmCm !== null ? `LiLA ${v.upperArmCm} cm` : null, v.fundalHeightCm !== null ? `TFU ${v.fundalHeightCm} cm` : null, v.fetalHeartRate !== null ? `DJJ ${v.fetalHeartRate}` : null, v.hemoglobin !== null ? `Hb ${v.hemoglobin}` : null, v.tetanusGiven ? "TT" : null, v.ironTablets !== null ? `${v.ironTablets} tablet Fe` : null].filter(Boolean).join(" · ") || "Tanpa hasil pengukuran"}
                    </p>
                    {v.flags.length ? <p className="text-amber-800 dark:text-amber-300">{v.flags.join("; ")}</p> : null}
                    {v.note ? <p>{v.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        <FormErrorSummary innerRef={del.summaryRef} errors={{}} general={del.general} labels={{}} />
        <DialogFooter className="gap-2 sm:gap-2">
          {canDelete && data && data.visits.length === 0 ? (
            <Button type="button" variant="ghost" className="min-h-11 text-destructive" disabled={del.busy} onClick={async () => { if (window.confirm(`Hapus catatan kehamilan ${name}? Gunakan hanya untuk data yang salah dimasukkan.`) && (await del.submit(`/api/pkk/kia/${id}`, "DELETE", undefined, "Gagal menghapus. Coba lagi."))) onDeleted(); }}>
              Hapus (salah input)
            </Button>
          ) : null}
          {canWrite && p?.status === "HAMIL" ? (
            <>
              <Button type="button" variant="outline" className="min-h-11" onClick={onEnd}>Akhiri kehamilan</Button>
              <Button type="button" className="min-h-11" onClick={onVisit}>Catat kunjungan</Button>
            </>
          ) : null}
          <Button type="button" variant="ghost" className="min-h-11" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
