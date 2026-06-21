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
import { Badge } from "@/components/ui/badge";
import { RegionalPageHeader } from "@/components/regional/RegionalPageHeader";

type SdgsData = {
  overallScore: number | null;
  villagesScored: number;
  goals: Array<{
    goalId: number;
    shortTitle: string;
    avgScore: number | null;
    villagesLow: number;
    villagesGood: number;
  }>;
  ranking: Array<{
    code: string;
    name: string;
    district: string;
    overallScore: number | null;
  }>;
  byDistrict: Array<{
    district: string;
    villageCount: number;
    avgOverallScore: number | null;
  }>;
};

function scoreBadge(score: number | null) {
  if (score == null) return <Badge variant="outline">—</Badge>;
  if (score >= 70) return <Badge className="bg-green-600">Baik</Badge>;
  if (score >= 45) return <Badge variant="secondary">Sedang</Badge>;
  return <Badge variant="destructive">Rendah</Badge>;
}

export default function WilayahSdgsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<SdgsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/regional/sdgs", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | SdgsData
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error ?? "Gagal memuat SDGs",
          );
          return;
        }
        setData(json as SdgsData);
      } catch {
        if (!cancelled) setError("Gagal memuat SDGs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RegionalPageHeader
        title="SDGs Desa"
        userName={session?.user?.name}
        description="Capaian 18 goal agregat — selaras portal SDGs Desa Kemendesa."
      />

      {loading && (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Skor rata-rata</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {data.overallScore ?? "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Desa terhitung</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.villagesScored}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Goal perlu perhatian</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {data.goals.filter((g) => (g.avgScore ?? 100) < 45).length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Capaian per goal</CardTitle>
              <CardDescription>Rata-rata skor lintas desa</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Goal</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead className="text-right">Skor</TableHead>
                    <TableHead className="text-right">Desa baik</TableHead>
                    <TableHead className="text-right">Desa rendah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.goals.map((g) => (
                    <TableRow key={g.goalId}>
                      <TableCell>{g.goalId}</TableCell>
                      <TableCell>{g.shortTitle}</TableCell>
                      <TableCell className="text-right">
                        <span className="mr-2">{g.avgScore ?? "—"}</span>
                        {scoreBadge(g.avgScore)}
                      </TableCell>
                      <TableCell className="text-right">{g.villagesGood}</TableCell>
                      <TableCell className="text-right">{g.villagesLow}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ranking desa</CardTitle>
                <CardDescription>Top berdasarkan skor keseluruhan</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Desa</TableHead>
                      <TableHead>Kec.</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ranking.slice(0, 15).map((v) => (
                      <TableRow key={v.code}>
                        <TableCell>{v.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {v.district}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {v.overallScore ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Per kecamatan</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kecamatan</TableHead>
                      <TableHead className="text-right">Desa</TableHead>
                      <TableHead className="text-right">Skor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byDistrict.map((d) => (
                      <TableRow key={d.district}>
                        <TableCell>{d.district}</TableCell>
                        <TableCell className="text-right">
                          {d.villageCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {d.avgOverallScore ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
