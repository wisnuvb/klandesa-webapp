"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBox, Loading } from "@/components/app/incident/common";
import { useApiGet } from "@/hooks/useApiGet";
import { EventsTab } from "./EventsTab";
import { ReferralTab } from "./ReferralTab";
import { RisksTab } from "./RisksTab";
import { RondaTab } from "./RondaTab";
import { SatlinmasTab } from "./SatlinmasTab";
import { Findings } from "./shared";
import type { OverviewResp } from "./types";

type Tab = "kejadian" | "ronda" | "satlinmas" | "rawan" | "rujukan";

export function KeamananView() {
  const [tab, setTab] = useState<Tab>("kejadian");
  const { data, loading, error, reload } = useApiGet<OverviewResp>("/api/keamanan");
  const o = data;
  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Keamanan dan Ketertiban</h1>
        <p className="max-w-3xl text-muted-foreground">Mencatat kejadian dan mediasi, mengatur jadwal ronda adil beserta kehadirannya, mengelola anggota Satlinmas dan perlengkapannya, dan menandai wilayah rawan. Kasus kekerasan terhadap perempuan/anak tidak disimpan di sini: hanya dirujuk ke layanan.</p>
      </header>

      {loading && !o ? <Loading text="Memuat ringkasan…" /> : null}
      {error ? <ErrorBox message={error} /> : null}

      {o ? (
        <>
          <Findings items={o.findings.slice(0, 5)} label="Temuan keamanan" />
          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Kejadian masih berjalan", String(o.incidents.active)],
              [`Kejadian tahun ${o.incidents.year}`, String(o.incidents.yearToDate)],
              ["Ronda malam ini", `${o.tonight.present} hadir dari ${o.tonight.assigned} petugas${o.tonight.pending ? ` (${o.tonight.pending} belum dicatat)` : ""}`],
              ["Anggota Satlinmas aktif", String(o.counts.activeMembers)],
              ["Mediasi terjadwal", String(o.counts.scheduledMediations)],
              ["Tindak lanjut terbuka", `${o.counts.openFollowups}${o.counts.overdueFollowups ? ` (${o.counts.overdueFollowups} lewat batas)` : ""}`],
              ["Regu ronda aktif", String(o.counts.activeGroups)],
              ["Wilayah rawan tinggi", String(o.counts.highRiskAreas)],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="kejadian" className="min-h-11">Kejadian</TabsTrigger>
              <TabsTrigger value="ronda" className="min-h-11">Ronda</TabsTrigger>
              <TabsTrigger value="satlinmas" className="min-h-11">Satlinmas</TabsTrigger>
              <TabsTrigger value="rawan" className="min-h-11">Wilayah rawan</TabsTrigger>
              <TabsTrigger value="rujukan" className="min-h-11">Rujukan</TabsTrigger>
            </TabsList>
            <TabsContent value="kejadian" className="pt-4">
              <EventsTab onChanged={reload} goReferral={() => setTab("rujukan")} />
            </TabsContent>
            <TabsContent value="ronda" className="pt-4">
              <RondaTab onChanged={reload} />
            </TabsContent>
            <TabsContent value="satlinmas" className="pt-4">
              <SatlinmasTab onChanged={reload} />
            </TabsContent>
            <TabsContent value="rawan" className="pt-4">
              <RisksTab onChanged={reload} />
            </TabsContent>
            <TabsContent value="rujukan" className="pt-4">
              <ReferralTab onChanged={reload} />
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
