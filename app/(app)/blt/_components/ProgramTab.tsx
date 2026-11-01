"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { TabProps } from "./types";

const ACTIONS = {
  tetapkan: { label: "Tetapkan program", title: "Tetapkan program BLT?", body: "Setelah ditetapkan, daftar penerima terkunci dan pembayaran dapat dicatat. Perubahan penerima selanjutnya hanya lewat Musyawarah Desa khusus." },
  selesai: { label: "Tandai selesai", title: "Tandai program selesai?", body: "Pembayaran baru tidak dapat dicatat lagi. Program dapat dibuka kembali bila ada koreksi." },
  buka: { label: "Buka kembali", title: "Buka kembali program?", body: "Program kembali berstatus ditetapkan sehingga pembayaran dapat dicatat atau dikoreksi." },
  cabut: { label: "Cabut penetapan", title: "Cabut penetapan program?", body: "Program kembali menjadi draf. Hanya bisa bila belum ada pembayaran." },
};
type ActionKey = keyof typeof ACTIONS;

export function ProgramTab({ data, reload }: TabProps) {
  const p = data.program;
  const draft = p.status === "DRAFT";
  const canEdit = data.can.update && p.status !== "SELESAI";
  const [title, setTitle] = useState<string | null>(null);
  const [monthly, setMonthly] = useState<string | null>(null);
  const [months, setMonths] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<string | null>(null);
  const [number, setNumber] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [reported, setReported] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [action, setAction] = useState<ActionKey | null>(null);
  const form = useFormSubmit();
  const act = useFormSubmit();

  const dirty = [title, monthly, months, meeting, number, date, reported, note].some((x) => x !== null);
  const blt = p.meetings.filter((m) => m.kind === "MUSDES_BLT");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    if (draft) {
      if (title !== null) body.title = title;
      if (monthly !== null) body.monthly = monthly;
      if (months !== null) body.totalMonths = Number(months);
      if (meeting !== null) body.musdesMeetingId = meeting;
      if (number !== null) body.decreeNumber = number;
      if (date !== null) body.decreeDate = date;
    }
    if (reported !== null) body.reportedToRegencyOn = reported;
    if (note !== null) body.note = note;
    const r = await form.submit(`/api/blt/${p.id}`, "PATCH", body);
    if (r) {
      [setTitle, setMonthly, setMonths, setMeeting, setNumber, setDate, setReported, setNote].forEach((s) => s(null));
      reload();
    }
  }

  async function runAction() {
    if (!action) return;
    const r = await act.submit(`/api/blt/${p.id}/status`, "POST", { action });
    if (r) {
      setAction(null);
      reload();
    }
  }

  const available: ActionKey[] = p.status === "DRAFT" ? ["tetapkan"] : p.status === "DITETAPKAN" ? ["selesai", "cabut"] : ["buka"];

  return (
    <>
      <section aria-labelledby="bl-alur-h" className="space-y-2">
        <h2 id="bl-alur-h" className="text-lg font-semibold">
          Alur penetapan
        </h2>
        <ol className="list-decimal space-y-1 pl-6 text-sm text-muted-foreground">
          <li>Pendataan keluarga calon penerima di RT/RW/dusun, lalu verifikasi kependudukan (tab Penerima).</li>
          <li>Musyawarah Desa membahas dan menyepakati daftar penerima; buat jadwalnya di menu Musyawarah Desa (jenis “penetapan penerima BLT Desa”).</li>
          <li>Kepala Desa menetapkan daftar dengan Keputusan Kepala Desa; catat nomor dan tanggalnya di bawah, lalu tetapkan program.</li>
          <li>Keputusan dilaporkan kepada bupati/wali kota melalui camat; catat tanggalnya.</li>
          <li>Pembayaran dicatat per keluarga (tab Pembayaran), paling banyak {p.cap.monthsAtOnce} bulan sekaligus.</li>
        </ol>
      </section>

      <form onSubmit={save} className="space-y-4 rounded-lg border p-4" noValidate>
        <h2 className="text-lg font-semibold">Isian program dan Keputusan Kepala Desa</h2>
        <FormErrorSummary innerRef={form.summaryRef} errors={form.errors} general={form.general} labels={{ title: "Judul", monthly: "Nilai per bulan", totalMonths: "Jumlah bulan", musdesMeetingId: "Musyawarah Desa", decreeNumber: "Nomor keputusan", decreeDate: "Tanggal keputusan", reportedToRegencyOn: "Tanggal pelaporan", note: "Catatan" }} />
        {!draft ? <p className="text-sm text-muted-foreground">Program sudah ditetapkan; yang masih dapat diubah hanya tanggal pelaporan kepada bupati dan catatan.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pr-title">Judul</Label>
            <Input id="pr-title" className="h-11" maxLength={200} disabled={!draft || !canEdit} value={title ?? p.title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-monthly">Nilai per keluarga per bulan (maks. {rupiah(p.cap.monthlyMax)})</Label>
            <CurrencyInput id="pr-monthly" inputClassName="h-11" disabled={!draft || !canEdit} value={monthly ?? String(Math.round(Number(p.monthly)))} onValueChange={setMonthly} aria-invalid={Boolean(form.errors.monthly)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-months">Jumlah bulan program</Label>
            <Input id="pr-months" inputMode="numeric" className="h-11" disabled={!draft || !canEdit} value={months ?? String(p.totalMonths)} onChange={(e) => setMonths(e.target.value)} aria-invalid={Boolean(form.errors.totalMonths)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pr-meeting">Musyawarah Desa penetapan penerima</Label>
            <SearchSelect id="pr-meeting" className={SELECT_CLASS} disabled={!draft || !canEdit} value={meeting ?? String(p.musdes?.id ?? "")} onChange={(e) => setMeeting(e.target.value)}>
              <option value="">— Belum dipilih —</option>
              {blt.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} {m.heldOn ? `(${fmtDate(m.heldOn)})` : "(belum terlaksana)"}
                </option>
              ))}
            </SearchSelect>
            {p.musdes && p.musdes.status === "PLANNED" ? <p className="text-xs text-amber-900">Musyawarah ini belum ditandai terlaksana.</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-no">Nomor Keputusan Kepala Desa</Label>
            <Input id="pr-no" className="h-11" maxLength={100} disabled={!draft || !canEdit} value={number ?? p.decreeNumber ?? ""} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-date">Tanggal keputusan</Label>
            <Input id="pr-date" type="date" className="h-11" disabled={!draft || !canEdit} value={date ?? p.decreeDate ?? ""} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-rep">Dilaporkan kepada bupati melalui camat pada</Label>
            <Input id="pr-rep" type="date" className="h-11" disabled={!canEdit} value={reported ?? p.reportedToRegencyOn ?? ""} onChange={(e) => setReported(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pr-note">Catatan</Label>
            <Textarea id="pr-note" rows={2} maxLength={500} disabled={!canEdit} value={note ?? p.note ?? ""} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        {canEdit ? (
          <Button type="submit" className="min-h-11" disabled={form.busy || !dirty}>
            {form.busy ? "Menyimpan…" : "Simpan"}
          </Button>
        ) : null}
      </form>

      <section aria-labelledby="bl-status-h" className="space-y-2">
        <h2 id="bl-status-h" className="text-lg font-semibold">
          Status program
        </h2>
        {data.can.approve ? (
          <div className="flex flex-wrap gap-2">
            {available.map((k) => (
              <Button key={k} type="button" variant={k === "tetapkan" ? "default" : "outline"} className="min-h-11" onClick={() => setAction(k)}>
                {ACTIONS[k].label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Penetapan, penyelesaian, dan pembukaan kembali program hanya dapat dilakukan oleh Kepala Desa atau admin.</p>
        )}
      </section>

      {action ? (
        <Dialog open onOpenChange={(o) => (!o && !act.busy ? setAction(null) : undefined)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{ACTIONS[action].title}</DialogTitle>
              <DialogDescription>{ACTIONS[action].body}</DialogDescription>
            </DialogHeader>
            <FormErrorSummary innerRef={act.summaryRef} errors={act.errors} general={act.general} labels={{}} />
            <DialogFooter>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setAction(null)} disabled={act.busy}>
                Batal
              </Button>
              <Button type="button" className="min-h-11" onClick={runAction} disabled={act.busy}>
                {act.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {ACTIONS[action].label}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
