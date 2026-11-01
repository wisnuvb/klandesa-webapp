"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, fmtDate } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { CandidatePicker, emptyPicker, type PickerValue } from "./CandidatePicker";
import type { TabProps } from "./types";

type B = TabProps["data"]["program"]["beneficiaries"][number];
const TONE: Record<string, string> = { AKTIF: "done", DIGANTI: "soon", BERAKHIR: "neutral" };

export function BeneficiariesTab({ data, reload }: TabProps) {
  const p = data.program;
  const [pick, setPick] = useState<PickerValue>(emptyPicker());
  const [pickerKey, setPickerKey] = useState(0);
  const [replacing, setReplacing] = useState<B | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const form = useFormSubmit();
  const draft = p.status === "DRAFT";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await form.submit(`/api/blt/${p.id}/penerima`, "POST", { residentId: pick.residentId, source: pick.source, criteria: pick.criteria, category: pick.category });
    if (r) {
      setPick(emptyPicker());
      setPickerKey((k) => k + 1);
      reload();
    }
  }
  async function remove(b: B) {
    setErr(null);
    const res = await fetch(`/api/blt/${p.id}/penerima/${b.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menghapus.");
  }

  return (
    <>
      <section aria-labelledby="bn-h" className="space-y-3">
        <h2 id="bn-h" className="text-lg font-semibold">
          Keluarga penerima manfaat
        </h2>
        <p className="text-sm text-muted-foreground">Satu keluarga (KK) satu penerima, diwakili satu warga. NIK disamarkan di layar; lengkapnya hanya pada dokumen cetak bagi yang berwenang.</p>
        {err ? (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        ) : null}
        {p.beneficiaries.length ? (
          <ul className="divide-y rounded-lg border">
            {p.beneficiaries.map((b) => (
              <li key={b.id} className="space-y-1 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {b.name} <Pill tone={TONE[b.status] ?? "neutral"}>{b.statusLabel}</Pill>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      NIK {b.nikMasked ?? "-"} · KK {b.kk ?? "-"} · {b.category} · {b.jobGroup}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.source === "PEMERINTAH" ? "Data Pemerintah" : `Kriteria Desa: ${b.criteria.join(", ")}`}
                      {b.startMonth > 1 ? ` · berhak mulai bulan ke-${b.startMonth}` : ""}
                      {b.decreeRef ? ` · SK perubahan ${b.decreeRef}` : ""}
                    </p>
                    {b.endedReason ? <p className="text-sm">Alasan berhenti: {b.endedReason}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    {p.status === "DITETAPKAN" && b.status === "AKTIF" && data.can.update ? (
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setReplacing(b)}>
                        Ganti atau akhiri
                      </Button>
                    ) : null}
                    {draft && data.can.delete ? (
                      <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus ${b.name} dari daftar`} onClick={() => remove(b)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {b.warnings.length ? (
                  <ul className="list-disc space-y-0.5 rounded-md border border-amber-600/50 bg-amber-50 py-2 pl-7 pr-3 text-sm text-amber-950">
                    {b.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada penerima. Cari warga di bawah untuk mulai mendata.</p>
        )}
      </section>

      {draft && data.can.create ? (
        <form onSubmit={add} className="space-y-3 rounded-lg border p-4" noValidate>
          <h2 className="text-lg font-semibold">Tambah penerima</h2>
          <FormErrorSummary innerRef={form.summaryRef} errors={form.errors} general={form.general} labels={{ residentId: "Warga", source: "Sumber data", criteria: "Kriteria", category: "Kategori" }} />
          <CandidatePicker key={pickerKey} programId={p.id} idPrefix="add" criteria={p.criteria} value={pick} onChange={setPick} errors={form.errors} />
          <Button type="submit" className="min-h-11" disabled={form.busy || !pick.residentId}>
            {form.busy ? "Menyimpan…" : "Tambahkan ke daftar"}
          </Button>
        </form>
      ) : null}
      {!draft ? <p className="text-sm text-muted-foreground">Daftar terkunci sejak Keputusan Kepala Desa terbit. Perubahan penerima hanya lewat penggantian berdasar Musyawarah Desa khusus.</p> : null}

      {replacing ? (
        <ReplaceDialog
          data={data}
          target={replacing}
          onClose={() => setReplacing(null)}
          onDone={() => {
            setReplacing(null);
            reload();
          }}
        />
      ) : null}
    </>
  );
}

function ReplaceDialog({ data, target, onClose, onDone }: { data: TabProps["data"]; target: B; onClose: () => void; onDone: () => void }) {
  const p = data.program;
  const khusus = p.meetings.filter((m) => m.kind === "MUSDES_BLT_KHUSUS");
  const [meeting, setMeeting] = useState("");
  const [reason, setReason] = useState("");
  const [decree, setDecree] = useState("");
  const [withNew, setWithNew] = useState(true);
  const [pick, setPick] = useState<PickerValue>(emptyPicker());
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { meetingId: meeting, reason, decreeRef: decree, replacement: withNew ? { residentId: pick.residentId, source: pick.source, criteria: pick.criteria, category: pick.category } : null };
    const r = await submit(`/api/blt/${p.id}/penerima/${target.id}/ganti`, "POST", body);
    if (r) onDone();
  }
  const errs = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k.replace(/^replacement\./, ""), v]));

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ganti atau akhiri penerima</DialogTitle>
          <DialogDescription>
            {target.name}: meninggal dunia atau tidak lagi memenuhi kriteria. Penggantian ditetapkan Musyawarah Desa khusus dan dituangkan dalam Keputusan Kepala Desa, lalu dilaporkan kepada bupati melalui camat.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ meetingId: "Musyawarah Desa khusus", reason: "Alasan", decreeRef: "Nomor keputusan", "replacement.residentId": "Warga pengganti", "replacement.criteria": "Kriteria", "replacement.category": "Kategori" }} />
          <div className="space-y-1.5">
            <Label htmlFor="rp-meeting">Musyawarah Desa khusus *</Label>
            <SearchSelect id="rp-meeting" className={SELECT_CLASS} value={meeting} onChange={(e) => setMeeting(e.target.value)}>
              <option value="">— Pilih —</option>
              {khusus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} {m.heldOn ? `(${fmtDate(m.heldOn)})` : "(belum terlaksana)"}
                </option>
              ))}
            </SearchSelect>
            {!khusus.length ? <p className="text-xs text-muted-foreground">Belum ada. Jadwalkan di menu Musyawarah Desa dengan jenis “Musyawarah Desa khusus penggantian penerima BLT Desa”.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-reason">Alasan *</Label>
            <Textarea id="rp-reason" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-decree">Nomor Keputusan Kepala Desa tentang perubahan</Label>
            <Input id="rp-decree" className="h-11" maxLength={150} value={decree} onChange={(e) => setDecree(e.target.value)} />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-5" checked={withNew} onChange={(e) => setWithNew(e.target.checked)} />
            Ada keluarga pengganti
          </label>
          {withNew ? <CandidatePicker programId={p.id} idPrefix="rep" criteria={p.criteria} value={pick} onChange={setPick} errors={errs} /> : <p className="text-sm text-muted-foreground">Tanpa pengganti: alasan harus dijelaskan juga dalam berita acara Musyawarah Desa khusus.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy || (withNew && !pick.residentId)}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {withNew ? "Ganti penerima" : "Akhiri tanpa pengganti"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
