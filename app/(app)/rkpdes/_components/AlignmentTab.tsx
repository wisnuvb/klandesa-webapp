"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Pill, SELECT_CLASS, WarningList, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import type { AlignmentView } from "@/lib/rkpdes/alignment-service";

const STATE: Record<AlignmentView["rows"][number]["state"], { label: string; tone: string }> = {
  SELARAS: { label: "Selaras", tone: "done" },
  KURANG: { label: "APB Desa lebih kecil", tone: "soon" },
  LEBIH: { label: "APB Desa lebih besar", tone: "soon" },
  BELUM_DIANGGARKAN: { label: "Belum dianggarkan", tone: "overdue" },
  TIDAK_DI_RKP: { label: "Tidak ada di RKP Desa", tone: "info" },
};

/** Selisih bertanda (APB Desa dikurangi RKP Desa); nol ditulis polos. */
function signed(v: string): string {
  const n = Number(v);
  if (!n) return "Rp0";
  return `${n > 0 ? "+" : "−"}${rupiah(String(Math.abs(n)))}`;
}

type Response = AlignmentView & { can: { prefill: boolean } };
type Prefill = { created: number; skipped: { activityCode: string; reason: string }[] };

export function AlignmentTab({ documentId }: { documentId: number }) {
  const [apbdesId, setApbdesId] = useState<string>("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const { data, loading, error, reload } = useApiGet<Response>(`/api/perencanaan/rkpdes/${documentId}/keselarasan${apbdesId ? `?apbdes=${apbdesId}` : ""}`);
  // Pilihan dokumen disimpan dari jawaban pertama agar pemilih tetap tampil saat jawaban berikutnya dimuat.
  const [options, setOptions] = useState<Response["apbdesOptions"] | null>(null);
  if (data && options !== data.apbdesOptions && !apbdesId) setOptions(data.apbdesOptions);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Prefill | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function prefill() {
    setBusy(true);
    setActionError(null);
    setResult(null);
    const res = await fetch(`/api/perencanaan/rkpdes/${documentId}/keselarasan`, { method: "POST" }).catch(() => null);
    const j = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setResult({ created: j.created, skipped: j.skipped ?? [] });
      return reload();
    }
    setActionError(typeof j?.error === "string" ? j.error : "Gagal menyiapkan DPA. Coba lagi.");
  }

  if (error && !data) {
    return (
      <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
        {error}
      </div>
    );
  }

  const choices = options ?? data?.apbdesOptions ?? [];
  const rows = data ? (onlyIssues ? data.rows.filter((r) => r.state !== "SELARAS") : data.rows) : [];
  const issueCount = data ? data.rows.length - data.counts.SELARAS : 0;

  return (
    <>
      <section aria-labelledby="al-h" className="space-y-3">
        <h2 id="al-h" className="text-lg font-semibold">
          Keselarasan dengan APB Desa
        </h2>
        <p className="text-sm text-muted-foreground">
          APB Desa disusun berdasarkan RKP Desa. Tabel ini mencocokkan anggaran kegiatan RKP Desa dengan belanja APB Desa per kode kegiatan; hanya memeriksa, tidak mengubah APB Desa.
        </p>

        {choices.length ? (
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="al-apb">Dokumen APB Desa pembanding</Label>
            <SearchSelect id="al-apb" className={SELECT_CLASS} value={apbdesId || String(choices[0]!.id)} onChange={(e) => setApbdesId(e.target.value)}>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} — {c.status === "DITETAPKAN" ? "ditetapkan" : "draf"}
                </option>
              ))}
            </SearchSelect>
          </div>
        ) : null}

        {loading ? (
          <p role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Membandingkan…
          </p>
        ) : null}

        {data && !data.apbdes ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Belum ada APB Desa untuk tahun {data.rkp.year}. Susun di menu{" "}
            <Link href="/apbdes" className="font-medium text-foreground underline underline-offset-4">
              APB Desa
            </Link>
            ; setelah itu hasil pencocokan tampil di sini.
          </p>
        ) : null}

        {data?.apbdes ? (
          <>
            <WarningList title="Perlu diperiksa" items={data.warnings} />
            {!data.warnings.length && data.rows.length ? (
              <p role="status" className="flex items-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Semua kegiatan RKP Desa selaras dengan {data.apbdes.label}.
              </p>
            ) : null}

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(Object.keys(STATE) as (keyof typeof STATE)[]).map((k) => (
                <div key={k} className="rounded-lg border p-3">
                  <dt className="text-xs text-muted-foreground">{STATE[k].label}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{data.counts[k]}</dd>
                </div>
              ))}
            </dl>

            {data.rows.length ? (
              <>
                <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
                  Tampilkan hanya yang perlu diperiksa ({issueCount})
                </label>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[44rem] text-sm">
                    <caption className="sr-only">Perbandingan anggaran per kegiatan antara RKP Desa dan {data.apbdes.label}</caption>
                    <thead className="bg-muted text-left">
                      <tr>
                        <th scope="col" className="px-3 py-2">Kegiatan</th>
                        <th scope="col" className="px-3 py-2 text-right">RKP Desa</th>
                        <th scope="col" className="px-3 py-2 text-right">{data.apbdes.label}</th>
                        <th scope="col" className="px-3 py-2 text-right">Selisih</th>
                        <th scope="col" className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((r) => (
                        <tr key={r.activityCode}>
                          <td className="px-3 py-2">
                            <span className="tabular-nums text-muted-foreground">{r.activityCode}</span> {r.name}
                            {r.titles.length ? <span className="block text-xs text-muted-foreground">{r.titles.join(" · ")}</span> : null}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{rupiah(r.rkp)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{rupiah(r.apb)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{signed(r.diff)}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <Pill tone={STATE[r.state].tone}>{STATE[r.state].label}</Pill>
                          </td>
                        </tr>
                      ))}
                      {!rows.length ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                            Tidak ada yang perlu diperiksa.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-medium">
                        <td className="px-3 py-2">Jumlah{data.uncoded.count ? ` (termasuk ${data.uncoded.count} kegiatan tanpa kode)` : ""}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{rupiah(data.totals.rkp)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{rupiah(data.totals.apb)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{signed(data.totals.diff)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">Selisih = APB Desa dikurangi RKP Desa. Hanya belanja yang dibandingkan; pendapatan dan pembiayaan tidak ikut.</p>
              </>
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada kegiatan di RKP Desa maupun belanja di APB Desa untuk dibandingkan.</p>
            )}

            {data.sources.length ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[32rem] text-sm">
                  <caption className="sr-only">Perbandingan per sumber dana</caption>
                  <thead className="bg-muted text-left">
                    <tr>
                      <th scope="col" className="px-3 py-2">Sumber dana</th>
                      <th scope="col" className="px-3 py-2 text-right">RKP Desa</th>
                      <th scope="col" className="px-3 py-2 text-right">{data.apbdes.label}</th>
                      <th scope="col" className="px-3 py-2 text-right">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.sources.map((s) => (
                      <tr key={s.fundSource ?? "kosong"}>
                        <td className="px-3 py-2">{s.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{rupiah(s.rkp)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{rupiah(s.apb)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{signed(s.diff)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {data?.apbdes && data.can.prefill ? (
        <section aria-labelledby="dpa-h" className="space-y-3 rounded-lg border p-4">
          <h2 id="dpa-h" className="text-lg font-semibold">
            Siapkan DPA dari RKP Desa
          </h2>
          <p className="text-sm text-muted-foreground">
            Menyalin lokasi, keluaran, volume, dan tim pelaksana kegiatan RKP Desa menjadi draf Rencana Kerja Kegiatan di{" "}
            <Link href="/apbdes" className="font-medium text-foreground underline underline-offset-4">
              DPA
            </Link>
            . DPA yang sudah ada tidak ditimpa. Pelaksana (Kaur/Kasi) dan bulan pelaksanaan tetap Anda isi sendiri.
          </p>
          {!data.dpaReady ? <p className="text-sm text-amber-900">Tersedia setelah APB Desa ditetapkan dengan Peraturan Desa. Dokumen yang dipilih masih berstatus draf.</p> : null}
          <Button type="button" className="min-h-11" disabled={busy || !data.dpaReady} onClick={prefill}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {busy ? "Menyiapkan…" : "Siapkan draf DPA"}
          </Button>
          {actionError ? (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          ) : null}
          {result ? (
            <div role="status" className="space-y-1 text-sm">
              <p className="font-medium">{result.created} DPA kegiatan disiapkan.</p>
              {result.skipped.length ? (
                <ul className="list-disc space-y-0.5 pl-6 text-muted-foreground">
                  {result.skipped.map((s) => (
                    <li key={s.activityCode}>
                      <span className="tabular-nums">{s.activityCode}</span>: {s.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
