"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VillageHeader } from "@/components/admin/villages/VillageHeader";
import { OverviewTab } from "@/components/admin/villages/OverviewTab";
import { SubscriptionTab } from "@/components/admin/villages/SubscriptionTab";
import { AccountsTab } from "@/components/admin/villages/AccountsTab";
import { HealthTab } from "@/components/admin/villages/HealthTab";
import { ActivityTab } from "@/components/admin/villages/ActivityTab";
import { readError, type VillageDetail } from "@/components/admin/villages/types";

export default function AdminDesaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [detail, setDetail] = useState<VillageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isInteger(id) || id < 1) {
        setError("ID desa tidak valid.");
        setLoading(false);
        return;
      }
      try {
        setError(null);
        const res = await fetch(`/api/admin/villages/${id}`, { cache: "no-store", signal });
        if (!res.ok) throw await readError(res, "Gagal memuat desa.");
        setDetail((await res.json()) as VillageDetail);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Gagal memuat desa.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);

  if (loading && !detail) {
    return (
      <div className="space-y-4 p-4 md:p-6" aria-busy="true" aria-label="Memuat desa">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-4 md:p-6">
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="flex items-center gap-2 text-destructive"><AlertTriangle aria-hidden="true" className="h-4 w-4" />{error ?? "Desa tidak ditemukan."}</div>
          <Button variant="outline" onClick={() => { setLoading(true); void load(); }} className="min-h-10">Coba lagi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <VillageHeader d={detail} />
      <Tabs defaultValue="ringkasan" className="space-y-2">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="ringkasan" className="min-h-9">Ringkasan</TabsTrigger>
          <TabsTrigger value="langganan" className="min-h-9">Langganan &amp; Tagihan</TabsTrigger>
          <TabsTrigger value="akun" className="min-h-9">Akun</TabsTrigger>
          <TabsTrigger value="kesehatan" className="min-h-9">Kesehatan Data</TabsTrigger>
          <TabsTrigger value="aktivitas" className="min-h-9">Aktivitas</TabsTrigger>
        </TabsList>
        <TabsContent value="ringkasan"><OverviewTab d={detail} /></TabsContent>
        <TabsContent value="langganan"><SubscriptionTab d={detail} onChanged={() => void load()} /></TabsContent>
        <TabsContent value="akun"><AccountsTab villageId={detail.village.id} /></TabsContent>
        <TabsContent value="kesehatan"><HealthTab villageId={detail.village.id} /></TabsContent>
        <TabsContent value="aktivitas"><ActivityTab villageId={detail.village.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
