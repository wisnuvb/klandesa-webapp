"use client";

import { AlertTriangle, CheckCircle2, Download, Loader2, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ImportWizard } from "./useImportWizard";

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "bad" }) {
  const toneCls =
    tone === "good" ? "text-emerald-700 dark:text-emerald-400" : tone === "bad" ? "text-red-700 dark:text-red-400" : tone === "warn" ? "text-amber-700 dark:text-amber-400" : "";
  return (
    <div className="rounded-lg border p-4">
      <div className={`text-2xl font-semibold tabular-nums ${toneCls}`}>{value.toLocaleString("id-ID")}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function ResultStep({ wizard, onDownloadReport }: { wizard: ImportWizard; onDownloadReport: () => void }) {
  const { sending, result } = wizard;

  if (sending || !result) {
    const pct = sending ? Math.round((sending.done / Math.max(1, sending.total)) * 100) : 0;
    return (
      <div className="mx-auto max-w-xl space-y-4 py-10" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-blue-600" aria-hidden />
          <div className="text-sm font-medium">Mengimpor data warga…</div>
        </div>
        <Progress value={pct} aria-label="Kemajuan impor" />
        <p className="text-xs text-muted-foreground">
          {sending ? `${sending.done.toLocaleString("id-ID")} dari ${sending.total.toLocaleString("id-ID")} baris` : "Menyiapkan…"}. Jangan tutup jendela ini.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={wizard.cancelSending}>
          Hentikan setelah potongan ini
        </Button>
      </div>
    );
  }

  const rejectedKeys = new Map(wizard.rows.map((r) => [r.key, r]));
  const reportCount = wizard.buildReport().length;
  const ok = !result.failedMessage;

  return (
    <div className="space-y-5">
      {ok ? (
        <Alert className="border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CheckCircle2 className="text-emerald-600" aria-hidden />
          <AlertTitle>Impor selesai</AlertTitle>
          <AlertDescription>
            {result.created.toLocaleString("id-ID")} warga ditambahkan
            {result.updated > 0 && `, ${result.updated.toLocaleString("id-ID")} diperbarui`}.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive" role="alert">
          <AlertTriangle aria-hidden />
          <AlertTitle>Impor berhenti di tengah jalan</AlertTitle>
          <AlertDescription>
            {result.failedMessage}. {result.notSent.toLocaleString("id-ID")} baris belum terkirim. Data yang sudah masuk tetap tersimpan; kembali ke langkah Tinjau lalu impor ulang dengan pilihan “Lewati” untuk melanjutkan tanpa menggandakan.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Ditambahkan" value={result.created} tone="good" />
        <Stat label="Diperbarui" value={result.updated} tone="good" />
        <Stat label="Dilewati (sudah ada)" value={result.skipped} tone="warn" />
        <Stat label="Ditolak server" value={result.rejected.length} tone={result.rejected.length ? "bad" : undefined} />
      </div>
      {result.accountsSuspended > 0 && (
        <p className="text-xs text-muted-foreground">
          {result.accountsSuspended.toLocaleString("id-ID")} akun aplikasi mobile dinonaktifkan karena warganya kini berstatus meninggal/pindah.
        </p>
      )}

      <section aria-label="Langkah berikutnya untuk aplikasi mobile" className="rounded-lg border bg-muted/30 p-4 text-sm">
        <h3 className="mb-2 flex items-center gap-2 font-semibold">
          <Smartphone className="size-4" aria-hidden /> Agar warga bisa memakai aplikasi mobile
        </h3>
        <p className="mb-2 text-muted-foreground">
          Impor tidak membuat akun. Warga mendaftar sendiri di aplikasi dan memilih password-nya sendiri, dicocokkan dengan data yang baru Anda impor.
        </p>
        <ul className="space-y-1 text-muted-foreground">
          <li>
            <strong className="text-foreground">{wizard.readiness.identity.toLocaleString("id-ID")}</strong> warga siap mendaftar mandiri (NIK + tanggal lahir + nama ibu kandung).
          </li>
          {wizard.readiness.code > 0 && (
            <li>
              <strong className="text-foreground">{wizard.readiness.code.toLocaleString("id-ID")}</strong> warga hanya bisa lewat <em>kode aktivasi KK</em>: buat dari aplikasi staf, lalu bagikan ke keluarganya.
            </li>
          )}
          {wizard.readiness.blocked > 0 && (
            <li>
              <strong className="text-foreground">{wizard.readiness.blocked.toLocaleString("id-ID")}</strong> warga belum bisa mendaftar (meninggal/pindah, atau tanpa nama ibu dan No. KK).
            </li>
          )}
        </ul>
      </section>

      {result.rejected.length > 0 && (
        <section aria-label="Baris yang ditolak server">
          <h3 className="mb-2 text-sm font-semibold">Baris yang ditolak</h3>
          <ul className="max-h-48 space-y-1 overflow-auto rounded-lg border p-3 text-sm">
            {result.rejected.slice(0, 50).map((r) => {
              const row = rejectedKeys.get(r.key);
              return (
                <li key={r.key}>
                  <span className="font-medium">
                    {row ? `${row.sheet}, baris ${row.srcRow}` : `Baris ${r.key}`}
                    {row?.values.name ? ` — ${row.values.name}` : ""}
                  </span>
                  : <span className="text-muted-foreground">{r.errors.join("; ")}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reportCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="text-sm">
            <strong>{reportCount.toLocaleString("id-ID")}</strong> baris tidak masuk. Unduh laporannya, perbaiki di Excel, lalu unggah ulang.
          </div>
          <Button type="button" variant="outline" size="sm" className="ml-auto gap-2" onClick={onDownloadReport}>
            <Download className="size-4" aria-hidden /> Unduh laporan (.xlsx)
          </Button>
        </div>
      )}
    </div>
  );
}
