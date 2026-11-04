"use client";

import { useState } from "react";
import { Check, Copy, MailCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type DeliveryView = {
  sent: boolean;
  reason?: "not-configured" | "duplicate" | "quota" | "failed" | "rate-limit";
  error?: string;
  /** Hanya ada bila email tidak terkirim. */
  manualLink?: string;
  expiresAt: string;
};

export type InviteNotice = { email: string; name: string; kind: "invite" | "reset"; delivery: DeliveryView };

const REASON_TEXT: Record<NonNullable<DeliveryView["reason"]>, string> = {
  "not-configured": "Layanan email belum dikonfigurasi di server ini.",
  duplicate: "Email serupa baru saja dikirim ke alamat ini.",
  quota: "Kuota email harian sudah habis.",
  failed: "Pengiriman email gagal.",
  "rate-limit": "Terlalu banyak undangan/tautan dikirim dari desa ini dalam satu jam. Coba lagi nanti.",
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso)) + " WIB";

export function InviteResultDialog({ notice, onClose }: { notice: InviteNotice | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!notice) return null;
  const { delivery, email, name, kind } = notice;
  const what = kind === "invite" ? "Undangan" : "Tautan atur ulang kata sandi";

  async function copy() {
    if (!delivery.manualLink) return;
    try {
      await navigator.clipboard.writeText(delivery.manualLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {delivery.sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                {what} terkirim
              </DialogTitle>
              <DialogDescription>
                Email dikirim ke <strong className="break-all">{email}</strong> untuk {name}. Di dalamnya ada tombol untuk membuat kata sandi sendiri.
              </DialogDescription>
            </DialogHeader>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Tautan berlaku sampai {fmt(delivery.expiresAt)} dan hanya bisa dipakai sekali.</li>
              <li>Minta yang bersangkutan memeriksa folder spam bila belum masuk dalam beberapa menit.</li>
              <li>Admin tidak pernah melihat kata sandinya. Tautan baru bisa dikirim dari “Atur akses”.</li>
            </ul>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                Email belum terkirim
              </DialogTitle>
              <DialogDescription>
                {delivery.reason ? REASON_TEXT[delivery.reason] : "Email tidak terkirim."} Akun {name} sudah dibuat. Sampaikan tautan di bawah langsung kepada yang bersangkutan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="manual-link" className="text-xs text-muted-foreground">
                Tautan membuat kata sandi untuk <span className="break-all">{email}</span>
              </label>
              <input
                id="manual-link"
                readOnly
                value={delivery.manualLink ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 w-full rounded-md border bg-muted/40 px-3 font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Tampil sekali ini saja, berlaku sampai {fmt(delivery.expiresAt)}, sekali pakai. Kirim lewat jalur pribadi yang aman (bukan grup). Siapa pun yang memegang tautan ini bisa membuat kata sandi akun tersebut.
              </p>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {!delivery.sent && (
            <Button type="button" variant="outline" className="h-11" onClick={() => void copy()}>
              {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-2 h-4 w-4" aria-hidden="true" />}
              {copied ? "Tersalin" : "Salin tautan"}
            </Button>
          )}
          <Button type="button" className="h-11" onClick={onClose}>
            {delivery.sent ? "Selesai" : "Sudah saya sampaikan"}
          </Button>
        </DialogFooter>
        <p role="status" className="sr-only">
          {copied ? "Tautan tersalin ke papan klip" : ""}
        </p>
      </DialogContent>
    </Dialog>
  );
}
