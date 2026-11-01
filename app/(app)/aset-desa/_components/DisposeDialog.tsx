"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DISPOSAL_REASON_LABEL, DISPOSAL_REASONS } from "@/lib/aset-desa/catalog";
import { SELECT_CLASS, type ItemView } from "./types";
import { SearchSelect } from "@/components/ui/search-select";

const LABELS: Record<string, string> = { reason: "Alasan", disposedAt: "Tanggal keputusan", decree: "Nomor keputusan", note: "Keterangan", regencyApproved: "Persetujuan Bupati/Wali Kota" };

export function DisposeDialog({ item, onClose, onDone }: { item: ItemView; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [disposedAt, setDisposedAt] = useState("");
  const [decree, setDecree] = useState("");
  const [note, setNote] = useState("");
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral(null);
    try {
      const res = await fetch(`/api/aset-desa/${item.id}/penghapusan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, disposedAt, decree, note, regencyApproved: approved }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        const fe = (j?.fieldErrors ?? {}) as Record<string, string>;
        setErrors(fe);
        setGeneral(Object.keys(fe).length ? null : typeof j?.error === "string" ? j.error : "Gagal menghapus dari buku inventaris. Coba lagi.");
        queueMicrotask(() => summaryRef.current?.focus());
        return;
      }
      onDone();
    } catch {
      setGeneral("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
      queueMicrotask(() => summaryRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  const common = (k: string) => ({ id: `hapus-${k}`, "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `hapus-${k}-err` : undefined });
  const errNode = (k: string) =>
    errors[k] ? (
      <p id={`hapus-${k}-err`} className="text-sm text-destructive">
        {errors[k]}
      </p>
    ) : null;
  const errorKeys = Object.keys(errors);

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Hapus dari buku inventaris</DialogTitle>
          <DialogDescription>
            {item.name} ({item.quantity} unit). Barang tidak dihapus dari sistem: tetap tersimpan sebagai riwayat dan tidak dapat diubah lagi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <p className="text-sm text-muted-foreground">Penghapusan didahului berita acara dan ditetapkan dengan Keputusan Kepala Desa (Pasal 23). Isikan nomor keputusannya di bawah.</p>
          <div className="space-y-1.5">
            <Label htmlFor="hapus-reason">Alasan *</Label>
            <SearchSelect {...common("reason")} className={SELECT_CLASS} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Pilih alasan…</option>
              {DISPOSAL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {DISPOSAL_REASON_LABEL[r]}
                </option>
              ))}
            </SearchSelect>
            {errNode("reason")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hapus-decree">Nomor Keputusan Kepala Desa *</Label>
              <Input {...common("decree")} className="h-11" value={decree} maxLength={100} onChange={(e) => setDecree(e.target.value)} />
              {errNode("decree")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hapus-disposedAt">Tanggal keputusan *</Label>
              <Input {...common("disposedAt")} className="h-11" type="date" value={disposedAt} onChange={(e) => setDisposedAt(e.target.value)} />
              {errNode("disposedAt")}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hapus-note">Keterangan</Label>
            <Textarea {...common("note")} rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
            {errNode("note")}
          </div>

          {item.strategic ? (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
              <p className="flex items-start gap-2">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>Ini aset strategis. Penghapusannya dibahas dalam musyawarah desa dan memerlukan persetujuan Bupati/Wali Kota (Pasal 22).</span>
              </p>
              <label className="flex min-h-11 cursor-pointer items-start gap-3">
                <input {...common("regencyApproved")} type="checkbox" className="mt-0.5 size-5 shrink-0" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
                <span>Persetujuan Bupati/Wali Kota sudah diterima.</span>
              </label>
              {errNode("regencyApproved")}
            </div>
          ) : null}

          {errorKeys.length || general ? (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
              <p className="font-medium">Belum bisa dilanjutkan:</p>
              <ul className="list-disc pl-5">
                {errorKeys.map((k) => (
                  <li key={k}>
                    {LABELS[k] ?? k}: {errors[k]}
                  </li>
                ))}
                {general ? <li>{general}</li> : null}
              </ul>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="destructive" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Memproses…" : "Hapus dari buku"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
