"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { FilePlus2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBlankStarters, listStarters, type StarterInfo } from "../_utils/starters";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dipanggil dengan id pilihan (`kosong:<jenis>` / `contoh:<kunci>`); pemanggil yang mengarahkan ke editor. */
  onChoose: (startId: string) => void;
};

type Examples = { state: "loading" } | { state: "error" } | { state: "ready"; items: StarterInfo[] };

/** Kartu pilihan = radio native (panah keyboard bekerja, dibaca benar oleh pembaca layar). */
function Choice({ info, name, checked, onSelect }: { info: StarterInfo; name: string; checked: boolean; onSelect: () => void }) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none ${
        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
    >
      <input type="radio" name={name} value={info.id} checked={checked} onChange={onSelect} className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{info.title}</span>
        <span className="block text-sm text-muted-foreground">{info.description}</span>
      </span>
    </label>
  );
}

/** Dialog "Buat jenis surat baru": mulai dari kosong atau dari contoh. */
export function NewTemplateDialog({ open, onOpenChange, onChoose }: Props) {
  const groupName = useId();
  const searchId = useId();
  const [selected, setSelected] = useState<string>("kosong:keterangan");
  const [query, setQuery] = useState("");
  const [examples, setExamples] = useState<Examples>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const blank = useMemo(() => listBlankStarters(), []);

  // Katalog dimuat saat dialog dibuka pertama kali (tidak ikut bundel awal editor).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listStarters()
      .then((r) => {
        if (!cancelled) setExamples({ state: "ready", items: r.examples });
      })
      .catch(() => {
        if (!cancelled) setExamples({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  const filtered = useMemo(() => {
    if (examples.state !== "ready") return [];
    const q = query.trim().toLowerCase();
    if (!q) return examples.items;
    return examples.items.filter((i) => `${i.title} ${i.description} ${i.category}`.toLowerCase().includes(q));
  }, [examples, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5" aria-hidden /> Buat jenis surat baru
          </DialogTitle>
          <DialogDescription>
            Pilih titik awal. Semuanya bisa diubah sepenuhnya di kertas setelah itu.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" role="radiogroup" aria-label="Titik awal jenis surat">
          <section aria-labelledby={`${groupName}-kosong`} className="space-y-2">
            <h3 id={`${groupName}-kosong`} className="text-sm font-semibold">Mulai dari kosong</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {blank.map((b) => (
                <Choice key={b.id} info={b} name={groupName} checked={selected === b.id} onSelect={() => setSelected(b.id)} />
              ))}
            </div>
          </section>

          <section aria-labelledby={`${groupName}-contoh`} className="space-y-2">
            <h3 id={`${groupName}-contoh`} className="text-sm font-semibold">Mulai dari contoh</h3>
            <p className="text-sm text-muted-foreground">Salinan contoh surat bawaan. Cocok bila jenis suratnya mirip.</p>
            <div className="space-y-1">
              <Label htmlFor={searchId} className="text-sm">Cari contoh</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id={searchId}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="mis. domisili, usaha, kematian"
                  className="h-11 pl-9"
                  autoComplete="off"
                />
              </div>
            </div>

            {examples.state === "loading" && (
              <p role="status" className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> Memuat contoh…
              </p>
            )}
            {examples.state === "error" && (
              <div role="alert" className="flex flex-wrap items-center gap-3 py-2 text-sm text-destructive">
                Contoh surat gagal dimuat.
                <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => { setExamples({ state: "loading" }); setAttempt((a) => a + 1); }}>
                  Coba lagi
                </Button>
              </div>
            )}
            {examples.state === "ready" && (
              <>
                <p className="sr-only" role="status" aria-live="polite">{filtered.length} contoh ditemukan</p>
                {filtered.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">Tidak ada contoh yang cocok dengan “{query}”.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filtered.map((i) => (
                      <Choice key={i.id} info={i} name={groupName} checked={selected === i.id} onSelect={() => setSelected(i.id)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="button" className="min-h-11" onClick={() => onChoose(selected)}>Buat jenis surat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
