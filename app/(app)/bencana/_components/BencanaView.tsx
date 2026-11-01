"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiGet } from "@/hooks/useApiGet";
import { AlertsTab } from "./AlertsTab";
import { ErrorBox, Loading } from "./common";
import { EventsTab } from "./EventsTab";
import { PrepTab } from "./PrepTab";
import { ReadinessTab } from "./ReadinessTab";
import { ScoreBar } from "./ScoreBar";
import type { Resp } from "./types";

type Tab = "kejadian" | "kesiapsiagaan" | "peringatan" | "destana";

export function BencanaView() {
  const [tab, setTab] = useState<Tab>("kejadian");
  const { data, loading, error, reload } = useApiGet<Resp>("/api/bencana");
  const f = data?.readiness.findings ?? [];

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Kebencanaan</h1>
        <p className="max-w-3xl text-muted-foreground">Mencatat kejadian bencana beserta tindakan dan bantuan yang disalurkan, menyiapkan desa (ancaman, tempat pengungsian, relawan, rencana), mengirim peringatan dini ke warga, dan memantau kesiapan Desa Tangguh Bencana.</p>
      </header>

      {loading && !data ? <Loading text="Memuat ringkasan…" /> : null}
      {error ? <ErrorBox message={error} /> : null}

      {data ? (
        <>
          {f.length ? (
            <ul className="space-y-2" aria-label="Temuan kesiapsiagaan">
              {f.slice(0, 4).map((x) => (
                <li key={x.code} className={`flex items-start gap-2 rounded-md border p-3 text-sm ${x.level === "WARN" ? "border-amber-600/50 bg-amber-50 text-amber-950" : "border-sky-600/40 bg-sky-50 text-sky-950"}`}>
                  {x.level === "WARN" ? <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
                  <span className="min-w-0 break-words">
                    <span className="sr-only">{x.level === "WARN" ? "Perlu diperiksa: " : "Catatan: "}</span>
                    {x.message}
                    {x.ref ? <span className="block text-xs opacity-80">{x.ref}</span> : null}
                  </span>
                </li>
              ))}
              {f.length > 4 ? (
                <li className="text-sm text-muted-foreground">
                  {f.length - 4} temuan lain di tab{" "}
                  <button type="button" className="min-h-11 underline underline-offset-4" onClick={() => setTab("destana")}>
                    Kesiapan Destana
                  </button>
                  .
                </li>
              ) : null}
            </ul>
          ) : null}

          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {[
              ["Kejadian masih berjalan", String(data.incidents.active)],
              [`Kejadian tahun ${data.incidents.year}`, String(data.incidents.yearToDate)],
              ["Ancaman tercatat", `${data.counts.hazards}${data.counts.highRiskHazards ? ` (${data.counts.highRiskHazards} risiko tinggi)` : ""}`],
              ["Relawan aktif", String(data.counts.activeVolunteers)],
              ["Kapasitas pengungsian", `${data.capacity.shelter.toLocaleString("id-ID")} orang`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <ScoreBar label="Aktivitas Destana selesai" pct={data.readiness.score.pct} detail={`${data.readiness.score.done} dari ${data.readiness.score.total} (Peraturan BNPB 7/2025 Pasal 8). Tingkat resmi: ${data.readiness.currentLevel ? data.readiness.currentLevel.label : "belum dicatat"}.`} />
            <p className="text-sm text-muted-foreground">
              Dokumen rencana ditetapkan: {data.counts.adoptedPlans} dari {data.counts.plans}. Dampak tahun {data.incidents.year}: {data.incidents.impactYear.displaced.toLocaleString("id-ID")} mengungsi, {data.incidents.impactYear.houses.toLocaleString("id-ID")} rumah rusak, {data.incidents.impactYear.deaths.toLocaleString("id-ID")} meninggal.
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="kejadian" className="min-h-11">Kejadian</TabsTrigger>
              <TabsTrigger value="kesiapsiagaan" className="min-h-11">Kesiapsiagaan</TabsTrigger>
              <TabsTrigger value="peringatan" className="min-h-11">Peringatan dini</TabsTrigger>
              <TabsTrigger value="destana" className="min-h-11">Kesiapan Destana</TabsTrigger>
            </TabsList>
            <TabsContent value="kejadian" className="pt-4">
              <EventsTab onChanged={reload} />
            </TabsContent>
            <TabsContent value="kesiapsiagaan" className="pt-4">
              <PrepTab />
            </TabsContent>
            <TabsContent value="peringatan" className="pt-4">
              <AlertsTab />
            </TabsContent>
            <TabsContent value="destana" className="pt-4">
              <ReadinessTab onChanged={reload} />
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
}
