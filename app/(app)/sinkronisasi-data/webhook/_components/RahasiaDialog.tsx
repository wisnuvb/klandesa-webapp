"use client";

import { useRef, useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Menampilkan rahasia penandatangan sekali saja; tidak bisa ditutup sebelum pengguna menyatakan sudah menyimpannya. */
export function RahasiaDialog({ title, secret, onClose }: { title: string; secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      ref.current?.select();
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && saved ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => (!saved ? e.preventDefault() : undefined)} onEscapeKeyDown={(e) => (!saved ? e.preventDefault() : undefined)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Rahasia ini dipakai aplikasi penerima untuk memastikan kiriman benar-benar dari Klandesa.</DialogDescription>
        </DialogHeader>
        <div role="alert" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Rahasia ini hanya ditampilkan sekali.</strong> Simpan di pengaturan rahasia aplikasi penerima. Bila hilang, ganti rahasia dari halaman ini.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wh-rahasia">Rahasia penandatangan</Label>
          <div className="flex gap-2">
            <Input id="wh-rahasia" ref={ref} readOnly className="h-11 font-mono text-sm" value={secret} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => void copy()}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Tersalin" : "Salin"}
            </Button>
          </div>
          <p role="status" aria-live="polite" className="sr-only">
            {copied ? "Rahasia tersalin ke papan klip." : ""}
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          Saya sudah menyimpan rahasia ini
        </label>
        <DialogFooter>
          <Button type="button" className="min-h-11" disabled={!saved} onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
