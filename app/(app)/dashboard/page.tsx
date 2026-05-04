"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RecentActivity } from "@/components/app/RecentActivity";
import { StatsCard } from "@/components/app/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Wallet, TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type DashboardStats = {
  totals: {
    residents: number;
    households: number;
    officials: number;
    mailServices: number;
    budgetAvailable: number;
  };
  charts: {
    gender: { name: string; value: number; color?: string }[];
    age: { name: string; value: number }[];
    education: { name: string; value: number }[];
  };
  statusDesa?: {
    idm?: {
      configured: boolean;
      year: number;
      villageCode: string;
      cached: boolean;
      sourceUrl: string;
      score: number | null;
      status: string | null;
      subScores: { social: number | null; economic: number | null; ecology: number | null };
      error: string | null;
    };
    idmHistory?: Array<{
      year: number;
      cached: boolean;
      sourceUrl: string;
      score: number | null;
      status: string | null;
      error: string | null;
    }>;
    sdgs?: {
      dashboardUrl: string;
    };
  };
};

const fallbackGenderData = [
  { name: "Laki-laki", value: 0, color: "#0f766e" },
  { name: "Perempuan", value: 0, color: "#14b8a6" },
];

const fallbackAgeData = [
  { name: "0-17", value: 0 },
  { name: "18-30", value: 0 },
  { name: "31-45", value: 0 },
  { name: "46-60", value: 0 },
  { name: "60+", value: 0 },
];

const fallbackEducationData = [
  { name: "SD/Sederajat", value: 0 },
  { name: "SMP/Sederajat", value: 0 },
  { name: "SMA/Sederajat", value: 0 },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AppDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [idmYear, setIdmYear] = useState(() => `${new Date().getFullYear()}`);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const res = await fetch(`/api/dashboard/stats?idmYear=${encodeURIComponent(idmYear)}`);
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data: DashboardStats = await res.json();
        if (isMounted) setStats(data);
      } catch (error) {
        console.error("Gagal memuat statistik dashboard:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [idmYear]);

  const genderData = stats?.charts.gender ?? fallbackGenderData;
  const ageData = stats?.charts.age ?? fallbackAgeData;
  const educationData = stats?.charts.education ?? fallbackEducationData;

  const totals = stats?.totals;
  const idm = stats?.statusDesa?.idm;
  const sdgs = stats?.statusDesa?.sdgs;
  const idmHistory = stats?.statusDesa?.idmHistory ?? [];

  const idmYearOptions = Array.from({ length: 8 }, (_, i) => `${new Date().getFullYear() - i}`);

  const idmTrendData = idmHistory.map((x) => ({
    year: String(x.year),
    score: x.score ?? 0,
    hasData: x.score !== null,
  }));

  const downloadIdmCsv = () => {
    const rows = [
      ["tahun", "skor_idm", "status_idm", "catatan"],
      ...idmHistory.map((x) => [
        String(x.year),
        x.score === null ? "" : String(x.score),
        x.status ?? "",
        x.error ?? "",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `idm-${idm?.villageCode || "desa"}-${idmYear}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Warga"
          value={
            totals
              ? formatNumber(totals.residents)
              : isLoading
              ? "Memuat..."
              : "0"
          }
          icon={Users}
          color="primary"
        />
        <StatsCard
          title="Permohonan Surat"
          value={
            totals
              ? formatNumber(totals.mailServices)
              : isLoading
              ? "Memuat..."
              : "0"
          }
          icon={FileText}
          color="info"
        />
        <StatsCard
          title="Perangkat Desa"
          value={
            totals
              ? formatNumber(totals.officials)
              : isLoading
              ? "Memuat..."
              : "0"
          }
          icon={Users}
          color="success"
        />
        <StatsCard
          title="Dana Tersedia"
          value={
            totals
              ? formatCurrency(totals.budgetAvailable)
              : isLoading
              ? "Memuat..."
              : "Rp 0"
          }
          icon={Wallet}
          color="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Status IDM & SDGs</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={idmYear} onValueChange={setIdmYear}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {idmYearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={downloadIdmCsv}
                disabled={!idm?.configured || idmHistory.length === 0}
              >
                <Download className="h-4 w-4" />
                Export IDM
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat status…</p>
          ) : !idm?.configured ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Kode desa IDM/SDGs belum diisi. Isi dulu agar sistem bisa menarik status IDM dari portal
                resmi.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/pengaturan-desa"
                  className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                >
                  Isi kode desa
                </Link>
                {sdgs?.dashboardUrl ? (
                  <a
                    href={sdgs.dashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                  >
                    Buka Dashboard SDGs
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-sm">
                  IDM {idm.year}:{" "}
                  <span className="font-medium">{idm.status ?? "—"}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Skor:{" "}
                  <span className="font-mono">
                    {idm.score === null ? "—" : idm.score.toFixed(4)}
                  </span>
                </p>
              </div>
              {idm.error ? (
                <p className="text-sm text-muted-foreground">{idm.error}</p>
              ) : null}
              {idmTrendData.length ? (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={idmTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="year" className="text-xs" />
                      <YAxis className="text-xs" domain={[0, 1]} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {idm.sourceUrl ? (
                  <a
                    href={idm.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                  >
                    Lihat sumber IDM
                  </a>
                ) : null}
                {sdgs?.dashboardUrl ? (
                  <a
                    href={sdgs.dashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                  >
                    Buka Dashboard SDGs
                  </a>
                ) : null}
                <Link
                  href="/pengaturan-desa"
                  className="px-3 py-2 rounded-md border border-border text-sm hover:bg-accent transition-colors"
                >
                  Ubah kode desa
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Jenis Kelamin</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Usia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Education Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Education Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tingkat Pendidikan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={educationData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis type="number" className="text-xs" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  className="text-xs"
                />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <RecentActivity />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/data-warga"
              className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all duration-200 text-center block"
            >
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm">Tambah Warga</p>
            </Link>
            <Link
              href="/layanan-surat"
              className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all duration-200 text-center block"
            >
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm">Buat Surat</p>
            </Link>
            <Link
              href="/keuangan"
              className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all duration-200 text-center block"
            >
              <Wallet className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm">Input Keuangan</p>
            </Link>
            <Link
              href="/statistik"
              className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all duration-200 text-center block"
            >
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm">Lihat Laporan</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
