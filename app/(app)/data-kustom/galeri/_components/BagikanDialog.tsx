"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApiGet } from "@/hooks/useApiGet";

interface TablesResponse {
  tables: { id: number; name: string; fieldCount: number }[];
}

export function BagikanDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const tables = useApiGet<TablesResponse>("/api/custom-data/tables");
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const toggle = (id: number) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (picked.size === 0) errs.push("Pilih minimal satu tabel.");
    if (picked.size > 5) errs.push("Maksimal 5 tabel.");
    if (!name.trim()) errs.push("Isi nama aplikasi.");
    if (!description.trim()) errs.push("Isi penjelasan singkat.");
    if (errs.length) return setErrors(errs);
    setBusy(true);
    setErrors([]);
    try {
      const r = await fetch("/api/custom-data/gallery/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tableIds: [...picked], name, description }) });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(Array.isArray(j?.errors) ? j.errors.join(" ") : typeof j?.error === "string" ? j.error : "Gagal mengajukan. Coba lagi.");
      toast.success("Diajukan. Tim Klandesa akan meninjaunya sebelum tampil di galeri.");
      onDone();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Gagal mengajukan. Coba lagi."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bagikan sebagai aplikasi</DialogTitle>
          <DialogDescription>
            Yang dibagikan hanya <strong>susunan tabel</strong> (kolom dan kelas datanya), bukan isi data. Tim Klandesa meninjau dulu sebelum desa lain bisa memasangnya.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tabel yang disertakan</legend>
            {tables.loading ? <p className="text-sm text-muted-foreground">Memuat tabel…</p> : null}
            {tables.data?.tables.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada tabel. Buat tabel di Data Kustom dulu.</p> : null}
            <ul className="space-y-2">
              {tables.data?.tables.map((t) => (
                <li key={t.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="checkbox" className="size-5 shrink-0" checked={picked.has(t.id)} onChange={() => toggle(t.id)} />
                    <span>
                      {t.name} <span className="text-sm text-muted-foreground">({t.fieldCount} kolom)</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="bg-nama">Nama aplikasi</Label>
            <Input id="bg-nama" className="h-11" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Catatan Posyandu" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bg-desc">Penjelasan singkat</Label>
            <Textarea id="bg-desc" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="Untuk apa aplikasi ini dan siapa yang memakainya." />
          </div>
          <p className="text-sm text-muted-foreground">Pastikan kolom berisi data pribadi sudah ditandai sebagai data pribadi. Peninjau akan memeriksanya.</p>
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
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Ajukan untuk ditinjau
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
