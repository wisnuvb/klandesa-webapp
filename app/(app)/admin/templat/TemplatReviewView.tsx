"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApiGet } from "@/hooks/useApiGet";
import type { ReviewItem } from "@/lib/village-apps/service";

const TYPE: Record<string, string> = { text: "Teks pendek", longtext: "Teks panjang", number: "Angka", date: "Tanggal", boolean: "Ya/Tidak", select: "Pilihan" };
const PII: Record<string, string> = { NONE: "bukan pribadi", PERSONAL: "PRIBADI", SENSITIVE: "SANGAT SENSITIF" };

type Action = { kind: "approve" | "reject" | "unpublish"; item: ReviewItem };

export function TemplatReviewView() {
  const [all, setAll] = useState(false);
  const res = useApiGet<{ items: ReviewItem[] }>(`/api/admin/app-templates${all ? "?status=all" : ""}`);
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [official, setOfficial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(a: Action) {
    setNote("");
    setOfficial(false);
    setError(null);
    setAction(a);
  }

  async function toggleOfficial(t: ReviewItem) {
    const r = await fetch(`/api/admin/app-templates/${t.id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: t.official ? "unofficial" : "official" }) });
    const j = await r.json().catch(() => null);
    if (!r.ok) return toast.error(typeof j?.error === "string" ? j.error : "Gagal mengubah lencana.");
    toast.success(t.official ? "Lencana resmi dicabut." : "Ditandai resmi.");
    res.reload();
  }

  async function submit() {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/app-templates/${action.item.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: action.kind, note, official: action.kind === "approve" ? official : undefined }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal menyimpan keputusan.");
      toast.success(action.kind === "approve" ? "Diterbitkan ke galeri." : action.kind === "unpublish" ? "Dicabut dari galeri." : "Ditolak.");
      setAction(null);
      res.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan keputusan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Tinjau templat Aplikasi Desa</h1>
        <p className="max-w-prose text-muted-foreground">
          Periksa tiap kolom: kolom yang berisi data pribadi (NIK, telepon, alamat, kesehatan, penghasilan) wajib bertanda PRIBADI atau SANGAT SENSITIF. Peringatan otomatis hanya membantu, bukan pengganti pemeriksaan Anda.
        </p>
        <div role="group" aria-label="Tampilan" className="flex gap-2">
          <Button type="button" variant={all ? "outline" : "default"} className="min-h-11" aria-pressed={!all} onClick={() => setAll(false)}>
            Menunggu
          </Button>
          <Button type="button" variant={all ? "default" : "outline"} className="min-h-11" aria-pressed={all} onClick={() => setAll(true)}>
            Riwayat
          </Button>
        </div>
      </header>
      {res.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat…
        </p>
      ) : null}
      {res.error ? (
        <p role="alert" className="text-destructive">
          {res.error}
        </p>
      ) : null}
      {res.data && res.data.items.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada templat.</p> : null}
      <ul className="space-y-4">
        {res.data?.items.map((t) => (
          <li key={t.id} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">
                  {t.name} <span className="text-sm font-normal text-muted-foreground">v{t.version}</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Oleh {t.publisherName} · {t.status}
                </p>
              </div>
            </div>
            <p className="text-sm">{t.description}</p>
            {t.warnings.length ? (
              <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <ul className="list-disc pl-4">
                  {t.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {t.tables.map((tb) => (
              <div key={tb.name} className="rounded-md border p-3">
                <h3 className="font-medium">{tb.name}</h3>
                {tb.description ? <p className="text-sm text-muted-foreground">Keterangan: {tb.description}</p> : null}
                <ul className="divide-y text-sm">
                  {tb.fields.map((f) => (
                    <li key={f.label} className="space-y-0.5 py-1">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span>{f.label}</span>
                        <span className={f.piiClass === "NONE" ? "text-muted-foreground" : "font-medium"}>
                          {TYPE[f.type] ?? f.type} · {PII[f.piiClass] ?? f.piiClass}
                        </span>
                      </div>
                      {f.options?.length ? <p className="break-words text-muted-foreground">Pilihan: {f.options.join(" | ")}</p> : null}
                      {f.unit ? <p className="text-muted-foreground">Satuan: {f.unit}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {t.widgets.length ? <p className="text-sm text-muted-foreground">Judul widget dasbor: {t.widgets.map((w) => w.title).join(" | ")}</p> : null}
            {t.status === "PUBLISHED" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="min-h-11" onClick={() => open({ kind: "unpublish", item: t })}>
                  Cabut dari galeri
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => void toggleOfficial(t)}>
                  {t.official ? "Cabut lencana resmi" : "Tandai resmi"}
                </Button>
              </div>
            ) : null}
            {t.status === "PENDING" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="min-h-11" onClick={() => open({ kind: "approve", item: t })}>
                  Terbitkan
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => open({ kind: "reject", item: t })}>
                  Tolak
                </Button>
              </div>
            ) : t.reviewNote ? (
              <p className="text-sm text-muted-foreground">Catatan: {t.reviewNote}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={action != null} onOpenChange={(o) => (!o && !busy ? setAction(null) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{action?.kind === "approve" ? "Terbitkan ke galeri?" : action?.kind === "unpublish" ? "Cabut dari galeri?" : "Tolak templat?"}</DialogTitle>
            <DialogDescription>{action?.kind === "approve" ? "Semua desa bisa melihat dan memasangnya." : action?.kind === "unpublish" ? "Tidak bisa dipasang lagi. Desa yang sudah memasangnya tidak terpengaruh." : "Penerbit akan melihat alasan Anda dan bisa mengajukan versi baru."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="catatan">{action?.kind === "approve" ? "Catatan internal (boleh dikosongkan; hanya terlihat oleh penerbit)" : "Alasan (wajib)"}</Label>
            <Textarea id="catatan" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          </div>
          {action?.kind === "approve" ? (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={official} onChange={(e) => setOfficial(e.target.checked)} />
              Tandai sebagai resmi (lencana &quot;Resmi&quot;)
            </label>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setAction(null)}>
              Batal
            </Button>
            <Button type="button" variant={action?.kind === "approve" ? "default" : "destructive"} className="min-h-11" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {action?.kind === "approve" ? "Terbitkan" : action?.kind === "unpublish" ? "Cabut" : "Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
