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
import { Progress } from "@/components/ui/progress";
import { RegionalPageHeader } from "@/components/regional/RegionalPageHeader";

type AdoptionData = {
  totalVillages: number;
  activeVillages: number;
  subscribedVillages: number;
  includedInAggregate: number;
  moduleAdoption: Array<{
    module: string;
    label: string;
    villagesWithData: number;
    pct: number;
  }>;
  syncStatus: {
    villagesWithAnySync: number;
    byAdapter: Array<{ adapterId: string; villageCount: number }>;
  };
  villages: Array<{
    code: string;
    name: string;
    district: string;
    subscriptionActive: boolean;
    lastSyncAt: string | null;
    modulesUsed: number;
  }>;
};

export default function WilayahAdopsiPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AdoptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/regional/adoption", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | AdoptionData
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error ?? "Gagal memuat adopsi",
          );
          return;
        }
        setData(json as AdoptionData);
      } catch {
        if (!cancelled) setError("Gagal memuat adopsi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subPct =
    data && data.totalVillages > 0
      ? Math.round((data.subscribedVillages / data.totalVillages) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RegionalPageHeader
        title="Adopsi digital"
        userName={session?.user?.name}
        description="Seberapa banyak desa yang aktif menggunakan modul Klandesa dan sinkronisasi Kemendesa."
      />

      {loading && (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total desa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.totalVillages}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Berlangganan aktif</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.subscribedVillages}</p>
                <Progress value={subPct} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dalam agregat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.includedInAggregate}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pernah sync Kemendesa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.syncStatus.villagesWithAnySync}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Adopsi modul</CardTitle>
              <CardDescription>
                Persentase desa dengan data di modul tersebut
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.moduleAdoption.map((m) => (
                <div key={m.module}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{m.label}</span>
                    <span className="text-muted-foreground">
                      {m.villagesWithData} desa ({m.pct}%)
                    </span>
                  </div>
                  <Progress value={m.pct} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          {data.syncStatus.byAdapter.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sinkronisasi per adapter</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {data.syncStatus.byAdapter.map((a) => (
                      <TableRow key={a.adapterId}>
                        <TableCell className="font-mono text-sm">
                          {a.adapterId}
                        </TableCell>
                        <TableCell className="text-right">
                          {a.villageCount} desa
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Detail per desa</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Desa</TableHead>
                    <TableHead>Kec.</TableHead>
                    <TableHead className="text-right">Modul</TableHead>
                    <TableHead>Langganan</TableHead>
                    <TableHead>Sync terakhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.villages.map((v) => (
                    <TableRow key={v.code}>
                      <TableCell>{v.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.district}
                      </TableCell>
                      <TableCell className="text-right">{v.modulesUsed}</TableCell>
                      <TableCell>
                        {v.subscriptionActive ? (
                          <Badge>Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Off</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.lastSyncAt
                          ? new Date(v.lastSyncAt).toLocaleDateString("id-ID")
                          : "—"}
                      </TableCell>
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
