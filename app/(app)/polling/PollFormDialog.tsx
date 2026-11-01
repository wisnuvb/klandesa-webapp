"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { PollView } from "@/lib/polls/service";

const LABELS: Record<string, string> = { title: "Pertanyaan", description: "Penjelasan", options: "Pilihan", minAge: "Umur minimum", showLive: "Tampil hasil", opensAt: "Mulai", closesAt: "Ditutup" };

/** ISO UTC → nilai input datetime-local di zona waktu perangkat. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toIso = (local: string): string => (local ? new Date(local).toISOString() : "");

export function PollFormDialog({ poll, onClose, onSaved }: { poll: PollView | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: poll?.title ?? "",
    description: poll?.description ?? "",
    options: poll?.options ?? ["", ""],
    minAge: String(poll?.minAge ?? 17),
    showLive: poll?.showLive ?? false,
    opensAt: toLocalInput(poll?.opensAt ?? null),
    closesAt: toLocalInput(poll?.closesAt ?? null),
  });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const setOption = (i: number, v: string) => set({ options: f.options.map((o, k) => (k === i ? v : o)) });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { title: f.title, description: f.description, options: f.options, minAge: f.minAge === "" ? undefined : Number(f.minAge), showLive: f.showLive, opensAt: toIso(f.opensAt) || null, closesAt: toIso(f.closesAt) };
    if (await submit(poll ? `/api/polls/${poll.id}` : "/api/polls", poll ? "PATCH" : "POST", body)) onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{poll ? "Ubah draf polling" : "Buat polling"}</DialogTitle>
          <DialogDescription>Polling dibuat sebagai draf lebih dulu. Setelah diterbitkan, pertanyaan dan pilihannya dikunci.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="pl-title">Pertanyaan *</Label>
            <Input {...fieldA11y("pl-title", errors.title)} className="h-11" value={f.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} placeholder="Contoh: Setujukah jalan dusun dibangun tahun depan?" />
            <FieldError id="pl-title" message={errors.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-description">Penjelasan</Label>
            <Textarea {...fieldA11y("pl-description", errors.description)} rows={3} value={f.description} maxLength={1000} onChange={(e) => set({ description: e.target.value })} />
            <FieldError id="pl-description" message={errors.description} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Pilihan jawaban * (2 sampai 10)</legend>
            {f.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <label htmlFor={`pl-opt-${i}`} className="sr-only">Pilihan {i + 1}</label>
                <Input id={`pl-opt-${i}`} className="h-11" value={o} maxLength={100} onChange={(e) => setOption(i, e.target.value)} placeholder={`Pilihan ${i + 1}`} />
                {f.options.length > 2 ? (
                  <Button type="button" variant="outline" className="min-h-11 min-w-11" aria-label={`Hapus pilihan ${i + 1}`} onClick={() => set({ options: f.options.filter((_, k) => k !== i) })}>
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            ))}
            {f.options.length < 10 ? (
              <Button type="button" variant="outline" className="min-h-11" onClick={() => set({ options: [...f.options, ""] })}>
                <Plus aria-hidden="true" />
                Tambah pilihan
              </Button>
            ) : null}
            <FieldError id="pl-options" message={errors.options} />
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pl-opensAt">Mulai (kosong = saat diterbitkan)</Label>
              <Input {...fieldA11y("pl-opensAt", errors.opensAt)} className="h-11" type="datetime-local" value={f.opensAt} onChange={(e) => set({ opensAt: e.target.value })} />
              <FieldError id="pl-opensAt" message={errors.opensAt} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-closesAt">Ditutup *</Label>
              <Input {...fieldA11y("pl-closesAt", errors.closesAt)} className="h-11" type="datetime-local" value={f.closesAt} onChange={(e) => set({ closesAt: e.target.value })} />
              <FieldError id="pl-closesAt" message={errors.closesAt} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-minAge">Umur minimum pemilih</Label>
              <Input {...fieldA11y("pl-minAge", errors.minAge)} className="h-11" type="number" inputMode="numeric" min={0} max={100} value={f.minAge} onChange={(e) => set({ minAge: e.target.value })} />
              <FieldError id="pl-minAge" message={errors.minAge} />
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer gap-3 rounded-md border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={f.showLive} onChange={(e) => set({ showLive: e.target.checked })} />
            <span>
              <span className="block font-medium">Tampilkan hasil ke warga selama berlangsung</span>
              <span className="block text-sm text-muted-foreground">Bila tidak dicentang, warga baru melihat hasil setelah polling ditutup. Mengetahui hasil sementara dapat memengaruhi pilihan warga lain.</span>
            </span>
          </label>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Menyimpan…" : "Simpan draf"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
