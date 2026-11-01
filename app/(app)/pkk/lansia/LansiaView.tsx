"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, HeartPulse, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localToday } from "@/lib/form-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { ResidentPicker } from "@/components/app/ResidentPicker";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { ElderBoard, ElderCheckView } from "@/lib/kia/service";
import type { ResidentPick } from "@/lib/kependudukan/mutasi-labels";
import { SearchSelect } from "@/components/ui/search-select";

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
const today = localToday;
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const STATUS = { NEVER: "Belum pernah diperiksa", OVERDUE: "Perlu diperiksa lagi", OK: "Terpantau" } as const;

type Data = ElderBoard & { can: { create: boolean; delete: boolean } };
type Dlg = { kind: "check"; id: number | null; name: string | null } | { kind: "history"; id: number; name: string };

export function LansiaView() {
  const { data, loading, error, reload } = useApiGet<Data>("/api/pkk/lansia");
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [filter, setFilter] = useState<"perlu" | "semua">("perlu");
  const s = data?.summary;
  const rows = data?.elders.filter((e) => filter === "semua" || e.flags.length > 0 || e.status !== "OK") ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/pkk"><ArrowLeft aria-hidden="true" />Kembali ke PKK</Link>
        </Button>
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><HeartPulse aria-hidden="true" className="size-6" />Posyandu Lansia</h1>
          <p className="max-w-prose text-muted-foreground">
            Catat pemeriksaan warga usia 60 tahun ke atas dan lihat siapa yang belum diperiksa atau tekanan/gula darahnya tinggi. Nilai IMT dan skor kemandirian dicatat sebagai angka tanpa kategori, karena kategorinya berbeda antar pedoman; penilaian oleh tenaga kesehatan. Penanda bukan diagnosis. Data kesehatan bersifat rahasia.
          </p>
        </header>
      </div>

      <section aria-label="Catat pemeriksaan" className="rounded-lg border p-4">
        <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "check", id: null, name: null })}>Catat pemeriksaan lansia</Button>
      </section>

      {loading ? <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Memuat…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}

      {s ? (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Lansia (60+)", s.elders],
              [`Diperiksa ${s.reminderDays} hari terakhir`, s.checkedRecently],
              ["Belum pernah diperiksa", s.neverChecked],
              ["Ada penanda", s.flagged],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-lg border p-3"><dt className="text-sm text-muted-foreground">{k}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">Batas {s.reminderDays} hari adalah pengingat aplikasi, bukan ketentuan.{data!.truncated ? " Daftar dibatasi 3.000 lansia; ringkasan hanya mencakup yang ditampilkan." : ""}</p>
          <div className="w-56">
            <label htmlFor="ln-filter" className="mb-1.5 block text-sm font-medium">Tampilkan</label>
            <SearchSelect id="ln-filter" className={SELECT_CLASS} value={filter} onChange={(e) => setFilter(e.target.value as "perlu" | "semua")}>
              <option value="perlu">Perlu perhatian</option>
              <option value="semua">Semua lansia</option>
            </SearchSelect>
          </div>
          {rows.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center">{s.elders === 0 ? "Belum ada warga usia 60 tahun ke atas di data warga." : "Semua lansia terpantau dan tanpa penanda."}</p> : (
            <ul className="space-y-3">
              {rows.map((e) => (
                <li key={e.residentId} className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h2 className="break-words font-semibold">{e.name}<span className="font-normal text-muted-foreground"> · RT {e.rt ?? "-"}/RW {e.rw ?? "-"} · {e.ageYears} th</span></h2>
                      <p className="text-sm">{STATUS[e.status]}{e.lastCheck ? `: terakhir ${day(e.lastCheck.checkedAt)} (${e.daysSinceCheck} hari lalu)` : ""}</p>
                      {e.lastCheck ? <p className="text-sm text-muted-foreground">{[e.lastCheck.bloodPressure ? `TD ${e.lastCheck.bloodPressure}` : null, e.lastCheck.glucoseMgDl !== null ? `Gula darah ${e.lastCheck.glucoseMgDl} (${e.lastCheck.glucoseType === "PUASA" ? "puasa" : "sewaktu"})` : null, e.lastCheck.bmi !== null ? `IMT ${String(e.lastCheck.bmi).replace(".", ",")}` : null, e.lastCheck.adlScore !== null ? `Skor kemandirian ${e.lastCheck.adlScore}/20` : null].filter(Boolean).join(" · ")}</p> : null}
                      {e.flags.length ? <ul className="space-y-0.5 text-sm text-amber-800 dark:text-amber-300">{e.flags.map((f) => <li key={f} className="flex gap-1.5"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{f}</li>)}</ul> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "history", id: e.residentId, name: e.name })} aria-label={`Riwayat ${e.name}`}>Riwayat</Button>
                      {data!.can.create ? <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "check", id: e.residentId, name: e.name })} aria-label={`Catat pemeriksaan ${e.name}`}>Catat</Button> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {dlg?.kind === "check" ? <CheckDialog presetId={dlg.id} presetName={dlg.name} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); reload(); }} /> : null}
      {dlg?.kind === "history" ? <HistoryDialog id={dlg.id} name={dlg.name} canDelete={Boolean(data?.can.delete)} onClose={() => setDlg(null)} onChanged={reload} /> : null}
    </div>
  );
}

const FIELDS = [
  { k: "weightKg", label: "Berat badan (kg)", step: "0.1" },
  { k: "heightCm", label: "Tinggi badan (cm)", step: "0.1" },
  { k: "systolic", label: "Tekanan darah atas (mmHg)", step: "1" },
  { k: "diastolic", label: "Tekanan darah bawah (mmHg)", step: "1" },
  { k: "glucoseMgDl", label: "Gula darah (mg/dL)", step: "1" },
  { k: "adlScore", label: "Skor kemandirian (0-20)", step: "1" },
] as const;

function CheckDialog({ presetId, presetName, onClose, onSaved }: { presetId: number | null; presetName: string | null; onClose: () => void; onSaved: () => void }) {
  const [pick, setPick] = useState<ResidentPick | null>(null);
  const [f, setF] = useState<Record<string, string>>({ checkedAt: today(), glucoseType: "PUASA" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const residentId = presetId ?? pick?.id;
  const labels: Record<string, string> = { residentId: "Warga", checkedAt: "Tanggal", glucoseType: "Jenis gula darah", note: "Catatan", ...Object.fromEntries(FIELDS.map((x) => [x.k, x.label])) };
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{presetName ? `Catat pemeriksaan: ${presetName}` : "Catat pemeriksaan lansia"}</DialogTitle>
          <DialogDescription>Isi hanya yang diperiksa; minimal satu hasil. Hanya warga usia 60 tahun ke atas.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await submit("/api/pkk/lansia", "POST", { ...f, residentId })) onSaved();
          }}
        >
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={labels} />
          {presetId === null ? <ResidentPicker value={pick} onChange={setPick} label="Cari lansia (nama atau NIK)" /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="ck-date">Tanggal pemeriksaan *</Label>
            <Input {...fieldA11y("ck-date", errors.checkedAt)} className="h-11" type="date" max={today()} value={f.checkedAt} onChange={(e) => set("checkedAt", e.target.value)} />
            <FieldError id="ck-date" message={errors.checkedAt} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((x) => (
              <div key={x.k} className="space-y-1.5">
                <Label htmlFor={`ck-${x.k}`}>{x.label}</Label>
                <Input {...fieldA11y(`ck-${x.k}`, errors[x.k])} className="h-11" type="number" inputMode="decimal" step={x.step} value={f[x.k] ?? ""} onChange={(e) => set(x.k, e.target.value)} />
                <FieldError id={`ck-${x.k}`} message={errors[x.k]} />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-gtype">Jenis gula darah</Label>
            <SearchSelect {...fieldA11y("ck-gtype", errors.glucoseType)} className={SELECT_CLASS} value={f.glucoseType} onChange={(e) => set("glucoseType", e.target.value)}>
              <option value="PUASA">Puasa</option>
              <option value="SEWAKTU">Sewaktu</option>
            </SearchSelect>
            <FieldError id="ck-gtype" message={errors.glucoseType} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ck-note">Catatan</Label>
            <Input {...fieldA11y("ck-note", errors.note)} className="h-11" maxLength={300} value={f.note ?? ""} onChange={(e) => set("note", e.target.value)} />
            <FieldError id="ck-note" message={errors.note} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
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

function HistoryDialog({ id, name, canDelete, onClose, onChanged }: { id: number; name: string; canDelete: boolean; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApiGet<{ name: string; checks: ElderCheckView[] }>(`/api/pkk/lansia/${id}`);
  const del = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Riwayat: {name}</DialogTitle>
          <DialogDescription>Pemeriksaan terbaru lebih dulu.</DialogDescription>
        </DialogHeader>
        {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat…</p> : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        <FormErrorSummary innerRef={del.summaryRef} errors={{}} general={del.general} labels={{}} />
        {data && data.checks.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada pemeriksaan.</p> : null}
        <ul className="space-y-2">
          {data?.checks.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{day(c.checkedAt)}</p>
                <p className="text-muted-foreground">{[c.weightKg !== null ? `BB ${c.weightKg} kg` : null, c.heightCm !== null ? `TB ${c.heightCm} cm` : null, c.bmi !== null ? `IMT ${String(c.bmi).replace(".", ",")}` : null, c.bloodPressure ? `TD ${c.bloodPressure}` : null, c.glucoseMgDl !== null ? `GD ${c.glucoseMgDl} (${c.glucoseType === "PUASA" ? "puasa" : "sewaktu"})` : null, c.adlScore !== null ? `Kemandirian ${c.adlScore}/20` : null].filter(Boolean).join(" · ")}</p>
                {c.flags.length ? <p className="text-amber-800 dark:text-amber-300">{c.flags.join("; ")}</p> : null}
                {c.note ? <p>{c.note}</p> : null}
              </div>
              {canDelete ? (
                <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Hapus pemeriksaan ${day(c.checkedAt)}`} disabled={del.busy} onClick={async () => { if (await del.submit(`/api/pkk/lansia?id=${c.id}`, "DELETE", undefined, "Gagal menghapus. Coba lagi.")) { reload(); onChanged(); } }}>
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" className="min-h-11" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
