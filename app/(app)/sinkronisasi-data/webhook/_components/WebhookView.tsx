"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Ban, CheckCircle2, ChevronDown, Loader2, Plus, Send, Webhook } from "lucide-react";
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
import { RahasiaDialog } from "./RahasiaDialog";
import { RiwayatList } from "./RiwayatList";
import { WebhookFormDialog } from "./WebhookFormDialog";
import type { EndpointView, EndpointsResponse } from "./types";

const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

type Confirm = { kind: "delete" | "rotate"; endpoint: EndpointView };
type Form = { endpoint: EndpointView | null };

export function WebhookView() {
  const res = useApiGet<EndpointsResponse>("/api/developer/webhooks");
  const [form, setForm] = useState<Form | null>(null);
  const [secret, setSecret] = useState<{ title: string; value: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testNote, setTestNote] = useState<{ id: number; ok: boolean; text: string } | null>(null);

  const eventLabel = (id: string) => res.data?.events.find((e) => e.id === id)?.label ?? id;
  const full = res.data ? res.data.endpoints.length >= res.data.maxEndpoints : false;

  async function call(key: string, url: string, init: RequestInit): Promise<{ ok: boolean; body: Record<string, unknown> | null }> {
    setBusy(key);
    try {
      const r = await fetch(url, init);
      const body = await r.json().catch(() => null);
      return { ok: r.ok, body };
    } catch {
      return { ok: false, body: { error: "Tidak bisa terhubung. Periksa koneksi lalu coba lagi." } };
    } finally {
      setBusy(null);
    }
  }
  const errText = (b: Record<string, unknown> | null, fallback: string) => (typeof b?.error === "string" ? b.error : fallback);

  async function test(ep: EndpointView) {
    setTestNote(null);
    const r = await call(`test-${ep.id}`, `/api/developer/webhooks/${ep.id}/test`, { method: "POST" });
    if (!r.ok) return setTestNote({ id: ep.id, ok: false, text: errText(r.body, "Gagal mengirim uji.") });
    const ok = r.body?.success === true;
    setTestNote({
      id: ep.id,
      ok,
      text: ok ? `Berhasil. Server tujuan menjawab dengan kode ${String(r.body?.statusCode)}.` : `Gagal: ${typeof r.body?.error === "string" ? r.body.error : `kode ${String(r.body?.statusCode)}`}`,
    });
    res.reload();
  }

  async function toggle(ep: EndpointView) {
    const r = await call(`toggle-${ep.id}`, `/api/developer/webhooks/${ep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ep.isActive }),
    });
    if (!r.ok) return toast.error(errText(r.body, "Gagal mengubah status."));
    toast.success(ep.isActive ? `"${ep.name}" dimatikan.` : `"${ep.name}" diaktifkan.`);
    res.reload();
  }

  async function runConfirm() {
    if (!confirm) return;
    setError(null);
    const ep = confirm.endpoint;
    if (confirm.kind === "delete") {
      const r = await call("confirm", `/api/developer/webhooks/${ep.id}`, { method: "DELETE" });
      if (!r.ok) return setError(errText(r.body, "Gagal menghapus. Coba lagi."));
      toast.success(`"${ep.name}" dihapus.`);
    } else {
      const r = await call("confirm", `/api/developer/webhooks/${ep.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotateSecret: true }),
      });
      if (!r.ok) return setError(errText(r.body, "Gagal mengganti rahasia. Coba lagi."));
      setSecret({ title: "Rahasia baru", value: String(r.body?.secret ?? "") });
    }
    setConfirm(null);
    res.reload();
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
              <Webhook aria-hidden="true" className="size-6" />
              Webhook: kabar otomatis ke aplikasi lain
            </h1>
            <p className="max-w-prose text-muted-foreground">
              Webhook mengirim kabar singkat ke aplikasi Anda saat sesuatu terjadi di Klandesa, misalnya pengumuman baru atau mutasi penduduk, tanpa perlu diperiksa berkala.
              Kabar hanya berisi nomor id, tidak memuat data pribadi.
            </p>
          </div>
          <Button type="button" size="lg" className="min-h-11" disabled={!res.data || full} onClick={() => setForm({ endpoint: null })}>
            <Plus aria-hidden="true" />
            Tambah tujuan
          </Button>
        </div>
        {full ? <p className="text-sm text-muted-foreground">Sudah ada {res.data!.maxEndpoints} tujuan. Hapus yang tidak dipakai untuk menambah yang baru.</p> : null}
      </header>

      <section aria-labelledby="tujuan-title" className="space-y-3">
        <h2 id="tujuan-title" className="text-lg font-semibold">
          Tujuan Anda
        </h2>
        {res.loading ? (
          <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            Memuat…
          </p>
        ) : null}
        {res.error ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <p>{res.error}</p>
            <Button type="button" variant="outline" className="min-h-11" onClick={res.reload}>
              Coba lagi
            </Button>
          </div>
        ) : null}
        {res.data && res.data.endpoints.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada tujuan. Tekan &quot;Tambah tujuan&quot; untuk memulai.</p> : null}
        {res.data ? (
          <ul className="space-y-3">
            {res.data.endpoints.map((ep) => (
              <li key={ep.id} className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{ep.name}</h3>
                    <p className="break-all font-mono text-sm text-muted-foreground">{ep.url}</p>
                  </div>
                  {ep.isActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50">
                      <CheckCircle2 aria-hidden="true" className="size-4" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50">
                      <Ban aria-hidden="true" className="size-4" />
                      Mati
                    </span>
                  )}
                </div>
                {!ep.isActive && ep.disabledReason ? (
                  <p className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>{ep.disabledReason} Perbaiki penerimanya lalu aktifkan kembali. Kabar yang terlewat tidak dikirim ulang otomatis.</span>
                  </p>
                ) : null}
                <p className="text-sm">
                  <span className="text-muted-foreground">Dikabarkan saat: </span>
                  {ep.events.map(eventLabel).join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ep.lastSuccessAt ? `Terakhir berhasil ${fmt.format(new Date(ep.lastSuccessAt))}` : "Belum pernah berhasil"}
                  {ep.isActive && ep.consecutiveFailures > 0 ? ` · ${ep.consecutiveFailures} kegagalan berturut-turut` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="min-h-11" disabled={busy === `test-${ep.id}`} onClick={() => void test(ep)}>
                    {busy === `test-${ep.id}` ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}
                    Kirim uji
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setForm({ endpoint: ep })}>
                    Ubah
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" disabled={busy === `toggle-${ep.id}`} onClick={() => void toggle(ep)}>
                    {ep.isActive ? "Matikan" : "Aktifkan"}
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(null); setConfirm({ kind: "rotate", endpoint: ep }); }}>
                    Ganti rahasia
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(null); setConfirm({ kind: "delete", endpoint: ep }); }}>
                    Hapus
                  </Button>
                </div>
                <p role="status" aria-live="polite" className={testNote?.id === ep.id ? `text-sm ${testNote.ok ? "text-emerald-800 dark:text-emerald-300" : "text-destructive"}` : "sr-only"}>
                  {testNote?.id === ep.id ? (
                    <>
                      {testNote.ok ? <CheckCircle2 aria-hidden="true" className="mr-1 inline size-4" /> : <AlertTriangle aria-hidden="true" className="mr-1 inline size-4" />}
                      {testNote.text}
                    </>
                  ) : null}
                </p>
                <div>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1 text-sm underline-offset-2 hover:underline"
                    aria-expanded={open === ep.id}
                    aria-controls={`riwayat-${ep.id}`}
                    onClick={() => setOpen(open === ep.id ? null : ep.id)}
                  >
                    <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open === ep.id ? "rotate-180" : ""}`} />
                    Riwayat pengiriman
                  </button>
                  <div id={`riwayat-${ep.id}`} hidden={open !== ep.id}>
                    {open === ep.id ? <RiwayatList endpointId={ep.id} eventLabel={eventLabel} active={ep.isActive} /> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="verif-title" className="space-y-2 rounded-lg border bg-card p-4">
        <h2 id="verif-title" className="text-lg font-semibold">
          Untuk pembuat aplikasi penerima
        </h2>
        <p className="text-sm text-muted-foreground">
          Setiap kiriman adalah POST berisi JSON <code>{"{ id, type, createdAt, data }"}</code>. Ambil detail datanya lewat API dengan kunci Anda. Kirim ulang bisa terjadi, jadi pakai <code>id</code> untuk
          mengenali kabar yang sama. Urutan kabar tidak dijamin.
        </p>
        <p className="text-sm text-muted-foreground">
          Pastikan kiriman asli: header <code>X-Klandesa-Signature</code> berbentuk <code>t=waktu,v1=tandatangan</code>. Hitung HMAC-SHA256 dari <code>waktu + &quot;.&quot; + isi mentah</code> memakai rahasia Anda,
          bandingkan, dan tolak bila waktu lebih dari 5 menit.
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">
          <code>{`import { createHmac, timingSafeEqual } from "node:crypto";

function asli(rahasia, header, isiMentah) {
  const m = /^t=(\\d+),v1=([0-9a-f]{64})$/.exec(header ?? "");
  if (!m || Math.abs(Date.now() / 1000 - Number(m[1])) > 300) return false;
  const hitung = createHmac("sha256", rahasia).update(m[1] + "." + isiMentah).digest();
  return timingSafeEqual(hitung, Buffer.from(m[2], "hex"));
}`}</code>
        </pre>
        <p className="text-sm text-muted-foreground">Server tujuan harus menjawab kode 2xx dalam 8 detik. Bila gagal, Klandesa mencoba lagi beberapa kali (1 menit sampai 24 jam), lalu berhenti.</p>
      </section>

      {form && res.data ? (
        <WebhookFormDialog
          key={form.endpoint?.id ?? "baru"}
          events={res.data.events}
          endpoint={form.endpoint}
          onClose={() => setForm(null)}
          onSaved={(s) => {
            setForm(null);
            res.reload();
            if (s) setSecret({ title: "Tujuan ditambahkan", value: s });
            else toast.success("Perubahan disimpan.");
          }}
        />
      ) : null}
      {secret ? <RahasiaDialog title={secret.title} secret={secret.value} onClose={() => setSecret(null)} /> : null}

      <AlertDialog open={confirm != null} onOpenChange={(o) => (!o && busy !== "confirm" ? setConfirm(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === "delete" ? `Hapus "${confirm.endpoint.name}"?` : `Ganti rahasia "${confirm?.endpoint.name}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "delete"
                ? "Kabar tidak akan dikirim lagi ke alamat ini dan riwayat pengirimannya ikut terhapus."
                : "Rahasia lama langsung tidak berlaku. Perbarui rahasia di aplikasi penerima, kalau tidak kabar berikutnya akan ditolak penerima."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy === "confirm"}>
              Batal
            </AlertDialogCancel>
            <Button type="button" variant="destructive" className="min-h-11" disabled={busy === "confirm"} onClick={() => void runConfirm()}>
              {busy === "confirm" ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {confirm?.kind === "delete" ? "Ya, hapus" : "Ya, ganti"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
