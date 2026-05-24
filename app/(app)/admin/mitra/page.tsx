"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartnerFinancePanel } from "./_components/PartnerFinancePanel";

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
  stats: {
    prospects: { total: number; byStatus: Record<string, number> };
    acquiredVillages: number;
  };
};

function formatDate(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw || "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

function formatProspectSummary(byStatus: Record<string, number>): string {
  const entries = Object.entries(byStatus).filter(
    (e): e is [string, number] => typeof e[0] === "string" && typeof e[1] === "number",
  );
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [linkingPartnerId, setLinkingPartnerId] = useState<number | null>(null);
  const [villageCodeByPartnerId, setVillageCodeByPartnerId] = useState<
    Record<number, string>
  >({});
  const [financePartnerId, setFinancePartnerId] = useState<number | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);
        setApprovedPassword(null);
        setActionError(null);
        setActionOk(null);

        const [appsRes, partnersRes] = await Promise.all([
          fetch(
            `/api/admin/partner-applications?query=${encodeURIComponent(query)}`,
            {
              cache: "no-store",
              signal,
            },
          ),
          fetch(`/api/admin/partners?query=${encodeURIComponent(query)}`, {
            cache: "no-store",
            signal,
          }),
        ]);

        const appsData = (await appsRes.json().catch(() => null)) as {
          applications?: PartnerApplicationRow[];
          error?: string;
        } | null;
        const partnersData = (await partnersRes.json().catch(() => null)) as {
          partners?: PartnerRow[];
          error?: string;
        } | null;

        if (!appsRes.ok)
          throw new Error(appsData?.error || "Gagal memuat pendaftaran mitra");
        if (!partnersRes.ok)
          throw new Error(partnersData?.error || "Gagal memuat akun mitra");

        setApplications(appsData?.applications ?? []);
        setPartners(partnersData?.partners ?? []);
      } catch (e) {
        const name =
          e && typeof e === "object" && "name" in e
            ? String((e as { name?: unknown }).name || "")
            : "";
        if (name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => {
      try {
        c.abort("cleanup");
      } catch {
        return;
      }
    };
  }, [load]);

  const approve = async (applicationId: string) => {
    try {
      setApprovingId(applicationId);
      setError(null);
      setApprovedPassword(null);
      setActionError(null);
      setActionOk(null);
      const res = await fetch(
        `/api/admin/partner-applications/${applicationId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        tempPassword?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal approve");
      setApprovedPassword(data?.tempPassword ?? null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal approve");
    } finally {
      setApprovingId(null);
    }
  };

  const setVillageAcquisition = async (
    partnerId: number,
    action: "link" | "unlink",
  ) => {
    try {
      setLinkingPartnerId(partnerId);
      setActionError(null);
      setActionOk(null);
      const villageCode = (villageCodeByPartnerId[partnerId] || "").trim();
      if (!villageCode) {
        setActionError("Kode desa wajib diisi");
        return;
      }

      const res = await fetch("/api/admin/villages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageCode,
          partnerId: action === "link" ? partnerId : null,
          acquisitionSource: "admin_mitra",
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; village?: { code?: string; name?: string } }
        | null;
      if (!res.ok) {
        throw new Error(data?.error || "Gagal memperbarui akuisisi desa");
      }

      setActionOk(
        action === "link"
          ? `Berhasil menautkan ${data?.village?.code || villageCode}`
          : `Berhasil melepas ${data?.village?.code || villageCode}`,
      );

      await load();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Gagal memperbarui akuisisi desa",
      );
    } finally {
      setLinkingPartnerId(null);
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
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari… (nama/email/region)"
            />
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => setQ("")}
            >
              Reset
            </Button>
          </div>
          {approvedPassword ? (
            <div className="rounded-lg border border-border p-3 text-sm">
              Password sementara:{" "}
              <span className="font-mono">{approvedPassword}</span>
            </div>
          ) : null}
          {error ? (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}
          {actionError ? (
            <div className="text-sm text-red-600" role="alert">
              {actionError}
            </div>
          ) : null}
          {actionOk ? (
            <div className="text-sm text-green-700" role="status">
              {actionOk}
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
                <div
                  key={a.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.email} · {a.phone} · {a.region}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground shrink-0">
                      {a.status}
                    </div>
                  </div>
                  {a.message ? (
                    <div className="text-sm">{a.message}</div>
                  ) : null}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      Masuk: {formatDate(a.createdAt)}
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={approvingId === a.id || a.status !== "NEW"}
                      onClick={() => approve(a.id)}
                    >
                      {approvingId === a.id
                        ? "Memproses…"
                        : "Approve & buat akun"}
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
          <div className="text-sm text-muted-foreground">
            {loading ? "Memuat…" : `${partners.length} akun`}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : partners.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada akun mitra.
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.email} ·{" "}
                        {[p.phone, p.region].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground shrink-0">
                      {p.status}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Dibuat: {formatDate(p.createdAt)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Prospek: {p.stats?.prospects?.total ?? 0}
                    {(p.stats?.prospects?.total ?? 0) > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        ({formatProspectSummary(p.stats.prospects.byStatus)})
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Akuisisi: {p.stats?.acquiredVillages ?? 0} desa
                  </div>

                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Input
                      value={villageCodeByPartnerId[p.id] || ""}
                      onChange={(e) =>
                        setVillageCodeByPartnerId((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      placeholder="Kode desa untuk ditautkan…"
                    />
                    <Button
                      className="w-full sm:w-auto"
                      disabled={linkingPartnerId === p.id}
                      onClick={() => setVillageAcquisition(p.id, "link")}
                    >
                      {linkingPartnerId === p.id ? "Memproses…" : "Tautkan"}
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      variant="outline"
                      disabled={linkingPartnerId === p.id}
                      onClick={() => setVillageAcquisition(p.id, "unlink")}
                    >
                      Lepas
                    </Button>
                  </div>
                  <Button
                    className="w-full mt-2"
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setFinancePartnerId((cur) =>
                        cur === p.id ? null : p.id,
                      )
                    }
                  >
                    {financePartnerId === p.id ? "Sembunyikan bagi hasil" : "Kelola bagi hasil"}
                  </Button>
                  {financePartnerId === p.id ? (
                    <PartnerFinancePanel partnerId={p.id} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
