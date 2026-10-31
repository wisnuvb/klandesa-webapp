"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { formatCell } from "@/lib/custom-data/ui-model";
import type { WidgetResult } from "@/lib/village-apps/service";

interface Dash {
  name: string;
  widgets: WidgetResult[];
  tables: { tableId: number; name: string }[];
}

const num = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

function Unavailable() {
  return <p className="text-sm text-muted-foreground">Tabelnya sudah diarsipkan atau dihapus.</p>;
}

function Widget({ w }: { w: WidgetResult }) {
  return (
    <section aria-label={w.title} className="space-y-2 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">{w.title}</h2>
      {!w.available ? (
        <Unavailable />
      ) : w.type === "count" ? (
        <p className="text-3xl font-semibold tabular-nums">{num.format(w.value)}</p>
      ) : w.type === "sum" ? (
        <div>
          <p className="text-3xl font-semibold tabular-nums">{num.format(w.total)}</p>
          <p className="text-sm text-muted-foreground">
            {w.field}: rata-rata {w.average == null ? "-" : num.format(w.average)} dari {w.filled} isian
          </p>
        </div>
      ) : w.type === "breakdown" ? (
        w.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {w.items.map((i) => {
              const max = w.items[0].count || 1;
              return (
                <li key={i.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                  <span className="truncate">{i.label}</span>
                  <span className="tabular-nums">{num.format(i.count)}</span>
                  <span aria-hidden="true" className="col-span-2 h-1.5 overflow-hidden rounded bg-muted">
                    <span className="block h-full rounded bg-primary" style={{ width: `${Math.max(2, (i.count / max) * 100)}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        )
      ) : w.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada data.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{w.title}</caption>
            <thead className="text-muted-foreground">
              <tr>
                {w.columns.map((c) => (
                  <th key={c.key} scope="col" className="py-1.5 pr-3 font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {w.rows.map((r) => (
                <tr key={r.id}>
                  {w.columns.map((c) => (
                    <td key={c.key} className="py-1.5 pr-3">
                      {formatCell(r.values[c.key], { type: c.type as never, options: null }) || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function DashboardView({ id }: { id: number }) {
  const router = useRouter();
  const res = useApiGet<Dash>(id ? `/api/custom-data/apps/${id}` : null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const r = await fetch(`/api/custom-data/apps/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal melepas.");
      toast.success("Aplikasi dilepas dari daftar. Tabel dan datanya tetap ada di Data Kustom.");
      router.push("/data-kustom/galeri");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal melepas.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/data-kustom/galeri" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Galeri
        </Link>
        <h1 className="text-2xl font-semibold">{res.data?.name ?? "Aplikasi Desa"}</h1>
      </header>
      {res.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat dasbor…
        </p>
      ) : null}
      {res.error || !id ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{res.error ?? "Aplikasi tidak ditemukan."}</p>
        </div>
      ) : null}
      {res.data ? (
        <>
          <div className="flex flex-wrap gap-2">
            {res.data.tables.map((t) => (
              <Button key={t.tableId} asChild variant="outline" className="min-h-11">
                <Link href={`/data-kustom/${t.tableId}`}>Buka tabel {t.name}</Link>
              </Button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {res.data.widgets.map((w, i) => (
              <Widget key={`${w.type}-${i}`} w={w} />
            ))}
          </div>
          <div>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setConfirm(true)}>
              Lepas dari daftar
            </Button>
          </div>
        </>
      ) : null}
      <AlertDialog open={confirm} onOpenChange={(o) => (!o && !busy ? setConfirm(false) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lepas aplikasi ini dari daftar?</AlertDialogTitle>
            <AlertDialogDescription>Hanya dasbornya yang hilang. Semua tabel dan data tetap ada di Data Kustom. Aplikasi bisa dipasang lagi dari galeri.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy}>
              Batal
            </AlertDialogCancel>
            <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={() => void remove()}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Ya, lepas
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
