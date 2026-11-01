"use client";

import { useState } from "react";
import { AlertTriangle, ChevronRight, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Pill, SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { SEVERITIES } from "@/lib/incident/catalog";
import { useApiGet } from "@/hooks/useApiGet";
import { ErrorBox, FormDialog, Loading, SEVERITY_TONE, STATUS_TONE, fmtDateTime, opt, toLocalInput, type Field } from "./common";
import { EventDetailDialog } from "./EventDetail";
import type { EventView, EventsResp } from "./types";

const FILTERS: [string, string][] = [
  ["ACTIVE", "Masih berjalan"],
  ["", "Semua"],
  ["OPEN", "Dilaporkan"],
  ["RESPONDING", "Ditangani"],
  ["RESOLVED", "Selesai ditangani"],
  ["CLOSED", "Ditutup"],
  ["CANCELLED", "Dibatalkan"],
];

export const eventFields = (kinds: Record<string, string>): Field[] => [
  { key: "kind", label: "Jenis kejadian", type: "select", options: opt(kinds), required: true, half: true },
  { key: "severity", label: "Tingkat keparahan", type: "select", options: opt(SEVERITIES), half: true },
  { key: "title", label: "Judul kejadian", type: "text", required: true, max: 200, hint: "Contoh: Banjir luapan Kali Gede di RW 02." },
  { key: "occurredAt", label: "Waktu kejadian", type: "datetime", required: true, half: true },
  { key: "locationText", label: "Lokasi", type: "text", max: 255, half: true },
  { key: "rw", label: "RW", type: "text", max: 10, half: true },
  { key: "rt", label: "RT", type: "text", max: 10, half: true },
  { key: "hamlet", label: "Dusun", type: "text", max: 100, half: true },
  { key: "lat", label: "Lintang (opsional)", type: "text", inputMode: "decimal", half: true, hint: "Contoh: -7.6012. Isi bersama bujur." },
  { key: "lng", label: "Bujur (opsional)", type: "text", inputMode: "decimal", half: true },
  { key: "description", label: "Uraian kejadian", type: "textarea", max: 2000 },
  { key: "deathCount", label: "Meninggal (jiwa)", type: "number", half: true },
  { key: "missingCount", label: "Hilang (jiwa)", type: "number", half: true },
  { key: "injuredCount", label: "Luka (jiwa)", type: "number", half: true },
  { key: "displacedCount", label: "Mengungsi (jiwa)", type: "number", half: true },
  { key: "affectedHouseholds", label: "KK terdampak", type: "number", half: true },
  { key: "damagedHouses", label: "Rumah rusak", type: "number", half: true },
  { key: "loss", label: "Perkiraan kerugian (Rp)", type: "text", inputMode: "numeric", half: true, hint: "Angka saja, tanpa titik." },
  { key: "impactNote", label: "Catatan dampak", type: "textarea", max: 1000 },
  { key: "supraReportedAt", label: "Dilaporkan ke supra-desa pada", type: "datetime", half: true, hint: "Kosongkan bila belum dilaporkan." },
  { key: "supraReportedTo", label: "Instansi tujuan laporan", type: "text", max: 150, half: true, hint: "Mis. BPBD kabupaten, kecamatan." },
  { key: "supraReference", label: "Nomor/bukti laporan", type: "text", max: 150 },
];

export const eventInitial = (e: EventView | null): Record<string, string> => ({
  kind: e?.kind ?? "BANJIR",
  severity: e?.severity ?? "MEDIUM",
  title: e?.title ?? "",
  occurredAt: toLocalInput(e?.occurredAt),
  locationText: e?.locationText ?? "",
  rw: e?.rw ?? "",
  rt: e?.rt ?? "",
  hamlet: e?.hamlet ?? "",
  lat: e?.lat == null ? "" : String(e.lat),
  lng: e?.lng == null ? "" : String(e.lng),
  description: e?.description ?? "",
  deathCount: e?.deathCount == null ? "" : String(e.deathCount),
  missingCount: e?.missingCount == null ? "" : String(e.missingCount),
  injuredCount: e?.injuredCount == null ? "" : String(e.injuredCount),
  displacedCount: e?.displacedCount == null ? "" : String(e.displacedCount),
  affectedHouseholds: e?.affectedHouseholds == null ? "" : String(e.affectedHouseholds),
  damagedHouses: e?.damagedHouses == null ? "" : String(e.damagedHouses),
  loss: e?.loss == null ? "" : String(Math.round(Number(e.loss))),
  impactNote: e?.impactNote ?? "",
  supraReportedAt: e?.supra ? toLocalInput(e.supra.reportedAt) : "",
  supraReportedTo: e?.supra?.to ?? "",
  supraReference: e?.supra?.reference ?? "",
});

export function EventsTab({ onChanged }: { onChanged: () => void }) {
  const [filter, setFilter] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, loading, error, reload } = useApiGet<EventsResp>(`/api/bencana/kejadian?page=${page}${filter ? `&status=${filter}` : ""}`);
  const changed = () => {
    reload();
    onChanged();
  };

  return (
    <section aria-labelledby="bn-ev-h" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bn-ev-filter">Tampilkan</Label>
          <SearchSelect id="bn-ev-filter" className={`${SELECT_CLASS} w-52`} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            {FILTERS.map(([k, l]) => (
              <option key={k || "all"} value={k}>
                {l}
              </option>
            ))}
          </SearchSelect>
        </div>
        {data?.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Catat kejadian
          </Button>
        ) : null}
      </div>
      <h2 id="bn-ev-h" className="sr-only">
        Daftar kejadian bencana
      </h2>

      {loading && !data ? <Loading text="Memuat kejadian…" /> : null}
      {error ? <ErrorBox message={error} /> : null}

      {data && !data.rows.length ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{filter === "ACTIVE" ? "Tidak ada kejadian yang sedang berjalan. Bila terjadi bencana, catat di sini agar tindakan dan bantuan terdokumentasi." : "Tidak ada kejadian pada pilihan ini."}</p>
      ) : null}

      {data?.rows.length ? (
        <ul className="space-y-3">
          {data.rows.map((e) => (
            <li key={e.id} className="min-w-0 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold">{e.title}</p>
                  <p className="break-words text-sm text-muted-foreground">
                    {e.kindLabel} · {fmtDateTime(e.occurredAt)}
                    {e.locationText || e.rw ? ` · ${[e.locationText, e.rw ? `RW ${e.rw}${e.rt ? `/RT ${e.rt}` : ""}` : null].filter(Boolean).join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={SEVERITY_TONE[e.severity]}>{e.severityLabel}</Pill>
                  <Pill tone={STATUS_TONE[e.status]}>{e.statusLabel}</Pill>
                </div>
              </div>
              {e.impactSummary ? <p className="mt-2 break-words text-sm">Dampak: {e.impactSummary}</p> : null}
              {e.findings.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {e.findings.map((f) => (
                    <li key={f.code} className={`flex items-start gap-2 break-words ${f.level === "WARN" ? "text-amber-900" : "text-sky-900"}`}>
                      {f.level === "WARN" ? <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
                      <span>
                        <span className="sr-only">{f.level === "WARN" ? "Perlu diperiksa: " : "Catatan: "}</span>
                        {f.message}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {e.responseCount} tindakan · {e.logisticCount} catatan bantuan
                </span>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpenId(e.id)}>
                  Buka rincian
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {data && data.total > data.pageSize ? (
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {data.page} dari {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= Math.ceil(data.total / data.pageSize)} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      ) : null}

      {creating && data ? (
        <FormDialog title="Catat kejadian" description="Isi yang sudah diketahui; dampak dan pelaporan dapat dilengkapi kemudian lewat tombol Ubah." fields={eventFields(data.kinds)} initial={eventInitial(null)} url="/api/bencana/kejadian" method="POST" onClose={() => setCreating(false)} onDone={(r) => { setCreating(false); changed(); if (typeof r.id === "number") setOpenId(r.id); }} />
      ) : null}
      {openId ? <EventDetailDialog id={openId} kinds={data?.kinds ?? {}} onClose={() => setOpenId(null)} onChanged={changed} /> : null}
    </section>
  );
}
