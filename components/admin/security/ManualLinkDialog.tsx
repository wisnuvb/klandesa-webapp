"use client";

import { useId } from "react";
import { Copy, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copyText, formatWib } from "./api";

/** Tautan manual (email gagal terkirim). Ditampilkan SEKALI; tidak disimpan maupun dicatat. */
export function ManualLinkDialog({ link, expiresAt, onClose }: { link: string | null; expiresAt?: string; onClose: () => void }) {
  const id = useId();
  return (
    <Dialog open={link != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Email tidak terkirim
          </DialogTitle>
          <DialogDescription>
            Sampaikan tautan ini langsung ke penerima lewat saluran yang aman. Tautan hanya tampil sekali, berlaku sampai {formatWib(expiresAt)}, dan bisa dipakai satu kali.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={id}>Tautan atur kata sandi</Label>
          <div className="flex gap-2">
            <Input id={id} readOnly value={link ?? ""} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" aria-label="Salin tautan" onClick={async () => ((await copyText(link ?? "")) ? toast.success("Tautan disalin.") : toast.error("Gagal menyalin."))}>
              <Copy className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
