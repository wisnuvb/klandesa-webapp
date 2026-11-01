"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill, fmtDate } from "@/components/app/perencanaan/shared";
import { CONDITIONS, HAZARD_TYPES, PLAN_KINDS, PLAN_STATUSES, RESOURCE_KINDS, RISK_LEVELS, VOLUNTEER_STATUSES } from "@/lib/bencana/catalog";
import type { HazardView, PlanView, ResourceView, VolunteerView } from "@/lib/bencana/service";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { ErrorBox, FormDialog, Loading, SearchPick, opt, type Field } from "./common";
import type { Can } from "./types";

type Resp<T> = { rows: T[]; can: Can; detail: boolean; links?: { legal: { id: number; label: string }[]; archives: { id: string; label: string }[] } };
const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const where = (r: { rw: string | null; rt: string | null }) => (r.rw ? `RW ${r.rw}${r.rt ? `/RT ${r.rt}` : ""}` : null);
const COORD_HINT = "Contoh: -7.6012 (lintang) dan 110.9231 (bujur). Isi keduanya atau kosongkan keduanya.";

const hazardFields: Field[] = [
  { key: "hazardType", label: "Jenis ancaman", type: "select", options: opt(HAZARD_TYPES), required: true, half: true },
  { key: "riskLevel", label: "Tingkat risiko", type: "select", options: opt(RISK_LEVELS), half: true, hint: "Penilaian setempat, bukan kelas resmi." },
  { key: "name", label: "Nama/lokasi ancaman", type: "text", required: true, max: 200, hint: "Contoh: Bantaran Kali Gede." },
  { key: "rw", label: "RW", type: "text", max: 10, half: true },
  { key: "rt", label: "RT", type: "text", max: 10, half: true },
  { key: "hamlet", label: "Dusun", type: "text", max: 100, half: true },
  { key: "exposedHouseholds", label: "KK terpapar (perkiraan)", type: "number", half: true },
  { key: "lat", label: "Lintang (opsional)", type: "text", inputMode: "decimal", half: true, hint: COORD_HINT },
  { key: "lng", label: "Bujur (opsional)", type: "text", inputMode: "decimal", half: true },
  { key: "lastReviewedOn", label: "Terakhir dikaji ulang", type: "date", half: true },
  { key: "description", label: "Uraian", type: "textarea", max: 1000 },
];
const resourceFields: Field[] = [
  { key: "kind", label: "Jenis", type: "select", options: opt(RESOURCE_KINDS), required: true, half: true },
  { key: "condition", label: "Kondisi", type: "select", options: opt(CONDITIONS), half: true },
  { key: "name", label: "Nama", type: "text", required: true, max: 200 },
  { key: "capacity", label: "Kapasitas (orang)", type: "number", half: true, hint: "Untuk shelter dan titik kumpul." },
  { key: "quantity", label: "Jumlah barang", type: "number", half: true },
  { key: "unit", label: "Satuan", type: "text", max: 30, half: true },
  { key: "locationText", label: "Lokasi", type: "text", max: 255, half: true },
  { key: "rw", label: "RW", type: "text", max: 10, half: true },
  { key: "rt", label: "RT", type: "text", max: 10, half: true },
  { key: "lat", label: "Lintang (opsional)", type: "text", inputMode: "decimal", half: true, hint: COORD_HINT },
  { key: "lng", label: "Bujur (opsional)", type: "text", inputMode: "decimal", half: true },
  { key: "lastCheckedOn", label: "Terakhir diperiksa", type: "date", half: true },
  { key: "custodian", label: "Penanggung jawab", type: "text", max: 150, half: true },
  { key: "note", label: "Catatan (mis. rute jalur evakuasi)", type: "textarea", max: 500 },
];
const volunteerFields: Field[] = [
  { key: "team", label: "Tim", type: "text", max: 100, half: true, hint: "Mis. Tim Siaga RW 02, FPRB." },
  { key: "role", label: "Peran", type: "text", max: 60, half: true },
  { key: "skill", label: "Keahlian", type: "text", max: 100, half: true },
  { key: "status", label: "Status", type: "select", options: opt(VOLUNTEER_STATUSES), half: true },
  { key: "joinedOn", label: "Bergabung sejak", type: "date", half: true },
  { key: "skRef", label: "Nomor SK/penugasan", type: "text", max: 150, half: true },
  { key: "note", label: "Catatan", type: "textarea", max: 300 },
];
const planFields = (links: Resp<PlanView>["links"]): Field[] => [
  { key: "kind", label: "Jenis dokumen", type: "select", options: opt(PLAN_KINDS), required: true, half: true },
  { key: "status", label: "Status", type: "select", options: opt(PLAN_STATUSES), half: true },
  { key: "title", label: "Judul", type: "text", required: true, max: 200 },
  { key: "year", label: "Tahun", type: "number", half: true },
  { key: "legalDocumentId", label: "Produk hukum terkait", type: "select", options: [["", "(tidak ada)"], ...(links?.legal ?? []).map((l) => [String(l.id), l.label] as [string, string])], half: true, hint: "Dari menu Produk Hukum Desa." },
  { key: "archiveId", label: "Berkas di Arsip Digital", type: "select", options: [["", "(tidak ada)"], ...(links?.archives ?? []).map((a) => [a.id, a.label] as [string, string])], hint: "Unggah dokumen lebih dulu di menu Arsip Digital, lalu tautkan di sini." },
  { key: "note", label: "Catatan", type: "textarea", max: 500 },
];

function Section<T extends { id: number }>({ entity, title, hint, addText, empty, fields, initial, renderRow, extraCreate, deleteWarn }: { entity: string; title: string; hint: string; addText: string; empty: string; fields: (d: Resp<T>) => Field[]; initial: (row: T | null) => Record<string, string>; renderRow: (row: T, d: Resp<T>) => React.ReactNode; extraCreate?: (set: (id: number) => void, picked: number | null) => React.ReactNode; deleteWarn: string }) {
  const { data, loading, error, reload } = useApiGet<Resp<T>>(`/api/bencana/data/${entity}`);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <section aria-labelledby={`pr-${entity}`} className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`pr-${entity}`} className="text-lg font-semibold">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {data?.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => { setPicked(null); setEditing("new"); }}>
            <Plus aria-hidden="true" />
            {addText}
          </Button>
        ) : null}
      </div>
      {entity === "ancaman" && data?.can.create ? <ImportPoints onDone={reload} /> : null}
      {loading && !data ? <Loading text="Memuat…" /> : null}
      {error ? <ErrorBox message={error} /> : null}
      {data && !data.rows.length ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{empty}</p> : null}
      {data?.rows.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.rows.map((r) => (
            <li key={r.id} className="min-w-0 space-y-2 rounded-lg border p-4">
              {renderRow(r, data)}
              <div className="flex flex-wrap gap-2">
                {data.can.update ? (
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(r)}>
                    <Pencil aria-hidden="true" />
                    Ubah
                  </Button>
                ) : null}
                {data.can.delete ? <ConfirmDelete label={`Hapus ${title.toLowerCase()} ini`} title="Hapus data ini?" description={deleteWarn} url={`/api/bencana/data/${entity}/${r.id}`} onDone={reload} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {editing && data ? (
        <FormDialog
          title={editing === "new" ? addText : `Ubah ${title.toLowerCase()}`}
          fields={fields(data)}
          initial={initial(editing === "new" ? null : editing)}
          url={editing === "new" ? `/api/bencana/data/${entity}` : `/api/bencana/data/${entity}/${editing.id}`}
          method={editing === "new" ? "POST" : "PATCH"}
          transform={entity === "relawan" && editing === "new" ? (b) => ({ ...b, residentId: picked ?? "" }) : undefined}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); reload(); }}
        >
          {editing === "new" && extraCreate ? extraCreate(setPicked, picked) : null}
        </FormDialog>
      ) : null}
    </section>
  );
}

function ImportPoints({ onDone }: { onDone: () => void }) {
  const { busy, general, submit } = useFormSubmit();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-3 text-sm">
      <p className="min-w-0 flex-1">Sudah punya titik rawan di menu Lingkungan Hidup? Salin ke daftar ancaman ini (yang sudah disalin dilewati).</p>
      <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={async () => { const r = await submit<{ imported: number; skipped: number }>("/api/bencana/impor-ancaman", "POST", {}); if (r) { setMsg(`${r.imported} titik disalin.`); onDone(); } }}>
        <Download aria-hidden="true" />
        Salin titik rawan
      </Button>
      {msg ? <p role="status" className="w-full">{msg}</p> : null}
      {general ? <p role="alert" className="w-full text-destructive">{general}</p> : null}
    </div>
  );
}

const TONE_RISK: Record<string, string> = { LOW: "neutral", MEDIUM: "info", HIGH: "soon", EXTREME: "overdue" };
const TONE_COND: Record<string, string> = { BAIK: "done", PERLU_PERBAIKAN: "soon", RUSAK: "overdue", BELUM_DIPERIKSA: "neutral" };

export function PrepTab() {
  return (
    <Tabs defaultValue="ancaman">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="ancaman" className="min-h-11">Ancaman</TabsTrigger>
        <TabsTrigger value="sumber-daya" className="min-h-11">Sumber daya dan jalur evakuasi</TabsTrigger>
        <TabsTrigger value="relawan" className="min-h-11">Relawan dan tim siaga</TabsTrigger>
        <TabsTrigger value="rencana" className="min-h-11">Dokumen rencana</TabsTrigger>
      </TabsList>
      <TabsContent value="ancaman" className="pt-4">
        <Section<HazardView>
          entity="ancaman" title="Ancaman per wilayah" hint="Jenis bahaya yang mengancam wilayah desa, diurutkan dari risiko tertinggi." addText="Tambah ancaman" empty="Belum ada ancaman tercatat. Tambahkan, atau salin dari titik rawan di menu Lingkungan Hidup." deleteWarn="Data ancaman ini dihapus. Titik rawan di menu Lingkungan Hidup tidak ikut terhapus."
          fields={() => hazardFields}
          initial={(h) => ({ hazardType: h?.hazardType ?? "BANJIR", riskLevel: h?.riskLevel ?? "MEDIUM", name: h?.name ?? "", rw: s(h?.rw), rt: s(h?.rt), hamlet: s(h?.hamlet), exposedHouseholds: s(h?.exposedHouseholds), lat: s(h?.lat), lng: s(h?.lng), lastReviewedOn: s(h?.lastReviewedOn), description: s(h?.description) })}
          renderRow={(h) => (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 break-words font-semibold">{h.name}</p>
                <Pill tone={TONE_RISK[h.riskLevel]}>Risiko {h.riskLabel.toLowerCase()}</Pill>
              </div>
              <p className="break-words text-sm text-muted-foreground">
                {h.hazardLabel}
                {where(h) ? ` · ${where(h)}` : ""}
                {h.hamlet ? ` · Dusun ${h.hamlet}` : ""}
                {h.exposedHouseholds ? ` · ±${h.exposedHouseholds} KK terpapar` : ""}
              </p>
              {h.lat !== null ? <Coord lat={h.lat} lng={h.lng} /> : null}
              {h.description ? <p className="whitespace-pre-line break-words text-sm">{h.description}</p> : null}
              <p className="text-xs text-muted-foreground">{h.lastReviewedOn ? `Dikaji ulang ${fmtDate(h.lastReviewedOn)}` : "Belum pernah dikaji ulang"}{h.fromDisasterPoint ? " · disalin dari titik rawan" : ""}</p>
            </>
          )}
        />
      </TabsContent>
      <TabsContent value="sumber-daya" className="pt-4">
        <Section<ResourceView>
          entity="sumber-daya" title="Sumber daya dan jalur evakuasi" hint="Shelter, titik kumpul, jalur evakuasi, peralatan, stok logistik, dan alat peringatan dini." addText="Tambah sumber daya" empty="Belum ada sumber daya tercatat. Mulai dari tempat pengungsian dan titik kumpul." deleteWarn="Data sumber daya ini dihapus."
          fields={() => resourceFields}
          initial={(r) => ({ kind: r?.kind ?? "SHELTER", condition: r?.condition ?? "BELUM_DIPERIKSA", name: r?.name ?? "", capacity: s(r?.capacity), quantity: s(r?.quantity), unit: s(r?.unit), locationText: s(r?.locationText), rw: s(r?.rw), rt: s(r?.rt), lat: s(r?.lat), lng: s(r?.lng), lastCheckedOn: s(r?.lastCheckedOn), custodian: s(r?.custodian), note: s(r?.note) })}
          renderRow={(r) => (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 break-words font-semibold">{r.name}</p>
                <Pill tone={TONE_COND[r.condition]}>{r.conditionLabel}</Pill>
              </div>
              <p className="break-words text-sm text-muted-foreground">
                {r.kindLabel}
                {r.capacity !== null ? ` · kapasitas ${r.capacity.toLocaleString("id-ID")} orang` : ""}
                {r.quantity !== null ? ` · ${r.quantity.toLocaleString("id-ID")} ${r.unit ?? ""}` : ""}
              </p>
              <p className="break-words text-sm">{[r.locationText, where(r)].filter(Boolean).join(" · ")}</p>
              {r.lat !== null ? <Coord lat={r.lat} lng={r.lng} /> : null}
              {r.custodian ? <p className="break-words text-sm">Penanggung jawab: {r.custodian}</p> : null}
              {r.note ? <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{r.note}</p> : null}
              <p className="text-xs text-muted-foreground">{r.lastCheckedOn ? `Diperiksa ${fmtDate(r.lastCheckedOn)}` : "Belum pernah diperiksa"}</p>
            </>
          )}
        />
      </TabsContent>
      <TabsContent value="relawan" className="pt-4">
        <Section<VolunteerView>
          entity="relawan" title="Relawan dan tim siaga" hint="Warga yang bertugas sebagai relawan penanggulangan bencana. Nomor telepon hanya tampil bagi yang berizin baca rinci." addText="Tambah relawan" empty="Belum ada relawan tercatat." deleteWarn="Warga ini dikeluarkan dari daftar relawan. Data kependudukannya tidak berubah."
          fields={() => volunteerFields}
          initial={(v) => ({ team: s(v?.team), role: s(v?.role), skill: s(v?.skill), status: v?.status ?? "ACTIVE", joinedOn: s(v?.joinedOn), skRef: s(v?.skRef), note: s(v?.note) })}
          extraCreate={(setPicked, picked) => <PickResident picked={picked} onPick={setPicked} />}
          renderRow={(v) => (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 break-words font-semibold">{v.name ?? "(warga tidak ditemukan)"}</p>
                <Pill tone={v.status === "ACTIVE" ? "done" : "neutral"}>{v.statusLabel}</Pill>
              </div>
              <p className="break-words text-sm text-muted-foreground">{[v.team, v.role, v.skill, where(v)].filter(Boolean).join(" · ") || "-"}</p>
              {v.phone ? <p className="break-words text-sm">Telepon: {v.phone}</p> : null}
              {v.skRef || v.joinedOn ? <p className="break-words text-xs text-muted-foreground">{[v.skRef, v.joinedOn ? `sejak ${fmtDate(v.joinedOn)}` : null].filter(Boolean).join(" · ")}</p> : null}
            </>
          )}
        />
      </TabsContent>
      <TabsContent value="rencana" className="pt-4">
        <Section<PlanView>
          entity="rencana" title="Dokumen rencana" hint="Rencana penanggulangan bencana, kontinjensi, evakuasi, dan SOP. Lampiran ditautkan dari Produk Hukum Desa dan Arsip Digital." addText="Tambah dokumen" empty="Belum ada dokumen rencana tercatat." deleteWarn="Catatan dokumen ini dihapus. Berkas di Arsip Digital dan Produk Hukum tidak ikut terhapus."
          fields={(d) => planFields(d.links)}
          initial={(p) => ({ kind: p?.kind ?? "RPB", status: p?.status ?? "DRAF", title: p?.title ?? "", year: s(p?.year), legalDocumentId: s(p?.legalDocument?.id), archiveId: s(p?.archive?.id), note: s(p?.note) })}
          renderRow={(p) => (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 break-words font-semibold">{p.title}</p>
                <Pill tone={p.status === "DITETAPKAN" ? "done" : p.status === "DRAF" ? "info" : "neutral"}>{p.statusLabel}</Pill>
              </div>
              <p className="break-words text-sm text-muted-foreground">
                {p.kindLabel}
                {p.year ? ` · ${p.year}` : ""}
              </p>
              {p.legalDocument ? <p className="break-words text-sm">Produk hukum: {p.legalDocument.label}</p> : null}
              {p.archive ? <p className="break-words text-sm">Arsip: {p.archive.label}</p> : null}
              {p.note ? <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{p.note}</p> : null}
            </>
          )}
        />
      </TabsContent>
    </Tabs>
  );
}

function Coord({ lat, lng }: { lat: number; lng: number | null }) {
  return (
    <p className="flex items-center gap-1.5 break-words text-xs text-muted-foreground">
      <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
      Koordinat {lat}, {lng}
    </p>
  );
}

interface Hit {
  id: number;
  name: string;
  rt: string | null;
  rw: string | null;
}
function PickResident({ picked, onPick }: { picked: number | null; onPick: (id: number) => void }) {
  const [name, setName] = useState<string | null>(null);
  if (picked && name) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
        <p className="min-w-0 break-words text-sm">
          <span className="font-medium">{name}</span>
        </p>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => { setName(null); onPick(0); }}>
          Ganti
        </Button>
      </div>
    );
  }
  return <SearchPick<Hit> id="pv-res" label="Cari warga *" url={(q) => `/api/bencana/warga?q=${encodeURIComponent(q)}`} hint="Ketik nama warga (minimal 3 huruf). NIK tidak ditampilkan." render={(h) => <>{h.name}{h.rw ? ` · RW ${h.rw}${h.rt ? `/RT ${h.rt}` : ""}` : ""}</>} onPick={(h) => { setName(h.name); onPick(h.id); }} />;
}
