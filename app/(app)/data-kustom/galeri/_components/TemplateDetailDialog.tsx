"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiGet } from "@/hooks/useApiGet";
import { PII_LABEL, TYPE_LABEL, type TemplateDetail } from "./types";

/** Pratinjau lengkap sebelum memasang: tabel, kolom, dan kelas datanya. Pemasangan hanya membuat tabel, tanpa data dan tanpa akses API. */
export function TemplateDetailDialog({ id, canInstall, onClose, onInstalled }: { id: number; canInstall: boolean; onClose: () => void; onInstalled: (installId: number) => void }) {
  const res = useApiGet<TemplateDetail>(`/api/custom-data/gallery/${id}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const d = res.data;

  async function install() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/custom-data/gallery/${id}/install`, { method: "POST" });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal memasang. Coba lagi.");
      toast.success("Aplikasi terpasang. Tabelnya sudah dibuat di Data Kustom.");
      onInstalled(j.installId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memasang. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d?.name ?? "Memuat…"}</DialogTitle>
          <DialogDescription>{d ? `Oleh ${d.publisherName}${d.official ? " (resmi)" : ""} · versi ${d.version}` : "Mengambil rincian aplikasi"}</DialogDescription>
        </DialogHeader>
        {res.loading ? (
          <p role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            Memuat…
          </p>
        ) : null}
        {res.error ? (
          <p role="alert" className="text-destructive">
            {res.error}
          </p>
        ) : null}
        {d ? (
          <div className="space-y-4">
            <p className="text-sm">{d.description}</p>
            <p className="flex gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>Memasang hanya membuat tabel kosong di desa Anda. Tidak ada data dari desa lain, tidak ada kunci API, dan tidak ada akses ke data Anda yang diberikan ke pihak mana pun.</span>
            </p>
            {d.warnings?.length ? (
              <div role="status" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <ul className="list-disc pl-4">
                  {d.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {d.tables.map((t) => (
              <section key={t.name} aria-label={`Tabel ${t.name}`} className="space-y-2 rounded-md border p-3">
                <h3 className="font-semibold">
                  {t.name}
                  {t.linkResident ? <span className="ml-2 text-sm font-normal text-muted-foreground">terhubung ke data warga</span> : null}
                </h3>
                {t.description ? <p className="text-sm text-muted-foreground">{t.description}</p> : null}
                <ul className="divide-y text-sm">
                  {t.fields.map((f) => (
                    <li key={f.label} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>
                        {f.label}
                        {f.required ? <span className="text-muted-foreground"> (wajib)</span> : null}
                      </span>
                      <span className="text-muted-foreground">
                        {TYPE_LABEL[f.type] ?? f.type} · {PII_LABEL[f.piiClass] ?? f.piiClass}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <p className="text-sm text-muted-foreground">Dasbor: {d.widgets.map((w) => w.title).join(", ") || "tidak ada"}.</p>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
            Tutup
          </Button>
          {canInstall && d && d.status === "PUBLISHED" ? (
            d.installed ? (
              <Button type="button" className="min-h-11" disabled>
                Sudah terpasang
              </Button>
            ) : (
              <Button type="button" className="min-h-11" disabled={busy} onClick={() => void install()}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                Pasang di desa saya
              </Button>
            )
          ) : null}
        </DialogFooter>
        {!canInstall && d?.status === "PUBLISHED" ? <p className="text-sm text-muted-foreground">Hanya admin atau sekretaris desa yang dapat memasang aplikasi.</p> : null}
      </DialogContent>
    </Dialog>
  );
}
