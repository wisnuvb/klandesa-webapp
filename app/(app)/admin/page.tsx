"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, HeartHandshake, FileText } from "lucide-react";

type AdminStats = {
  villages: number;
  partners: number;
  partnerApplicationsNew: number;
};

function isAdminStats(value: unknown): value is AdminStats {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.villages === "number" &&
    typeof v.partners === "number" &&
    typeof v.partnerApplicationsNew === "number"
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as AdminStats | { error?: string } | null;
        if (!mounted) return;
        if (res.ok && isAdminStats(data)) {
          setStats(data);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold">Admin Klandesa</h1>
          <p className="text-sm text-muted-foreground">
            Kelola desa, mitra, dan operasional platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="w-full md:w-auto">
            <Link href="/admin/desa">Kelola desa</Link>
          </Button>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <Link href="/admin/mitra">Kelola mitra</Link>
          </Button>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <Link href="/admin/pemda">Akun pemda</Link>
          </Button>
          <Button asChild variant="outline" className="w-full md:w-auto">
            <Link href="/admin/mitra?tab=referral">Referral</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desa</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? "…" : String(stats?.villages ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total tenant desa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mitra aktif</CardTitle>
            <HeartHandshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? "…" : String(stats?.partners ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Akun mitra</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendaftaran baru</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? "…" : String(stats?.partnerApplicationsNew ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Mitra (status NEW)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
