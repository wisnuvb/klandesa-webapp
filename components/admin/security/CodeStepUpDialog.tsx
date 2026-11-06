"use client";

import { useEffect, useId, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Minta kode 2FA (TOTP atau kode pemulihan) selain sandi. */
  needCode?: boolean;
  passwordLabel?: string;
  /** Lempar Error(pesan) untuk menampilkan galat di dalam dialog. */
  onConfirm: (v: { password: string; code: string }) => Promise<void>;
};

/** Dialog konfirmasi aksi keamanan DIRI SENDIRI: sandi (step-up) + kode 2FA bila akun memakainya. Tanpa alasan (bukan tindakan atas akun lain). */
export function CodeStepUpDialog({ open, onOpenChange, title, description, confirmLabel, destructive, needCode, passwordLabel = "Kata sandi Anda", onConfirm }: Props) {
  const pwId = useId();
  const codeId = useId();
  const codeHelpId = useId();
  const errId = useId();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setCode("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const canSubmit = password.length > 0 && (!needCode || code.trim().length > 0) && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm({ password, code: code.trim() });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi gagal. Coba lagi.");
      setPassword("");
      setCode("");
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

          <div className="space-y-1.5">
            <Label htmlFor={pwId}>{passwordLabel}</Label>
            <Input id={pwId} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {needCode ? (
            <div className="space-y-1.5">
              <Label htmlFor={codeId}>Kode 2FA atau kode pemulihan</Label>
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
                6 digit dari aplikasi autentikator, atau salah satu kode pemulihan.
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
