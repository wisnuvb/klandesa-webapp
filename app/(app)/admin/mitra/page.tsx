"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PartnerApplicationRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  message: string;
  status: string;
  createdAt: string;
};

type PartnerRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  region: string | null;
  status: string;
  createdAt: string;
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

export default function AdminMitraPage() {
  const [q, setQ] = useState("");
  const query = useMemo(() => q.trim(), [q]);

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<PartnerApplicationRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedPassword, setApprovedPassword] = useState<string | null>(null);

  const load = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      setApprovedPassword(null);

      const [appsRes, partnersRes] = await Promise.all([
        fetch(`/api/admin/partner-applications?query=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal,
        }),
        fetch(`/api/admin/partners?query=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal,
        }),
      ]);

      const appsData = (await appsRes.json().catch(() => null)) as
        | { applications?: PartnerApplicationRow[]; error?: string }
        | null;
      const partnersData = (await partnersRes.json().catch(() => null)) as
        | { partners?: PartnerRow[]; error?: string }
        | null;

      if (!appsRes.ok) throw new Error(appsData?.error || "Gagal memuat pendaftaran mitra");
      if (!partnersRes.ok) throw new Error(partnersData?.error || "Gagal memuat akun mitra");

      setApplications(appsData?.applications ?? []);
      setPartners(partnersData?.partners ?? []);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [query]);

  const approve = async (applicationId: string) => {
    try {
      setApprovingId(applicationId);
      setError(null);
      setApprovedPassword(null);
      const res = await fetch(`/api/admin/partner-applications/${applicationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; tempPassword?: string }
        | null;
      if (!res.ok) throw new Error(data?.error || "Gagal approve");
      setApprovedPassword(data?.tempPassword ?? null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal approve");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Kelola mitra</CardTitle>
          <div className="text-sm text-muted-foreground">
            Pendaftaran mitra (lead) dan akun mitra yang sudah aktif.
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari… (nama/email/region)" />
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setQ("")}>
              Reset
            </Button>
          </div>
          {approvedPassword ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              Password sementara: <span className="font-mono">{approvedPassword}</span>
            </div>
          ) : null}
          {error ? (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pendaftaran mitra</CardTitle>
          <div className="text-sm text-muted-foreground">
            {loading ? "Memuat…" : `${applications.length} item`}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : applications.length === 0 ? (
            <div className="text-sm text-muted-foreground">Tidak ada data.</div>
          ) : (
            <div className="space-y-3">
              {applications.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.email} · {a.phone} · {a.region}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground shrink-0">{a.status}</div>
                  </div>
                  {a.message ? <div className="text-sm">{a.message}</div> : null}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-xs text-muted-foreground">Masuk: {formatDate(a.createdAt)}</div>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={approvingId === a.id || a.status !== "NEW"}
                      onClick={() => approve(a.id)}
                    >
                      {approvingId === a.id ? "Memproses…" : "Approve & buat akun"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Akun mitra</CardTitle>
          <div className="text-sm text-muted-foreground">{loading ? "Memuat…" : `${partners.length} akun`}</div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : partners.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada akun mitra.</div>
          ) : (
            <div className="space-y-3">
              {partners.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.email} · {[p.phone, p.region].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground shrink-0">{p.status}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Dibuat: {formatDate(p.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
