"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/app/patterns";
import { KIND_META, KIND_ORDER } from "@/lib/kependudukan/labels";
import { useKualitasKk } from "../_hooks/useKualitasKk";
import { WorkItemCard } from "./WorkItemCard";

export function KualitasKkView() {
  const k = useKualitasKk();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const listRef = useRef<HTMLHeadingElement>(null);
  const running = k.bulkProgress !== null;
  const totalAll = k.data ? Object.values(k.data.counts).reduce((a, b) => a + b, 0) : 0;
  const kinds = KIND_ORDER.filter((x) => (k.data?.counts[x] ?? 0) > 0);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/data-warga" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Data Warga
        </Link>
        <h1 className="text-2xl font-semibold">Perbaikan Data KK</h1>
        <p className="max-w-prose text-muted-foreground">
          Sistem menemukan data keluarga yang perlu dicek. Tiap temuan disertai saran dan alasannya. Anda yang memutuskan. Semua perubahan tercatat dan
          bisa diurungkan.
        </p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/data-warga/kualitas/nik">Periksa juga NIK warga</Link>
        </Button>
      </header>

      <AsyncState loading={k.loading && !k.data} error={k.error} onRetry={k.reload} loadingMessage="Memeriksa data keluarga…" minHeight="40vh">
        {k.data ? (
          totalAll === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-10 text-center">
              <CheckCircle2 aria-hidden="true" className="size-10 text-emerald-700 dark:text-emerald-300" />
              <h2 className="text-lg font-semibold">Data KK sudah rapi</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Tidak ada nomor KK yang bermasalah dan semua keluarga punya Kepala Keluarga. Periksa lagi setelah mengimpor data baru.
              </p>
              <Button asChild variant="outline" className="min-h-11">
                <Link href="/data-warga">Kembali ke Data Warga</Link>
              </Button>
            </div>
          ) : (
            <>
              {k.bulkTotal > 0 ? (
                <section aria-labelledby="bulk-title" className="flex flex-col gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50">
                  <div className="flex gap-3">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <h2 id="bulk-title" className="font-semibold">
                        {k.bulkTotal} saran yang yakin
                      </h2>
                      <p className="text-sm">Datanya jelas dan tiap saran sudah dicek agar tidak menimbulkan masalah baru. Boleh diterapkan sekaligus.</p>
                    </div>
                  </div>
                  <Button type="button" size="lg" className="min-h-11 shrink-0" disabled={running} onClick={() => setConfirmOpen(true)}>
                    {running ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                    {running ? `Menerapkan ${k.bulkProgress!.done} dari ${k.bulkProgress!.total}…` : "Terapkan semua yang yakin"}
                  </Button>
                </section>
              ) : null}

              <nav aria-label="Saring menurut jenis temuan">
                <ul className="flex flex-wrap gap-2">
                  <li>
                    <FilterChip active={k.kind === "ALL"} onClick={() => k.selectKind("ALL")} label="Semua" count={totalAll} />
                  </li>
                  {kinds.map((x) => (
                    <li key={x}>
                      <FilterChip active={k.kind === x} onClick={() => k.selectKind(x)} label={KIND_META[x].short} count={k.data!.counts[x]} />
                    </li>
                  ))}
                </ul>
              </nav>

              <section aria-labelledby="list-title" className="space-y-4">
                <h2 id="list-title" ref={listRef} tabIndex={-1} className="text-lg font-semibold outline-none">
                  {k.total} temuan{k.kind === "ALL" ? "" : ` · ${KIND_META[k.kind].short}`}
                </h2>

                {k.items.length === 0 ? (
                  <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {k.skippedCount > 0
                      ? "Semua temuan di tampilan ini sedang dilewati. Muat ulang halaman untuk menampilkannya lagi."
                      : "Tidak ada temuan di jenis ini."}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {k.items.map((item) => (
                      <li key={item.id}>
                        <WorkItemCard item={item} busy={k.busy} disabled={running} onApply={(i, s) => void k.apply(i, s)} onSkip={k.skip} />
                      </li>
                    ))}
                  </ul>
                )}

                {k.canLoadMore ? (
                  <div className="flex justify-center">
                    <Button type="button" variant="outline" className="min-h-11" onClick={k.loadMore}>
                      Tampilkan lebih banyak
                    </Button>
                  </div>
                ) : null}
                {k.capped ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Menampilkan 100 temuan teratas (yang paling merusak lebih dulu). Daftar menyegar setelah Anda membereskannya.
                  </p>
                ) : null}
              </section>
            </>
          )
        ) : null}
      </AsyncState>

      {/* Pengumuman untuk pembaca layar: hasil aksi tanpa memindahkan fokus. */}
      <p role="status" aria-live="polite" className="sr-only">
        {k.announcement}
      </p>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terapkan {k.bulkTotal} saran yang yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Sistem akan mengubah nomor KK atau hubungan keluarga sesuai saran, satu per satu. Setiap perubahan tercatat di riwayat, dan setelah selesai Anda
              bisa menekan &quot;Urungkan semua&quot;. Saran yang &quot;Perlu dicek&quot; atau &quot;Kurang yakin&quot; tidak ikut diterapkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void k.applyAllConfident()}>Ya, terapkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent"
      }`}
    >
      {label} <span className="ml-1 tabular-nums opacity-80">({count})</span>
    </button>
  );
}
