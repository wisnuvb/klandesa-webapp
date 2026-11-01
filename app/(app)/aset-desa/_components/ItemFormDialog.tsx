"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CATEGORY_KEYS, CONDITION_LABEL, CONDITIONS, ORIGIN_LABEL, ORIGINS, type CategoryKey } from "@/lib/aset-desa/catalog";
import { SELECT_CLASS, type ItemView } from "./types";
import { SearchSelect } from "@/components/ui/search-select";

interface Form {
  name: string;
  category: string;
  origin: string;
  itemCode: string;
  identity: string;
  quantity: string;
  acquiredYear: string;
  acquiredAt: string;
  acquisitionValue: string;
  condition: string;
  location: string;
  notes: string;
}

const LABELS: Record<string, string> = {
  name: "Jenis barang",
  category: "Golongan",
  origin: "Asal usul",
  itemCode: "Kode barang",
  identity: "Identitas barang",
  quantity: "Jumlah",
  acquiredYear: "Tahun perolehan",
  acquiredAt: "Tanggal perolehan",
  acquisitionValue: "Nilai perolehan",
  condition: "Kondisi",
  location: "Lokasi",
  notes: "Keterangan",
};

const fromItem = (i: ItemView | null): Form => ({
  name: i?.name ?? "",
  category: i?.category ?? "",
  origin: i?.origin ?? "",
  itemCode: i?.itemCode ?? "",
  identity: i?.identity ?? "",
  quantity: String(i?.quantity ?? 1),
  acquiredYear: String(i?.acquiredYear ?? new Date().getFullYear()),
  acquiredAt: i?.acquiredAt ?? "",
  acquisitionValue: i?.acquisitionValue ? i.acquisitionValue.replace(/\.00$/, "") : "",
  condition: i?.condition ?? "BAIK",
  location: i?.location ?? "",
  notes: i?.notes ?? "",
});

const isAsli = (c: string) => (CATEGORY_KEYS as string[]).includes(c) && CATEGORIES[c as CategoryKey].group === "ASLI";

export function ItemFormDialog({ item, onClose, onSaved }: { item: ItemView | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>(() => fromItem(item));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const editing = item !== null;
  const set = (patch: Partial<Form>) => setF((p) => ({ ...p, ...patch }));

  /** Golongan kekayaan asli desa mengunci asal usulnya (kolom 7 buku inventaris); golongan lain tak boleh "asli desa". */
  function pickCategory(category: string) {
    const asli = isAsli(category);
    set({ category, origin: asli ? "ASLI_DESA" : f.origin === "ASLI_DESA" ? "" : f.origin });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setGeneral(null);
    try {
      const res = await fetch(editing ? `/api/aset-desa/${item!.id}` : "/api/aset-desa", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          acquiredAt: f.acquiredAt || null,
          acquisitionValue: f.acquisitionValue || null,
          mapAssetId: item?.mapAssetId ?? null,
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        const fe = (j?.fieldErrors ?? {}) as Record<string, string>;
        setErrors(fe);
        setGeneral(Object.keys(fe).length ? null : typeof j?.error === "string" ? j.error : "Gagal menyimpan. Coba lagi.");
        queueMicrotask(() => summaryRef.current?.focus());
        return;
      }
      onSaved();
    } catch {
      setGeneral("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
      queueMicrotask(() => summaryRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  const err = (k: string) => errors[k];
  const common = (k: keyof Form) => ({ id: `aset-${k}`, "aria-invalid": err(k) ? true : undefined, "aria-describedby": err(k) ? `aset-${k}-err` : undefined });
  const errNode = (k: string) =>
    err(k) ? (
      <p id={`aset-${k}-err`} className="text-sm text-destructive">
        {err(k)}
      </p>
    ) : null;
  const errorKeys = Object.keys(errors);

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah data barang" : "Catat barang"}</DialogTitle>
          <DialogDescription>Isian mengikuti Buku Inventaris Aset Desa (Permendagri 1/2016). Tanda * wajib diisi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="aset-name">Jenis barang *</Label>
            <Input {...common("name")} className="h-11" value={f.name} maxLength={200} onChange={(e) => set({ name: e.target.value })} placeholder="Contoh: Komputer meja kantor" />
            {errNode("name")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="aset-category">Golongan *</Label>
              <SearchSelect {...common("category")} className={SELECT_CLASS} value={f.category} onChange={(e) => pickCategory(e.target.value)}>
                <option value="">Pilih golongan…</option>
                {(["UMUM", "ASLI"] as const).map((g) => (
                  <optgroup key={g} label={g === "ASLI" ? "Kekayaan asli desa" : "Barang dan aset lain"}>
                    {CATEGORY_KEYS.filter((k) => CATEGORIES[k].group === g).map((k) => (
                      <option key={k} value={k}>
                        {CATEGORIES[k].label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SearchSelect>
              {errNode("category")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aset-origin">Asal usul *</Label>
              <SearchSelect {...common("origin")} className={SELECT_CLASS} value={f.origin} disabled={isAsli(f.category)} onChange={(e) => set({ origin: e.target.value })}>
                <option value="">Pilih asal usul…</option>
                {ORIGINS.filter((o) => o !== "ASLI_DESA" || isAsli(f.category)).map((o) => (
                  <option key={o} value={o}>
                    {ORIGIN_LABEL[o]}
                  </option>
                ))}
              </SearchSelect>
              {isAsli(f.category) ? <p className="text-sm text-muted-foreground">Kekayaan asli desa otomatis berasal dari aset/kekayaan asli desa.</p> : null}
              {errNode("origin")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="aset-itemCode">Kode barang</Label>
              <Input {...common("itemCode")} className="h-11" value={f.itemCode} maxLength={60} onChange={(e) => set({ itemCode: e.target.value })} />
              {errNode("itemCode")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aset-identity">Identitas barang</Label>
              <Input {...common("identity")} className="h-11" value={f.identity} maxLength={255} onChange={(e) => set({ identity: e.target.value })} placeholder="Merk, tipe, atau ukuran" />
              {errNode("identity")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="aset-quantity">Jumlah *</Label>
              <Input {...common("quantity")} className="h-11" type="number" inputMode="numeric" min={1} step={1} value={f.quantity} onChange={(e) => set({ quantity: e.target.value })} />
              {errNode("quantity")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aset-acquiredYear">Tahun perolehan *</Label>
              <Input {...common("acquiredYear")} className="h-11" type="number" inputMode="numeric" min={1900} step={1} value={f.acquiredYear} onChange={(e) => set({ acquiredYear: e.target.value })} />
              {errNode("acquiredYear")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aset-acquiredAt">Tanggal perolehan</Label>
              <Input {...common("acquiredAt")} className="h-11" type="date" value={f.acquiredAt} onChange={(e) => set({ acquiredAt: e.target.value, ...(e.target.value ? { acquiredYear: e.target.value.slice(0, 4) } : {}) })} />
              {errNode("acquiredAt")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="aset-acquisitionValue">Nilai perolehan per satuan</Label>
              <CurrencyInput {...common("acquisitionValue")} inputClassName="h-11" value={f.acquisitionValue} onValueChange={(d) => set({ acquisitionValue: d })} />
              <p className="text-sm text-muted-foreground">Kosongkan bila belum diketahui.</p>
              {errNode("acquisitionValue")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aset-condition">Kondisi</Label>
              <SearchSelect {...common("condition")} className={SELECT_CLASS} value={f.condition} onChange={(e) => set({ condition: e.target.value })}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABEL[c]}
                  </option>
                ))}
              </SearchSelect>
              {errNode("condition")}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="aset-location">Lokasi</Label>
            <Input {...common("location")} className="h-11" value={f.location} maxLength={255} onChange={(e) => set({ location: e.target.value })} placeholder="Contoh: Kantor desa, ruang sekretaris" />
            {errNode("location")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aset-notes">Keterangan</Label>
            <Textarea {...common("notes")} rows={2} value={f.notes} maxLength={1000} onChange={(e) => set({ notes: e.target.value })} />
            {errNode("notes")}
          </div>

          {errorKeys.length || general ? (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
              <p className="font-medium">Belum bisa disimpan:</p>
              <ul className="list-disc pl-5">
                {errorKeys.map((k) => (
                  <li key={k}>
                    {LABELS[k] ?? k}: {errors[k]}
                  </li>
                ))}
                {general ? <li>{general}</li> : null}
              </ul>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
