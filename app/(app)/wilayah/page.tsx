"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Download,
  Mail,
  Target,
  Users,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RegionalPageHeader } from "@/components/regional/RegionalPageHeader";
import { scopeTitle } from "@/lib/regional-nav";
import type { RegionalScope } from "@/lib/regional-session";

type SummaryResponse = {
  scope: RegionalScope;
  villageCount: number;
  villagesIncluded: number;
  totals: {
    residents: number;
    officials: number;
    mailServices: number;
    pendingMailRequests: number;
  };
  villages: Array<{
    id: number;
    code: string;
    name: string;
    district: string;
    regency: string;
    isActive: boolean;
    subscriptionActive: boolean;
    includedInAggregate: boolean;
  }>;
};

type OverviewResponse = {
  digitalIndex: number;
  demographics: {
    totalResidents: number;
    stuntingRate: number | null;
    desil12Rate: number | null;
  };
  sdgs: { overallScore: number | null; villagesScored: number };
  adoption: {
    totalVillages: number;
    subscribedVillages: number;
    includedInAggregate: number;
  };
  finance: {
    budgetAmount: number;
    realizedAmount: number;
    realizationPct: number;
  };
  alerts: Array<{
    type: string;
    severity: string;
    villageName: string;
    district: string;
    message: string;
  }>;
};

export default function WilayahOverviewPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sumRes, ovRes] = await Promise.all([
          fetch("/api/regional/summary", { cache: "no-store" }),
          fetch("/api/regional/overview", { cache: "no-store" }),
        ]);
        const sumJson = (await sumRes.json().catch(() => null)) as
          | SummaryResponse
          | { error?: string }
          | null;
        const ovJson = (await ovRes.json().catch(() => null)) as
          | OverviewResponse
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!sumRes.ok) {
          setError(
            (sumJson as { error?: string })?.error ?? "Gagal memuat ringkasan",
          );
          return;
        }
        setSummary(sumJson as SummaryResponse);
        if (ovRes.ok) setOverview(ovJson as OverviewResponse);
        setError(null);
      } catch {
        if (!cancelled) setError("Gagal memuat ringkasan");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scope = summary?.scope;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <RegionalPageHeader
          title="Ringkasan wilayah"
          userName={session?.user?.name}
          description="Agregat antar desa di lingkup Anda — tanpa detail identitas warga."
        />
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "/api/regional/export?format=csv";
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "/api/regional/export?format=json";
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {scope && !loading && summary && (
        <>
          <p className="text-sm font-medium text-muted-foreground">
            {scopeTitle(scope)}
          </p>

          {overview && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Indeks Digital Desa
                </CardTitle>
                <CardDescription>
                  Gabungan adopsi modul, SDGs, realisasi APBDes, dan sinkronisasi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">
                    {overview.digitalIndex}
                  </span>
                  <span className="text-sm text-muted-foreground pb-1">/ 100</span>
                </div>
                <Progress value={overview.digitalIndex} className="h-2" />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desa</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.villageCount}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.villagesIncluded} dalam agregat
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warga</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.totals.residents.toLocaleString("id-ID")}
                </div>
                {overview?.demographics.stuntingRate != null && (
                  <p className="text-xs text-muted-foreground">
                    Stunting: {overview.demographics.stuntingRate}%
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SDGs</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview?.sdgs.overallScore ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Skor rata-rata desa
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Surat</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.totals.mailServices.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending:{" "}
                  {summary.totals.pendingMailRequests.toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          </div>

          {overview && overview.finance.budgetAmount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Realisasi APBDes {new Date().getFullYear()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {overview.finance.realizationPct}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Rp{" "}
                  {overview.finance.realizedAmount.toLocaleString("id-ID")} dari
                  Rp {overview.finance.budgetAmount.toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          )}

          {overview && overview.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Perhatian ({overview.alerts.length})
                </CardTitle>
                <CardDescription>
                  Desa yang memerlukan tindak lanjut supervisi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {overview.alerts.slice(0, 10).map((a, i) => (
                  <div
                    key={i}
                    className="flex gap-2 text-sm border-b border-border/50 pb-2 last:border-0"
                  >
                    <Badge
                      variant={
                        a.severity === "critical" ? "destructive" : "secondary"
                      }
                      className="shrink-0 h-5"
                    >
                      {a.type}
                    </Badge>
                    <div>
                      <span className="font-medium">{a.villageName}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {a.district}
                      </span>
                      <p className="text-muted-foreground text-xs">{a.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Desa di wilayah</CardTitle>
              <CardDescription>
                Metadata desa; non-aktif atau tanpa langganan mungkin di luar
                agregat.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kecamatan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.villages.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">
                        {v.code}
                      </TableCell>
                      <TableCell>{v.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {v.district}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {!v.isActive && (
                            <Badge variant="secondary">Nonaktif</Badge>
                          )}
                          {v.isActive && !v.subscriptionActive && (
                            <Badge variant="outline">Langganan off</Badge>
                          )}
                          {v.includedInAggregate && (
                            <Badge>Agregat</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Detail:{" "}
            <Link href="/wilayah/demografi" className="underline">
              Demografi
            </Link>
            {" · "}
            <Link href="/wilayah/sdgs" className="underline">
              SDGs
            </Link>
            {" · "}
            <Link href="/wilayah/adopsi" className="underline">
              Adopsi
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
