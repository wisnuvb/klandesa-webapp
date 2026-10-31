"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EndpointView, EventInfo } from "./types";

interface Props {
  events: EventInfo[];
  /** Diisi saat mengubah; kosong saat menambah. */
  endpoint: EndpointView | null;
  onClose: () => void;
  /** `secret` hanya ada saat tujuan baru dibuat. */
  onSaved: (secret: string | null) => void;
}

export function WebhookFormDialog({ events, endpoint, onClose, onSaved }: Props) {
  const [name, setName] = useState(endpoint?.name ?? "");
  const [url, setUrl] = useState(endpoint?.url ?? "");
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set(endpoint?.events ?? []));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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
    if (!name.trim()) errs.push("Isi nama tujuan, misalnya nama aplikasinya.");
    if (!url.trim()) errs.push("Isi alamat tujuan.");
    else if (!/^https:\/\//i.test(url.trim())) errs.push("Alamat harus diawali https://");
    if (picked.size === 0) errs.push("Pilih minimal satu kejadian.");
    if (errs.length) return setErrors(errs);
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch(endpoint ? `/api/developer/webhooks/${endpoint.id}` : "/api/developer/webhooks", {
        method: endpoint ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url: url.trim(), events: [...picked] }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal menyimpan. Coba lagi.");
      onSaved(typeof j?.secret === "string" ? j.secret : null);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{endpoint ? "Ubah tujuan webhook" : "Tambah tujuan webhook"}</DialogTitle>
          <DialogDescription>Klandesa akan mengirim kabar singkat ke alamat ini setiap kali kejadian yang Anda pilih terjadi. Kabar tidak memuat data pribadi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="wh-nama">Nama tujuan</Label>
            <Input id="wh-nama" className="h-11" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Rekap posyandu di Google Sheets" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-url">Alamat tujuan</Label>
            <Input id="wh-url" type="url" inputMode="url" className="h-11" value={url} maxLength={500} onChange={(e) => setUrl(e.target.value)} placeholder="https://contoh.id/webhook" aria-describedby="wh-url-help" />
            <p id="wh-url-help" className="text-sm text-muted-foreground">
              Harus https dan bisa dijangkau dari internet. Alamat ke jaringan lokal ditolak.
            </p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Kabarkan saat…</legend>
            <ul className="space-y-2">
              {events.map((ev) => (
                <li key={ev.id}>
                  <label className="flex min-h-11 cursor-pointer gap-3 rounded-md border p-3 hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={picked.has(ev.id)} onChange={() => toggle(ev.id)} />
                    <span>
                      <span className="block font-medium">{ev.label}</span>
                      <span className="block text-sm text-muted-foreground">{ev.detail}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
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
              {busy ? "Menyimpan…" : endpoint ? "Simpan" : "Tambah tujuan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
