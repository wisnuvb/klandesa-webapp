"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Tombol hapus dengan konfirmasi; galat dari server (mis. 409) ditampilkan di dalam dialog. */
export function ConfirmDelete({ label, title, description, url, onDone, text = "Hapus", buttonText }: { label: string; title: string; description: string; url: string; onDone: () => void; text?: string; buttonText?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    const res = await fetch(url, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setOpen(false);
      return onDone();
    }
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menghapus. Coba lagi.");
  }

  return (
    <>
      {buttonText ? (
        <Button type="button" variant="outline" className="min-h-11" aria-label={label} onClick={() => { setErr(null); setOpen(true); }}>
          {buttonText}
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={label} onClick={() => { setErr(null); setOpen(true); }}>
          <Trash2 aria-hidden="true" />
        </Button>
      )}
      <AlertDialog open={open} onOpenChange={(o) => (!busy ? setOpen(o) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {err ? (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {err}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy}>
              Batal
            </AlertDialogCancel>
            <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={go}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {text}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
