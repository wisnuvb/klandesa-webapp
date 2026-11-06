"use client";

import { useId, useState } from "react";
import { Copy, Loader2, ShieldAlert, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invalidateStepUpStatus } from "@/components/admin/step-up-status";
import { ApiError, apiJson, copyText, formatWib } from "./api";
import { CodeStepUpDialog } from "./CodeStepUpDialog";
import { QrCode } from "./QrCode";
import { RecoveryCodes } from "./RecoveryCodes";

export type SecurityStatus = {
  email: string;
  name: string;
  lastLogin: string | null;
  totpEnabled: boolean;
  totpEnabledAt: string | null;
  setupPending: boolean;
  recoveryCodesLeft: number;
};

type Setup = { secret: string; manualKey: string; uri: string };

export function TwoFactorCard({ status, onChanged }: { status: SecurityStatus; onChanged: () => Promise<void> | void }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [starting, setStarting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [dialog, setDialog] = useState<null | "disable" | "regenerate">(null);
  // Status 2FA menentukan apakah dialog konfirmasi meminta kode: buang cache setiap kali status bisa berubah.
  const load = () => {
    invalidateStepUpStatus();
    return onChanged();
  };

  async function start() {
    setStarting(true);
    try {
      setSetup(await apiJson<Setup>("/api/admin/security/2fa/setup", { method: "POST", body: {} }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai pendaftaran 2FA.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Verifikasi dua langkah (2FA)</CardTitle>
          {status.totpEnabled ? (
            <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Aktif
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <ShieldOff className="size-3" aria-hidden="true" />
              Belum aktif
            </Badge>
          )}
        </div>
        <CardDescription>
          Akun ini bisa mengintervensi akun siapa pun. Dengan 2FA, sandi yang bocor saja tidak cukup untuk masuk: dibutuhkan kode 6 digit dari
          aplikasi autentikator di ponsel Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.totpEnabled && !recoveryCodes ? (
          <div role="status" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              <strong>Aktifkan 2FA untuk akun Anda.</strong> Tanpa 2FA, sandi yang bocor atau sesi yang dicuri cukup untuk mengintervensi akun dan data semua desa.
              Bila 2FA aktif, setiap aksi berisiko juga meminta kode dari aplikasi autentikator.
            </p>
          </div>
        ) : null}
        {recoveryCodes ? (
          <RecoveryCodes
            codes={recoveryCodes}
            onDone={() => {
              setRecoveryCodes(null);
              void load();
            }}
          />
        ) : status.totpEnabled ? (
          <div className="space-y-3">
            <dl className="grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Aktif sejak</dt>
                <dd>{formatWib(status.totpEnabledAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kode pemulihan tersisa</dt>
                <dd className={status.recoveryCodesLeft <= 2 ? "font-medium text-destructive" : ""}>
                  <span className="tabular-nums">{status.recoveryCodesLeft}</span> dari 10{status.recoveryCodesLeft <= 2 ? " (segera buat ulang)" : ""}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="min-h-10" onClick={() => setDialog("regenerate")}>
                Buat ulang kode pemulihan
              </Button>
              <Button variant="destructive" className="min-h-10" onClick={() => setDialog("disable")}>
                Nonaktifkan 2FA
              </Button>
            </div>
          </div>
        ) : setup ? (
          <EnrollForm
            setup={setup}
            onCancel={() => setSetup(null)}
            onEnabled={(codes) => {
              invalidateStepUpStatus();
              setSetup(null);
              setRecoveryCodes(codes);
            }}
          />
        ) : (
          <div className="space-y-2">
            {status.setupPending ? <p className="text-sm text-muted-foreground">Pendaftaran sebelumnya belum diselesaikan. Mulai lagi untuk membuat kunci baru.</p> : null}
            <Button onClick={() => void start()} disabled={starting} className="min-h-10">
              {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
              Aktifkan 2FA
            </Button>
          </div>
        )}
      </CardContent>

      <CodeStepUpDialog
        open={dialog === "disable"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Nonaktifkan 2FA"
        destructive
        needCode
        confirmLabel="Nonaktifkan 2FA"
        description="Login akun ini akan kembali hanya memakai sandi. Kode pemulihan yang tersisa akan dihapus."
        onConfirm={async ({ password, code }) => {
          await apiJson("/api/admin/security/2fa/disable", { method: "POST", body: { confirmPassword: password, code } });
          toast.success("2FA dinonaktifkan.");
          await load();
        }}
      />
      <CodeStepUpDialog
        open={dialog === "regenerate"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Buat ulang kode pemulihan"
        needCode
        confirmLabel="Buat ulang"
        description="Kode pemulihan lama langsung hangus dan 10 kode baru ditampilkan satu kali."
        onConfirm={async ({ password, code }) => {
          const r = await apiJson<{ recoveryCodes: string[] }>("/api/admin/security/2fa/recovery-codes", { method: "POST", body: { confirmPassword: password, code } });
          setRecoveryCodes(r.recoveryCodes);
        }}
      />
    </Card>
  );
}

function EnrollForm({ setup, onCancel, onEnabled }: { setup: Setup; onCancel: () => void; onEnabled: (codes: string[]) => void }) {
  const codeId = useId();
  const pwId = useId();
  const keyId = useId();
  const errId = useId();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiJson<{ recoveryCodes: string[] }>("/api/admin/security/2fa/enable", { method: "POST", body: { code: code.trim(), confirmPassword: password } });
      onEnabled(r.recoveryCodes);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Gagal mengaktifkan 2FA.");
      setPassword("");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <ol className="space-y-5 text-sm">
        <li className="space-y-2">
          <p className="font-medium">1. Pindai kode QR dengan aplikasi autentikator</p>
          <p className="text-muted-foreground">Misalnya Google Authenticator, Authy, atau 1Password. Kode QR dibuat di perangkat ini dan tidak dikirim ke pihak lain.</p>
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <QrCode value={setup.uri} />
            <div className="space-y-1.5">
              <Label htmlFor={keyId}>Tidak bisa memindai? Masukkan kunci ini secara manual</Label>
              <div className="flex w-full max-w-md gap-2">
                <textarea id={keyId} readOnly rows={2} value={setup.manualKey} spellCheck={false} className="min-w-0 flex-1 resize-none rounded-md border border-input bg-input-background px-3 py-2 font-mono text-sm leading-snug text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" onFocus={(e) => e.currentTarget.select()} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0"
                  aria-label="Salin kunci manual"
                  onClick={async () => ((await copyText(setup.secret)) ? toast.success("Kunci disalin.") : toast.error("Gagal menyalin."))}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Jenis: berbasis waktu (TOTP), 6 digit, 30 detik.</p>
            </div>
          </div>
        </li>
        <li className="space-y-2">
          <p className="font-medium">2. Konfirmasi dengan kode pertama dan sandi Anda</p>
          <div className="grid max-w-md gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={codeId}>Kode 6 digit dari aplikasi</Label>
              <Input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-lg tracking-widest"
                placeholder="123456"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={pwId}>Kata sandi Anda</Label>
              <Input id={pwId} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
        </li>
      </ol>
      <div aria-live="assertive">
        {error ? (
          <p id={errId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || code.replace(/\s/g, "").length < 6 || !password} className="min-h-10">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {busy ? "Memeriksa…" : "Aktifkan 2FA"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="min-h-10">
          Batal
        </Button>
      </div>
    </form>
  );
}
