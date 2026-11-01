"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, WarningList, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { EVENT_KINDS } from "@/lib/rpjm/catalog";
import type { DetailResponse } from "./types";

/** Isi pokok rancangan: judul, periode, pelantikan, visi, misi, arah kebijakan, ringkasan pengkajian, catatan SDGs. */
export function ContentTab({ data, reload }: { data: DetailResponse; reload: () => void }) {
  const p = data.plan;
  const [f, setF] = useState({
    title: p.title,
    periodStart: String(p.periodStart),
    periodEnd: String(p.periodEnd),
    headInauguratedOn: p.headInauguratedOn ?? "",
    vision: p.vision ?? "",
    mission: p.mission ?? "",
    policyDirection: p.policyDirection ?? "",
    reviewSummary: p.reviewSummary ?? "",
    sdgsPlanRecordedAt: p.sdgsPlanRecordedAt ?? "",
    sdgsPlanNote: p.sdgsPlanNote ?? "",
  });
  const [saved, setSaved] = useState(false);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const editable = !p.locked && data.can.update;
  const adminEditable = data.can.update; // catatan SDGs tetap boleh setelah dikunci
  const set = (x: Partial<typeof f>) => {
    setF((v) => ({ ...v, ...x }));
    setSaved(false);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = p.locked
      ? { sdgsPlanRecordedAt: f.sdgsPlanRecordedAt || null, sdgsPlanNote: f.sdgsPlanNote }
      : { ...f, periodStart: f.periodStart, periodEnd: f.periodEnd, headInauguratedOn: f.headInauguratedOn || null, sdgsPlanRecordedAt: f.sdgsPlanRecordedAt || null };
    const r = await submit(`/api/perencanaan/rpjm/${p.id}`, "PATCH", body);
    if (r) {
      setSaved(true);
      reload();
    }
  }
  const err = (k: string) => errors[k];
  const common = (k: string) => ({ id: `ct-${k}`, "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `ct-${k}-err` : undefined });
  const errNode = (k: string) => (err(k) ? <p id={`ct-${k}-err`} className="text-sm text-destructive">{err(k)}</p> : null);
  const area = (k: "vision" | "mission" | "policyDirection" | "reviewSummary", label: string, help: string, rows = 4) => (
    <div className="space-y-1.5">
      <Label htmlFor={`ct-${k}`}>{label}</Label>
      <Textarea {...common(k)} rows={rows} maxLength={20000} value={f[k]} disabled={!editable} onChange={(e) => set({ [k]: e.target.value })} />
      <p className="text-sm text-muted-foreground">{help}</p>
      {errNode(k)}
    </div>
  );

  return (
    <form onSubmit={save} className="min-w-0 space-y-6" noValidate>
      <FormErrorSummary
        innerRef={summaryRef}
        errors={errors}
        general={general}
        labels={{ title: "Judul", periodStart: "Tahun awal", periodEnd: "Tahun akhir", headInauguratedOn: "Tanggal pelantikan", vision: "Visi", mission: "Misi", policyDirection: "Arah kebijakan", reviewSummary: "Ringkasan pengkajian", sdgsPlanRecordedAt: "Tanggal pengisian SDGs", sdgsPlanNote: "Catatan SDGs" }}
      />
      {p.locked ? <p className="text-sm text-muted-foreground">Isi dikunci karena Peraturan Desa sudah dihubungkan. Hanya catatan Rencana Jangka Menengah SDGs Desa yang masih bisa diisi. Untuk mengubah isi, buka kunci di tab Tahapan.</p> : null}

      <fieldset className="min-w-0 space-y-3">
        <legend className="text-base font-semibold">Dokumen dan periode</legend>
        <div className="space-y-1.5">
          <Label htmlFor="ct-title">Judul</Label>
          <Input {...common("title")} className="h-11" maxLength={255} value={f.title} disabled={!editable} onChange={(e) => set({ title: e.target.value })} />
          {errNode("title")}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ct-periodStart">Tahun awal</Label>
            <Input {...common("periodStart")} className="h-11" type="number" inputMode="numeric" value={f.periodStart} disabled={!editable} onChange={(e) => set({ periodStart: e.target.value })} />
            {errNode("periodStart")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-periodEnd">Tahun akhir</Label>
            <Input {...common("periodEnd")} className="h-11" type="number" inputMode="numeric" value={f.periodEnd} disabled={!editable} onChange={(e) => set({ periodEnd: e.target.value })} />
            {errNode("periodEnd")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-headInauguratedOn">Pelantikan Kepala Desa</Label>
            <Input {...common("headInauguratedOn")} className="h-11" type="date" value={f.headInauguratedOn} disabled={!editable} onChange={(e) => set({ headInauguratedOn: e.target.value })} />
            {errNode("headInauguratedOn")}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Jangka waktu {p.termYears} tahun. Berlaku {data.terms.rules.termYears} tahun (UU 3/2024 Pasal 79 ayat 2 huruf a; PP 16/2026 Pasal 143 ayat 2 huruf a). Periode lain tetap bisa disimpan; hanya ditandai perlu penyesuaian di tab Keselarasan.
        </p>
      </fieldset>

      <fieldset className="min-w-0 space-y-3">
        <legend className="text-base font-semibold">Pokok rancangan</legend>
        {area("vision", "Visi Kepala Desa", "Rancangan RPJM Desa memuat visi dan misi Kepala Desa terpilih (PP 16/2026 Pasal 144 ayat 4 dan 145 ayat 1).")}
        {area("mission", "Misi Kepala Desa", "Satu misi per baris memudahkan pembacaan di dokumen cetak.", 5)}
        {area("policyDirection", "Arah kebijakan pembangunan Desa", "Dijabarkan dari visi dan misi, mempertimbangkan kondisi objektif Desa, kearifan lokal, dan arah kebijakan kabupaten/kota (PP 16/2026 Pasal 145 ayat 2-3; Permendagri 114/2014 Pasal 21).", 5)}
      </fieldset>

      <fieldset className="min-w-0 space-y-3">
        <legend className="text-base font-semibold">Hasil pengkajian keadaan Desa</legend>
        {area("reviewSummary", "Ringkasan laporan pengkajian", "Keadaan sumber daya alam, manusia, pembangunan, dan sosial budaya; masalah dan potensi; ringkasan usulan dari dusun/kelompok masyarakat (Permendagri 114/2014 Pasal 12-18). Lampiran lengkap tetap dalam berita acara.", 6)}
      </fieldset>

      <fieldset className="min-w-0 space-y-3">
        <legend className="text-base font-semibold">Rencana Jangka Menengah SDGs Desa (SID)</legend>
        <p className="text-sm text-muted-foreground">Permendesa PDT 13/2025 Pasal 126 mengatur rencana lima tahun yang diisi Kepala Desa pada aplikasi SID dan diintegrasikan ke RPJM Desa. Aplikasi ini belum terhubung ke SID; catat saja kapan pengisiannya selesai.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ct-sdgsPlanRecordedAt">Tanggal selesai diisi di SID</Label>
            <Input {...common("sdgsPlanRecordedAt")} className="h-11" type="date" value={f.sdgsPlanRecordedAt} disabled={!adminEditable} onChange={(e) => set({ sdgsPlanRecordedAt: e.target.value })} />
            {errNode("sdgsPlanRecordedAt")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-sdgsPlanNote">Catatan</Label>
            <Input {...common("sdgsPlanNote")} className="h-11" maxLength={300} value={f.sdgsPlanNote} disabled={!adminEditable} onChange={(e) => set({ sdgsPlanNote: e.target.value })} />
            {errNode("sdgsPlanNote")}
          </div>
        </div>
      </fieldset>

      {adminEditable ? (
        <div className="flex items-center gap-3">
          <Button type="submit" className="min-h-11" disabled={busy}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Simpan isi rancangan
          </Button>
          {saved ? <span role="status" className="text-sm text-muted-foreground">Tersimpan.</span> : null}
        </div>
      ) : null}
    </form>
  );
}

/** Keselarasan: bendera aturan, matriks anggaran per bidang per tahun, jejak perubahan. */
export function AlignmentTab({ data }: { data: DetailResponse }) {
  const p = data.plan;
  const m = p.matrix;
  const need = p.flags.filter((x) => x.level === "perlu").map((x) => x.message);
  const info = p.flags.filter((x) => x.level === "info").map((x) => x.message);
  return (
    <div className="min-w-0 space-y-6">
      {need.length ? <WarningList title="Perlu penyesuaian (tidak memblokir)" items={need} /> : <p className="rounded-md border border-emerald-600/40 bg-emerald-50 p-3 text-sm text-emerald-950">Tidak ada bendera perlu penyesuaian.</p>}
      {info.length ? (
        <section aria-labelledby="al-info" className="space-y-1">
          <h2 id="al-info" className="text-base font-semibold">
            Catatan
          </h2>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            {info.map((t) => (
              <li key={t} className="break-words">
                {t}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="al-mx" className="space-y-2">
        <h2 id="al-mx" className="text-base font-semibold">
          Anggaran indikatif per bidang per tahun
        </h2>
        {p.programs.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada program, jadi belum ada matriks anggaran.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">Anggaran indikatif RPJM Desa per bidang per tahun (rupiah)</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Bidang</th>
                  {m.years.map((y) => (
                    <th key={y} scope="col" className="px-3 py-2 text-right">{y}</th>
                  ))}
                  <th scope="col" className="px-3 py-2 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {m.fields.map((f) => (
                  <tr key={f.code}>
                    <th scope="row" className="min-w-48 px-3 py-2 text-left font-normal">
                      {f.code}. {f.label}
                    </th>
                    {f.perYear.map((v, i) => (
                      <td key={m.years[i]} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rupiah(v)}</td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{rupiah(f.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted font-medium">
                <tr>
                  <th scope="row" className="px-3 py-2 text-left">Jumlah</th>
                  {m.yearTotals.map((v, i) => (
                    <td key={m.years[i]} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rupiah(v)}</td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{rupiah(m.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {m.outside.count > 0 ? <p className="text-sm text-amber-900">{m.outside.count} program ({rupiah(m.outside.total)}) berada di luar periode dan tidak masuk matriks.</p> : null}
      </section>

      <section aria-labelledby="al-ev" className="space-y-2">
        <h2 id="al-ev" className="text-base font-semibold">
          Riwayat peristiwa penting
        </h2>
        {p.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada peristiwa tercatat (pembukaan kunci, pencabutan persetujuan, Perdes lama).</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {p.events.map((e) => (
              <li key={e.id} className="space-y-0.5 px-4 py-3">
                <p className="flex flex-wrap items-center gap-2">
                  <Pill tone={e.kind === "REVOKE" ? "soon" : "info"}>{Object.hasOwn(EVENT_KINDS, e.kind) ? EVENT_KINDS[e.kind as keyof typeof EVENT_KINDS] : e.kind}</Pill>
                  <span className="text-muted-foreground">{fmtDate(e.createdAt)}</span>
                </p>
                {e.reasonLabel ? <p>{e.reasonLabel}</p> : null}
                <p className="break-words text-muted-foreground">{e.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
