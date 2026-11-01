"use client";

import { useState } from "react";
import { ChevronRight, HeartHandshake, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Pill, SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { FormDialog, SEVERITY_TONE, fmtDateTime, opt, toLocalInput, type Field } from "@/components/app/incident/common";
import { SEVERITIES } from "@/lib/incident/catalog";
import { useApiGet } from "@/hooks/useApiGet";
import { ErrorBox, Loading } from "@/components/app/incident/common";
import { EventDetailDialog } from "./EventDetail";
import { Empty, Findings, STATUS_TONE, where } from "./shared";
import type { EventsResp, SecurityEventRow } from "./types";

const FILTERS: [string, string][] = [
  ["ACTIVE", "Masih berjalan"],
  ["", "Semua"],
  ["OPEN", "Dilaporkan"],
  ["RESPONDING", "Ditangani"],
  ["RESOLVED", "Selesai ditangani"],
  ["CLOSED", "Ditutup"],
  ["CANCELLED", "Dibatalkan"],
];

export const PRIVACY_NOTE = "Catat peristiwa, bukan identitas korban. Kekerasan terhadap perempuan atau anak dan kekerasan seksual tidak dicatat di aplikasi ini: arahkan korban ke layanan rujukan (tab Rujukan).";

export const eventFields = (kinds: Record<string, string>): Field[] => [
  { key: "kind", label: "Jenis kejadian", type: "select", options: opt(kinds), required: true, half: true },
  { key: "severity", label: "Tingkat keparahan", type: "select", options: opt(SEVERITIES), half: true },
  { key: "title", label: "Judul kejadian", type: "text", required: true, max: 200, hint: "Contoh: Pencurian sepeda motor di RT 02. Jangan menulis nama korban." },
  { key: "occurredAt", label: "Waktu kejadian", type: "datetime", required: true, half: true },
  { key: "locationText", label: "Lokasi", type: "text", max: 255, half: true },
  { key: "rw", label: "RW", type: "text", max: 10, half: true },
  { key: "rt", label: "RT", type: "text", max: 10, half: true },
  { key: "hamlet", label: "Dusun", type: "text", max: 100, half: true },
  { key: "description", label: "Uraian kejadian", type: "textarea", max: 2000, hint: "Ringkas dan netral. Hindari nama, alamat, atau ciri pribadi korban." },
  { key: "injuredCount", label: "Luka (jiwa)", type: "number", half: true },
  { key: "deathCount", label: "Meninggal (jiwa)", type: "number", half: true },
  { key: "loss", label: "Perkiraan kerugian materi (Rp)", type: "text", inputMode: "numeric", half: true, hint: "Angka saja, tanpa titik." },
  { key: "impactNote", label: "Catatan dampak", type: "textarea", max: 1000 },
  { key: "supraReportedAt", label: "Dilaporkan ke aparat/supra-desa pada", type: "datetime", half: true, hint: "Kosongkan bila belum dilaporkan." },
  { key: "supraReportedTo", label: "Instansi tujuan laporan", type: "text", max: 150, half: true, hint: "Mis. Polsek, Bhabinkamtibmas, kecamatan." },
  { key: "supraReference", label: "Nomor/bukti laporan", type: "text", max: 150 },
];

export const eventInitial = (e: SecurityEventRow | null): Record<string, string> => ({
  kind: e?.kind ?? "PENCURIAN",
  severity: e?.severity ?? "MEDIUM",
  title: e?.title ?? "",
  occurredAt: toLocalInput(e?.occurredAt),
  locationText: e?.locationText ?? "",
  rw: e?.rw ?? "",
  rt: e?.rt ?? "",
  hamlet: e?.hamlet ?? "",
  description: e?.description ?? "",
  injuredCount: e?.injuredCount == null ? "" : String(e.injuredCount),
  deathCount: e?.deathCount == null ? "" : String(e.deathCount),
  loss: e?.loss == null ? "" : String(Math.round(Number(e.loss))),
  impactNote: e?.impactNote ?? "",
  supraReportedAt: e?.supra ? toLocalInput(e.supra.reportedAt) : "",
  supraReportedTo: e?.supra?.to ?? "",
  supraReference: e?.supra?.reference ?? "",
});

export function EventsTab({ onChanged, goReferral }: { onChanged: () => void; goReferral: () => void }) {
  const [filter, setFilter] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, loading, error, reload } = useApiGet<EventsResp>(`/api/keamanan/kejadian?page=${page}${filter ? `&status=${filter}` : ""}`);
  const changed = () => {
    reload();
    onChanged();
  };

  return (
    <section aria-labelledby="kt-ev-h" className="min-w-0 space-y-3">
      <div className="flex items-start gap-2 rounded-md border border-sky-600/40 bg-sky-50 p-3 text-sm text-sky-950">
        <HeartHandshake aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p className="min-w-0 break-words">
          {PRIVACY_NOTE}{" "}
          <button type="button" className="min-h-11 underline underline-offset-4" onClick={goReferral}>
            Buka Rujukan
          </button>
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="kt-ev-filter">Tampilkan</Label>
          <SearchSelect id="kt-ev-filter" className={`${SELECT_CLASS} w-52`} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
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
      <h2 id="kt-ev-h" className="sr-only">
        Daftar kejadian keamanan
      </h2>

      {loading && !data ? <Loading text="Memuat kejadian…" /> : null}
      {error ? <ErrorBox message={error} /> : null}
      {data && !data.rows.length ? <Empty>{filter === "ACTIVE" ? "Tidak ada kejadian yang sedang berjalan. Catat pencurian, keributan, atau perselisihan warga di sini agar penanganan dan mediasinya terdokumentasi." : "Tidak ada kejadian pada pilihan ini."}</Empty> : null}

      {data?.rows.length ? (
        <ul className="space-y-3">
          {data.rows.map((e) => (
            <li key={e.id} className="min-w-0 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold">{e.title}</p>
                  <p className="break-words text-sm text-muted-foreground">
                    {e.kindLabel} · {fmtDateTime(e.occurredAt)}
                    {e.locationText || e.rw ? ` · ${[e.locationText, where(e)].filter(Boolean).join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={SEVERITY_TONE[e.severity]}>{e.severityLabel}</Pill>
                  <Pill tone={STATUS_TONE[e.status]}>{e.statusLabel}</Pill>
                </div>
              </div>
              <div className="mt-2">
                <Findings items={e.findings} label="Temuan kejadian" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {e.responseCount} tindakan · {e.mediationCount} mediasi · {e.openFollowups} tindak lanjut terbuka · {e.reportLinks} pengaduan tertaut
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

      {creating && data ? <FormDialog title="Catat kejadian" description={PRIVACY_NOTE} fields={eventFields(data.kinds)} initial={eventInitial(null)} url="/api/keamanan/kejadian" method="POST" onClose={() => setCreating(false)} onDone={(r) => { setCreating(false); changed(); if (typeof r.id === "number") setOpenId(r.id); }} /> : null}
      {openId ? <EventDetailDialog id={openId} kinds={data?.kinds ?? {}} responseKinds={data?.responseKinds ?? {}} onClose={() => setOpenId(null)} onChanged={changed} /> : null}
    </section>
  );
}
