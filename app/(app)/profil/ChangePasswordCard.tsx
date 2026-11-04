"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) return setError("Konfirmasi kata sandi baru tidak sama.");
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setError(json.error ?? "Gagal mengganti kata sandi.");
      toast.success("Kata sandi berhasil diganti");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>Ganti kata sandi</CardTitle>
            <CardDescription>Gunakan kata sandi yang hanya Anda ketahui. Minimal 8 karakter, memuat huruf dan angka.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">Kata sandi saat ini</Label>
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-11" aria-required="true" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">Kata sandi baru</Label>
            <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="h-11" aria-required="true" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Ulangi kata sandi baru</Label>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" aria-required="true" />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="h-11" disabled={busy || !current || !next || !confirm}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {busy ? "Menyimpan…" : "Ganti kata sandi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
