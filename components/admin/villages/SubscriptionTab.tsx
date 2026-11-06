"use client";

import { useId, useMemo, useState } from "react";
import { CalendarPlus, Pencil, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { StepUpDialog, type StepUpSubmit } from "@/components/admin/StepUpDialog";
import {
  EXTEND_MAX,
  VILLAGE_PLANS,
  VILLAGE_SUBSCRIPTION_STATUSES,
  computeExtend,
  planLabel,
  type ExtendUnit,
} from "@/lib/platform/villages/subscription";
import {
  INVOICE_STATUS_LABEL, PRODUCT_LABEL, STATUS_LABEL, fmtDate, fmtDateTime, fmtRupiah, readError,
  type VillageDetail,
} from "./types";
import { remainingLabel } from "./VillageHeader";

type Dialog = "extend" | "set" | "active" | null;

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw await readError(res, "Aksi gagal. Coba lagi.");
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function SubscriptionTab({ d, onChanged }: { d: VillageDetail; onChanged: () => void }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState("");
  const base = `/api/admin/villages/${d.village.id}`;
  const sub = d.subscription;

  // Form perpanjang
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<ExtendUnit>("months");
  // Form ubah
  const [plan, setPlan] = useState<string>(VILLAGE_PLANS.includes(sub.plan as never) ? sub.plan : "lengkap");
  const [status, setStatus] = useState<string>(sub.status);
  const [expiry, setExpiry] = useState(toDateInput(sub.expiry));

  const ids = { amount: useId(), unit: useId(), plan: useId(), status: useId(), expiry: useId() };

  const preview = useMemo(() => {
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1) return null;
    const r = computeExtend(
      { plan: sub.plan, status: sub.status, expiry: sub.expiry ? new Date(sub.expiry) : null, startedAt: null },
      { amount: n, unit },
    );
    return r.ok ? r.value : null;
  }, [amount, unit, sub.plan, sub.status, sub.expiry]);

  function openDialog(which: Exclude<Dialog, null>) {
    if (which === "set") {
      setPlan(VILLAGE_PLANS.includes(sub.plan as never) ? sub.plan : "lengkap");
      setStatus(sub.status);
      setExpiry(toDateInput(sub.expiry));
    }
    setDialog(which);
  }

  async function done(msg: string) {
    setNotice(msg);
    onChanged();
  }

  return (
    <div className="space-y-4">
      <p role="status" aria-live="polite" className={notice ? "rounded-md border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100" : "sr-only"}>
        {notice}
      </p>

      <Card>
        <CardHeader><CardTitle className="text-base">Langganan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
            <dt className="text-muted-foreground">Paket</dt><dd className="font-medium">{planLabel(sub.plan)}</dd>
            <dt className="text-muted-foreground">Status</dt><dd>{STATUS_LABEL[sub.status] ?? sub.status}</dd>
            <dt className="text-muted-foreground">Mulai</dt><dd>{fmtDate(sub.startedAt)}</dd>
            <dt className="text-muted-foreground">Berlaku sampai</dt><dd className="tabular-nums">{sub.expiry ? fmtDateTime(sub.expiry) : "Tanpa batas"} ({remainingLabel(sub)})</dd>
            <dt className="text-muted-foreground">Add-on GPS absensi</dt>
            <dd>{sub.gpsAddon.active ? `Aktif${sub.gpsAddon.expiry ? ` sampai ${fmtDate(sub.gpsAddon.expiry)}` : " (tanpa batas)"}` : "Tidak aktif"}</dd>
            <dt className="text-muted-foreground">Mode data</dt><dd>{sub.writable ? "Baca + tulis" : sub.readable ? "Hanya baca" : "Terkunci"}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openDialog("extend")} className="min-h-10"><CalendarPlus aria-hidden="true" /> Perpanjang</Button>
            <Button variant="outline" onClick={() => openDialog("set")} className="min-h-10"><Pencil aria-hidden="true" /> Ubah paket/status</Button>
            <Button variant={d.village.isActive ? "destructive" : "outline"} onClick={() => openDialog("active")} className="min-h-10">
              <Power aria-hidden="true" /> {d.village.isActive ? "Nonaktifkan desa" : "Aktifkan desa"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Perpanjangan manual tidak membuat tagihan dan tidak menghasilkan komisi mitra. Setiap perubahan tercatat di jejak audit.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Modul &amp; add-on berlangganan</CardTitle></CardHeader>
        <CardContent>
          {d.modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada add-on berlangganan.</p>
          ) : (
            <ul className="divide-y">
              {d.modules.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium">{m.moduleCode}{m.planCode ? ` · ${m.planCode}` : ""}</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="text-muted-foreground">s.d. {fmtDate(m.expiryDate)}</span>
                    <Badge variant="outline" className={m.expired ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100" : ""}>
                      {m.expired ? "Kedaluwarsa" : STATUS_LABEL[m.status] ?? m.status}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tagihan terbaru</CardTitle></CardHeader>
        <CardContent>
          {d.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada tagihan.</p>
          ) : (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabel tagihan terbaru">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">20 tagihan terakhir desa</caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="py-2 pr-3 font-medium">Nomor</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Produk</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Jumlah</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                    <th scope="col" className="py-2 font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {d.invoices.map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{v.invoiceNumber}</td>
                      <td className="py-2 pr-3">{PRODUCT_LABEL[v.productType] ?? v.productType}<span className="text-muted-foreground"> · {v.planCode}</span></td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtRupiah(v.amount)}</td>
                      <td className="py-2 pr-3">{INVOICE_STATUS_LABEL[v.status] ?? v.status}</td>
                      <td className="py-2 tabular-nums">{fmtDate(v.paidAt ?? v.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <StepUpDialog
        open={dialog === "extend"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Perpanjang langganan ${d.village.name}`}
        confirmLabel="Perpanjang"
        description={
          <div className="space-y-3">
            <p>Masa berlaku disambung dari tanggal berakhir saat ini (atau dari hari ini bila sudah lewat). Tidak membuat tagihan dan tidak ada komisi mitra.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={ids.amount}>Jumlah</Label>
                <Input id={ids.amount} className="text-foreground" type="number" inputMode="numeric" min={1} max={EXTEND_MAX[unit]} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={ids.unit}>Satuan</Label>
                <SearchSelect id={ids.unit} className="h-10 w-full" value={unit} onChange={(e) => setUnit(e.target.value as ExtendUnit)}>
                  <option value="days">Hari</option>
                  <option value="months">Bulan</option>
                </SearchSelect>
              </div>
            </div>
            <p className="text-foreground" aria-live="polite">
              {preview
                ? `Masa berlaku baru: ${fmtDateTime(preview.expiry.toISOString())}`
                : sub.status === "cancelled"
                  ? "Langganan dibatalkan: gunakan Ubah paket/status."
                  : `Masukkan bilangan bulat 1-${EXTEND_MAX[unit]}.`}
            </p>
          </div>
        }
        onConfirm={async ({ confirmPassword, reason, totpCode }: StepUpSubmit) => {
          await post(`${base}/subscription`, { action: "extend", amount: Number(amount), unit, reason, confirmPassword, totpCode });
          await done("Langganan diperpanjang.");
        }}
      />

      <StepUpDialog
        open={dialog === "set"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Ubah langganan ${d.village.name}`}
        confirmLabel="Simpan perubahan"
        description={
          <div className="space-y-3">
            <p>Mengganti paket, status, dan masa berlaku secara langsung. Kuota penyimpanan tidak pernah diturunkan.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={ids.plan}>Paket</Label>
                <SearchSelect id={ids.plan} className="h-10 w-full" value={plan} onChange={(e) => setPlan(e.target.value)}>
                  {VILLAGE_PLANS.map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}
                </SearchSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={ids.status}>Status</Label>
                <SearchSelect id={ids.status} className="h-10 w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {VILLAGE_SUBSCRIPTION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </SearchSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.expiry}>Berlaku sampai</Label>
              <Input id={ids.expiry} className="text-foreground" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              <p className="text-xs">Aktif/uji coba/tenggang wajib bertanggal masa depan. Kosongkan untuk tanpa batas (hanya status Aktif) atau status tidak aktif/dibatalkan.</p>
            </div>
          </div>
        }
        onConfirm={async ({ confirmPassword, reason, totpCode }: StepUpSubmit) => {
          await post(`${base}/subscription`, {
            action: "set", plan, status, expiry: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null, reason, confirmPassword, totpCode,
          });
          await done("Langganan diperbarui.");
        }}
      />

      <StepUpDialog
        open={dialog === "active"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={d.village.isActive ? `Nonaktifkan desa ${d.village.name}` : `Aktifkan desa ${d.village.name}`}
        confirmLabel={d.village.isActive ? "Nonaktifkan desa" : "Aktifkan desa"}
        destructive={d.village.isActive}
        description={
          d.village.isActive
            ? "Desa yang dinonaktifkan ditolak di aplikasi seluler, kios, dan kunci API. Data tidak dihapus dan penonaktifan dapat dibatalkan kapan saja."
            : "Desa akan dapat dipakai kembali sesuai status langganannya."
        }
        onConfirm={async ({ confirmPassword, reason, totpCode }: StepUpSubmit) => {
          await post(`${base}/active`, { active: !d.village.isActive, reason, confirmPassword, totpCode });
          await done(d.village.isActive ? "Desa dinonaktifkan." : "Desa diaktifkan.");
        }}
      />
    </div>
  );
}
