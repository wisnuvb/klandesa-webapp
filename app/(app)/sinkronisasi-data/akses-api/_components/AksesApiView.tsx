"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Ban, CheckCircle2, Clock, KeyRound, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { BuatKunciDialog, type ScopeInfo } from "./BuatKunciDialog";

interface KeyView {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  status: "active" | "expired" | "revoked";
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}
interface KeysResponse {
  maxActive: number;
  scopes: ScopeInfo[];
  keys: KeyView[];
}
interface LogResponse {
  retentionDays: number;
  items: { id: string; at: string; keyName: string | null; keyPrefix: string | null; method: string; path: string; status: number }[];
}

const STATUS = {
  active: { label: "Aktif", Icon: CheckCircle2, cls: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50" },
  expired: { label: "Kedaluwarsa", Icon: Clock, cls: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50" },
  revoked: { label: "Dicabut", Icon: Ban, cls: "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50" },
} as const;

const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
const when = (iso: string | null, day = false) => (iso ? (day ? fmtDay : fmt).format(new Date(iso)) : null);

const noopSubscribe = () => () => {};
const useOrigin = () => useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "https://my.klandesa.com");

const statusText = (s: number) => (s >= 200 && s < 300 ? "Berhasil" : s === 401 ? "Ditolak: kunci tidak sah" : s === 403 ? "Ditolak: tidak punya akses" : s === 429 ? "Ditolak: terlalu sering" : `Gagal (${s})`);

export function AksesApiView() {
  const origin = useOrigin();
  const keys = useApiGet<KeysResponse>("/api/developer/keys");
  const log = useApiGet<LogResponse>("/api/developer/access-log?limit=50");
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<KeyView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeLabel = (id: string) => keys.data?.scopes.find((s) => s.id === id)?.label ?? id;
  const activeCount = keys.data?.keys.filter((k) => k.status === "active").length ?? 0;
  const full = keys.data ? activeCount >= keys.data.maxActive : false;

  async function revoke() {
    if (!revoking) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/developer/keys/${revoking.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal mencabut kunci. Coba lagi.");
      toast.success(`Kunci "${revoking.name}" dicabut. Aplikasi yang memakainya tidak bisa mengakses data lagi.`);
      setRevoking(null);
      keys.reload();
      log.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencabut kunci. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/sinkronisasi-data" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Sinkronisasi Data
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <KeyRound aria-hidden="true" className="size-6" />
              Akses API untuk aplikasi buatan sendiri
            </h1>
            <p className="max-w-prose text-muted-foreground">
              Kunci API memungkinkan aplikasi atau alat yang Anda buat (misalnya dengan bantuan AI) membaca data desa dengan aman. Kunci hanya bisa membaca, data pribadi
              disamarkan, dan setiap pemakaian tercatat di halaman ini.
            </p>
          </div>
          <Button type="button" size="lg" className="min-h-11" disabled={!keys.data || full} onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Buat kunci
          </Button>
        </div>
        {full ? <p className="text-sm text-muted-foreground">Sudah ada {keys.data!.maxActive} kunci aktif. Cabut yang tidak dipakai untuk membuat yang baru.</p> : null}
      </header>

      <p className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Simpan kunci di sisi server atau pengaturan rahasia aplikasi Anda. <strong>Jangan menaruhnya di halaman web yang dibuka publik</strong>, karena siapa pun yang punya
          kunci bisa membaca data yang diizinkan.
        </span>
      </p>

      <section aria-labelledby="kunci-title" className="space-y-3">
        <h2 id="kunci-title" className="text-lg font-semibold">
          Kunci Anda
        </h2>
        {keys.loading ? (
          <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            Memuat kunci…
          </p>
        ) : null}
        {keys.error ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <p>{keys.error}</p>
            <Button type="button" variant="outline" className="min-h-11" onClick={keys.reload}>
              Coba lagi
            </Button>
          </div>
        ) : null}
        {keys.data && keys.data.keys.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada kunci. Tekan &quot;Buat kunci&quot; untuk memulai.</p> : null}
        {keys.data ? (
          <ul className="space-y-3">
            {keys.data.keys.map((k) => {
              const st = STATUS[k.status];
              return (
                <li key={k.id} className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{k.name}</h3>
                      <p className="font-mono text-sm text-muted-foreground">{k.prefix}…</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${st.cls}`}>
                      <st.Icon aria-hidden="true" className="size-4" />
                      {st.label}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Boleh membaca: </span>
                    {k.scopes.length ? k.scopes.map(scopeLabel).join(", ") : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dibuat {when(k.createdAt, true)} · {k.lastUsedAt ? `terakhir dipakai ${when(k.lastUsedAt)}` : "belum pernah dipakai"} ·{" "}
                    {k.expiresAt ? `berlaku sampai ${when(k.expiresAt, true)}` : "tanpa batas waktu"}
                  </p>
                  {k.status === "active" ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(null); setRevoking(k); }}>
                      Cabut kunci
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="cara-title" className="space-y-2 rounded-lg border bg-card p-4">
        <h2 id="cara-title" className="text-lg font-semibold">
          Cara memakai
        </h2>
        <p className="text-sm text-muted-foreground">Kirim kunci lewat header Authorization. Uji dengan perintah ini (ganti KUNCI_ANDA):</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">
          <code>{`curl -H "Authorization: Bearer KUNCI_ANDA" \\\n  ${origin}/api/v1/me`}</code>
        </pre>
        <p className="text-sm text-muted-foreground">Batas pemakaian 120 permintaan per menit per kunci. Jawaban berisi nama desa, nama kunci, dan akses yang dimilikinya.</p>
        <p className="text-sm">
          Dokumentasi lengkap:{" "}
          <a className="underline underline-offset-2" href="/api/v1/openapi.json" target="_blank" rel="noreferrer">
            spesifikasi OpenAPI
          </a>{" "}
          dan{" "}
          <a className="underline underline-offset-2" href="/api/v1/llms.txt" target="_blank" rel="noreferrer">
            panduan untuk alat AI
          </a>
          . Tempel alamat panduan itu ke alat AI Anda agar ia paham cara memakai API ini.
        </p>
      </section>

      <section aria-labelledby="log-title" className="space-y-3">
        <h2 id="log-title" className="text-lg font-semibold">
          Jejak pemakaian
        </h2>
        <p className="text-sm text-muted-foreground">Setiap kali kunci dipakai, tercatat di sini selama {log.data?.retentionDays ?? 90} hari. Bila ada pemakaian yang tidak Anda kenal, cabut kuncinya.</p>
        {log.data && log.data.items.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada pemakaian.</p> : null}
        {log.data && log.data.items.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">50 pemakaian kunci API terbaru</caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="p-3 font-medium">Waktu</th>
                  <th scope="col" className="p-3 font-medium">Kunci</th>
                  <th scope="col" className="p-3 font-medium">Permintaan</th>
                  <th scope="col" className="p-3 font-medium">Hasil</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {log.data.items.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap p-3">{when(r.at)}</td>
                    <td className="p-3">{r.keyName ?? r.keyPrefix ?? "-"}</td>
                    <td className="p-3 font-mono text-xs">{r.method} {r.path}</td>
                    <td className="p-3">{statusText(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {creating && keys.data ? <BuatKunciDialog scopes={keys.data.scopes} onClose={() => setCreating(false)} onCreated={() => { keys.reload(); log.reload(); }} /> : null}

      <AlertDialog open={revoking != null} onOpenChange={(o) => (!o && !busy ? setRevoking(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cabut kunci &quot;{revoking?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>Aplikasi yang memakai kunci ini langsung tidak bisa mengakses data desa. Kunci yang dicabut tidak bisa diaktifkan kembali.</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy}>
              Batal
            </AlertDialogCancel>
            <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={() => void revoke()}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Ya, cabut
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
