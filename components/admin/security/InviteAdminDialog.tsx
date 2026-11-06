"use client";

import { useEffect, useId, useState } from "react";
import { UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStepUpTotpNeed } from "@/components/admin/step-up-status";
import { apiJson } from "./api";

export type InviteResult = { admin: { id: number; email: string; name: string }; delivery: { sent: boolean; manualLink?: string; reason?: string; expiresAt: string } };

export function InviteAdminDialog({ open, onOpenChange, onInvited }: { open: boolean; onOpenChange: (o: boolean) => void; onInvited: (r: InviteResult) => void }) {
  const ids = { email: useId(), name: useId(), reason: useId(), pw: useId(), code: useId() };
  const [code, setCode] = useState("");
  const { need } = useStepUpTotpNeed(open);
  const showCode = need === "yes" || need === "unknown";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setName("");
      setReason("");
      setPassword("");
      setCode("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const canSubmit = email.trim() && name.trim().length >= 2 && reason.trim().length >= 5 && password && (need !== "yes" || code.trim()) && need !== "loading" && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiJson<InviteResult>("/api/admin/platform-users", { method: "POST", body: { email: email.trim(), name: name.trim(), reason: reason.trim(), confirmPassword: password, ...(showCode && code.trim() ? { totpCode: code.trim() } : {}) } });
      onOpenChange(false);
      onInvited(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengundang admin.");
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
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              Undang admin platform
            </DialogTitle>
            <DialogDescription>
              Admin baru mendapat akses penuh lintas desa. Akun dibuat tanpa kata sandi: ia membuat sendiri lewat tautan email (berlaku 72 jam, sekali pakai).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={ids.name}>Nama lengkap</Label>
            <Input id={ids.name} autoComplete="off" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.email}>Email</Label>
            <Input id={ids.email} type="email" autoComplete="off" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.reason}>Alasan (dicatat di jejak audit)</Label>
            <Textarea id={ids.reason} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. staf operasional baru" />
            <p className="text-xs text-muted-foreground">Minimal 5 karakter.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.pw}>Kata sandi Anda</Label>
            <Input id={ids.pw} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {showCode ? (
            <div className="space-y-1.5">
              <Label htmlFor={ids.code}>{need === "yes" ? "Kode 2FA" : "Kode 2FA (bila akun Anda memakai 2FA)"}</Label>
              <Input id={ids.code} inputMode="numeric" autoComplete="one-time-code" spellCheck={false} autoCapitalize="characters" maxLength={24} value={code} onChange={(e) => setCode(e.target.value)} className="font-mono tracking-widest" />
              <p className="text-xs text-muted-foreground">6 digit dari aplikasi autentikator, atau salah satu kode pemulihan.</p>
            </div>
          ) : null}
          <div aria-live="assertive">
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {busy ? "Mengundang…" : "Kirim undangan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
