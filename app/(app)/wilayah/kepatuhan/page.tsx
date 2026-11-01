"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RegionalPageHeader } from "@/components/regional/RegionalPageHeader";
import { StatusPill, daysText, type KStatus } from "@/components/app/kepatuhan/shared";
import { SELECT_CLASS, fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { KatalogPanel } from "./_components/KatalogPanel";

type Tally = { total: number; terkirim: number; terlambat: number; segera: number; draf: number; belum: number; terkirimTerlambat: number };
type Recap = {
  year: number;
  excludedVillages: number;
  items: { key: string; title: string; group: string; binding: boolean; verification: string }[];
  villages: { villageId: number; name: string; district: string; regency: string; province: string; matchedBy: "KODE" | "TEKS"; tally: Tally; next: { key: string; title: string; due: string; daysLeft: number } | null; cells: Record<string, { status: KStatus; late: boolean; due: string | null }> }[];
  totals: Tally & { villages: number; villagesWithOverdue: number };
};

export default function WilayahKepatuhanPage() {
  const { data: session } = useSession();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [itemKey, setItemKey] = useState("");
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const { data, loading, error, reload } = useApiGet<Recap>(`/api/regional/kepatuhan?year=${year}`);

  const rows = useMemo(() => {
    const list = data?.villages ?? [];
    return onlyOverdue ? list.filter((v) => v.tally.terlambat > 0) : list;
  }, [data, onlyOverdue]);
  const chosen = data?.items.find((i) => i.key === itemKey) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      <RegionalPageHeader title="Kepatuhan laporan desa" userName={session?.user?.name} description="Tenggat dan status laporan wajib tiap desa. Hanya status dan tanggal; isi laporan tidak ditampilkan." />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="wk-year">Tahun anggaran</Label>
          <SearchSelect id="wk-year" className={`${SELECT_CLASS} w-32`} value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </SearchSelect>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="wk-item">Lihat satu butir laporan</Label>
          <SearchSelect id="wk-item" className={`${SELECT_CLASS} w-full sm:w-96`} value={itemKey} onChange={(e) => setItemKey(e.target.value)} placeholder="Semua butir (ringkasan)">
            <option value="">Semua butir (ringkasan)</option>
            {(data?.items ?? []).map((i) => (
              <option key={i.key} value={i.key}>{i.title}</option>
            ))}
          </SearchSelect>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
          <input type="checkbox" className="size-4" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
          Hanya desa yang ada keterlambatan
        </label>
      </div>

      {loading && !data ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat rekap kepatuhan…
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
              ["Desa dihitung", data.totals.villages],
              ["Desa ada keterlambatan", data.totals.villagesWithOverdue],
              ["Butir terlambat", data.totals.terlambat],
              ["Butir terkirim", `${data.totals.terkirim} dari ${data.totals.total}`],
              ["Segera (14 hari)", data.totals.segera],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">
            Hanya butir berlabel V (teks resmi) atau K (ketetapan kabupaten) yang dihitung sebagai kewajiban. {data.excludedVillages > 0 ? `${data.excludedVillages} desa lain di wilayah ini tidak dihitung karena belum berlangganan aktif. ` : ""}Wilayah desa berasal dari profil yang dapat diubah admin desa sendiri; periksa kolom wilayah bila ada desa yang tampak salah tempat. Desa yang belum memakai aplikasi akan tampak belum mengirim; itu belum tentu berarti terlambat di dunia nyata.
          </p>

          <Card>
            <CardHeader>
              <CardTitle>{chosen ? chosen.title : "Per desa"}</CardTitle>
              <CardDescription>{chosen ? "Status butir ini pada tiap desa." : "Diurutkan dari desa dengan keterlambatan terbanyak."}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Desa</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead>Wilayah terdaftar di profil desa</TableHead>
                    {chosen ? (
                      <>
                        <TableHead>Status</TableHead>
                        <TableHead>Tenggat</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-right">Terlambat</TableHead>
                        <TableHead className="text-right">Segera</TableHead>
                        <TableHead className="text-right">Terkirim</TableHead>
                        <TableHead>Tenggat terdekat</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((v) => {
                    const cell = chosen ? v.cells[chosen.key] : null;
                    return (
                      <TableRow key={v.villageId}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell>{v.district}</TableCell>
                        <TableCell className="break-words text-xs">{v.regency || "-"}, {v.province || "-"}<span className="block text-muted-foreground">Ketetapan katalog dicocokkan lewat {v.matchedBy === "KODE" ? "kode wilayah" : "teks wilayah"}</span></TableCell>
                        {chosen ? (
                          <>
                            <TableCell>{cell ? <StatusPill status={cell.status} late={cell.late} /> : <span className="text-muted-foreground">Tidak berlaku</span>}</TableCell>
                            <TableCell>{cell?.due ? fmtDate(cell.due) : "-"}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-right tabular-nums">{v.tally.terlambat > 0 ? <strong className="text-destructive">{v.tally.terlambat}</strong> : 0}</TableCell>
                            <TableCell className="text-right tabular-nums">{v.tally.segera}</TableCell>
                            <TableCell className="text-right tabular-nums">{v.tally.terkirim}/{v.tally.total}</TableCell>
                            <TableCell>{v.next ? <span className="break-words">{v.next.title}<span className="block text-xs text-muted-foreground">{fmtDate(v.next.due)} · {daysText(v.next.daysLeft)}</span></span> : <span className="text-muted-foreground">-</span>}</TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                  {!rows.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground">{data.villages.length ? "Tidak ada desa yang cocok dengan saringan." : "Belum ada desa berlangganan aktif di wilayah ini."}</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}

      <KatalogPanel onChanged={reload} />
    </div>
  );
}
