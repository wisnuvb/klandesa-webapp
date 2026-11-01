"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Archive, CalendarClock, ExternalLink, Loader2, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { SELECT_CLASS, fmtDate } from "@/components/app/perencanaan/shared";
import { StatusPill, VerificationTag, daysText } from "@/components/app/kepatuhan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { RecordDialog } from "./RecordDialog";
import type { Resp, Row } from "./types";

export function KepatuhanView() {
  const thisYear = new Date().getFullYear();
  const sp = useSearchParams();
  const initial = Number(sp.get("year"));
  const [year, setYear] = useState(Number.isInteger(initial) && initial >= 2000 && initial <= 2100 ? initial : thisYear);
  const [editing, setEditing] = useState<Row | null>(null);
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/kepatuhan?year=${year}`);
  const canWrite = Boolean(data?.can.create && data.can.update);

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Kalender Kepatuhan</h1>
        <p className="max-w-3xl text-muted-foreground">Laporan wajib desa menurut tahun anggaran, lengkap dengan tenggat, status, dan bukti kirim. Status dibaca otomatis dari APBDes, Perencanaan, Laporan Kepala Desa, dan Dana Desa bila datanya ada; yang lain dicatat petugas.</p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="kp-year">Tahun anggaran</Label>
        <SearchSelect id="kp-year" className={`${SELECT_CLASS} w-32`} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
          {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </SearchSelect>
      </div>

      {loading && !data ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat kalender kepatuhan…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-destructive p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}

      {data ? (
        <>
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {[
              ["Kewajiban tahun ini", data.tally.total],
              ["Sudah terkirim", data.tally.terkirim],
              ["Terlambat", data.tally.terlambat],
              ["Segera (14 hari)", data.tally.segera],
              ["Belum / draf", data.tally.belum + data.tally.draf],
            ].map(([k, v]) => (
              <div key={String(k)} className={`rounded-lg border p-3 ${k === "Terlambat" && Number(v) > 0 ? "border-destructive/50 bg-destructive/10" : ""}`}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          {data.provisionalCount > 0 ? (
            <p role="status" className="rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950">
              {data.provisionalCount} butir (Dana Desa) memakai aturan tahun sebelumnya secara sementara karena aturan tahun {data.year} belum dimasukkan ke katalog. Periksa peraturan terbaru; kabupaten atau admin platform dapat memperbaruinya tanpa rilis kode.
            </p>
          ) : null}

          {data.upcoming.length ? (
            <section aria-labelledby="kp-up-h" className="rounded-lg border p-4">
              <h2 id="kp-up-h" className="flex items-center gap-2 text-lg font-semibold">
                <CalendarClock aria-hidden="true" className="size-5" />
                Tenggat terdekat
              </h2>
              <ul className="mt-2 divide-y">
                {data.upcoming.map((u) => (
                  <li key={`${u.year}-${u.key}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm">
                    <span className="min-w-0 break-words font-medium">{u.title} <span className="font-normal text-muted-foreground">(TA {u.year})</span></span>
                    <span className="tabular-nums text-muted-foreground">{fmtDate(u.due)} · {daysText(u.daysLeft)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.groups.map((g) => {
            const rows = data.rows.filter((r) => r.group === g.key);
            return (
              <section key={g.key} aria-labelledby={`kp-g-${g.key}`} className="space-y-3">
                <h2 id={`kp-g-${g.key}`} className="text-lg font-semibold">
                  {g.label}
                </h2>
                <ul className="space-y-3">
                  {rows.map((r) => (
                    <ItemCard key={r.key} r={r} year={data.year} canWrite={canWrite} canDelete={data.can.delete} onEdit={() => setEditing(r)} reload={reload} />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      ) : null}

      {editing ? (
        <RecordDialog
          row={editing}
          year={year}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

function ItemCard({ r, year, canWrite, canDelete, onEdit, reload }: { r: Row; year: number; canWrite: boolean; canDelete: boolean; onEdit: () => void; reload: () => void }) {
  return (
    <li className="min-w-0 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 break-words font-medium">{r.title}</h3>
        {r.disabled ? <span className="inline-flex items-center rounded-full border border-sky-600/40 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900">Dimatikan oleh {r.override?.source === "GLOBAL" ? "platform" : "kabupaten"}</span> : <StatusPill status={r.status} late={r.late} soon={r.soon} doneLabel={r.doneLabel} />}
      </div>
      {r.override ? (
        <p role="note" className="mt-2 break-words rounded-md border border-sky-600/40 bg-sky-50 p-2 text-sm text-sky-950">
          {r.disabled ? "Butir ini dimatikan" : "Tenggat butir ini diubah"} oleh {r.override.source === "GLOBAL" ? "platform" : "kabupaten"} sejak tahun anggaran {r.override.fromYear}. Dasar: {r.override.basis ?? "(tidak disebutkan)"}. Bila tidak sesuai, tanyakan ke Dinas PMD kabupaten.
        </p>
      ) : null}
      <p className="mt-1 break-words text-sm text-muted-foreground">Kepada: {r.recipient}</p>
      <p className="mt-1 text-sm">
        {r.disabled ? (
          <span className="text-muted-foreground">Tidak dihitung sebagai kewajiban.</span>
        ) : r.due ? (
          <>
            <span className="font-medium">Tenggat {fmtDate(r.due)}</span>
            {r.status !== "TERKIRIM" ? <span className="text-muted-foreground"> · {daysText(r.daysLeft)}</span> : null}
          </>
        ) : (
          <span className="text-muted-foreground">{r.dueNote ?? "Tanpa tenggat tertulis"}</span>
        )}
        {!r.binding ? <span className="ml-2 text-xs text-muted-foreground">(informasi, tidak dihitung sebagai kewajiban)</span> : null}
      </p>
      {r.status === "TERKIRIM" || r.record ? (
        <div className="mt-2 space-y-0.5 rounded-md bg-muted/60 p-2 text-sm">
          {r.sentOn ? <p>{r.doneLabel} pada {fmtDate(r.sentOn)}{r.evidenceSource === "SISTEM" ? " (dari data sistem)" : ""}</p> : null}
          {r.record?.referenceNo ? <p className="break-words">Bukti/nomor: {r.record.referenceNo}</p> : null}
          {r.record?.note ? <p className="break-words text-muted-foreground">{r.record.note}</p> : null}
          {r.archive ? (
            <p className="flex items-center gap-1 break-words">
              <Archive aria-hidden="true" className="size-4 shrink-0" />
              Berkas: {r.archive.title}
            </p>
          ) : null}
        </div>
      ) : null}
      <details className="mt-2 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">Dasar hukum dan keterangan</summary>
        <div className="space-y-2 pb-1">
          <p className="break-words">{r.basis}</p>
          {r.note ? <p className="break-words text-muted-foreground">{r.note}</p> : null}
          <p className="break-words text-muted-foreground">{r.hint}</p>
          <p className="flex flex-wrap items-center gap-2">
            <VerificationTag v={r.verification} />
            <span className="text-xs text-muted-foreground">{r.source}{r.provisional ? " · SEMENTARA (aturan tahun sebelumnya)" : ""}</span>
          </p>
        </div>
      </details>
      <div className="mt-2 flex flex-wrap gap-2">
        {r.bundle && !r.disabled ? (
          <Button asChild variant="outline" className="min-h-11">
            <Link href={`/kepatuhan/bundel?item=${encodeURIComponent(r.key)}&year=${year}`}>
              <Printer aria-hidden="true" />
              Bahan cetak
            </Link>
          </Button>
        ) : null}
        {canWrite && !r.disabled ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={onEdit}>
            <Pencil aria-hidden="true" />
            {r.record ? "Ubah catatan" : r.autoDerived && r.status === "TERKIRIM" ? "Tambah bukti" : "Catat pengiriman"}
          </Button>
        ) : null}
        {canWrite && canDelete && r.record ? (
          <ConfirmDelete buttonText="Hapus catatan" label={`Hapus catatan pengiriman ${r.title}`} title="Hapus catatan pengiriman?" description="Butir ini kembali berstatus belum, kecuali datanya terbaca otomatis dari modul lain. Penghapusan tercatat dalam jejak audit." url={`/api/kepatuhan/catatan?year=${year}&itemKey=${encodeURIComponent(r.key)}`} onDone={reload} />
        ) : null}
        {r.key === "DD_PUBLIKASI" || r.key === "DD_FOKUS" || r.key === "DD_TAHAP1" || r.key === "DD_TAHAP2" ? (
          <Button asChild variant="ghost" className="min-h-11">
            <Link href="/dana-desa">
              Buka Dana Desa
              <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </li>
  );
}
