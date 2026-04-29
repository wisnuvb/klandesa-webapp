"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RecentActivity } from "@/components/app/RecentActivity";
import { StatsCard } from "@/components/app/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Wallet, TrendingUp } from "lucide-react";
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

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
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
  }, []);

  const genderData = stats?.charts.gender ?? fallbackGenderData;
  const ageData = stats?.charts.age ?? fallbackAgeData;
  const educationData = stats?.charts.education ?? fallbackEducationData;

  const totals = stats?.totals;

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
