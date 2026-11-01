"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { INDICATOR_FIELDS, SUMMARY_FIELDS, type Layout } from "@/lib/idm/catalog";
import { detectHeaderRow, detectLayout, guessMapping, matchRows, norm, parseDelimited, readIndicatorRows, readSummaryRows, villageKey, yearFromHeaders, type Grid, type Mapping, type SummaryRow } from "@/lib/idm/map";
import { TooBigError, readWorkbookLimited } from "@/lib/idm/read-xlsx";
import { fmtScore, type Resp } from "./types";

type Step = "file" | "map" | "pick";
const colName = (i: number) => {
  let n = i;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

export function ImportDialog({ data, onClose, onDone }: { data: Resp; onClose: () => void; onDone: (year: number) => void }) {
  const [step, setStep] = useState<Step>("file");
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<{ name: string; grid: Grid }[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [readErr, setReadErr] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [headerRow, setHeaderRow] = useState(0);
  const [layout, setLayout] = useState<Layout>("SUMMARY");
  const [mapping, setMapping] = useState<Mapping>({});
  const [year, setYear] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const maxMb = data.catalog.limits.maxFileMb;

  const grid = useMemo<Grid>(() => sheets[sheetIdx]?.grid ?? [], [sheets, sheetIdx]);
  const headers = useMemo(() => (grid[headerRow] ?? []).map((c) => (c === null ? "" : String(c))), [grid, headerRow]);
  const fields = layout === "SUMMARY" ? SUMMARY_FIELDS : INDICATOR_FIELDS;

  function prepare(g: Grid, name: string) {
    const hr = detectHeaderRow(g);
    const hs = (g[hr] ?? []).map((c) => (c === null ? "" : String(c)));
    const lay = detectLayout(hs);
    const map = guessMapping(hs, lay);
    setHeaderRow(hr);
    setLayout(lay);
    setMapping(map);
    const fromHeader = lay === "SUMMARY" ? yearFromHeaders(hs, map) : null;
    const fromName = /(20\d{2})/.exec(name)?.[1];
    setYear(fromHeader ? String(fromHeader) : (fromName ?? ""));
    setPicked(null);
    setQuery("");
  }

  async function load(file: File) {
    setReadErr(null);
    if (file.size > maxMb * 1024 * 1024) return setReadErr(`Ukuran berkas maksimal ${maxMb} MB.`);
    setReading(true);
    try {
      const isText = /\.(csv|tsv|txt)$/i.test(file.name);
      const list: { name: string; grid: Grid }[] = isText ? [{ name: "Data", grid: parseDelimited(await file.text(), data.catalog.limits.maxRows) }] : readWorkbookLimited(await file.arrayBuffer());
      const usable = list.filter((s) => s.grid.length > 1);
      if (!usable.length) {
        setReadErr("Berkas kosong atau tidak dapat dibaca. Gunakan berkas .xlsx atau .csv.");
        return;
      }
      usable.sort((a, b) => b.grid.length - a.grid.length);
      setSheets(usable);
      setSheetIdx(0);
      setFileName(file.name);
      prepare(usable[0].grid, file.name);
      setStep("map");
    } catch (e) {
      setReadErr(e instanceof TooBigError ? `${e.message} Pisahkan berkas atau ambil baris desa Anda saja.` : "Berkas tidak dapat dibaca. Pastikan formatnya .xlsx atau .csv yang tidak rusak.");
    } finally {
      setReading(false);
    }
  }

  const summaryRows = useMemo<SummaryRow[]>(() => (step === "pick" && layout === "SUMMARY" ? readSummaryRows(grid, headerRow, mapping) : []), [step, layout, grid, headerRow, mapping]);
  const match = useMemo(() => matchRows(summaryRows, { name: data.village.name, district: data.village.district, idmCode: data.village.idmVillageCode }), [summaryRows, data.village]);
  const indicatorRead = useMemo(() => (step === "pick" && layout === "INDICATORS" ? readIndicatorRows(grid, headerRow, mapping) : { rows: [], skipped: 0 }), [step, layout, grid, headerRow, mapping]);
  const search = useMemo(() => {
    const q = villageKey(query);
    if (q.length < 3) return [];
    return summaryRows.filter((r) => villageKey(r.namaDesa).includes(q) || norm(r.kodeDesa).includes(norm(query))).slice(0, 20);
  }, [summaryRows, query]);
  const candidates = match.rows.length ? match.rows : search;
  const chosen = summaryRows.find((r) => r.rowNo === picked) ?? (match.rows.length === 1 ? match.rows[0] : null);

  const mapProblems: string[] = [];
  if (layout === "SUMMARY") {
    if (mapping.kodeDesa === null && mapping.namaDesa === null) mapProblems.push("Pilih kolom kode desa atau nama desa agar baris desa Anda dapat dicari.");
    if (["iks", "ike", "ikl", "idm", "status"].every((k) => mapping[k] === null || mapping[k] === undefined)) mapProblems.push("Pilih paling sedikit satu kolom skor (IKS, IKE, IKL, atau nilai IDM) atau status.");
  } else {
    if (mapping.indikator === null || mapping.indikator === undefined) mapProblems.push("Pilih kolom nama indikator.");
    if (mapping.skor === null || mapping.skor === undefined) mapProblems.push("Pilih kolom skor indikator.");
  }
  const yearNum = /^\d{4}$/.test(year) ? Number(year) : NaN;
  if (!Number.isInteger(yearNum) || yearNum < 2010 || yearNum > new Date().getFullYear() + 1) mapProblems.push("Isi tahun data (mis. 2025).");

  async function save() {
    const body =
      layout === "SUMMARY"
        ? { year, layout, fileName, summary: chosen ? { iks: chosen.iks, ike: chosen.ike, ikl: chosen.ikl, idm: chosen.idm, status: chosen.status } : null }
        : { year, layout, fileName, indicators: indicatorRead.rows.map((r) => ({ row: r.rowNo, dimension: r.dimension, code: r.code, name: r.name, score: r.score, maxScore: r.maxScore, note: r.note, suggestion: r.suggestion })) };
    const r = await submit("/api/idm", "POST", body);
    if (r) onDone(yearNum);
  }
  const badIndicators = indicatorRead.rows.filter((r) => r.issue);
  const canSave = layout === "SUMMARY" ? chosen !== null && chosen.badScores.length === 0 : indicatorRead.rows.length > 0 && badIndicators.length === 0;

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Impor berkas IDM</DialogTitle>
          <DialogDescription>{step === "file" ? "Pilih berkas .xlsx atau .csv. Berkas dibaca di perangkat Anda; yang dikirim hanya baris desa Anda." : step === "map" ? "Periksa pemetaan kolom. Kolom dikenali otomatis dari judulnya; ubah bila keliru." : "Periksa data sebelum disimpan. Menyimpan ulang tahun yang sama menggantikan data lama."}</DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-4">
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ ...Object.fromEntries(Object.keys(errors).filter((k) => k.startsWith("indicators.")).map((k) => [k, "Indikator"])), year: "Tahun", layout: "Jenis berkas", summary: "Skor desa", indicators: "Indikator", iks: "IKS", ike: "IKE", ikl: "IKL", idm: "Nilai IDM", status: "Status", fileName: "Nama berkas" }} />

          {step === "file" ? (
            <div className="space-y-2">
              <Label htmlFor="idm-file">Berkas IDM (.xlsx atau .csv, maks. {maxMb} MB)</Label>
              <Input id="idm-file" type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" className="h-auto min-h-11 py-2" disabled={reading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); }} />
              {reading ? (
                <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Membaca berkas…
                </p>
              ) : null}
              {readErr ? (
                <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {readErr}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">Dikenali: berkas satu baris per desa (kolom seperti No, Kode Desa, Nama Desa, IKS, IKE, IKL, NILAI IDM, STATUS IDM; juga yang berakhiran tahun seperti &quot;IKS 2024&quot;) dan berkas satu baris per indikator (kolom Indikator dan Skor). Angka desimal dengan koma (0,7563) maupun titik (0.7563) dibaca benar.</p>
            </div>
          ) : null}

          {step === "map" ? (
            <>
              <p className="text-sm text-muted-foreground break-words">
                Berkas: <strong>{fileName}</strong> ({grid.length - headerRow - 1} baris data)
              </p>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {sheets.length > 1 ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="idm-sheet">Lembar kerja</Label>
                    <SearchSelect id="idm-sheet" className={SELECT_CLASS} value={String(sheetIdx)} onChange={(e) => { const i = Number(e.target.value); setSheetIdx(i); prepare(sheets[i].grid, fileName); }}>
                      {sheets.map((s, i) => (
                        <option key={s.name} value={i}>
                          {s.name} ({s.grid.length} baris)
                        </option>
                      ))}
                    </SearchSelect>
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="idm-layout">Jenis berkas</Label>
                  <SearchSelect id="idm-layout" className={SELECT_CLASS} value={layout} onChange={(e) => { const l = e.target.value as Layout; setLayout(l); setMapping(guessMapping(headers, l)); setPicked(null); }}>
                    {Object.entries(data.catalog.layouts).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </SearchSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idm-hrow">Baris judul kolom</Label>
                  <Input id="idm-hrow" type="number" min={1} max={Math.min(50, grid.length)} inputMode="numeric" className="h-11" value={headerRow + 1} onChange={(e) => { const n = Math.max(1, Math.min(grid.length, Number(e.target.value) || 1)) - 1; setHeaderRow(n); setMapping(guessMapping((grid[n] ?? []).map((c) => (c === null ? "" : String(c))), layout)); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idm-year">Tahun data *</Label>
                  <Input id="idm-year" inputMode="numeric" maxLength={4} className="h-11" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} aria-invalid={Boolean(errors.year)} />
                </div>
              </div>
              <fieldset className="grid min-w-0 gap-3 sm:grid-cols-2">
                <legend className="mb-1 text-sm font-medium">Pemetaan kolom</legend>
                {fields.map((f) => (
                  <div key={f.id} className="min-w-0 space-y-1.5">
                    <Label htmlFor={`idm-map-${f.id}`}>
                      {f.label}
                      {f.required ? " *" : ""}
                    </Label>
                    <SearchSelect id={`idm-map-${f.id}`} className={SELECT_CLASS} value={mapping[f.id] === null || mapping[f.id] === undefined ? "" : String(mapping[f.id])} onChange={(e) => setMapping((m) => ({ ...m, [f.id]: e.target.value === "" ? null : Number(e.target.value) }))}>
                      <option value="">Tidak dipakai</option>
                      {headers.map((h, i) => (h.trim() ? (
                        <option key={i} value={i}>
                          {colName(i)}: {h}
                        </option>
                      ) : null))}
                    </SearchSelect>
                  </div>
                ))}
              </fieldset>
              <div className="min-w-0 overflow-x-auto rounded-md border">
                <table className="w-full min-w-[32rem] text-xs">
                  <caption className="sr-only">Contoh baris berkas</caption>
                  <thead className="bg-muted text-left">
                    <tr>
                      {headers.slice(0, 12).map((h, i) => (
                        <th key={i} scope="col" className="whitespace-nowrap px-2 py-1">
                          {colName(i)}: {h || "(kosong)"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {grid.slice(headerRow + 1, headerRow + 5).map((r, i) => (
                      <tr key={i}>
                        {headers.slice(0, 12).map((_, c) => (
                          <td key={c} className="max-w-40 truncate px-2 py-1">
                            {r[c] === null || r[c] === undefined ? "" : String(r[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mapProblems.length ? (
                <ul role="status" className="list-disc rounded-md border border-amber-600/50 bg-amber-50 p-3 pl-8 text-sm text-amber-950">
                  {mapProblems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}

          {step === "pick" && layout === "SUMMARY" ? (
            <>
              <p className="text-sm">
                {summaryRows.length} desa dalam berkas.{" "}
                {match.by === "kode" ? "Baris ditemukan dari kode desa IDM di pengaturan desa." : match.by === "nama" ? `Baris ditemukan dari nama desa (${data.village.name}).` : "Baris desa Anda belum ditemukan otomatis; cari dengan nama atau kode di bawah."}
              </p>
              {!match.rows.length ? (
                <div className="space-y-1.5">
                  <Label htmlFor="idm-q">Cari desa (nama atau kode, minimal 3 huruf)</Label>
                  <Input id="idm-q" className="h-11" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              ) : null}
              {candidates.length ? (
                <fieldset className="space-y-1">
                  <legend className="mb-1 text-sm font-medium">Pilih baris desa Anda</legend>
                  {candidates.map((r) => (
                    <label key={r.rowNo} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-2 text-sm">
                      <input type="radio" name="idm-row" className="mt-1 size-5" checked={chosen?.rowNo === r.rowNo} onChange={() => setPicked(r.rowNo)} />
                      <span className="min-w-0 break-words">
                        {r.namaDesa || "(tanpa nama)"} {r.kodeDesa ? `· kode ${r.kodeDesa}` : ""} {r.kecamatan ? `· ${r.kecamatan}` : ""}
                        <span className="block text-xs text-muted-foreground">
                          IKS {fmtScore(r.iks)} · IKE {fmtScore(r.ike)} · IKL {fmtScore(r.ikl)} · IDM {fmtScore(r.idm)} · {r.status ?? "tanpa status"} (baris {r.rowNo})
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : query.length >= 3 ? (
                <p className="text-sm text-muted-foreground">Tidak ada desa yang cocok.</p>
              ) : null}
              {chosen ? (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Akan disimpan untuk tahun {year}:</p>
                  <p className="tabular-nums">
                    IKS {fmtScore(chosen.iks)} · IKE {fmtScore(chosen.ike)} · IKL {fmtScore(chosen.ikl)} · Nilai IDM {fmtScore(chosen.idm)} · Status {chosen.status ?? "-"}
                  </p>
                  {chosen.badScores.length ? (
                    <p role="alert" className="mt-1 flex items-start gap-1 text-destructive">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      Kolom {chosen.badScores.join(", ")} berisi nilai yang bukan angka. Perbaiki pemetaan kolom atau berkasnya.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {step === "pick" && layout === "INDICATORS" ? (
            <>
              <p className="text-sm">
                {indicatorRead.rows.length} indikator terbaca{indicatorRead.skipped ? `; ${indicatorRead.skipped} baris tanpa skor dilewati (judul kelompok atau jumlah)` : ""}. Satu berkas harus berisi satu desa saja.
              </p>
              {indicatorRead.rows.length > data.catalog.limits.indicatorsPerYear ? (
                <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  Terlalu banyak indikator ({indicatorRead.rows.length}; maksimal {data.catalog.limits.indicatorsPerYear}). Berkas ini kemungkinan berisi banyak desa; gunakan jenis &quot;satu baris per desa&quot;.
                </p>
              ) : null}
              {badIndicators.length ? (
                <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-medium">{badIndicators.length} baris tidak dapat disimpan. Perbaiki berkasnya atau pemetaan kolom skor/skor maksimal, lalu impor lagi:</p>
                  <ul className="list-disc pl-5">
                    {badIndicators.slice(0, 10).map((r) => (
                      <li key={r.rowNo} className="break-words">
                        Baris {r.rowNo} di berkas ({r.name.slice(0, 50)}): {r.issue}
                      </li>
                    ))}
                    {badIndicators.length > 10 ? <li>dan {badIndicators.length - 10} baris lain</li> : null}
                  </ul>
                </div>
              ) : null}
              <div className="min-w-0 overflow-x-auto rounded-md border">
                <table className="w-full min-w-[32rem] text-xs">
                  <caption className="sr-only">Indikator yang akan disimpan</caption>
                  <thead className="bg-muted text-left">
                    <tr>
                      <th scope="col" className="px-2 py-1">Dimensi</th>
                      <th scope="col" className="px-2 py-1">Indikator</th>
                      <th scope="col" className="px-2 py-1 text-right">Skor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {indicatorRead.rows.slice(0, 8).map((r) => (
                      <tr key={r.rowNo}>
                        <td className="px-2 py-1">{r.dimension}</td>
                        <td className="break-words px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1 text-right tabular-nums">
                          {fmtScore(r.score)}
                          {r.maxScore ? ` / ${fmtScore(r.maxScore)}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {step !== "file" ? (
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setStep(step === "pick" ? "map" : "file")}>
              <ArrowLeft aria-hidden="true" />
              Kembali
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          {step === "map" ? (
            <Button type="button" className="min-h-11" disabled={mapProblems.length > 0} onClick={() => setStep("pick")}>
              Lanjut
            </Button>
          ) : null}
          {step === "pick" ? (
            <Button type="button" className="min-h-11" disabled={busy || !canSave || (layout === "INDICATORS" && indicatorRead.rows.length > data.catalog.limits.indicatorsPerYear)} onClick={save}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan data IDM {year}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
