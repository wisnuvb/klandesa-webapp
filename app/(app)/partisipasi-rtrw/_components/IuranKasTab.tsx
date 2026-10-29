"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Summary = { charges: number; billed: number; collected: number; outstanding: number; overdue: number; claimed: number; collectionPercent: number | null };
type Group = {
  key: string;
  scope: "desa" | "rt";
  label: string;
  schedules: number;
  summary: Summary;
  balance: { income: number; expense: number; balance: number };
  pendingClaims: number;
};
type Overview = { period: string; groups: Group[]; total: Summary; pendingClaims: number };

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const periodLabel = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1] ?? p} ${p.slice(0, 4)}`;
function shift(p: string, delta: number) {
  const d = new Date(Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function IuranKasTab() {
  const [period, setPeriod] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/iuran/overview${p ? `?period=${p}` : ""}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Gagal memuat iuran");
      setData(json as Overview);
      setPeriod((json as Overview).period);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat iuran");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  const nav = (delta: number) => period && void load(shift(period, delta));
  const t = data?.total;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Halaman ini hanya menampilkan rekap. Jadwal iuran, pencatatan pembayaran, dan buku kas dikelola Ketua RT dan perangkat desa di aplikasi Klandesa.
          Klandesa tidak memegang uang iuran: warga membayar langsung ke RT atau desa.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Bulan sebelumnya" onClick={() => nav(-1)} disabled={loading || !period}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-40 text-center font-medium" aria-live="polite">{period ? periodLabel(period) : "…"}</span>
        <Button variant="outline" size="icon" aria-label="Bulan berikutnya" onClick={() => nav(1)} disabled={loading || !period}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Memuat" /> : null}
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load(period)}>Coba lagi</Button>
        </div>
      ) : null}

      {t ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Ditagih" value={rupiah(t.billed)} hint={`${t.charges} tagihan KK`} />
          <Stat label="Terkumpul" value={rupiah(t.collected)} hint={t.collectionPercent == null ? "Belum ada tagihan" : `${t.collectionPercent}% dari tagihan`} />
          <Stat label="Belum terbayar" value={rupiah(t.outstanding)} hint={`${t.overdue} lewat jatuh tempo`} />
          <Stat label="Menunggu dicek" value={String(data?.pendingClaims ?? 0)} hint="laporan bayar warga" />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Per RT dan desa</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada jadwal iuran. Ketua RT atau perangkat desa membuatnya di aplikasi (menu Iuran).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelompok</TableHead>
                  <TableHead className="text-right">Jadwal</TableHead>
                  <TableHead className="text-right">Ditagih</TableHead>
                  <TableHead className="text-right">Terkumpul</TableHead>
                  <TableHead className="text-right">Belum terbayar</TableHead>
                  <TableHead>Terkumpul %</TableHead>
                  <TableHead className="text-right">Menunggu dicek</TableHead>
                  <TableHead className="text-right">Saldo kas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.groups ?? []).map((g) => (
                  <TableRow key={g.key}>
                    <TableCell className="font-medium">{g.label}</TableCell>
                    <TableCell className="text-right">{g.schedules}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(g.summary.billed)}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(g.summary.collected)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {rupiah(g.summary.outstanding)}
                      {g.summary.overdue > 0 ? (
                        <Badge variant="outline" className="ml-2 gap-1 border-amber-400 text-amber-700">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {g.summary.overdue} lewat tempo
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{g.summary.collectionPercent == null ? "—" : `${g.summary.collectionPercent}%`}</TableCell>
                    <TableCell className="text-right">{g.pendingClaims || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(g.balance.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
