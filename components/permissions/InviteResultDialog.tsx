"use client";

import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export type TempCredential = { email: string; password: string; name: string; reason: "created" | "reset" };

export function TempPasswordDialog({ credential, onClose }: { credential: TempCredential | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!credential) return null;

  const text = `Akun Klandesa\nEmail: ${credential.email}\nKata sandi sementara: ${credential.password}\nMasuk di: ${typeof window !== "undefined" ? window.location.origin : ""}/auth/signin\nSetelah masuk, segera ganti kata sandi di menu Profil.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{credential.reason === "created" ? "Akun berhasil dibuat" : "Kata sandi direset"}</DialogTitle>
          <DialogDescription>
            Untuk {credential.name}. Kata sandi ini <strong>hanya tampil sekali</strong> dan tidak bisa dilihat lagi setelah jendela ini ditutup.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Email masuk</dt>
            <dd className="break-all font-medium">{credential.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Kata sandi sementara</dt>
            <dd className="select-all break-all font-mono text-base font-semibold tracking-wide">{credential.password}</dd>
          </div>
        </dl>

        <p className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Berikan lewat jalur yang aman (langsung atau pesan pribadi). Minta yang bersangkutan mengganti kata sandi di menu Profil setelah masuk pertama kali.
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => void copy()}>
            {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
            {copied ? "Tersalin" : "Salin kredensial"}
          </Button>
          <Button type="button" className="h-11" onClick={onClose}>
            Sudah saya catat
          </Button>
        </DialogFooter>
        <p role="status" className="sr-only">
          {copied ? "Kredensial tersalin ke papan klip" : ""}
        </p>
      </DialogContent>
    </Dialog>
  );
}
