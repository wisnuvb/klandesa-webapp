"use client";

import { useId, useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_HINT, validateNewPassword } from "@/lib/auth/password-policy";
import { apiJson } from "./api";

/** Ganti sandi sendiri. Berhasil = semua sesi berakhir (termasuk ini), jadi diarahkan ke halaman masuk. */
export function ChangePasswordCard({ totpEnabled }: { totpEnabled: boolean }) {
  const ids = { cur: useId(), next: useId(), conf: useId(), code: useId(), help: useId(), err: useId() };
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const problem = validateNewPassword(next);
    if (problem) return setFieldError(problem);
    if (next !== confirm) return setFieldError("Konfirmasi kata sandi tidak sama.");
    setFieldError(null);
    setBusy(true);
    try {
      await apiJson("/api/admin/security/password", { method: "POST", body: { currentPassword: current, newPassword: next, totpCode: code.trim() || undefined } });
      await signOut({ callbackUrl: "/auth/signin?sandi=diganti" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengganti kata sandi.");
      setCurrent("");
      setCode("");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ganti kata sandi</CardTitle>
        <CardDescription>Setelah diganti, semua sesi Anda (di semua perangkat) berakhir dan Anda perlu masuk kembali.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid max-w-md gap-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor={ids.cur}>Kata sandi saat ini</Label>
            <Input id={ids.cur} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.next}>Kata sandi baru</Label>
            <Input
              id={ids.next}
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              aria-describedby={fieldError ? ids.err : ids.help}
              aria-invalid={fieldError ? true : undefined}
            />
            <p id={ids.help} className="text-xs text-muted-foreground">
              {PASSWORD_HINT}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={ids.conf}>Ulangi kata sandi baru</Label>
            <Input id={ids.conf} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {totpEnabled ? (
            <div className="space-y-1.5">
              <Label htmlFor={ids.code}>Kode 2FA atau kode pemulihan</Label>
              <Input id={ids.code} inputMode="numeric" autoComplete="one-time-code" spellCheck={false} maxLength={24} value={code} onChange={(e) => setCode(e.target.value)} className="font-mono tracking-widest" />
            </div>
          ) : null}
          <div aria-live="assertive" className="space-y-1">
            {fieldError ? (
              <p id={ids.err} role="alert" className="text-sm text-destructive">
                {fieldError}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <div>
            <Button type="submit" disabled={busy || !current || !next || !confirm || (totpEnabled && !code.trim())} className="min-h-10">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
              {busy ? "Menyimpan…" : "Ganti kata sandi"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
