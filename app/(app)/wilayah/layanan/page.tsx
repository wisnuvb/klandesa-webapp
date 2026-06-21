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

type ServicesData = {
  mail: {
    totalServices: number;
    pendingRequests: number;
    byDistrict: Array<{ district: string; services: number; pending: number }>;
  };
  citizenReports: {
    open: number;
    resolved: number;
    byCategory: Array<{ category: string; count: number }>;
  };
  socialBenefits: { activePrograms: number; beneficiaries: number };
  engagement: {
    announcements: number;
    forumThreads: number;
    kioskDevices: number;
  };
};

export default function WilayahLayananPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ServicesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/regional/services", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | ServicesData
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            (json as { error?: string })?.error ?? "Gagal memuat layanan",
          );
          return;
        }
        setData(json as ServicesData);
      } catch {
        if (!cancelled) setError("Gagal memuat layanan");
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
        title="Layanan publik"
        userName={session?.user?.name}
        description="Volume surat, pengaduan warga, bansos, dan engagement portal."
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
                <CardTitle className="text-sm">Surat terbit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.mail.totalServices.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pending: {data.mail.pendingRequests}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pengaduan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.citizenReports.open}</p>
                <p className="text-xs text-muted-foreground">
                  Terselesaikan: {data.citizenReports.resolved}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Bansos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.socialBenefits.beneficiaries.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.socialBenefits.activePrograms} program aktif
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Kiosk aktif</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.engagement.kioskDevices}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Surat per kecamatan</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kecamatan</TableHead>
                      <TableHead className="text-right">Terbit</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.mail.byDistrict.map((d) => (
                      <TableRow key={d.district}>
                        <TableCell>{d.district}</TableCell>
                        <TableCell className="text-right">{d.services}</TableCell>
                        <TableCell className="text-right">{d.pending}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pengaduan per kategori</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableBody>
                    {data.citizenReports.byCategory.map((c) => (
                      <TableRow key={c.category}>
                        <TableCell>{c.category}</TableCell>
                        <TableCell className="text-right">{c.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engagement portal warga</CardTitle>
              <CardDescription>Pengumuman dan forum diskusi</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-8 text-sm">
              <div>
                <p className="text-2xl font-bold">
                  {data.engagement.announcements}
                </p>
                <p className="text-muted-foreground">Pengumuman</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.engagement.forumThreads}
                </p>
                <p className="text-muted-foreground">Thread forum</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
