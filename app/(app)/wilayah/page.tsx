"use client";

import { useEffect, useState } from "react";
import { BarChart3, Building2, Mail, Users } from "lucide-react";
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

export default function WilayahDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/regional/summary", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | SummaryResponse
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error ?? "Gagal memuat ringkasan",
          );
          setData(null);
          return;
        }
        setError(null);
        setData(json as SummaryResponse);
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

  const scopeTitle =
    data?.scope.level === "REGENCY"
      ? `Kabupaten / Kota — ${data.scope.regency}`
      : `Kecamatan — ${data?.scope.district ?? ""}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ringkasan wilayah
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {session?.user?.name ? `Halo, ${session.user.name}. ` : ""}
          Data di bawah adalah agregat antar desa di lingkup Anda (tanpa detail
          identitas warga).
        </p>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Memuat data…</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {data && !loading && (
        <>
          <p className="text-sm font-medium text-muted-foreground">
            {scopeTitle}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desa</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.villageCount}</div>
                <p className="text-xs text-muted-foreground">
                  {data.villagesIncluded} termasuk dalam agregat
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
                  {data.totals.residents.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total penduduk (semua desa terhitung)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Perangkat</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.totals.officials.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">Perangkat desa</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Surat</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.totals.mailServices.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Menunggu:{" "}
                  {data.totals.pendingMailRequests.toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Desa di wilayah</CardTitle>
              <CardDescription>
                Nama dan kode desa; desa non-aktif atau di luar filter
                langganan tetap tercantum tetapi bisa tidak masuk agregat.
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
                  {data.villages.map((v) => (
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
        </>
      )}
    </div>
  );
}
