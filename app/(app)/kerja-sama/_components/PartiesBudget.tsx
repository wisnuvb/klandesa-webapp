"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { moneyRaw, type DetailResp } from "./types";

type Party = DetailResp["parties"][number];
type Item = DetailResp["budget"][number];
const LOCKED = ["DITANDATANGANI", "PELAKSANAAN", "SELESAI", "BATAL"];

export function PartiesSection({ d, reload }: { d: DetailResp; reload: () => void }) {
  const [editing, setEditing] = useState<Party | "new" | null>(null);
  const locked = LOCKED.includes(d.status);
  return (
    <section aria-labelledby="ks-par-h" className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="ks-par-h" className="text-lg font-semibold">
            Para pihak
          </h2>
          <p className="text-sm text-muted-foreground">Desa ini dan {d.kind === "ANTAR_DESA" ? "desa lain" : "pihak ketiga"} beserta penandatangannya.</p>
        </div>
        {d.can.update && !locked ? (
          <Button type="button" className="min-h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Tambah pihak
          </Button>
        ) : null}
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {d.parties.map((p) => (
          <li key={p.id} className="min-w-0 rounded-md border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.kindLabel}</p>
                <p className="break-words text-sm">{p.representativeName ? `${p.representativeName}${p.representativeTitle ? `, ${p.representativeTitle}` : ""}` : "Penandatangan belum diisi"}</p>
                <p className="text-xs text-muted-foreground">Menanggung RAB: {rupiah(p.share)}</p>
              </div>
              {d.can.update && !locked ? (
                <span className="flex shrink-0">
                  <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah ${p.name}`} onClick={() => setEditing(p)}>
                    <Pencil aria-hidden="true" />
                  </Button>
                  {d.can.delete && p.kind !== "SELF" ? <ConfirmDelete label={`Hapus ${p.name}`} title={`Hapus ${p.name}?`} description="Baris RAB yang ditanggung pihak ini menjadi tanpa penanggung." url={`/api/kerja-sama/pihak/${p.id}`} onDone={reload} /> : null}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {editing ? <PartyDialog d={d} party={editing === "new" ? null : editing} locked={locked} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} /> : null}
    </section>
  );
}

function PartyDialog({ d, party, locked, onClose, onDone }: { d: DetailResp; party: Party | null; locked: boolean; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(party?.name ?? "");
  const [rep, setRep] = useState(party?.representativeName ?? "");
  const [title, setTitle] = useState(party?.representativeTitle ?? "");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const kind = d.kind === "ANTAR_DESA" ? "DESA" : "PIHAK_KETIGA";
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { kind, name, representativeName: rep, representativeTitle: title };
    const r = party ? await submit(`/api/kerja-sama/pihak/${party.id}`, "PATCH", locked || party.kind === "SELF" ? { representativeName: rep, representativeTitle: title } : { name, representativeName: rep, representativeTitle: title }) : await submit(`/api/kerja-sama/${d.id}/pihak`, "POST", body);
    if (r) onDone();
  }
  const nameLocked = party !== null && (locked || party.kind === "SELF");
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{party ? "Ubah pihak" : d.kind === "ANTAR_DESA" ? "Tambah desa lain" : "Tambah pihak ketiga"}</DialogTitle>
          <DialogDescription>Isi nama pejabat yang menandatangani atas nama pihak ini.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ name: "Nama pihak", kind: "Jenis", representativeName: "Nama penandatangan", representativeTitle: "Jabatan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="pt-name">{d.kind === "ANTAR_DESA" ? "Nama desa (dan kecamatan) *" : "Nama pihak ketiga *"}</Label>
            <Input id="pt-name" className="h-11" maxLength={200} disabled={nameLocked} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pt-rep">Nama penandatangan</Label>
            <Input id="pt-rep" className="h-11" maxLength={150} value={rep} onChange={(e) => setRep(e.target.value)} aria-invalid={Boolean(errors.representativeName)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pt-title">Jabatan</Label>
            <Input id="pt-title" className="h-11" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={d.kind === "ANTAR_DESA" ? "Kepala Desa" : ""} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BudgetSection({ d, reload }: { d: DetailResp; reload: () => void }) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const locked = LOCKED.includes(d.status);
  return (
    <section aria-labelledby="ks-rab-h" className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="ks-rab-h" className="text-lg font-semibold">
            RAB bersama
          </h2>
          <p className="text-sm text-muted-foreground">RAB kerja sama antar-Desa disusun dan disepakati bersama para kepala desa (Permendagri 114/2014 Pasal 42). Tiap baris menunjuk pihak yang menanggung.</p>
        </div>
        {d.can.update && !locked ? (
          <Button type="button" className="min-h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Tambah baris
          </Button>
        ) : null}
      </div>
      {d.budget.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <caption className="sr-only">Rencana anggaran biaya bersama</caption>
            <thead className="text-left text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 pr-3">Uraian</th>
                <th scope="col" className="py-1 pr-3">Ditanggung</th>
                <th scope="col" className="py-1 pr-3 text-right">Jumlah</th>
                <th scope="col" className="py-1"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.budget.map((b) => (
                <tr key={b.id}>
                  <td className="break-words py-2 pr-3">{b.description}</td>
                  <td className="break-words py-2 pr-3">{b.bearerName ?? <span className="text-amber-900">Belum ditunjuk</span>}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{rupiah(b.amount)}</td>
                  <td className="py-2 text-right">
                    {d.can.update && !locked ? (
                      <span className="inline-flex">
                        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah ${b.description}`} onClick={() => setEditing(b)}>
                          <Pencil aria-hidden="true" />
                        </Button>
                        {d.can.delete ? <ConfirmDelete label={`Hapus ${b.description}`} title={`Hapus baris ${b.description}?`} description="Baris RAB ini dihapus." url={`/api/kerja-sama/rab/${b.id}`} onDone={reload} /> : null}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <th scope="row" colSpan={2} className="py-2 pr-3 text-left">
                  Total (beban Desa ini {rupiah(d.selfShare)})
                </th>
                <td className="py-2 pr-3 text-right tabular-nums">{rupiah(d.total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada baris RAB. Kerja sama tanpa biaya cukup dijelaskan pada bagian pendanaan.</p>
      )}
      {editing ? <BudgetDialog d={d} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} /> : null}
    </section>
  );
}

function BudgetDialog({ d, item, onClose, onDone }: { d: DetailResp; item: Item | null; onClose: () => void; onDone: () => void }) {
  const [desc, setDesc] = useState(item?.description ?? "");
  const [amount, setAmount] = useState(moneyRaw(item?.amount));
  const [bearer, setBearer] = useState(item?.bearerId ? String(item.bearerId) : "");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { description: desc, amount, bearerId: bearer };
    const r = item ? await submit(`/api/kerja-sama/rab/${item.id}`, "PATCH", body) : await submit(`/api/kerja-sama/${d.id}/rab`, "POST", body);
    if (r) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Ubah baris RAB" : "Tambah baris RAB"}</DialogTitle>
          <DialogDescription>Pilih pihak yang menanggung biaya baris ini.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ description: "Uraian", amount: "Jumlah", bearerId: "Penanggung" }} />
          <div className="space-y-1.5">
            <Label htmlFor="rb-desc">Uraian *</Label>
            <Input id="rb-desc" className="h-11" maxLength={300} value={desc} onChange={(e) => setDesc(e.target.value)} aria-invalid={Boolean(errors.description)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rb-amt">Jumlah *</Label>
            <CurrencyInput id="rb-amt" inputClassName="h-11" value={amount} onValueChange={setAmount} aria-invalid={Boolean(errors.amount)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rb-bearer">Ditanggung oleh</Label>
            <SearchSelect id="rb-bearer" className={SELECT_CLASS} value={bearer} onChange={(e) => setBearer(e.target.value)}>
              <option value="">Belum ditunjuk</option>
              {d.parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SearchSelect>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
