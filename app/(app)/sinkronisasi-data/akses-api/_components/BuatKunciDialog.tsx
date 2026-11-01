"use client";

import { useRef, useState } from "react";
import { Check, Copy, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";

export interface ScopeInfo {
  id: string;
  label: string;
  detail: string;
  sensitive: boolean;
}

const EXPIRY: { value: string; label: string }[] = [
  { value: "90", label: "90 hari (disarankan)" },
  { value: "30", label: "30 hari" },
  { value: "365", label: "1 tahun" },
  { value: "", label: "Tanpa batas waktu" },
];

type Created = { secret: string };

export function BuatKunciDialog({ scopes, onClose, onCreated }: { scopes: ScopeInfo[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [expiry, setExpiry] = useState("90");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const secretRef = useRef<HTMLInputElement>(null);

  const conflict = scopes.some((s) => s.sensitive && picked.has(s.id)) && [...picked].some((id) => id.endsWith(":propose"));

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!name.trim()) errs.push("Isi nama kunci, misalnya nama aplikasinya.");
    if (picked.size === 0) errs.push("Pilih minimal satu akses.");
    if (conflict) errs.push("Akses data penduduk tidak boleh digabung dengan akses mengusulkan perubahan. Buat dua kunci terpisah.");
    if (errs.length) return setErrors(errs);
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes: [...picked], expiresInDays: expiry ? Number(expiry) : null }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal membuat kunci. Coba lagi.");
      setCreated({ secret: j.secret });
      onCreated();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Gagal membuat kunci. Coba lagi."]);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.secret);
      setCopied(true);
    } catch {
      secretRef.current?.select(); // cadangan: pilih teks agar bisa disalin manual
    }
  }

  // Setelah kunci dibuat, dialog tidak bisa ditutup tanpa menyatakan sudah menyimpan: rahasianya tidak bisa ditampilkan lagi.
  const closable = !created || saved;

  return (
    <Dialog open onOpenChange={(o) => (!o && closable && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" onInteractOutside={(e) => (!closable ? e.preventDefault() : undefined)} onEscapeKeyDown={(e) => (!closable ? e.preventDefault() : undefined)}>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Kunci berhasil dibuat</DialogTitle>
              <DialogDescription>Salin kunci ini sekarang dan simpan di tempat aman.</DialogDescription>
            </DialogHeader>
            <div role="alert" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
              <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>
                <strong>Kunci ini hanya ditampilkan sekali.</strong> Setelah jendela ini ditutup, Klandesa tidak bisa menampilkannya lagi. Bila hilang, cabut dan buat kunci baru.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kunci-rahasia">Kunci API</Label>
              <div className="flex gap-2">
                <Input id="kunci-rahasia" ref={secretRef} readOnly className="h-11 font-mono text-sm" value={created.secret} onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => void copy()}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? "Tersalin" : "Salin"}
                </Button>
              </div>
              <p role="status" aria-live="polite" className="sr-only">
                {copied ? "Kunci tersalin ke papan klip." : ""}
              </p>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              Saya sudah menyimpan kunci ini
            </label>
            <DialogFooter>
              <Button type="button" className="min-h-11" disabled={!saved} onClick={onClose}>
                Selesai
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Buat kunci API</DialogTitle>
              <DialogDescription>Kunci hanya mendapat akses yang Anda pilih. Anda bisa mencabutnya kapan saja.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="kunci-nama">Nama kunci</Label>
                <Input id="kunci-nama" className="h-11" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Aplikasi rekap posyandu" />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Akses yang diberikan</legend>
                <ul className="space-y-2">
                  {scopes.map((s) => (
                    <li key={s.id}>
                      <label className="flex min-h-11 cursor-pointer gap-3 rounded-md border p-3 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                        <span>
                          <span className="block font-medium">{s.label}</span>
                          <span className="block text-sm text-muted-foreground">{s.detail}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <div className="space-y-1.5">
                <Label htmlFor="kunci-masa">Masa berlaku</Label>
                <SearchSelect id="kunci-masa" className="flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
                  {EXPIRY.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SearchSelect>
              </div>
              {conflict ? (
                <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                  Akses data penduduk tidak boleh digabung dengan akses mengusulkan perubahan, demi keamanan. Buat dua kunci terpisah.
                </p>
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
                <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
                  Batal
                </Button>
                <Button type="submit" className="min-h-11" disabled={busy}>
                  {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                  {busy ? "Membuat…" : "Buat kunci"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
