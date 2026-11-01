"use client";

import { useState } from "react";
import { AlertTriangle, Info, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill, SELECT_CLASS, fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { ErrorBox, FormDialog, Loading, opt, type Field } from "./common";
import { ScoreBar } from "./ScoreBar";
import type { ReadinessResp } from "./types";

const TONE: Record<string, string> = { BELUM: "neutral", SEDANG: "soon", SELESAI: "done" };

export function ReadinessTab({ onChanged }: { onChanged: () => void }) {
  const { data, loading, error, reload } = useApiGet<ReadinessResp>("/api/bencana/kesiapan");
  const [note, setNote] = useState<{ code: string; label: string; status: string; note: string } | null>(null);
  const [custom, setCustom] = useState<{ id: number | null; label: string; status: string; note: string } | null>(null);
  const [assess, setAssess] = useState(false);
  const { busy, general, submit } = useFormSubmit();
  const changed = () => {
    reload();
    onChanged();
  };
  async function setStatus(code: string, status: string, n: string | null) {
    if (await submit("/api/bencana/kesiapan", "PUT", { code, status, note: n ?? "" })) changed();
  }

  if (loading && !data) return <Loading text="Memuat kesiapan Destana…" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;
  const can = data.can;
  const statusOpts = opt(data.statuses);

  const customFields: Field[] = [
    { key: "label", label: "Butir kesiapan", type: "text", required: true, max: 200 },
    { key: "status", label: "Status", type: "select", options: statusOpts, half: true },
    { key: "note", label: "Catatan", type: "textarea", max: 500 },
  ];
  const noteFields: Field[] = [
    { key: "status", label: "Status", type: "select", options: statusOpts, required: true, half: true },
    { key: "note", label: "Catatan atau bukti", type: "textarea", max: 500, hint: "Mis. nomor Perdes, tanggal pelatihan, nama dokumen." },
  ];
  const assessFields: Field[] = [
    { key: "kind", label: "Jenis catatan", type: "select", options: opt(data.assessmentKinds), required: true, half: true },
    { key: "doneOn", label: "Tanggal dilakukan", type: "date", required: true, half: true },
    { key: "level", label: "Tingkat hasil penilaian (wajib bila jenisnya Penilaian)", type: "select", options: [["", "(bukan penilaian)"], ...opt(data.levels)], hint: "Isi sesuai hasil penilaian resmi desa. Aplikasi tidak menghitung tingkat." },
    { key: "referenceNo", label: "Nomor/bukti (BA, SK, laporan)", type: "text", max: 150 },
    { key: "note", label: "Catatan", type: "textarea", max: 500 },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <section aria-labelledby="rd-h" className="min-w-0 space-y-3">
        <div>
          <h2 id="rd-h" className="text-lg font-semibold">
            Kesiapan Desa Tangguh Bencana (Destana)
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">Daftar aktivitas Program Destana dari {data.regulation.title} (Pasal 8 ayat 1). Centang kemajuan desa Anda; angka di bawah menunjukkan kelengkapan aktivitas, bukan tingkat ketangguhan resmi.</p>
        </div>
        <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
          <ScoreBar label="Aktivitas Destana selesai" pct={data.score.pct} detail={`${data.score.done} dari ${data.score.total} selesai, ${data.score.inProgress} sedang dikerjakan`} />
          <div className="space-y-1 text-sm">
            <p className="text-xs text-muted-foreground">Tingkat ketangguhan resmi (hasil penilaian terakhir)</p>
            <p className="text-lg font-semibold">{data.currentLevel ? data.currentLevel.label : "Belum dicatat"}</p>
            {data.currentLevel ? <p className="text-muted-foreground">Dinilai {fmtDate(data.currentLevel.doneOn)}</p> : <p className="text-muted-foreground">Catat hasil penilaian di bagian bawah.</p>}
          </div>
        </div>
        <div role="note" className="flex items-start gap-2 rounded-md border border-sky-600/40 bg-sky-50 p-3 text-sm text-sky-950">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            {data.notes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
        </div>
        {data.findings.length ? (
          <ul className="space-y-2" aria-label="Temuan kesiapsiagaan">
            {data.findings.map((f) => (
              <li key={f.code} className={`flex items-start gap-2 rounded-md border p-3 text-sm ${f.level === "WARN" ? "border-amber-600/50 bg-amber-50 text-amber-950" : "border-border bg-muted/40"}`}>
                {f.level === "WARN" ? <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
                <span className="min-w-0 break-words">
                  <span className="sr-only">{f.level === "WARN" ? "Perlu diperiksa: " : "Catatan: "}</span>
                  {f.message}
                  {f.ref ? <span className="block text-xs opacity-80">{f.ref}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {general ? <ErrorBox message={general} /> : null}
        <ul className="divide-y rounded-lg border">
          {data.items.map((i) => (
            <li key={i.code} className="min-w-0 space-y-2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium">{i.label}</p>
                  <p className="text-xs text-muted-foreground">{i.ref}</p>
                </div>
                <Pill tone={TONE[i.status]}>{data.statuses[i.status]}</Pill>
              </div>
              {i.detected ? <p className="text-sm text-sky-900">Terdeteksi dari data aplikasi: {i.detected}. Ubah status bila sudah memenuhi.</p> : null}
              {i.note ? <p className="break-words text-sm text-muted-foreground">{i.note}</p> : null}
              {can.update ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`rd-${i.code}`} className="text-xs">
                      Status
                    </Label>
                    <SearchSelect id={`rd-${i.code}`} className={`${SELECT_CLASS} w-48`} value={i.status} disabled={busy} onChange={(e) => void setStatus(i.code, e.target.value, i.note)}>
                      {statusOpts.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </SearchSelect>
                  </div>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setNote({ code: i.code, label: i.label, status: i.status, note: i.note ?? "" })}>
                    <Pencil aria-hidden="true" />
                    Catatan/bukti
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rd-c" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="rd-c" className="text-lg font-semibold">
              Butir tambahan desa <Pill tone="soon">Belum diverifikasi</Pill>
            </h2>
            <p className="text-sm text-muted-foreground">Kegiatan kesiapan buatan desa sendiri (mis. simulasi evakuasi). Tidak termasuk dalam angka kelengkapan di atas.</p>
          </div>
          {can.create ? (
            <Button type="button" className="min-h-11" onClick={() => setCustom({ id: null, label: "", status: "BELUM", note: "" })}>
              <Plus aria-hidden="true" />
              Tambah butir
            </Button>
          ) : null}
        </div>
        {data.custom.length ? (
          <ul className="divide-y rounded-lg border">
            {data.custom.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{c.label}</p>
                  {c.note ? <p className="break-words text-sm text-muted-foreground">{c.note}</p> : null}
                </div>
                <div className="flex items-center gap-1.5">
                  <Pill tone={TONE[c.status]}>{c.statusLabel}</Pill>
                  {can.update ? (
                    <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah ${c.label}`} onClick={() => setCustom({ id: c.id, label: c.label, status: c.status, note: c.note ?? "" })}>
                      <Pencil aria-hidden="true" />
                    </Button>
                  ) : null}
                  {can.delete ? <ConfirmDelete label={`Hapus ${c.label}`} title="Hapus butir ini?" description={`Butir “${c.label}” dihapus dari daftar.`} url={`/api/bencana/kesiapan/butir/${c.id}`} onDone={changed} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada butir tambahan.</p>
        )}
      </section>

      <section aria-labelledby="rd-a" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="rd-a" className="text-lg font-semibold">
              Penilaian dan evaluasi
            </h2>
            <p className="text-sm text-muted-foreground">Penilaian ketangguhan dilakukan mandiri oleh desa paling sedikit tiap 3 tahun; evaluasi program minimal sekali setahun (Peraturan BNPB 7/2025 Pasal 14 dan 19).</p>
          </div>
          {can.create ? (
            <Button type="button" className="min-h-11" onClick={() => setAssess(true)}>
              <Plus aria-hidden="true" />
              Catat
            </Button>
          ) : null}
        </div>
        {data.assessments.length ? (
          <ul className="divide-y rounded-lg border">
            {data.assessments.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0 text-sm">
                  <p className="break-words">
                    <span className="font-medium">{a.kindLabel}</span> · {fmtDate(a.doneOn)}
                    {a.levelLabel ? ` · ${a.levelLabel}` : ""}
                  </p>
                  {a.referenceNo ? <p className="break-words text-muted-foreground">{a.referenceNo}</p> : null}
                  {a.note ? <p className="break-words text-muted-foreground">{a.note}</p> : null}
                </div>
                {can.delete ? <ConfirmDelete label={`Hapus catatan ${a.kindLabel} ${fmtDate(a.doneOn)}`} title="Hapus catatan ini?" description="Catatan penilaian/evaluasi ini dihapus." url={`/api/bencana/kesiapan/penilaian/${a.id}`} onDone={changed} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada penilaian atau evaluasi tercatat.</p>
        )}
      </section>

      {note ? <FormDialog title="Catatan kesiapan" description={note.label} fields={noteFields} initial={{ status: note.status, note: note.note }} url="/api/bencana/kesiapan" method="PUT" transform={(b) => ({ ...b, code: note.code })} onClose={() => setNote(null)} onDone={() => { setNote(null); changed(); }} /> : null}
      {custom ? <FormDialog title={custom.id ? "Ubah butir" : "Tambah butir tambahan"} description="Butir buatan desa: belum diverifikasi dan tidak ikut angka kelengkapan." fields={customFields} initial={{ label: custom.label, status: custom.status, note: custom.note }} url={custom.id ? `/api/bencana/kesiapan/butir/${custom.id}` : "/api/bencana/kesiapan/butir"} method={custom.id ? "PATCH" : "POST"} onClose={() => setCustom(null)} onDone={() => { setCustom(null); changed(); }} /> : null}
      {assess ? <FormDialog title="Catat penilaian atau evaluasi" fields={assessFields} initial={{ kind: "PENILAIAN", doneOn: localToday(), level: "", referenceNo: "", note: "" }} url="/api/bencana/kesiapan/penilaian" method="POST" onClose={() => setAssess(false)} onDone={() => { setAssess(false); changed(); }} /> : null}
    </div>
  );
}
