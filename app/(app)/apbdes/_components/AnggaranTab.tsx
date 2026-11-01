"use client";

import { useEffect, useState } from "react";
import { FilePlus2, GitCompare, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import type { LineView } from "@/lib/apbdes/service";
import { AdoptDialog, AmendmentDialog } from "./AdoptDialog";
import { LineDialog } from "./LineDialog";
import { ConfirmRequest, dateId, money, type Overview } from "./shared";

interface DocResponse {
  document: {
    id: number;
    version: number;
    label: string;
    status: string;
    regulationNumber: string | null;
    regulationDate: string | null;
    exceptionalReason: string | null;
    lines: LineView[];
    totals: { income: string; expense: string; financingIn: string; financingOut: string; difference: string };
  };
}

type Dlg =
  | { kind: "line"; line: LineView | null }
  | { kind: "adopt" }
  | { kind: "amend" }
  | { kind: "delLine"; line: LineView }
  | { kind: "delDoc" };

const SECTIONS = [
  { title: "Pendapatan", match: (c: string) => c.startsWith("4.") },
  { title: "Belanja", match: (c: string) => c.startsWith("5.") },
  { title: "Pembiayaan", match: (c: string) => c.startsWith("6.") },
];

export function AnggaranTab({ o, reload, onWarnings }: { o: Overview; reload: () => void; onWarnings: (w: string[]) => void }) {
  const [selected, setSelected] = useState<number | null>(o.activeDocumentId ?? o.documents.at(-1)?.id ?? null);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Pilih dokumen yang valid bila daftar berubah (mis. setelah hapus draf atau ganti tahun).
  useEffect(() => {
    if (selected === null || !o.documents.some((d) => d.id === selected)) setSelected(o.activeDocumentId ?? o.documents.at(-1)?.id ?? null);
  }, [o.documents, o.activeDocumentId, selected]);

  const doc = useApiGet<DocResponse>(selected ? `/api/apbdes/dokumen/${selected}` : null);
  const d = doc.data?.document;
  const editable = d?.status === "DRAFT" && o.can.update;
  const hasDraft = o.documents.some((x) => x.status === "DRAFT");
  const hasAdopted = o.documents.some((x) => x.status === "DITETAPKAN");
  const nextVersion = (o.documents.at(-1)?.version ?? -1) + 1;
  const refresh = () => { setDlg(null); reload(); doc.reload(); };

  async function createFirst() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/apbdes/dokumen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: o.year }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) return setCreateError(typeof j?.error === "string" ? j.error : "Gagal membuat APB Desa.");
      setSelected(j.id);
      reload();
    } catch {
      setCreateError("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5">
      {o.documents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">APB Desa {o.year} belum dibuat.</p>
          <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">Masukkan anggaran sesuai Peraturan Desa tentang APB Desa. Belanja baru bisa dicatat di Buku Kas setelah APB Desa ditetapkan di sini.</p>
          {o.can.create ? (
            <Button type="button" className="mt-4 min-h-11" disabled={creating} onClick={createFirst}>
              {creating ? <Loader2 aria-hidden="true" className="animate-spin" /> : <FilePlus2 aria-hidden="true" />}
              Buat APB Desa {o.year}
            </Button>
          ) : null}
          {createError ? <p role="alert" className="mt-3 text-sm text-destructive">{createError}</p> : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Dokumen anggaran">
          {o.documents.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={selected === x.id} onClick={() => setSelected(x.id)} className={`min-h-11 rounded-md border px-3 text-sm ${selected === x.id ? "border-primary bg-primary/10 font-medium" : ""}`}>
              {x.label} <span className="text-muted-foreground">· {x.status === "DITETAPKAN" ? "Ditetapkan" : "Draf"}</span>
            </button>
          ))}
          {hasAdopted && !hasDraft && o.can.create ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "amend" })}>
              <GitCompare aria-hidden="true" />
              Buat perubahan
            </Button>
          ) : null}
        </div>
      )}

      {doc.loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat anggaran…</p> : null}
      {doc.error ? <p role="alert" className="text-destructive">{doc.error}</p> : null}

      {d ? (
        <section className="space-y-4" aria-label={d.label}>
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{d.label} {o.year}</h2>
              {d.status === "DITETAPKAN" ? (
                <p className="flex items-center gap-1.5 text-sm text-emerald-800 dark:text-emerald-300"><ShieldCheck aria-hidden="true" className="size-4" />Ditetapkan: Perdes {d.regulationNumber}{d.regulationDate ? `, ${dateId(d.regulationDate)}` : ""}. Terkunci.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Draf. Belum berlaku sampai ditetapkan.</p>
              )}
              {d.exceptionalReason ? <p className="text-sm text-muted-foreground">Keadaan luar biasa: {d.exceptionalReason}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {editable ? (
                <>
                  <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "line", line: null })}><Plus aria-hidden="true" />Tambah baris</Button>
                  <Button type="button" variant="outline" className="min-h-11" disabled={d.lines.length === 0} onClick={() => setDlg({ kind: "adopt" })}><ShieldCheck aria-hidden="true" />Tetapkan</Button>
                </>
              ) : null}
              {d.status === "DRAFT" && o.can.delete ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "delDoc" })} aria-label={`Hapus draf ${d.label}`}><Trash2 aria-hidden="true" />Hapus draf</Button>
              ) : null}
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Pendapatan", d.totals.income],
              ["Belanja", d.totals.expense],
              ["Penerimaan pembiayaan", d.totals.financingIn],
              ["Pengeluaran pembiayaan", d.totals.financingOut],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd className="text-lg font-semibold tabular-nums">{money(v!)}</dd>
              </div>
            ))}
          </dl>
          {Number(d.totals.difference) !== 0 ? (
            <p role="status" className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Anggaran belum seimbang (selisih {money(d.totals.difference)}): pendapatan + penerimaan pembiayaan - belanja - pengeluaran pembiayaan. Defisit lazimnya ditutup SiLPA tahun lalu dan surplus dipakai untuk pengeluaran pembiayaan.
            </p>
          ) : null}

          {d.lines.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Belum ada baris anggaran.</p> : null}
          {SECTIONS.map((s) => {
            const rows = d.lines.filter((l) => s.match(l.accountCode));
            if (rows.length === 0) return null;
            return (
              <div key={s.title} className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <caption className="bg-muted/50 p-3 text-left font-semibold">{s.title}</caption>
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th scope="col" className="p-3 font-medium">Kode</th>
                      <th scope="col" className="p-3 font-medium">Uraian</th>
                      <th scope="col" className="p-3 font-medium">Sumber dana</th>
                      <th scope="col" className="p-3 text-right font-medium">Jumlah</th>
                      {editable ? <th scope="col" className="p-3"><span className="sr-only">Tindakan</span></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id} className="border-b last:border-0 align-top">
                        <td className="whitespace-nowrap p-3 tabular-nums">{l.activityCode ? `${l.activityCode} · ` : ""}{l.accountCode}</td>
                        <td className="p-3">
                          <p className="break-words">{l.description}</p>
                          <p className="break-words text-xs text-muted-foreground">{l.activityName ? `${l.activityName} · ` : ""}{l.accountName}</p>
                        </td>
                        <td className="p-3">{l.fundSource ? (o.terms.fundSources[l.fundSource] ?? l.fundSource) : "-"}</td>
                        <td className="whitespace-nowrap p-3 text-right tabular-nums">{money(l.amount)}</td>
                        {editable ? (
                          <td className="whitespace-nowrap p-3 text-right">
                            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah ${l.description}`} onClick={() => setDlg({ kind: "line", line: l })}><Pencil aria-hidden="true" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus ${l.description}`} onClick={() => setDlg({ kind: "delLine", line: l })}><Trash2 aria-hidden="true" /></Button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>
      ) : null}

      {dlg?.kind === "line" && d ? <LineDialog documentId={d.id} line={dlg.line} terms={o.terms} onClose={() => setDlg(null)} onSaved={refresh} /> : null}
      {dlg?.kind === "adopt" && d ? <AdoptDialog documentId={d.id} label={d.label} onClose={() => setDlg(null)} onDone={(w) => { onWarnings(w); refresh(); }} /> : null}
      {dlg?.kind === "amend" ? <AmendmentDialog year={o.year} nextVersion={nextVersion} onClose={() => setDlg(null)} onDone={(id) => { setSelected(id); refresh(); }} /> : null}
      {dlg?.kind === "delLine" && d ? (
        <ConfirmRequest title="Hapus baris anggaran?" text={`“${dlg.line.description}” (${money(dlg.line.amount)}) dihapus dari draf.`} button="Hapus" destructive url={`/api/apbdes/dokumen/${d.id}/baris/${dlg.line.id}`} method="DELETE" onClose={() => setDlg(null)} onDone={refresh} />
      ) : null}
      {dlg?.kind === "delDoc" && d ? <ConfirmRequest title="Hapus draf?" text={`${d.label} ${o.year} (draf) beserta seluruh barisnya dihapus permanen.`} button="Hapus draf" destructive url={`/api/apbdes/dokumen/${d.id}`} method="DELETE" onClose={() => setDlg(null)} onDone={() => { setSelected(null); refresh(); }} /> : null}
    </div>
  );
}
