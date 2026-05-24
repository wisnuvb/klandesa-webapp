"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCircle, Wallet, Landmark } from "lucide-react";

type SummaryTotals = {
  accrued: number;
  approved: number;
  disbursed: number;
  pendingPayout: number;
};

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

type PartnerMe = {
  partner: {
    id: number;
    email: string;
    name: string;
    phone: string | null;
    region: string | null;
    status: string;
  };
};

type PartnerProspect = {
  id: string;
  villageName: string;
  status: string;
  regency: string | null;
  district: string | null;
  createdAt: string;
};

export default function MitraDashboardPage() {
  const { data: session } = useSession();
  const isPartner = session?.user?.accountType === "partner";

  const [me, setMe] = useState<PartnerMe | null>(null);
  const [prospects, setProspects] = useState<PartnerProspect[]>([]);
  const [loading, setLoading] = useState(true);

  const greetingName = useMemo(() => {
    const name = session?.user?.name || "";
    return name ? name : "Mitra";
  }, [session?.user?.name]);

  const [totalVillages, setTotalVillages] = useState<number | null>(null);
  const [summary, setSummary] = useState<SummaryTotals | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [meRes, prosRes, vilRes, sumRes] = await Promise.all([
          fetch("/api/partner/me", { cache: "no-store" }),
          fetch("/api/partner/prospects?limit=5", { cache: "no-store" }),
          fetch("/api/partner/villages?limit=1", { cache: "no-store" }),
          fetch("/api/partner/commissions/summary", { cache: "no-store" }),
        ]);
        if (!mounted) return;

        if (meRes.ok) {
          const d = (await meRes.json().catch(() => null)) as PartnerMe | null;
          if (d) setMe(d);
        }

        if (prosRes.ok) {
          const d = (await prosRes.json().catch(() => null)) as
            | { prospects?: PartnerProspect[] }
            | null;
          setProspects(d?.prospects ?? []);
        }

        if (vilRes.ok) {
          const d = (await vilRes.json().catch(() => null)) as { total?: number } | null;
          if (typeof d?.total === "number") setTotalVillages(d.total);
        }

        if (sumRes.ok) {
          const d = (await sumRes.json().catch(() => null)) as {
            totals?: SummaryTotals;
          } | null;
          if (d?.totals) setSummary(d.totals);
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

  const disbursementHref = "/mitra/disbursment";

  if (!isPartner) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Akun tidak valid</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Halaman ini hanya untuk akun mitra.
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalProspects = loading ? "…" : String(prospects.length);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold">Halo, {greetingName}</h1>
          <p className="text-sm text-muted-foreground">
            {me?.partner?.region ? `Wilayah: ${me.partner.region}` : "Lengkapi profil untuk wilayah"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="flex-1 min-w-[120px] md:flex-initial md:w-auto">
            <Link href="/mitra/prospek">Tambah prospek</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 min-w-[120px] md:flex-initial md:w-auto">
            <Link href="/mitra/desa">Desa dikelola</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 min-w-[120px] md:flex-initial md:w-auto">
            <Link href="/mitra/komisi">Komisi</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 min-w-[120px] md:flex-initial md:w-auto">
            <Link href={disbursementHref}>Disbursement</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 min-w-[120px] md:flex-initial md:w-auto">
            <Link href="/mitra/profil">Profil</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospek terbaru</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalProspects}</div>
            <p className="text-xs text-muted-foreground">Menampilkan 5 terakhir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desa dikelola</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {loading ? "…" : totalVillages != null ? String(totalVillages) : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              <Link className="text-primary underline-offset-2 hover:underline" href="/mitra/desa">
                Pantau desa closing
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Komisi (ringkas)</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-2xl font-semibold text-muted-foreground">…</div>
            ) : summary ? (
              <>
                <div className="text-lg font-semibold leading-tight">
                  {formatRp(summary.accrued + summary.approved)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Belum payout:{" "}
                  <span className="font-medium text-foreground">{formatRp(summary.approved)}</span>
                  {" · "}Sudah cair: {formatRp(summary.disbursed)}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Belum ada data.</div>
            )}
            <p className="text-xs">
              <Link href="/mitra/komisi" className="text-primary underline-offset-2 hover:underline">
                Detail revenue &amp; ledger
              </Link>
              {" · "}
              <Link href={disbursementHref} className="text-primary underline-offset-2 hover:underline">
                Disbursement
              </Link>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profil &amp; rekening</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {me?.partner?.phone ? "Profil sudah terisi" : "Lengkapi profil"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Prospek terakhir</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/mitra/prospek">Lihat semua</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : prospects.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada prospek. Mulai dengan menambahkan desa yang Anda prospek.
            </div>
          ) : (
            <div className="space-y-3">
              {prospects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-1 rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.villageName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[p.district, p.regency].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground shrink-0">
                      {p.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
