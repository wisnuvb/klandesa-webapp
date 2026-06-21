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
import { RegionalPageHeader } from "@/components/regional/RegionalPageHeader";

type DemographicsData = {
  totalResidents: number;
  gender: { male: number; female: number };
  agePyramid: Array<{
    range: string;
    male: number;
    female: number;
    total: number;
  }>;
  welfare: {
    desil1: number;
    desil2: number;
    illiterate: number;
    disability: number;
    bpjsKis: number;
    stunting: number;
    pregnant: number;
  };
  stuntingRate: number | null;
  desil12Rate: number | null;
};

export default function WilayahDemografiPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DemographicsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/regional/demographics", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as
          | DemographicsData
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error ?? "Gagal memuat demografi",
          );
          return;
        }
        setData(json as DemographicsData);
      } catch {
        if (!cancelled) setError("Gagal memuat demografi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxAge = Math.max(...(data?.agePyramid.map((a) => a.total) ?? [1]), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <RegionalPageHeader
        title="Demografi & kesejahteraan"
        userName={session?.user?.name}
        description="Agregat penduduk tanpa identitas individu — untuk perencanaan program daerah."
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
                <CardTitle className="text-sm font-medium">
                  Total penduduk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.totalResidents.toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stunting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.stuntingRate != null ? `${data.stuntingRate}%` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.welfare.stunting.toLocaleString("id-ID")} kasus
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Desil 1–2</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.desil12Rate != null ? `${data.desil12Rate}%` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">BPJS KIS</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.welfare.bpjsKis.toLocaleString("id-ID")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Piramida usia</CardTitle>
                <CardDescription>Distribusi L/P per kelompok usia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.agePyramid.map((row) => (
                  <div key={row.range} className="flex items-center gap-2 text-xs">
                    <span className="w-10 shrink-0 text-muted-foreground">
                      {row.range}
                    </span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden flex">
                      <div
                        className="bg-blue-500/70 h-full"
                        style={{
                          width: `${(row.male / maxAge) * 50}%`,
                        }}
                      />
                      <div
                        className="bg-pink-500/70 h-full"
                        style={{
                          width: `${(row.female / maxAge) * 50}%`,
                        }}
                      />
                    </div>
                    <span className="w-16 text-right tabular-nums">
                      {row.total.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indikator kesejahteraan</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {[
                      ["Laki-laki", data.gender.male],
                      ["Perempuan", data.gender.female],
                      ["Desil 1", data.welfare.desil1],
                      ["Desil 2", data.welfare.desil2],
                      ["Buta huruf", data.welfare.illiterate],
                      ["Disabilitas", data.welfare.disability],
                      ["Ibu hamil", data.welfare.pregnant],
                    ].map(([label, val]) => (
                      <TableRow key={String(label)}>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(val).toLocaleString("id-ID")}
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
