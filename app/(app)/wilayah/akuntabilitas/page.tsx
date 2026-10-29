"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegionalPageHeader } from "@/components/regional/RegionalPageHeader";

type Row = {
  villageId: number;
  name: string;
  district: string;
  mail: { total: number; viaAppPercent: number | null; processed: number; medianHours: number | null; withinSlaPercent: number | null; pending: number; oldestPendingHours: number | null };
  reports: { total: number; respondedInTimePercent: number | null; resolvedPercent: number | null; resolvedYes: number; resolvedNo: number };
  activation: { residents: number; accounts: number; percent: number | null };
};
type Payload = { windowDays: number; truncated: boolean; villages: Row[] };

type SortKey = "name" | "median" | "reports" | "activation" | "pending";

const NA = <span className="text-muted-foreground">belum cukup data</span>;
const pct = (v: number | null) => (v === null ? NA : `${v}%`);
const hrs = (v: number | null) => (v === null ? NA : v < 48 ? `${v} jam` : `${Math.round((v / 24) * 10) / 10} hari`);

/** Rata-rata tertimbang hanya dari desa yang punya angka, agar desa tanpa data tidak menurunkan rata-rata. */
function weighted(rows: Row[], pick: (r: Row) => { v: number | null; w: number }): number | null {
  let sum = 0;
  let wsum = 0;
  for (const r of rows) {
    const { v, w } = pick(r);
    if (v !== null && w > 0) { sum += v * w; wsum += w; }
  }
  return wsum > 0 ? Math.round(sum / wsum) : null;
}

export default function WilayahAkuntabilitasPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("name");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/regional/accountability", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as Payload | { error?: string } | null;
        if (cancelled) return;
        if (!res.ok) return setError((json as { error?: string })?.error ?? "Gagal memuat data");
        setData(json as Payload);
      } catch {
        if (!cancelled) setError("Gagal memuat data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    const list = [...(data?.villages ?? [])];
    const nv = (v: number | null, dir: 1 | -1) => (v === null ? Number.POSITIVE_INFINITY : v * dir);
    list.sort((a, b) => {
      switch (sort) {
        case "median": return nv(a.mail.medianHours, 1) - nv(b.mail.medianHours, 1);
        case "reports": return nv(a.reports.respondedInTimePercent, -1) - nv(b.reports.respondedInTimePercent, -1);
        case "activation": return nv(a.activation.percent, -1) - nv(b.activation.percent, -1);
        case "pending": return b.mail.pending - a.mail.pending;
        default: return a.name.localeCompare(b.name);
      }
    });
    return list;
  }, [data, sort]);

  const summary = useMemo(() => {
    const v = data?.villages ?? [];
    return {
      activation: weighted(v, (r) => ({ v: r.activation.percent, w: r.activation.residents })),
      inTime: weighted(v, (r) => ({ v: r.reports.respondedInTimePercent, w: r.reports.total })),
      sla: weighted(v, (r) => ({ v: r.mail.withinSlaPercent, w: r.mail.processed })),
      pending: v.reduce((n, r) => n + r.mail.pending, 0),
      withData: v.filter((r) => r.mail.medianHours !== null || r.reports.respondedInTimePercent !== null).length,
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RegionalPageHeader
        title="Akuntabilitas layanan"
        userName={session?.user?.name}
        description={`Seberapa cepat desa melayani surat dan menanggapi pengaduan (${data?.windowDays ?? 90} hari terakhir).`}
      />
      {loading && <p className="text-sm text-muted-foreground">Memuat data…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Surat selesai ≤ 48 jam</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary.sla === null ? "—" : `${summary.sla}%`}</p><p className="text-xs text-muted-foreground">rata-rata tertimbang desa yang punya data</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pengaduan ditanggapi ≤ 3 hari</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary.inTime === null ? "—" : `${summary.inTime}%`}</p><p className="text-xs text-muted-foreground">rata-rata tertimbang</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Warga aktif di aplikasi</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary.activation === null ? "—" : `${summary.activation}%`}</p><p className="text-xs text-muted-foreground">dari penduduk tercatat</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Surat menunggu</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary.pending}</p><p className="text-xs text-muted-foreground">{summary.withData} dari {data.villages.length} desa punya data cukup</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Per desa</CardTitle>
              <CardDescription>
                Angka muncul bila sampel cukup (surat ≥ 5, pengaduan ≥ 5, jawaban pelapor ≥ 3). Desa yang baru memakai aplikasi wajar masih kosong.
                {data.truncated ? " Data sangat besar: sebagian baris terpotong, angka perkiraan." : ""}
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-2 text-sm">
                {([["name", "Nama"], ["median", "Tercepat"], ["reports", "Pengaduan"], ["activation", "Aktivasi"], ["pending", "Antrean"]] as [SortKey, string][]).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setSort(k)} className={`rounded-full border px-3 py-1 ${sort === k ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Desa</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead className="text-right">Median surat</TableHead>
                    <TableHead className="text-right">Surat ≤ 48 jam</TableHead>
                    <TableHead className="text-right">Antrean</TableHead>
                    <TableHead className="text-right">Pengaduan ≤ 3 hari</TableHead>
                    <TableHead className="text-right">Sudah beres</TableHead>
                    <TableHead className="text-right">Warga aktif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.villageId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.district}</TableCell>
                      <TableCell className="text-right">{hrs(r.mail.medianHours)}</TableCell>
                      <TableCell className="text-right">{pct(r.mail.withinSlaPercent)}</TableCell>
                      <TableCell className="text-right">{r.mail.pending}{r.mail.oldestPendingHours !== null && r.mail.pending > 0 ? <span className="block text-xs text-muted-foreground">tertua {hrs(r.mail.oldestPendingHours)}</span> : null}</TableCell>
                      <TableCell className="text-right">{pct(r.reports.respondedInTimePercent)}</TableCell>
                      <TableCell className="text-right">{pct(r.reports.resolvedPercent)}</TableCell>
                      <TableCell className="text-right">{pct(r.activation.percent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
