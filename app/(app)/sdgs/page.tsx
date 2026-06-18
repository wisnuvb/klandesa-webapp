"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AsyncState, MetricGrid, type MetricItem } from "@/components/app/patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/components/ui/utils";
import {
  LarasDashboardCard,
  LARAS_SDGS_PROMPTS,
} from "@/components/ai/LarasDashboardCard";
import { AI_ASSISTANT_NAME } from "@/lib/ai/persona";
import { useSdgsDashboard } from "./_hooks/useSdgsDashboard";
import type { SdgGoalScore } from "@/lib/sdgs/types";
import type { SdgSpendingSummary } from "@/lib/finance/sdg-spending";

function statusBadge(status: SdgGoalScore["status"]) {
  switch (status) {
    case "good":
      return <Badge className="bg-emerald-600">Baik</Badge>;
    case "moderate":
      return <Badge variant="secondary">Sedang</Badge>;
    case "low":
      return <Badge variant="destructive">Perlu perhatian</Badge>;
    default:
      return <Badge variant="outline">Data kurang</Badge>;
  }
}

function GoalCard({ goal }: { goal: SdgGoalScore }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Goal {goal.goalId}</p>
            <CardTitle className="text-base leading-snug">{goal.shortTitle}</CardTitle>
          </div>
          {statusBadge(goal.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-end justify-between mb-1">
            <span className="text-2xl font-semibold">
              {goal.score != null ? `${goal.score}` : "—"}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <Progress value={goal.score ?? 0} className="h-2" />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{goal.title}</p>
        <ul className="text-xs space-y-1">
          {goal.indicators.slice(0, 2).map((ind) => (
            <li key={ind.label} className="flex justify-between gap-2">
              <span className="text-muted-foreground truncate">{ind.label}</span>
              <span className="font-medium shrink-0">{ind.value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function SdgsDashboardPage() {
  const { data, loading, error, reload } = useSdgsDashboard();
  const [spending, setSpending] = useState<SdgSpendingSummary | null>(null);

  useEffect(() => {
    if (!data) return;
    void fetch(`/api/finance/sdg-spending?year=${data.year}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setSpending(json.data as SdgSpendingSummary);
      })
      .catch(() => setSpending(null));
  }, [data]);

  const metrics: MetricItem[] = data
    ? [
        {
          title: "Skor SDGs Desa",
          value: data.overallScore != null ? `${data.overallScore}` : "—",
          subtitle: `Tahun ${data.year}`,
          icon: Target,
          accent: "primary",
        },
        {
          title: "Goal on track",
          value: data.goalsOnTrack,
          subtitle: "Skor ≥ 70",
          icon: CheckCircle2,
          accent: "green",
        },
        {
          title: "Perlu perhatian",
          value: data.goalsNeedAttention,
          subtitle: "Skor < 45",
          icon: AlertTriangle,
          accent: "orange",
        },
        {
          title: "RT/RW terpeta",
          value: data.heatmap.length,
          subtitle: "Heatmap partisipatif",
          icon: TrendingUp,
          accent: "info",
        },
      ]
    : [];

  return (
    <AsyncState
      loading={loading}
      error={error}
      onRetry={reload}
      loadingMessage="Menghitung skor SDGs desa..."
    >
      {data ? (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary">
                  <Globe2 className="h-5 w-5" />
                  <span className="font-medium">SDGs Desa — monitoring internal</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Skor dihitung dari data warga, PKK, BUMDes, keuangan, dan modul desa lain.
                  Validasi resmi tetap melalui portal Kemendesa.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(data.moduleCoverage).map(([key, ok]) => (
                    <Badge key={key} variant={ok ? "default" : "outline"}>
                      {key}: {ok ? "ada data" : "belum"}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button asChild variant="outline">
                  <a href={data.kemendesaUrl} target="_blank" rel="noopener noreferrer">
                    Buka Dashboard SDGs Kemendesa
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
                {!data.idmVillageCode ? (
                  <Button asChild variant="link" className="text-xs h-auto p-0">
                    <Link href="/pengaturan-desa">Isi kode desa IDM/SDGs →</Link>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    Kode IDM: {data.idmVillageCode}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <MetricGrid items={metrics} />

          <LarasDashboardCard
            title={`${AI_ASSISTANT_NAME} — analisa SDGs`}
            tagline="Minta Laras merangkum skor di atas, mengidentifikasi goal yang perlu perhatian, dan menyusun prioritas program—berdasarkan data desa yang sama dengan dashboard ini. Bukan pengganti penilaian resmi Kemendesa."
            prompts={LARAS_SDGS_PROMPTS}
            mode="sdgs_analysis"
          />

          {spending ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Belanja APBDes per Goal SDGs ({spending.year})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Agregasi dari anggaran & transaksi yang ditag SDGs.{" "}
                  <Link href="/rpjmdes" className="text-primary underline-offset-4 hover:underline">
                    Kelola RPJMDes →
                  </Link>
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {spending.goals
                    .filter((g) => g.totalSpending > 0)
                    .sort((a, b) => b.totalSpending - a.totalSpending)
                    .slice(0, 9)
                    .map((g) => (
                      <div key={g.goalId} className="rounded-lg border p-3 space-y-1">
                        <p className="text-sm font-medium">
                          Goal {g.goalId} — {g.shortTitle}
                        </p>
                        <p className="text-lg font-semibold">
                          Rp {g.totalSpending.toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Realisasi anggaran + transaksi belanja
                        </p>
                      </div>
                    ))}
                </div>
                {spending.untaggedRealized + spending.untaggedTransactions > 0 ? (
                  <p className="text-xs text-muted-foreground mt-4">
                    Belum ditag SDGs: Rp{" "}
                    {(spending.untaggedRealized + spending.untaggedTransactions).toLocaleString(
                      "id-ID",
                    )}{" "}
                    — tag via modul Anggaran/Keuangan.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <div>
            <h2 className="text-lg font-semibold mb-3">18 Goal SDGs Desa</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.goals.map((goal) => (
                <GoalCard key={goal.goalId} goal={goal} />
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Heatmap RT/RW</CardTitle>
              <p className="text-sm text-muted-foreground">
                Prioritas intervensi berdasarkan kesehatan (stunting) dan kemiskinan (desil) per RT/RW
              </p>
            </CardHeader>
            <CardContent>
              {data.heatmap.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Belum ada data RT/RW pada data warga. Lengkapi field RT/RW di data penduduk.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Wilayah</TableHead>
                        <TableHead className="text-right">Penduduk</TableHead>
                        <TableHead className="text-right">Kesehatan</TableHead>
                        <TableHead className="text-right">Kemiskinan</TableHead>
                        <TableHead className="text-right">Komposit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.heatmap.map((row) => (
                        <TableRow key={`${row.rt}-${row.rw}`}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right">{row.population}</TableCell>
                          <TableCell className="text-right">
                            {row.healthScore ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.povertyScore ?? "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold",
                              row.compositeScore != null && row.compositeScore < 45
                                ? "text-destructive"
                                : row.compositeScore != null && row.compositeScore >= 70
                                  ? "text-emerald-600"
                                  : "",
                            )}
                          >
                            {row.compositeScore ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            Diperbarui: {new Date(data.computedAt).toLocaleString("id-ID")}
          </p>
        </div>
      ) : null}
    </AsyncState>
  );
}
