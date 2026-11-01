"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { moneyRaw, type DetailResp } from "./types";

type Offer = DetailResp["offers"][number];

export function OffersSection({ d, reload }: { d: DetailResp; reload: () => void }) {
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const open = d.status === "PEMILIHAN";
  const canEdit = d.can.update && open;
  const canAct = (d.can.update || d.can.approve) && open;

  async function choose(o: Offer) {
    setErr(null);
    const res = await fetch(`/api/pengadaan/penawaran/${o.id}/pemenang`, { method: "POST" }).catch(() => null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setErr(typeof j?.error === "string" ? j.error : "Gagal menetapkan penyedia terpilih.");
  }

  return (
    <section aria-labelledby="pg-off-h" className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="pg-off-h" className="text-lg font-semibold">
            Penawaran penyedia
          </h2>
          <p className="text-sm text-muted-foreground">
            {d.method === "PEMBELIAN_LANGSUNG" ? "Pembelian langsung: catat penyedia dan harga yang dibayar." : d.method === "PERMINTAAN_PENAWARAN" ? `Permintaan penawaran tertulis ke paling sedikit 2 penyedia (atau satu bila di desa hanya ada satu penyedia, dengan alasan). Dibutuhkan ${d.minOffers} penawaran.` : "Lelang: catat tiap penawaran yang masuk."} Pemenang adalah penawaran lulus dengan harga terendah.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" className="min-h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Catat penawaran
          </Button>
        ) : null}
      </div>
      {err ? (
        <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </p>
      ) : null}
      {d.offers.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {d.offers.map((o) => (
            <li key={o.id} className="min-w-0 space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium">{o.providerName}</p>
                  {o.providerAddress ? <p className="break-words text-xs text-muted-foreground">{o.providerAddress}</p> : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  {o.isWinner ? (
                    <Pill tone="done">
                      <Trophy aria-hidden="true" className="mr-1 size-3" />
                      Penyedia terpilih
                    </Pill>
                  ) : null}
                  <Pill tone={o.passed ? "info" : "neutral"}>{o.passed ? "Lulus evaluasi" : "Belum lulus"}</Pill>
                  {o.conflict ? <Pill tone="overdue">Bentrok kepentingan</Pill> : null}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Harga penawaran ({fmtDate(o.offeredOn)})</dt>
                  <dd className="tabular-nums">{rupiah(o.price)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Harga akhir{o.negotiated ? " (negosiasi)" : ""}</dt>
                  <dd className="font-medium tabular-nums">{rupiah(o.effective)}</dd>
                </div>
              </dl>
              {o.conflict ? (
                <p role="status" className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                  Penyedia ini sama dengan anggota TPK atau Kasi/Kaur pelaksana, jadi tidak dapat dipilih dan tidak ikut perhitungan harga terendah. Hapus penawaran ini, atau perbaiki nama penyedia atau anggota yang keliru.
                </p>
              ) : null}
              {o.passed && o.isLowest ? <p className="text-xs text-muted-foreground">Termasuk harga terendah di antara yang lulus.</p> : null}
              {o.evaluationNote ? <p className="break-words text-xs text-muted-foreground">{o.evaluationNote}</p> : null}
              {canAct ? (
                <div className="flex flex-wrap gap-2">
                  {!o.isWinner && d.can.approve ? (
                    <Button type="button" variant="outline" className="min-h-11" disabled={!o.passed || o.conflict} onClick={() => choose(o)}>
                      Tetapkan terpilih
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(o)}>
                        <Pencil aria-hidden="true" />
                        Ubah
                      </Button>
                      {d.can.delete ? <ConfirmDelete label={`Hapus penawaran ${o.providerName}`} title={`Hapus penawaran ${o.providerName}?`} description="Penawaran ini dihapus dari paket." url={`/api/pengadaan/penawaran/${o.id}`} onDone={reload} /> : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{open ? "Belum ada penawaran. Catat penawaran yang diterima." : "Penawaran dicatat setelah paket masuk tahap pemilihan penyedia."}</p>
      )}
      {editing ? <OfferDialog packageId={d.id} offer={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} /> : null}
    </section>
  );
}

function OfferDialog({ packageId, offer, onClose, onDone }: { packageId: number; offer: Offer | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(offer?.providerName ?? "");
  const [address, setAddress] = useState(offer?.providerAddress ?? "");
  const [date, setDate] = useState(offer?.offeredOn || localToday());
  const [price, setPrice] = useState(moneyRaw(offer?.price));
  const [passed, setPassed] = useState(offer?.passed ?? false);
  const [note, setNote] = useState(offer?.evaluationNote ?? "");
  const [negotiated, setNegotiated] = useState(moneyRaw(offer?.negotiated));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { providerName: name, providerAddress: address, offeredOn: date, price, passed, evaluationNote: note, negotiated };
    const r = offer ? await submit(`/api/pengadaan/penawaran/${offer.id}`, "PATCH", body) : await submit(`/api/pengadaan/${packageId}/penawaran`, "POST", body);
    if (r) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{offer ? "Ubah penawaran" : "Catat penawaran"}</DialogTitle>
          <DialogDescription>Harga hasil negosiasi (bila ada) menjadi harga akhir dan tidak boleh lebih tinggi dari penawaran.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ providerName: "Nama penyedia", providerAddress: "Alamat", offeredOn: "Tanggal penawaran", price: "Harga penawaran", negotiated: "Harga hasil negosiasi", evaluationNote: "Catatan evaluasi", passed: "Lulus evaluasi" }} />
          <div className="space-y-1.5">
            <Label htmlFor="of-name">Nama penyedia *</Label>
            <Input id="of-name" className="h-11" maxLength={150} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.providerName)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="of-addr">Alamat</Label>
            <Input id="of-addr" className="h-11" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="of-date">Tanggal penawaran *</Label>
              <Input id="of-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.offeredOn)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="of-price">Harga penawaran *</Label>
              <CurrencyInput id="of-price" inputClassName="h-11" value={price} onValueChange={setPrice} aria-invalid={Boolean(errors.price)} />
            </div>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="size-5" checked={passed} onChange={(e) => setPassed(e.target.checked)} />
            Lulus persyaratan administrasi/teknis dan harga
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="of-neg">Harga hasil negosiasi (bila ada)</Label>
            <CurrencyInput id="of-neg" inputClassName="h-11" value={negotiated} onValueChange={setNegotiated} aria-invalid={Boolean(errors.negotiated)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="of-note">Catatan evaluasi</Label>
            <Input id="of-note" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
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
