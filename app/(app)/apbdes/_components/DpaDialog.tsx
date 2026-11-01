"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { ActivityPlanView } from "@/lib/apbdes/dpa";
import { PLAN_STATUS } from "@/lib/apbdes/catalog";
import { MoneyInput } from "./MoneyInput";
import { MONTHS, money, type Overview } from "./shared";

const RKK_LABELS: Record<string, string> = { executorName: "Pelaksana", location: "Lokasi", outputName: "Nama output", outputVolume: "Volume", outputUnit: "Satuan", target: "Sasaran", team: "Tim", startMonth: "Bulan mulai", endMonth: "Bulan selesai" };
const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

/** Pengelolaan DPA satu kegiatan: Rencana Kerja, rencana penarikan bulanan (RAK), dan RAB. */
export function DpaDialog({ o, plan, onClose, onChanged }: { o: Overview; plan: ActivityPlanView; onClose: () => void; onChanged: () => void }) {
  const locked = plan.status !== "DRAFT";
  const editable = o.can.update && !locked;
  const [f, setF] = useState({
    executorName: plan.executorName ?? "",
    location: plan.location ?? "",
    outputName: plan.outputName ?? "",
    outputVolume: plan.outputVolume ? plan.outputVolume.replace(/\.00$/, "") : "",
    outputUnit: plan.outputUnit ?? "",
    target: plan.target ?? "",
    team: plan.team ?? "",
    startMonth: plan.startMonth ? String(plan.startMonth) : "",
    endMonth: plan.endMonth ? String(plan.endMonth) : "",
  });
  const rkk = useFormSubmit();
  const flow = useFormSubmit();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function act(url: string, action?: string) {
    const r = await flow.submit(url, "POST", { year: o.year, activityCode: plan.activityCode, action });
    if (r) onChanged();
  }

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            DPA {plan.activityCode} {plan.name}
          </DialogTitle>
          <DialogDescription>
            Status: {PLAN_STATUS[plan.status]}. Anggaran {money(plan.budget)}. Disusun Kaur/Kasi pelaksana, diverifikasi Sekretaris Desa, disetujui Kepala Desa (Pasal 45-46).
          </DialogDescription>
        </DialogHeader>

        <FormErrorSummary innerRef={flow.summaryRef} errors={{}} general={flow.general} labels={{}} />
        {plan.needsRevision ? <p role="alert" className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Anggaran kegiatan berubah sejak DPA disetujui; rencana penarikan tidak lagi sama dengan APB Desa. Perlu DPPA (Pasal 47).</p> : null}

        <section aria-labelledby="rkk-h" className="space-y-3">
          <h3 id="rkk-h" className="font-semibold">Rencana Kerja Kegiatan</h3>
          <form
            noValidate
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await rkk.submit("/api/apbdes/dpa", "PUT", { year: o.year, activityCode: plan.activityCode, ...f })) onChanged();
            }}
          >
            <div className="sm:col-span-2"><FormErrorSummary innerRef={rkk.summaryRef} errors={rkk.errors} general={rkk.general} labels={RKK_LABELS} /></div>
            {(["executorName", "location", "outputName", "target", "team"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`rkk-${k}`}>{RKK_LABELS[k]}{k === "executorName" ? " (Kaur/Kasi) *" : ""}</Label>
                <Input {...fieldA11y(`rkk-${k}`, rkk.errors[k])} className="h-11" value={f[k]} disabled={!editable} onChange={(e) => set(k, e.target.value)} />
                <FieldError id={`rkk-${k}`} message={rkk.errors[k]} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rkk-vol">Volume output</Label>
                <Input {...fieldA11y("rkk-vol", rkk.errors.outputVolume)} className="h-11" inputMode="decimal" value={f.outputVolume} disabled={!editable} onChange={(e) => set("outputVolume", e.target.value)} />
                <FieldError id="rkk-vol" message={rkk.errors.outputVolume} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rkk-unit">Satuan</Label>
                <Input {...fieldA11y("rkk-unit", rkk.errors.outputUnit)} className="h-11" value={f.outputUnit} disabled={!editable} onChange={(e) => set("outputUnit", e.target.value)} placeholder="unit, M, paket" />
                <FieldError id="rkk-unit" message={rkk.errors.outputUnit} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["startMonth", "endMonth"] as const).map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`rkk-${k}`}>{RKK_LABELS[k]}</Label>
                  <select {...fieldA11y(`rkk-${k}`, rkk.errors[k])} className={SELECT_CLASS} value={f[k]} disabled={!editable} onChange={(e) => set(k, e.target.value)}>
                    <option value="">-</option>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <FieldError id={`rkk-${k}`} message={rkk.errors[k]} />
                </div>
              ))}
            </div>
            {editable ? (
              <div className="sm:col-span-2">
                <Button type="submit" className="min-h-11" disabled={rkk.busy}>{rkk.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Simpan rencana kerja</Button>
              </div>
            ) : null}
          </form>
        </section>

        <section aria-labelledby="rak-h" className="space-y-3">
          <h3 id="rak-h" className="font-semibold">Rencana penarikan per bulan (RAK)</h3>
          <p className="text-sm text-muted-foreground">Jumlah 12 bulan tiap rekening harus sama dengan anggarannya sebelum DPA dapat diverifikasi.</p>
          {plan.accounts.map((a) => <CashRow key={a.accountCode} o={o} plan={plan} account={a} editable={editable} onSaved={onChanged} />)}
        </section>

        <RabSection o={o} plan={plan} editable={editable} onChanged={onChanged} />

        <DialogFooter className="flex-wrap gap-2 sm:gap-2">
          <Button asChild variant="outline" className="min-h-11"><Link href={`/apbdes/cetak?kind=rka&year=${o.year}&activity=${plan.activityCode}`}>Cetak RKA</Link></Button>
          <Button asChild variant="outline" className="min-h-11"><Link href={`/apbdes/cetak?kind=rab&year=${o.year}&activity=${plan.activityCode}`}>Cetak RAB</Link></Button>
          {plan.status === "DRAFT" && o.verifier ? <Button type="button" className="min-h-11" disabled={flow.busy} onClick={() => act("/api/apbdes/dpa/aksi", "verify")}>Verifikasi (Sekretaris Desa)</Button> : null}
          {plan.status === "DIVERIFIKASI" && o.can.approve ? <Button type="button" className="min-h-11" disabled={flow.busy} onClick={() => act("/api/apbdes/dpa/persetujuan")}>Setujui (Kepala Desa)</Button> : null}
          {plan.status !== "DRAFT" && o.verifier ? <Button type="button" variant="ghost" className="min-h-11" disabled={flow.busy} onClick={() => act("/api/apbdes/dpa/aksi", "reopen")}>Buka kembali ke draf</Button> : null}
          <Button type="button" variant="ghost" className="min-h-11" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CashRow({ o, plan, account, editable, onSaved }: { o: Overview; plan: ActivityPlanView; account: ActivityPlanView["accounts"][number]; editable: boolean; onSaved: () => void }) {
  const [months, setMonths] = useState<string[]>(() => account.months.map((m) => (Number(m) === 0 ? "" : m.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1"))));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const sum = months.reduce((a, m) => a + Math.round((Number(m) || 0) * 100), 0);
  const budget = Math.round(Number(account.budget) * 100);
  return (
    <form
      noValidate
      className="space-y-2 rounded-lg border p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await submit("/api/apbdes/dpa/rak", "PUT", { year: o.year, activityCode: plan.activityCode, accountCode: account.accountCode, months })) onSaved();
      }}
    >
      <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ months: "Rencana" }} />
      <p className="text-sm font-medium">{account.accountCode} {account.accountName} <span className="font-normal text-muted-foreground">· anggaran {money(account.budget)}</span></p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {MONTHS.map((m, i) => (
          <div key={m} className="space-y-1">
            <Label htmlFor={`rak-${account.accountCode}-${i}`} className="text-xs">{m.slice(0, 3)}</Label>
            <Input id={`rak-${account.accountCode}-${i}`} className="h-10" inputMode="decimal" disabled={!editable} value={months[i]} onChange={(e) => setMonths((p) => p.map((x, j) => (j === i ? e.target.value.replace(",", ".").replace(/[^\d.]/g, "") : x)))} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <p className={`text-sm ${sum === budget ? "text-emerald-800 dark:text-emerald-300" : sum > budget ? "text-destructive" : "text-amber-800 dark:text-amber-300"}`} aria-live="polite">
          Jumlah {money(sum / 100)} dari {money(account.budget)}{sum === budget ? " (sesuai)" : sum > budget ? " (melebihi)" : ` (kurang ${money((budget - sum) / 100)})`}
        </p>
        {editable ? <Button type="submit" size="sm" className="min-h-11" disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Simpan</Button> : null}
      </div>
    </form>
  );
}

function RabSection({ o, plan, editable, onChanged }: { o: Overview; plan: ActivityPlanView; editable: boolean; onChanged: () => void }) {
  const [f, setF] = useState({ accountCode: plan.accounts[0]?.accountCode ?? "", description: "", volume: "", unit: "", unitPrice: "" });
  const add = useFormSubmit();
  const del = useFormSubmit();
  const labels = { description: "Uraian", volume: "Volume", unit: "Satuan", unitPrice: "Harga satuan", accountCode: "Rekening" };
  return (
    <section aria-labelledby="rab-h" className="space-y-3">
      <h3 id="rab-h" className="font-semibold">Rencana Anggaran Biaya</h3>
      <FormErrorSummary innerRef={del.summaryRef} errors={{}} general={del.general} labels={{}} />
      {plan.costItems.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada baris RAB.</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">RAB {plan.name}</caption>
            <thead className="border-b text-muted-foreground"><tr><th scope="col" className="p-2 font-medium">Rekening</th><th scope="col" className="p-2 font-medium">Uraian</th><th scope="col" className="p-2 text-right font-medium">Volume</th><th scope="col" className="p-2 text-right font-medium">Harga satuan</th><th scope="col" className="p-2 text-right font-medium">Jumlah</th>{editable ? <th scope="col" className="p-2"><span className="sr-only">Hapus</span></th> : null}</tr></thead>
            <tbody>
              {plan.costItems.map((x) => (
                <tr key={x.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap p-2">{x.accountCode}</td>
                  <td className="p-2 break-words">{x.description}</td>
                  <td className="whitespace-nowrap p-2 text-right tabular-nums">{x.volume.replace(/\.00$/, "")} {x.unit}</td>
                  <td className="whitespace-nowrap p-2 text-right tabular-nums">{money(x.unitPrice)}</td>
                  <td className="whitespace-nowrap p-2 text-right tabular-nums">{money(x.amount)}</td>
                  {editable ? <td className="p-2 text-right"><Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus ${x.description}`} disabled={del.busy} onClick={async () => { if (await del.submit(`/api/apbdes/dpa/rab?id=${x.id}&year=${o.year}`, "DELETE", undefined, "Gagal menghapus. Coba lagi.")) onChanged(); }}><Trash2 aria-hidden="true" /></Button></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editable ? (
        <form
          noValidate
          className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await add.submit("/api/apbdes/dpa/rab", "POST", { year: o.year, activityCode: plan.activityCode, ...f })) {
              setF((p) => ({ ...p, description: "", volume: "", unit: "", unitPrice: "" }));
              onChanged();
            }
          }}
        >
          <div className="sm:col-span-2"><FormErrorSummary innerRef={add.summaryRef} errors={add.errors} general={add.general} labels={labels} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="rab-acc">Rekening</Label>
            <select {...fieldA11y("rab-acc", add.errors.accountCode)} className={SELECT_CLASS} value={f.accountCode} onChange={(e) => setF((p) => ({ ...p, accountCode: e.target.value }))}>
              {plan.accounts.map((a) => <option key={a.accountCode} value={a.accountCode}>{a.accountCode} {a.accountName}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rab-desc">Uraian *</Label>
            <Input {...fieldA11y("rab-desc", add.errors.description)} className="h-11" maxLength={300} value={f.description} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} />
            <FieldError id="rab-desc" message={add.errors.description} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rab-vol">Volume *</Label>
            <Input {...fieldA11y("rab-vol", add.errors.volume)} className="h-11" inputMode="decimal" value={f.volume} onChange={(e) => setF((p) => ({ ...p, volume: e.target.value.replace(",", ".") }))} />
            <FieldError id="rab-vol" message={add.errors.volume} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rab-unit">Satuan *</Label>
            <Input {...fieldA11y("rab-unit", add.errors.unit)} className="h-11" maxLength={30} value={f.unit} onChange={(e) => setF((p) => ({ ...p, unit: e.target.value }))} />
            <FieldError id="rab-unit" message={add.errors.unit} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="rab-price">Harga satuan *</Label>
            <MoneyInput id="rab-price" value={f.unitPrice} onChange={(v) => setF((p) => ({ ...p, unitPrice: v }))} invalid={Boolean(add.errors.unitPrice)} describedBy={add.errors.unitPrice ? "rab-price-err" : undefined} />
            <FieldError id="rab-price" message={add.errors.unitPrice} />
          </div>
          <div className="sm:col-span-2"><Button type="submit" className="min-h-11" disabled={add.busy}>{add.busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Tambah baris RAB</Button></div>
        </form>
      ) : null}
    </section>
  );
}
