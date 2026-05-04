"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type VillageRow = {
  id: number;
  code: string;
  name: string;
  district: string;
  regency: string;
  province: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  isActive: boolean;
  createdAt: string;
};

export default function AdminDesaPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<VillageRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const q = useMemo(() => query.trim(), [query]);

  const load = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/admin/villages?query=${encodeURIComponent(q)}`;
      const res = await fetch(url, { cache: "no-store", signal });
      const data = (await res.json().catch(() => null)) as
        | { villages?: VillageRow[]; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error || "Gagal memuat desa");
      setRows(data?.villages ?? []);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Gagal memuat desa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [q]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Kelola desa</CardTitle>
          <div className="text-sm text-muted-foreground">
            Cari berdasarkan nama, kode, kecamatan, kabupaten, atau provinsi.
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari desa…"
            />
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setQuery("")}>
              Reset
            </Button>
          </div>
          {error ? (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daftar desa</CardTitle>
          <div className="text-sm text-muted-foreground">
            {loading ? "Memuat…" : `${rows.length} desa`}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Tidak ada data.</div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {rows.map((v) => (
                  <div key={v.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{v.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {v.code} · {[v.district, v.regency, v.province].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground shrink-0">
                        {v.isActive ? "aktif" : "nonaktif"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Paket: {v.subscriptionPlan} · Status: {v.subscriptionStatus}
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-4 font-medium">Desa</th>
                      <th className="py-2 pr-4 font-medium">Kode</th>
                      <th className="py-2 pr-4 font-medium">Wilayah</th>
                      <th className="py-2 pr-4 font-medium">Paket</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Aktif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((v) => (
                      <tr key={v.id} className="border-b border-border">
                        <td className="py-2 pr-4 font-medium">{v.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{v.code}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {[v.district, v.regency, v.province].filter(Boolean).join(" · ")}
                        </td>
                        <td className="py-2 pr-4">{v.subscriptionPlan}</td>
                        <td className="py-2 pr-4">{v.subscriptionStatus}</td>
                        <td className="py-2 pr-4">{v.isActive ? "ya" : "tidak"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
