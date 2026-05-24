"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { StatsCard } from "@/components/app/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Gift, Landmark, Receipt } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { formatIdr } from "@/lib/billing/catalog";

type SummaryResponse = {
  totals?: {
    accrued: number;
    approved: number;
    disbursed: number;
    pendingPayout: number;
  };
  rule?: {
    closingBonusAmount: string | number;
    subscriptionSharePercent: string | number;
    isActive: boolean;
  } | null;
  byTypeStatus?: Array<{
    type: string;
    status: string;
    _sum: { amount: unknown };
    _count: { id: number };
  }>;
};

type CommissionRow = {
  id: string;
  villageId: number | null;
  type: string;
  amount: string | number;
  description: string | null;
  status: string;
  createdAt: string;
  village: {
    name: string;
    code: string;
    regency?: string | null;
    district?: string | null;
  } | null;
};

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "disbursed") return "default";
  if (status === "approved") return "secondary";
  if (status === "cancelled") return "destructive";
  return "outline";
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

export default function MitraKomisiPage() {
  const { data: session } = useSession();
  const isPartner = session?.user?.accountType === "partner";

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [totalLedger, setTotalLedger] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const qs = new URLSearchParams();
    if (typeFilter !== "all") qs.set("type", typeFilter);
    if (statusFilter !== "all") qs.set("status", statusFilter);
    qs.set("limit", "75");

    const [sumRes, listRes] = await Promise.all([
      fetch("/api/partner/commissions/summary", { cache: "no-store" }),
      fetch(`/api/partner/commissions?${qs.toString()}`, { cache: "no-store" }),
    ]);

    if (sumRes.ok) {
      setSummary(((await sumRes.json()) as SummaryResponse) ?? {});
    }
    if (listRes.ok) {
      const d = (await listRes.json()) as {
        commissions?: CommissionRow[];
        total?: number;
      };
      setCommissions(d.commissions ?? []);
      setTotalLedger(d.total ?? 0);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        if (!mounted) return;
        await reload();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [reload]);

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of summary?.byTypeStatus ?? []) {
      if (row.status === "cancelled") continue;
      const amt = Number(row._sum.amount ?? 0);
      if (!Number.isFinite(amt)) continue;
      map.set(row.type, (map.get(row.type) ?? 0) + amt);
    }
    return [...map.entries()].map(([label, total]) => ({ label, total }));
  }, [summary]);

  const t = summary?.totals;

  if (!isPartner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Akun tidak valid</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Halaman ini hanya untuk akun mitra.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Revenue &amp; komisi</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan bagi hasil (closing &amp; langganan desa Anda) serta riwayat
            entri ledger.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/mitra/disbursment">Lihat disbursement</Link>
        </Button>
      </div>

      {summary?.rule ? (
        <Card className="border-blue-900/30 bg-muted/40">
          <CardContent className="py-4 text-sm">
            <span className="font-medium">Skema aktif Anda: </span>
            closing bonus {formatIdr(Number(summary.rule.closingBonusAmount ?? 0))},{" "}
            {Number(summary.rule.subscriptionSharePercent ?? 0)}% dari tagihan lunas yang
            memenuhi syarat.
            {!summary.rule.isActive ? (
              <Badge variant="destructive" className="ml-2">
                Tidak aktif
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Skema komisi Anda akan dibuat oleh admin setelah akun Anda aktif.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Dialokasi (belum di-approve)"
          value={loading ? "…" : formatIdr(t?.accrued ?? 0)}
          icon={Gift}
          color="warning"
        />
        <StatsCard
          title="Menunggu payout"
          value={loading ? "…" : formatIdr(t?.approved ?? 0)}
          icon={Receipt}
          color="info"
        />
        <StatsCard
          title="Sudah dibayarkan"
          value={loading ? "…" : formatIdr(t?.disbursed ?? 0)}
          icon={CreditCard}
          color="success"
        />
        <StatsCard
          title="Hitungan ledger (difilter)"
          value={loading ? "…" : String(totalLedger)}
          icon={Landmark}
          color="primary"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Komisi menurut tipe</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {chartData.length === 0 ? (
            <div className="text-sm text-muted-foreground h-full flex items-center justify-center">
              Belum ada data komisi untuk ditampilkan.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="4 8" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number | string) =>
                    `${Math.round(Number(v) / 1000)}rb`
                  }
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <RechartsTooltip
                  formatter={(value: unknown) => {
                    const v = typeof value === "number" ? value : Number(value);
                    return [Number.isFinite(v) ? formatIdr(v) : String(value), "Jumlah"];
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Ledger komisi</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Filter tidak mengubah kartu ringkasan di atas — hanya memfilter tabel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="accrued">accrued</SelectItem>
                <SelectItem value="approved">approved</SelectItem>
                <SelectItem value="disbursed">disbursed</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                <SelectItem value="CLOSING">CLOSING</SelectItem>
                <SelectItem value="SUBSCRIPTION">SUBSCRIPTION</SelectItem>
                <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => void reload()}
            >
              Muat ulang
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : commissions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Tidak ada entri dengan filter tersebut.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="text-left border-b">
                    <th className="p-3 font-medium">Waktu</th>
                    <th className="p-3 font-medium">Desa</th>
                    <th className="p-3 font-medium">Tipe</th>
                    <th className="p-3 font-medium text-right">Jumlah</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                      <td className="p-3 max-w-[200px]">
                        <div className="truncate">{c.village?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.village?.code ?? ""}
                        </div>
                        {c.description ? (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{c.type}</Badge>
                      </td>
                      <td className="p-3 text-right font-medium tabular-nums">
                        {formatIdr(Number(c.amount ?? 0))}
                      </td>
                      <td className="p-3">
                        <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
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
