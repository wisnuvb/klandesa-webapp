"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Tombol dengan dialog konfirmasi untuk tindakan yang sulit dibalik (kunci, cabut persetujuan, batal penanda). Galat tampil di layar induk. */
export function ConfirmAction({ label, title, description, confirmText, disabled, busy, describedBy, onConfirm }: { label: string; title: string; description: string; confirmText?: string; disabled?: boolean; busy?: boolean; describedBy?: string; onConfirm: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  async function go() {
    setWorking(true);
    try {
      await onConfirm();
    } finally {
      setWorking(false);
      setOpen(false);
    }
  }
  return (
    <>
      <Button type="button" variant="outline" className="min-h-11" disabled={disabled || busy} aria-describedby={describedBy} onClick={() => setOpen(true)}>
        {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
        {label}
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => (!working ? setOpen(o) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={working}>
              Batal
            </AlertDialogCancel>
            <Button type="button" className="min-h-11" disabled={working} onClick={go}>
              {working ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {confirmText ?? label}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
