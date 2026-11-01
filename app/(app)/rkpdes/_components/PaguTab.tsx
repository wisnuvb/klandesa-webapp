"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS, WarningList, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { DetailResponse } from "./types";

export function PaguTab({ data, editable, reload }: { data: DetailResponse; editable: boolean; reload: () => void }) {
  const d = data.document;
  const base = `/api/perencanaan/rkpdes/${d.id}`;
  const [source, setSource] = useState("DD");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const pagu = useFormSubmit();
  const prog = useFormSubmit();
  const [level, setLevel] = useState("KABUPATEN");
  const [agency, setAgency] = useState("");
  const [pname, setPname] = useState("");
  const [loc, setLoc] = useState("");
  const [pamount, setPamount] = useState("");
  const [pnote, setPnote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function savePagu(e: React.FormEvent) {
    e.preventDefault();
    const r = await pagu.submit(`${base}/pagu`, "PUT", { source, amount, note });
    if (r) {
      setAmount("");
      setNote("");
      reload();
    }
  }
  async function addProgram(e: React.FormEvent) {
    e.preventDefault();
    const r = await prog.submit(`${base}/program-masuk`, "POST", { level, agency, name: pname, location: loc, amount: pamount || null, note: pnote });
    if (r) {
      setAgency("");
      setPname("");
      setLoc("");
      setPamount("");
      setPnote("");
      reload();
    }
  }
  async function del(url: string) {
    setErr(null);
    const res = await fetch(url, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menghapus.");
  }

  const spend = d.activitySummary.bySource;
  const rows = Object.entries(data.terms.paguSources)
    .map(([k, label]) => ({ k, label, pagu: d.pagu.find((p) => p.source === k)?.amount ?? null, spent: spend[k] ?? null }))
    .filter((r) => r.pagu !== null || r.spent !== null);

  return (
    <>
      <section aria-labelledby="pagu-h" className="space-y-3">
        <h2 id="pagu-h" className="text-lg font-semibold">
          Pagu indikatif Desa
        </h2>
        <p className="text-sm text-muted-foreground">Informasi dari kabupaten/kota paling lambat Juli (Pasal 35). Isi per sumber dana, lalu bandingkan dengan anggaran kegiatan.</p>
        <WarningList title="Anggaran melebihi pagu" items={d.paguWarnings} />
        {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
        {rows.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">Pagu indikatif dan anggaran kegiatan per sumber dana</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Sumber dana</th>
                  <th scope="col" className="px-3 py-2 text-right">Pagu indikatif</th>
                  <th scope="col" className="px-3 py-2 text-right">Anggaran kegiatan</th>
                  {editable ? <th scope="col" className="px-3 py-2"><span className="sr-only">Aksi</span></th> : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.k}>
                    <td className="px-3 py-2">{r.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rupiah(r.pagu)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rupiah(r.spent)}</td>
                    {editable ? (
                      <td className="px-3 py-1 text-right">
                        {r.pagu !== null ? (
                          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus pagu ${r.label}`} onClick={() => del(`${base}/pagu?source=${r.k}`)}>
                            <Trash2 aria-hidden="true" />
                          </Button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="px-3 py-2">Jumlah</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rupiah(d.paguTotal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rupiah(d.activitySummary.totalBudget)}</td>
                  {editable ? <td /> : null}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada pagu tercatat.</p>
        )}
        {editable ? (
          <form onSubmit={savePagu} className="space-y-3 rounded-lg border p-4" noValidate>
            <FormErrorSummary innerRef={pagu.summaryRef} errors={pagu.errors} general={pagu.general} labels={{ source: "Sumber", amount: "Jumlah" }} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pg-src">Sumber dana *</Label>
                <SearchSelect id="pg-src" className={SELECT_CLASS} value={source} onChange={(e) => setSource(e.target.value)}>
                  {Object.entries(data.terms.paguSources).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </SearchSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pg-amt">Jumlah pagu *</Label>
                <CurrencyInput id="pg-amt" inputClassName="h-11" value={amount} onValueChange={setAmount} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pg-note">Catatan</Label>
                <Input id="pg-note" className="h-11" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="min-h-11" disabled={pagu.busy}>
              {pagu.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan pagu
            </Button>
            <p className="text-sm text-muted-foreground">Menyimpan sumber yang sama memperbarui angkanya.</p>
          </form>
        ) : null}
      </section>

      <section aria-labelledby="inc-h" className="space-y-3">
        <h2 id="inc-h" className="text-lg font-semibold">
          Program yang masuk Desa
        </h2>
        <p className="text-sm text-muted-foreground">Rencana program/kegiatan Pemerintah, provinsi, dan kabupaten/kota yang akan dilaksanakan di desa Anda (Pasal 36 ayat 2), agar tidak tumpang tindih dengan kegiatan Desa.</p>
        {d.incoming.length ? (
          <ul className="divide-y rounded-lg border text-sm">
            {d.incoming.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-muted-foreground">
                    {p.levelLabel}
                    {p.agency ? ` · ${p.agency}` : ""}
                    {p.location ? ` · ${p.location}` : ""}
                    {p.amount ? ` · ${rupiah(p.amount)}` : ""}
                  </p>
                  {p.note ? <p className="text-muted-foreground">{p.note}</p> : null}
                </div>
                {editable ? (
                  <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Hapus program ${p.name}`} onClick={() => del(`${base}/program-masuk/${p.id}`)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada program masuk Desa tercatat.</p>
        )}
        {editable ? (
          <form onSubmit={addProgram} className="space-y-3 rounded-lg border p-4" noValidate>
            <FormErrorSummary innerRef={prog.summaryRef} errors={prog.errors} general={prog.general} labels={{ level: "Tingkat", name: "Nama program", amount: "Jumlah" }} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ip-level">Tingkat pemerintah *</Label>
                <SearchSelect id="ip-level" className={SELECT_CLASS} value={level} onChange={(e) => setLevel(e.target.value)}>
                  {Object.entries(data.terms.incomingLevels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </SearchSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ip-agency">Instansi</Label>
                <Input id="ip-agency" className="h-11" maxLength={150} value={agency} onChange={(e) => setAgency(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ip-name">Nama program/kegiatan *</Label>
                <Input id="ip-name" className="h-11" maxLength={200} value={pname} onChange={(e) => setPname(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ip-loc">Lokasi</Label>
                <Input id="ip-loc" className="h-11" maxLength={200} value={loc} onChange={(e) => setLoc(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ip-amt">Perkiraan nilai</Label>
                <CurrencyInput id="ip-amt" inputClassName="h-11" value={pamount} onValueChange={setPamount} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ip-note">Catatan</Label>
                <Input id="ip-note" className="h-11" maxLength={300} value={pnote} onChange={(e) => setPnote(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="min-h-11" disabled={prog.busy}>
              {prog.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Tambah program
            </Button>
          </form>
        ) : null}
      </section>
    </>
  );
}
