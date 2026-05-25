"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import Link from "next/link";
import { StatsCard } from "@/components/app/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, ShieldCheck } from "lucide-react";
import { hasPartnerPortalAccess } from "@/lib/partner-session";

type VillageRow = {
  id: number;
  code: string;
  name: string;
  district: string | null;
  regency: string | null;
  province: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiry: string | null;
  acquiredAt: string | null;
  acquisitionSource: string | null;
  isActive: boolean;
  subscriptionActive: boolean;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

export default function MitraDesaPage() {
  const { data: session } = useSession();
  const portalOk = useMemo(
    () => hasPartnerPortalAccess(session as Session | null),
    [session],
  );

  const [total, setTotal] = useState(0);
  const [villages, setVillages] = useState<VillageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/partner/villages?limit=100", { cache: "no-store" });
        if (!mounted) return;
        if (res.ok) {
          const d = (await res.json().catch(() => null)) as {
            total?: number;
            villages?: VillageRow[];
          } | null;
          setTotal(d?.total ?? 0);
          setVillages(d?.villages ?? []);
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

  const stats = useMemo(() => {
    const active = villages.filter((v) => v.subscriptionActive).length;
    const inactive = villages.length - active;
    return { active, inactive };
  }, [villages]);

  if (!portalOk) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Akun tidak valid</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Halaman ini hanya bagi pengguna dengan akses portal mitra (akun mitra atau desa tertaut referral).
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Desa yang dikelola</h1>
          <p className="text-sm text-muted-foreground">
            Desa yang sudah closing dan ditautkan ke akun Anda oleh admin Klandesa.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/mitra/prospek">Lihat prospek</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total desa"
          value={loading ? "…" : total}
          icon={Landmark}
          color="primary"
        />
        <StatsCard
          title="Langganan aktif"
          value={loading ? "…" : stats.active}
          icon={ShieldCheck}
          color="success"
        />
        <StatsCard
          title="Perlu perhatian"
          value={loading ? "…" : stats.inactive}
          icon={Landmark}
          color="warning"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daftar desa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : villages.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada desa tertaut. Prospek desa Anda di halaman Prospek akan diproses
              tim dan ditautkan setelah closing berhasil.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="text-left border-b">
                    <th className="p-3 font-medium">Desa</th>
                    <th className="p-3 font-medium">Wilayah</th>
                    <th className="p-3 font-medium">Paket</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium whitespace-nowrap">Tertaut</th>
                  </tr>
                </thead>
                <tbody>
                  {villages.map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium">{v.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {v.code}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {[v.district, v.regency, v.province].filter(Boolean).join(", ")}
                      </td>
                      <td className="p-3 capitalize">{v.subscriptionPlan}</td>
                      <td className="p-3">
                        <Badge variant={v.subscriptionActive ? "default" : "secondary"}>
                          {v.subscriptionActive ? "Aktif" : v.subscriptionStatus}
                        </Badge>
                        {!v.subscriptionActive && v.subscriptionExpiry ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            s/d {formatDate(v.subscriptionExpiry)}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(v.acquiredAt)}
                        {v.acquisitionSource ? (
                          <span className="block text-[10px] uppercase tracking-wide mt-1">
                            {v.acquisitionSource}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
