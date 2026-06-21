"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { RegionalPageHeader } from "@/components/regional/RegionalPageHeader";

type FinanceData = {
  year: number;
  totals: {
    budgetAmount: number;
    realizedAmount: number;
    realizationPct: number;
  };
  byCategory: Array<{ category: string; budget: number; realized: number }>;
  byVillage: Array<{
    name: string;
    district: string;
    budget: number;
    realized: number;
    realizationPct: number;
  }>;
  monthlyTrend: Array<{ month: string; income: number; expense: number }>;
};

function formatRp(n: number) {
  if (n >= 1_000_000_000) {
    return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  }
  if (n >= 1_000_000) {
    return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
  }
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function WilayahKeuanganPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<FinanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/regional/finance?year=${year}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as
          | FinanceData
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error ?? "Gagal memuat keuangan",
          );
          return;
        }
        setData(json as FinanceData);
      } catch {
        if (!cancelled) setError("Gagal memuat keuangan");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RegionalPageHeader
        title="Keuangan desa (APBDes)"
        userName={session?.user?.name}
        description={`Agregat anggaran dan realisasi tahun ${year} — tanpa detail transaksi individual.`}
      />

      {loading && (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && !loading && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Realisasi keseluruhan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-3xl font-bold">{data.totals.realizationPct}%</p>
              <Progress value={data.totals.realizationPct} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {formatRp(data.totals.realizedAmount)} dari{" "}
                {formatRp(data.totals.budgetAmount)}
              </p>
            </CardContent>
          </Card>

          {data.byCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Per sektor</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sektor</TableHead>
                      <TableHead className="text-right">Anggaran</TableHead>
                      <TableHead className="text-right">Realisasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byCategory.map((c) => (
                      <TableRow key={c.category}>
                        <TableCell>{c.category}</TableCell>
                        <TableCell className="text-right">
                          {formatRp(c.budget)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRp(c.realized)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.byVillage.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Per desa</CardTitle>
                <CardDescription>Diurutkan realisasi terendah</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Desa</TableHead>
                      <TableHead>Kec.</TableHead>
                      <TableHead className="text-right">Realisasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byVillage.slice(0, 30).map((v) => (
                      <TableRow key={v.name + v.district}>
                        <TableCell>{v.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {v.district}
                        </TableCell>
                        <TableCell className="text-right">
                          {v.realizationPct}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.totals.budgetAmount === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada data anggaran desa di wilayah ini.
            </p>
          )}
        </>
      )}
    </div>
  );
}
