"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { activityOptions, leafAccounts } from "@/lib/apbdes/catalog";
import { moneyRaw, type Catalog } from "./types";

export interface PackageFormValues {
  id?: number;
  activityCode: string;
  accountCode: string | null;
  title: string;
  scope: string | null;
  location: string | null;
  mode: string;
  method: string | null;
  hps: string;
  executorName: string | null;
  executorTitle: string | null;
}

const ACTIVITIES = activityOptions();
const ACCOUNTS = leafAccounts("BELANJA");

/** Buat paket baru, atau ubah isian dasar paket tahap persiapan (kegiatan, cara, metode, HPS/RAB). */
export function PackageDialog({ year, catalog, initial, onClose, onDone }: { year: number; catalog: Pick<Catalog, "modes" | "methods">; initial?: PackageFormValues; onClose: () => void; onDone: () => void }) {
  const router = useRouter();
  const [activity, setActivity] = useState(initial?.activityCode ?? "");
  const [account, setAccount] = useState(initial?.accountCode ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [scope, setScope] = useState(initial?.scope ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [mode, setMode] = useState(initial?.mode ?? "PENYEDIA");
  const [method, setMethod] = useState(initial?.method ?? "PEMBELIAN_LANGSUNG");
  const [hps, setHps] = useState(moneyRaw(initial?.hps));
  const [executorName, setExecutorName] = useState(initial?.executorName ?? "");
  const [executorTitle, setExecutorTitle] = useState(initial?.executorTitle ?? "");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { activityCode: activity, accountCode: account, title, scope, location, mode, method: mode === "PENYEDIA" ? method : null, hps, executorName, executorTitle };
    if (initial?.id) {
      if (await submit(`/api/pengadaan/${initial.id}`, "PATCH", body)) onDone();
      return;
    }
    const r = await submit<{ id: number }>("/api/pengadaan", "POST", { ...body, year });
    if (r?.id) router.push(`/pengadaan/${r.id}`);
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Ubah paket pengadaan" : `Paket pengadaan baru (${year})`}</DialogTitle>
          <DialogDescription>Swakelola diutamakan; gunakan penyedia bila kegiatan tidak dapat dikerjakan sendiri (Peraturan LKPP 12/2019 Pasal 5).</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ year: "Tahun", activityCode: "Kegiatan", accountCode: "Rekening", title: "Nama paket", scope: "Lingkup", location: "Lokasi", mode: "Cara pengadaan", method: "Metode", hps: mode === "SWAKELOLA" ? "RAB pengadaan" : "HPS", executorName: "Kasi/Kaur", executorTitle: "Jabatan" }} />
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="pg-act">Kegiatan APB Desa *</Label>
            <SearchSelect id="pg-act" className={SELECT_CLASS} value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Cari kode atau nama kegiatan" aria-invalid={Boolean(errors.activityCode)}>
              <option value="">Pilih kegiatan</option>
              {ACTIVITIES.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} {a.name}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="pg-acc">Rekening belanja (opsional)</Label>
            <SearchSelect id="pg-acc" className={SELECT_CLASS} value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Cari rekening belanja" aria-invalid={Boolean(errors.accountCode)}>
              <option value="">Tidak dipilih</option>
              {ACCOUNTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} {a.name}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-title">Nama paket *</Label>
            <Input id="pg-title" className="h-11" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(errors.title)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-scope">Lingkup pekerjaan</Label>
            <Textarea id="pg-scope" maxLength={1000} rows={3} value={scope} onChange={(e) => setScope(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-loc">Lokasi</Label>
            <Input id="pg-loc" className="h-11" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pg-mode">Cara pengadaan *</Label>
              <SearchSelect id="pg-mode" className={SELECT_CLASS} value={mode} onChange={(e) => setMode(e.target.value)}>
                {Object.entries(catalog.modes).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SearchSelect>
            </div>
            {mode === "PENYEDIA" ? (
              <div className="space-y-1.5">
                <Label htmlFor="pg-method">Metode *</Label>
                <SearchSelect id="pg-method" className={SELECT_CLASS} value={method} onChange={(e) => setMethod(e.target.value)} aria-invalid={Boolean(errors.method)}>
                  {Object.entries(catalog.methods).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </SearchSelect>
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-hps">{mode === "SWAKELOLA" ? "RAB pengadaan *" : "Harga perkiraan sendiri (HPS) *"}</Label>
            <CurrencyInput id="pg-hps" inputClassName="h-11" value={hps} onValueChange={setHps} aria-invalid={Boolean(errors.hps)} />
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pg-exec">Kasi/Kaur pelaksana</Label>
              <Input id="pg-exec" className="h-11" maxLength={150} value={executorName} onChange={(e) => setExecutorName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pg-ext">Jabatan</Label>
              <Input id="pg-ext" className="h-11" maxLength={100} value={executorTitle} onChange={(e) => setExecutorTitle(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {initial ? "Simpan" : "Buat paket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
