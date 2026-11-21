"use client";

import { useCallback, useEffect, useState } from "react";
import { MessagesSquare, SearchCheck, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiJson } from "@/components/admin/security/api";
import { ClaimsTab } from "./ClaimsTab";
import { FlagsTab } from "./FlagsTab";
import { ModerationTab } from "./ModerationTab";

type Tab = "moderasi" | "klaim" | "konten";

function CountBadge({ n, label }: { n: number | null; label: string }) {
  if (!n) return null;
  return (
    <Badge variant="destructive" className="ml-2 tabular-nums" aria-label={`${n} ${label}`}>
      {n}
    </Badge>
  );
}

export function AspirasiConsole({ indexingEnabled }: { indexingEnabled: boolean }) {
  const [tab, setTab] = useState<Tab>("moderasi");
  const [pending, setPending] = useState<number | null>(null);
  const [claims, setClaims] = useState<number | null>(null);
  const [flags, setFlags] = useState<number | null>(null);
  const [focus, setFocus] = useState<{ code: string; nonce: number } | null>(null);

  // Lencana tab yang belum dibuka: ambil sekali di awal (tab aktif memperbaruinya sendiri).
  useEffect(() => {
    void apiJson<{ pending: number }>("/api/admin/aspirasi/claims?status=PENDING").then((r) => setClaims(r.pending)).catch(() => undefined);
    void apiJson<{ open: number }>("/api/admin/aspirasi/flags?status=OPEN").then((r) => setFlags(r.open)).catch(() => undefined);
  }, []);

  const onPending = useCallback((n: number) => setPending(n), []);
  const onClaims = useCallback((n: number) => setClaims(n), []);
  const onFlags = useCallback((n: number) => setFlags(n), []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessagesSquare className="h-6 w-6" aria-hidden="true" />
          Aspirasi Warga
        </h1>
        <p className="text-sm text-muted-foreground">Tinjau laporan warga sebelum tayang, verifikasi klaim desa, dan tangani laporan konten. Kontak pelapor hanya terlihat di sini.</p>
        <p role="status" className="flex items-center gap-2 text-sm">
          {indexingEnabled ? <SearchCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : <SearchX className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          <span>
            Pengindeksan mesin pencari: <strong>{indexingEnabled ? "MENYALA" : "MATI"}</strong> (ASPIRASI_INDEXING).{" "}
            {indexingEnabled ? "Laporan yang lolos syarat (lewat masa tenggang, isi cukup, tanpa laporan konten terbuka) masuk sitemap." : "Semua halaman aspirasi noindex dan tidak ada di sitemap."}
          </span>
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="moderasi" className="min-h-11">
            Moderasi
            <CountBadge n={pending} label="laporan menunggu tinjauan" />
          </TabsTrigger>
          <TabsTrigger value="klaim" className="min-h-11">
            Klaim desa
            <CountBadge n={claims} label="klaim menunggu verifikasi" />
          </TabsTrigger>
          <TabsTrigger value="konten" className="min-h-11">
            Laporan konten
            <CountBadge n={flags} label="laporan konten terbuka" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="moderasi" className="mt-4">
          <ModerationTab focus={focus} onCounts={onPending} />
        </TabsContent>
        <TabsContent value="klaim" className="mt-4">
          <ClaimsTab onCounts={onClaims} />
        </TabsContent>
        <TabsContent value="konten" className="mt-4">
          <FlagsTab
            onCounts={onFlags}
            onOpenAspiration={(code) => {
              setFocus({ code, nonce: Date.now() });
              setTab("moderasi");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
