"use client";

import { useState } from "react";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill } from "@/components/app/perencanaan/shared";
import { ErrorBox, FormDialog, Loading, opt, type Field } from "@/components/app/incident/common";
import { useApiGet } from "@/hooks/useApiGet";
import type { RiskView } from "@/lib/keamanan/service";
import { Empty, fmtDay, s, where } from "./shared";
import type { RisksResp } from "./types";

const LEVEL_TONE: Record<string, string> = { HIGH: "overdue", MEDIUM: "soon", LOW: "info" };
const COORD_HINT = "Contoh: -7.6012 (lintang) dan 110.9231 (bujur). Isi keduanya atau kosongkan keduanya.";

export function RisksTab({ onChanged }: { onChanged: () => void }) {
  const { data, loading, error, reload } = useApiGet<RisksResp>("/api/keamanan/kerawanan");
  const [form, setForm] = useState<{ risk: RiskView | null } | null>(null);
  const done = () => {
    setForm(null);
    reload();
    onChanged();
  };
  const fields = (d: RisksResp): Field[] => [
    { key: "kind", label: "Jenis kerawanan", type: "select", options: opt(d.kinds), required: true, half: true },
    { key: "level", label: "Tingkat", type: "select", options: opt(d.levels), half: true, hint: "Penilaian setempat, bukan klasifikasi resmi." },
    { key: "name", label: "Nama/lokasi", type: "text", required: true, max: 200, hint: "Contoh: Tikungan Kali Gede, Pasar Desa malam hari." },
    { key: "rw", label: "RW", type: "text", max: 10, half: true },
    { key: "rt", label: "RT", type: "text", max: 10, half: true },
    { key: "hamlet", label: "Dusun", type: "text", max: 100, half: true },
    { key: "lastReviewedOn", label: "Terakhir dikaji ulang", type: "date", half: true },
    { key: "lat", label: "Lintang (opsional)", type: "text", inputMode: "decimal", half: true, hint: COORD_HINT },
    { key: "lng", label: "Bujur (opsional)", type: "text", inputMode: "decimal", half: true },
    { key: "note", label: "Catatan", type: "textarea", max: 500, hint: "Tanpa identitas orang." },
  ];
  return (
    <section aria-labelledby="rw-h" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="rw-h" className="text-lg font-semibold">
            Wilayah rawan
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">Daftar sederhana tempat yang dinilai rawan menurut pengurus desa, untuk menentukan titik patroli ronda dan perbaikan (penerangan, pos). Belum berupa peta digital.</p>
        </div>
        {data?.can.create ? (
          <Button type="button" className="min-h-11" onClick={() => setForm({ risk: null })}>
            <Plus aria-hidden="true" />
            Tambah wilayah rawan
          </Button>
        ) : null}
      </div>
      {loading && !data ? <Loading text="Memuat wilayah rawan…" /> : null}
      {error ? <ErrorBox message={error} /> : null}
      {data?.hints.length ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Kejadian 12 bulan terakhir per wilayah (hanya hitungan)</p>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {data.hints.map((h) => (
              <li key={`${h.rw}-${h.rt}`}>
                RW {h.rw}
                {h.rt ? `/RT ${h.rt}` : ""}: {h.events} kejadian
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data && !data.rows.length ? <Empty>Belum ada wilayah rawan tercatat.</Empty> : null}
      {data?.rows.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.rows.map((r) => (
            <li key={r.id} className={`flex min-w-0 items-start justify-between gap-2 rounded-lg border p-4 ${r.active ? "" : "bg-muted/30"}`}>
              <div className="min-w-0 space-y-1 text-sm">
                <p className="flex flex-wrap items-center gap-2 break-words">
                  <span className="font-semibold">{r.name}</span>
                  <Pill tone={LEVEL_TONE[r.level]}>Tingkat {r.levelLabel.toLowerCase()}</Pill>
                  {!r.active ? <Pill tone="neutral">Nonaktif</Pill> : null}
                </p>
                <p className="break-words text-muted-foreground">
                  {r.kindLabel}
                  {where(r) ? ` · ${where(r)}` : ""}
                  {r.lastReviewedOn ? ` · dikaji ${fmtDay(r.lastReviewedOn)}` : ""}
                </p>
                {r.note ? <p className="break-words">{r.note}</p> : null}
                {r.lat !== null && r.lng !== null ? (
                  <a className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4" href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}`} target="_blank" rel="noopener noreferrer">
                    Lihat di peta ({r.lat}, {r.lng})
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center">
                {data.can.update ? (
                  <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`Ubah ${r.name}`} onClick={() => setForm({ risk: r })}>
                    <Pencil aria-hidden="true" />
                  </Button>
                ) : null}
                {data.can.delete ? <ConfirmDelete label={`Hapus ${r.name}`} title="Hapus wilayah rawan?" description="Catatan wilayah ini dihapus." url={`/api/keamanan/kerawanan/${r.id}`} onDone={done} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {form && data ? (
        <FormDialog
          title={form.risk ? `Ubah: ${form.risk.name}` : "Tambah wilayah rawan"}
          fields={form.risk ? [...fields(data), { key: "active", label: "Status", type: "select", options: [["true", "Aktif"], ["false", "Nonaktif"]], half: true }] : fields(data)}
          initial={{ kind: form.risk?.kind ?? "PENCURIAN", level: form.risk?.level ?? "MEDIUM", name: form.risk?.name ?? "", rw: s(form.risk?.rw), rt: s(form.risk?.rt), hamlet: s(form.risk?.hamlet), lastReviewedOn: s(form.risk?.lastReviewedOn), lat: s(form.risk?.lat), lng: s(form.risk?.lng), note: s(form.risk?.note), active: String(form.risk?.active ?? true) }}
          transform={(b) => ({ ...b, active: b.active === undefined ? true : b.active === "true" })}
          url={form.risk ? `/api/keamanan/kerawanan/${form.risk.id}` : "/api/keamanan/kerawanan"}
          method={form.risk ? "PATCH" : "POST"}
          onClose={() => setForm(null)}
          onDone={done}
        />
      ) : null}
    </section>
  );
}
