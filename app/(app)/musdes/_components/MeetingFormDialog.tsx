"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { KIND_KEYS, KINDS, type MeetingKind } from "@/lib/musdes/catalog";
import type { MeetingView } from "./types";

interface Form {
  kind: string;
  title: string;
  topic: string;
  planYear: string;
  scheduledOn: string;
  startTime: string;
  location: string;
  agenda: string;
}

const LABELS: Record<string, string> = { kind: "Jenis", title: "Judul", topic: "Pokok bahasan", planYear: "Tahun rencana", scheduledOn: "Tanggal", startTime: "Jam", location: "Tempat", agenda: "Acara" };
const PLANNING: MeetingKind[] = ["MUSDES_PERENCANAAN", "MUSRENBANGDES", "MUSDES_PERUBAHAN"];

export function MeetingFormDialog({ meeting, onClose, onSaved }: { meeting: MeetingView | null; onClose: () => void; onSaved: (id: number) => void }) {
  const editing = meeting !== null;
  const [f, setF] = useState<Form>({
    kind: meeting?.kind ?? "",
    title: meeting?.title ?? "",
    topic: meeting?.topic ?? "",
    planYear: meeting?.planYear ? String(meeting.planYear) : "",
    scheduledOn: meeting?.scheduledOn ?? "",
    startTime: meeting?.startTime ?? "",
    location: meeting?.location ?? "",
    agenda: meeting?.agenda ?? "",
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  /** Memilih jenis mengisi judul dan tahun rencana bila masih kosong (RKP Desa tahun depan disusun tahun ini). */
  function pickKind(kind: string) {
    const label = kind in KINDS ? KINDS[kind as MeetingKind].label : "";
    const prev = f.kind in KINDS ? KINDS[f.kind as MeetingKind].label : "";
    set({
      kind,
      title: !f.title || f.title === prev ? label : f.title,
      planYear: !f.planYear && PLANNING.includes(kind as MeetingKind) ? String(new Date().getFullYear() + 1) : f.planYear,
    });
  }

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...f, planYear: f.planYear || null, startTime: f.startTime || null };
    const r = await submit<{ id?: number }>(editing ? `/api/musdes/${meeting!.id}` : "/api/musdes", editing ? "PATCH" : "POST", body);
    if (r) onSaved(editing ? meeting!.id : Number(r.id));
  }

  const err = (k: string) => errors[k];
  const common = (k: keyof Form) => ({ id: `md-${k}`, "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `md-${k}-err` : undefined });
  const errNode = (k: string) => (err(k) ? <p id={`md-${k}-err`} className="text-sm text-destructive">{err(k)}</p> : null);

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah musyawarah" : "Jadwalkan musyawarah"}</DialogTitle>
          <DialogDescription>Tanda * wajib diisi. Peserta dan berita acara diisi setelah musyawarah dijadwalkan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <div className="space-y-1.5">
            <Label htmlFor="md-kind">Jenis musyawarah *</Label>
            <SearchSelect {...common("kind")} className={SELECT_CLASS} value={f.kind} disabled={editing} onChange={(e) => pickKind(e.target.value)}>
              <option value="">Pilih jenis…</option>
              {KIND_KEYS.map((k) => (
                <option key={k} value={k}>
                  {KINDS[k].label}
                </option>
              ))}
            </SearchSelect>
            {f.kind in KINDS ? <p className="text-sm text-muted-foreground">Dasar: {KINDS[f.kind as MeetingKind].basis}. Diselenggarakan oleh {KINDS[f.kind as MeetingKind].organizer}.</p> : null}
            {editing ? <p className="text-sm text-muted-foreground">Jenis tidak dapat diubah setelah dibuat.</p> : null}
            {errNode("kind")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="md-title">Judul *</Label>
            <Input {...common("title")} className="h-11" maxLength={200} value={f.title} onChange={(e) => set({ title: e.target.value })} />
            {errNode("title")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="md-topic">Pokok bahasan</Label>
            <Input {...common("topic")} className="h-11" maxLength={300} value={f.topic} onChange={(e) => set({ topic: e.target.value })} />
            {errNode("topic")}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="md-scheduledOn">Tanggal *</Label>
              <Input {...common("scheduledOn")} className="h-11" type="date" value={f.scheduledOn} onChange={(e) => set({ scheduledOn: e.target.value })} />
              {errNode("scheduledOn")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-startTime">Jam mulai</Label>
              <Input {...common("startTime")} className="h-11" type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} />
              {errNode("startTime")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md-planYear">Tahun rencana</Label>
              <Input {...common("planYear")} className="h-11" type="number" inputMode="numeric" min={2000} max={2100} value={f.planYear} onChange={(e) => set({ planYear: e.target.value })} />
              {errNode("planYear")}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="md-location">Tempat</Label>
            <Input {...common("location")} className="h-11" maxLength={200} value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="Contoh: Balai Desa" />
            {errNode("location")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="md-agenda">Acara</Label>
            <Textarea {...common("agenda")} rows={3} maxLength={4000} value={f.agenda} onChange={(e) => set({ agenda: e.target.value })} />
            {errNode("agenda")}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {editing ? "Simpan" : "Jadwalkan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
