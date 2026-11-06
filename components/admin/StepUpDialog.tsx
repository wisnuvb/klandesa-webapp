"use client";

import { useEffect, useId, useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStepUpTotpNeed } from "@/components/admin/step-up-status";

/** `totpCode` hanya ada bila akun admin memakai 2FA; pemanggil WAJIB menyertakannya ke body (mis. `{ ...v }` atau field `totpCode`). */
export type StepUpSubmit = { confirmPassword: string; reason: string; totpCode?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Judul aksi, mis. "Nonaktifkan akun budi@desa.id". */
  title: string;
  /** Penjelasan dampak aksi (apa yang terjadi, bisa dibatalkan atau tidak). */
  description: React.ReactNode;
  confirmLabel: string;
  /** Aksi merusak/sulit dibatalkan → tombol merah. */
  destructive?: boolean;
  /** Minta alasan (masuk jejak audit). Bawaan true. */
  requireReason?: boolean;
  /**
   * Jalankan aksi. Lempar Error(pesan) bila gagal: pesan ditampilkan di dalam dialog dan dialog tetap terbuka
   * (mis. sandi konfirmasi salah). Dialog menutup sendiri bila berhasil.
   */
  onConfirm: (v: StepUpSubmit) => Promise<void>;
};

/**
 * Dialog standar SEMUA tindakan super admin yang berisiko: menampilkan dampak, meminta alasan (masuk jejak audit), dan
 * konfirmasi ulang kata sandi admin, ditambah kode 2FA (TOTP/pemulihan) bila akun admin memakai 2FA. Pasangan server: `requireStepUp`
 * di lib/platform/step-up.ts, yang menerima field `confirmPassword`, `totpCode`, dan `reason` di body JSON.
 */
export function StepUpDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  requireReason = true,
  onConfirm,
}: Props) {
  const pwId = useId();
  const reasonId = useId();
  const errId = useId();
  const codeId = useId();
  const codeHelpId = useId();
  const [code, setCode] = useState("");
  const { need, refresh } = useStepUpTotpNeed(open);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setCode("");
      setReason("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const reasonOk = !requireReason || reason.trim().length >= 5;
  // Kolom kode tampil bila 2FA aktif; bila status tak bisa dibaca, tampil sebagai opsional (server yang memutuskan).
  const showCode = need === "yes" || need === "unknown";
  const codeOk = need !== "yes" || code.trim().length > 0;
  const canSubmit = password.length > 0 && reasonOk && codeOk && need !== "loading" && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm({ confirmPassword: password, reason: reason.trim(), ...(showCode && code.trim() ? { totpCode: code.trim() } : {}) });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi gagal. Coba lagi.");
      setPassword("");
      setCode("");
      refresh(); // status 2FA bisa berubah sejak dibaca terakhir (mis. diaktifkan di tab lain)
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (busy ? undefined : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert aria-hidden="true" className={destructive ? "h-5 w-5 text-destructive" : "h-5 w-5 text-amber-600"} />
              {title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">{description}</div>
            </DialogDescription>
          </DialogHeader>

          {requireReason ? (
            <div className="space-y-1.5">
              <Label htmlFor={reasonId}>Alasan (dicatat di jejak audit)</Label>
              <Textarea
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Mis. permintaan admin desa via WhatsApp, tiket #123"
              />
              <p className="text-xs text-muted-foreground">Minimal 5 karakter.</p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={pwId}>Kata sandi Anda</Label>
            <Input
              id={pwId}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errId : undefined}
            />
          </div>

          {showCode ? (
            <div className="space-y-1.5">
              <Label htmlFor={codeId}>{need === "yes" ? "Kode 2FA" : "Kode 2FA (bila akun Anda memakai 2FA)"}</Label>
              <Input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                autoCapitalize="characters"
                maxLength={24}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-describedby={codeHelpId}
                className="font-mono tracking-widest"
              />
              <p id={codeHelpId} className="text-xs text-muted-foreground">
                6 digit dari aplikasi autentikator, atau salah satu kode pemulihan. Boleh ditempel.
              </p>
            </div>
          ) : null}

          <div aria-live="assertive">
            {error ? (
              <p id={errId} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={!canSubmit}>
              {busy ? "Memproses…" : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
