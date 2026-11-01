"use client";

import { useState } from "react";
import { AlertTriangle, Info, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { DOMAIN_DEFS, FUNDING_SOURCES } from "@/lib/incident/catalog";
import { localToday } from "@/lib/form-input";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { ErrorBox, FormDialog, Loading, NoteDialog, SEVERITY_TONE, STATUS_TONE, SearchPick, fmtDateTime, opt, toLocalInput, type Field } from "./common";
import { eventFields, eventInitial } from "./EventsTab";
import type { DetailResp } from "./types";

const ACTION_TEXT: Record<string, string> = { RESPONDING: "Mulai penanganan", RESOLVED: "Tandai selesai ditangani", CLOSED: "Tutup kejadian", CANCELLED: "Batalkan kejadian" };

export function EventDetailDialog({ id, kinds, onClose, onChanged }: { id: number; kinds: Record<string, string>; onClose: () => void; onChanged: () => void }) {
  const [logPage, setLogPage] = useState(1);
  const { data, loading, error, reload } = useApiGet<DetailResp>(`/api/bencana/kejadian/${id}?logPage=${logPage}`);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [addResp, setAddResp] = useState(false);
  const [addLog, setAddLog] = useState(false);
  const [notice, setNotice] = useState<string[]>([]);
  const refresh = () => {
    reload();
    onChanged();
  };
  const e = data?.event;
  const editable = e ? e.status === "OPEN" || e.status === "RESPONDING" || e.status === "RESOLVED" : false;
  const can = data?.can;
  const allowed = (from: string, to: string) => (to === "CLOSED" || from === "CLOSED" ? can?.approve : can?.update);

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="break-words">{e?.title ?? "Rincian kejadian"}</DialogTitle>
          <DialogDescription>{e ? `${e.kindLabel} · ${fmtDateTime(e.occurredAt)}` : "Memuat…"}</DialogDescription>
        </DialogHeader>
        {loading && !data ? <Loading text="Memuat rincian…" /> : null}
        {error ? <ErrorBox message={error} /> : null}

        {data && e && can ? (
          <div className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={STATUS_TONE[e.status]}>{e.statusLabel}</Pill>
              <Pill tone={SEVERITY_TONE[e.severity]}>{e.severityLabel}</Pill>
              {editable && can.update ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" />
                  Ubah isian
                </Button>
              ) : null}
            </div>

            {e.findings.length ? (
              <ul className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
                {e.findings.map((f) => (
                  <li key={f.code} className="flex items-start gap-2 break-words">
                    {f.level === "WARN" ? <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" /> : <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sky-700" />}
                    <span>
                      <span className="sr-only">{f.level === "WARN" ? "Perlu diperiksa: " : "Catatan: "}</span>
                      {f.message}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {notice.length ? (
              <div role="status" className="rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950">
                {notice.map((n) => (
                  <p key={n} className="break-words">
                    {n}
                  </p>
                ))}
              </div>
            ) : null}

            <section aria-labelledby="ed-status" className="space-y-2">
              <h3 id="ed-status" className="font-semibold">
                Status
              </h3>
              {data.nextStatuses.filter((s) => allowed(e.status, s)).length ? (
                <div className="flex flex-wrap gap-2">
                  {data.nextStatuses
                    .filter((s) => allowed(e.status, s))
                    .map((s) => (
                      <Button key={s} type="button" variant={s === "CANCELLED" ? "outline" : "default"} className="min-h-11" onClick={() => setMoving(s)}>
                        {s === "RESPONDING" && e.status !== "OPEN" ? "Buka kembali penanganan" : ACTION_TEXT[s]}
                      </Button>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{data.nextStatuses.length ? "Perpindahan status berikutnya memerlukan izin Kepala Desa atau admin." : "Status ini final."}</p>
              )}
              <ol className="space-y-1 text-sm">
                {data.statusLog.map((l) => (
                  <li key={l.id} className="break-words">
                    <span className="font-medium">{l.to === "OPEN" ? "Dilaporkan" : l.to === "RESPONDING" ? "Ditangani" : l.to === "RESOLVED" ? "Selesai ditangani" : l.to === "CLOSED" ? "Ditutup" : "Dibatalkan"}</span> · {fmtDateTime(l.at)}
                    {l.note ? <span className="block text-muted-foreground">{l.note}</span> : null}
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="ed-info" className="space-y-2">
              <h3 id="ed-info" className="font-semibold">
                Lokasi, dampak, dan pelaporan
              </h3>
              <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                <Item k="Lokasi" v={[e.locationText, e.hamlet ? `Dusun ${e.hamlet}` : null, e.rw ? `RW ${e.rw}${e.rt ? `/RT ${e.rt}` : ""}` : null].filter(Boolean).join(", ") || "-"} />
                <Item k="Koordinat" v={e.lat !== null && e.lng !== null ? `${e.lat}, ${e.lng}` : "-"} />
                <Item k="Dampak" v={e.impactSummary || "Belum diisi"} />
                <Item k="Perkiraan kerugian" v={e.loss ? rupiah(e.loss) : "-"} />
                <Item k="Dilaporkan ke supra-desa" v={e.supra ? `${fmtDateTime(e.supra.reportedAt)}${e.supra.to ? ` · ${e.supra.to}` : ""}${e.supra.reference ? ` · ${e.supra.reference}` : ""}` : "Belum dicatat"} />
                <Item k="Ringkasan penyelesaian" v={e.resolutionNote ?? "-"} />
              </dl>
              {e.description ? <p className="whitespace-pre-line break-words text-sm">{e.description}</p> : null}
              {e.impactNote ? <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{e.impactNote}</p> : null}
            </section>

            <section aria-labelledby="ed-resp" className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="ed-resp" className="font-semibold">
                  Tindakan ({data.responses.length})
                </h3>
                {editable && can.create ? (
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setAddResp(true)}>
                    <Plus aria-hidden="true" />
                    Catat tindakan
                  </Button>
                ) : null}
              </div>
              {data.responses.length ? (
                <ul className="divide-y rounded-md border">
                  {data.responses.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-2 px-3 py-2">
                      <div className="min-w-0 text-sm">
                        <p>
                          <span className="font-medium">{r.kindLabel}</span> · {fmtDateTime(r.loggedAt)}
                          {r.actor ? ` · ${r.actor}` : ""}
                        </p>
                        <p className="break-words text-muted-foreground">{r.description}</p>
                      </div>
                      {editable && can.delete ? <ConfirmDelete label={`Hapus catatan tindakan ${r.kindLabel}`} title="Hapus catatan tindakan?" description="Catatan ini dihapus dari kejadian. Lakukan hanya untuk mengoreksi salah catat." url={`/api/bencana/kejadian/${id}/respons/${r.id}`} onDone={refresh} /> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada tindakan tercatat. Catat evakuasi, penilaian, koordinasi, dan lainnya agar jejak penanganan lengkap.</p>
              )}
            </section>

            {data.logistics ? (
              <section aria-labelledby="ed-log" className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="ed-log" className="font-semibold">
                    Distribusi bantuan ({data.logistics.total})
                  </h3>
                  {editable && can.create ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setAddLog(true)}>
                      <Plus aria-hidden="true" />
                      Catat distribusi
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Catatan penyerahan bantuan ke KK. Ini bukan pembukuan: pengeluaran uang tetap dicatat lewat SPP dan Buku Kas.
                  {data.detail ? "" : " Nama penerima ditampilkan tersamar karena Anda tidak punya izin baca rinci."}
                </p>
                {data.logistics.summary.items.length ? (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {data.logistics.summary.items.map((i) => (
                      <li key={`${i.item}-${i.unit}-${i.fundingSource}`} className="min-w-0 rounded-md border p-3 text-sm">
                        <p className="break-words font-medium">
                          {i.item}: {i.quantity.toLocaleString("id-ID")} {i.unit}
                        </p>
                        <p className="break-words text-muted-foreground">
                          {i.fundingLabel}
                          {Number(i.value) > 0 ? ` · ${rupiah(i.value)}` : ""}
                        </p>
                      </li>
                    ))}
                    <li className="rounded-md border bg-muted/40 p-3 text-sm sm:col-span-2">
                      {data.logistics.summary.households} KK penerima · {data.logistics.summary.rows} catatan{Number(data.logistics.summary.totalValue) > 0 ? ` · nilai tercatat ${rupiah(data.logistics.summary.totalValue)}` : ""}
                    </li>
                  </ul>
                ) : null}
                {data.logistics.rows.length ? (
                  <ul className="divide-y rounded-md border">
                    {data.logistics.rows.map((l) => (
                      <li key={l.id} className="flex items-start justify-between gap-2 px-3 py-2">
                        <div className="min-w-0 text-sm">
                          <p className="break-words">
                            <span className="font-medium">{l.recipientName}</span>
                            {l.kk ? ` · KK ${l.kk}` : l.isHousehold ? "" : " · non-KK"}
                            {l.rw ? ` · RW ${l.rw}${l.rt ? `/RT ${l.rt}` : ""}` : ""}
                          </p>
                          <p className="break-words text-muted-foreground">
                            {l.item} {l.quantity.toLocaleString("id-ID")} {l.unit} · {fmtDate(l.distributedOn)} · {l.fundingLabel}
                            {l.reference ? ` · ${l.reference}` : ""}
                          </p>
                        </div>
                        {editable && can.delete ? <ConfirmDelete label={`Hapus catatan ${l.item} untuk ${l.recipientName}`} title="Hapus catatan distribusi?" description={`Catatan penyerahan ${l.item} ${l.quantity} ${l.unit} akan dihapus.`} url={`/api/bencana/kejadian/${id}/logistik/${l.id}`} onDone={refresh} /> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada distribusi bantuan tercatat.</p>
                )}
                {data.logistics.total > data.logistics.pageSize ? (
                  <div className="flex items-center justify-between gap-2">
                    <Button type="button" variant="outline" className="min-h-11" disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)}>
                      Sebelumnya
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Halaman {data.logistics.page} dari {Math.ceil(data.logistics.total / data.logistics.pageSize)}
                    </span>
                    <Button type="button" variant="outline" className="min-h-11" disabled={logPage >= Math.ceil(data.logistics.total / data.logistics.pageSize)} onClick={() => setLogPage((p) => p + 1)}>
                      Berikutnya
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {data.can.delete && (e.status === "OPEN" || e.status === "CANCELLED") ? (
              <div className="border-t pt-4">
                <ConfirmDelete buttonText="Hapus kejadian" label="Hapus kejadian" title="Hapus kejadian ini?" description="Kejadian dan catatan tindakannya dihapus permanen. Hanya untuk kejadian salah catat tanpa distribusi bantuan." url={`/api/bencana/kejadian/${id}`} onDone={() => { onChanged(); onClose(); }} />
              </div>
            ) : null}
          </div>
        ) : null}

        {editing && e ? <FormDialog title="Ubah kejadian" fields={eventFields(kinds)} initial={eventInitial(e)} url={`/api/bencana/kejadian/${id}`} method="PATCH" onClose={() => setEditing(false)} onDone={() => { setEditing(false); refresh(); }} /> : null}
        {moving && e ? (
          <NoteDialog
            title={moving === "RESPONDING" && e.status !== "OPEN" ? "Buka kembali penanganan" : ACTION_TEXT[moving]!}
            description={moving === "CLOSED" ? "Kejadian yang ditutup tidak dapat diubah lagi kecuali dibuka kembali oleh Kepala Desa atau admin." : moving === "RESOLVED" ? "Pastikan sudah ada minimal satu tindakan tercatat." : undefined}
            label={moving === "CANCELLED" ? "Alasan pembatalan" : moving === "RESPONDING" && e.status !== "OPEN" ? "Alasan membuka kembali" : moving === "RESOLVED" ? "Ringkasan penyelesaian" : moving === "CLOSED" ? "Catatan penutupan (wajib bila kejadian berat belum dilaporkan ke supra-desa)" : "Catatan (opsional)"}
            required={moving === "CANCELLED" || (moving === "RESPONDING" && e.status !== "OPEN") || (moving === "RESOLVED" && !e.resolutionNote)}
            confirm="Simpan"
            url={`/api/bencana/kejadian/${id}/status`}
            build={(note) => ({ to: moving, note })}
            onClose={() => setMoving(null)}
            onDone={() => { setMoving(null); refresh(); }}
          />
        ) : null}
        {addResp ? <FormDialog title="Catat tindakan" fields={respFields()} initial={{ loggedAt: toLocalInput(null), kind: "ASESMEN", description: "", actor: "" }} url={`/api/bencana/kejadian/${id}/respons`} method="POST" onClose={() => setAddResp(false)} onDone={() => { setAddResp(false); refresh(); }} /> : null}
        {addLog ? <LogisticDialog id={id} onClose={() => setAddLog(false)} onDone={(w) => { setAddLog(false); setNotice(w); refresh(); }} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="break-words">{v}</dd>
    </div>
  );
}

// Halaman ini hanya untuk domain BENCANA, jadi jenis tindakan dibaca dari katalog domain itu.
const RESP_KINDS = DOMAIN_DEFS.BENCANA.responses;
const respFields = (): Field[] => [
  { key: "kind", label: "Jenis tindakan", type: "select", options: opt(RESP_KINDS), required: true, half: true },
  { key: "loggedAt", label: "Waktu tindakan", type: "datetime", required: true, half: true },
  { key: "description", label: "Uraian tindakan", type: "textarea", required: true, max: 1000 },
  { key: "actor", label: "Pelaksana / tim", type: "text", max: 150 },
];

interface Hit {
  id: number;
  headName: string;
  kkLast4: string;
  rt: string | null;
  rw: string | null;
  members: number;
}

function LogisticDialog({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: (warnings: string[]) => void }) {
  const [hit, setHit] = useState<Hit | null>(null);
  const [nonKk, setNonKk] = useState(false);
  const [name, setName] = useState("");
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("");
  const [value, setValue] = useState("");
  const [funding, setFunding] = useState("DD_OPERASIONAL");
  const [date, setDate] = useState(() => localToday());
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<{ warnings?: string[] }>(`/api/bencana/kejadian/${id}/logistik`, "POST", { householdId: nonKk ? "" : (hit?.id ?? ""), recipientName: nonKk ? name : "", item, quantity: qty, unit, value, fundingSource: funding, distributedOn: date, reference: ref, note });
    if (r) onDone(r.warnings ?? []);
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Catat distribusi bantuan</DialogTitle>
          <DialogDescription>Pilih KK penerima (hanya 4 digit akhir nomor KK yang ditampilkan) atau tulis penerima non-KK seperti posko.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ householdId: "KK penerima", recipientName: "Penerima", item: "Jenis bantuan", quantity: "Jumlah", unit: "Satuan", value: "Nilai", fundingSource: "Sumber", distributedOn: "Tanggal", reference: "Nomor bukti", note: "Catatan" }} />
          <div className="flex items-center gap-2">
            <input id="lg-nonkk" type="checkbox" className="size-5" checked={nonKk} onChange={(e) => setNonKk(e.target.checked)} />
            <Label htmlFor="lg-nonkk" className="min-h-11 flex-1 content-center">
              Penerima bukan KK (posko, fasilitas umum)
            </Label>
          </div>
          {nonKk ? (
            <div className="space-y-1.5">
              <Label htmlFor="lg-name">Nama penerima *</Label>
              <Input id="lg-name" className="h-11" maxLength={150} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.recipientName)} />
            </div>
          ) : hit ? (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
              <p className="min-w-0 break-words text-sm">
                <span className="font-medium">{hit.headName}</span> · KK ••••{hit.kkLast4} · {hit.members} anggota{hit.rw ? ` · RW ${hit.rw}${hit.rt ? `/RT ${hit.rt}` : ""}` : ""}
              </p>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setHit(null)}>
                Ganti
              </Button>
            </div>
          ) : (
            <SearchPick<Hit> id="lg-kk" label="Cari KK penerima *" url={(q) => `/api/bencana/kk?q=${encodeURIComponent(q)}`} hint="Ketik nama kepala keluarga atau awal nomor KK (minimal 3)." render={(h) => <>{h.headName} · KK ••••{h.kkLast4} · {h.members} anggota{h.rw ? ` · RW ${h.rw}${h.rt ? `/RT ${h.rt}` : ""}` : ""}</>} onPick={setHit} />
          )}
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label htmlFor="lg-item">Jenis bantuan *</Label>
              <Input id="lg-item" className="h-11" maxLength={100} value={item} onChange={(e) => setItem(e.target.value)} aria-invalid={Boolean(errors.item)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lg-qty">Jumlah *</Label>
              <Input id="lg-qty" className="h-11" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} aria-invalid={Boolean(errors.quantity)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lg-unit">Satuan *</Label>
              <Input id="lg-unit" className="h-11" maxLength={30} value={unit} onChange={(e) => setUnit(e.target.value)} aria-invalid={Boolean(errors.unit)} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="lg-value">Nilai (Rp, opsional)</Label>
              <CurrencyInput id="lg-value" inputClassName="h-11" value={value} onValueChange={setValue} aria-invalid={Boolean(errors.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lg-date">Tanggal penyerahan *</Label>
              <Input id="lg-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.distributedOn)} />
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label htmlFor="lg-fund">Sumber bantuan *</Label>
              <SearchSelect id="lg-fund" className={SELECT_CLASS} value={funding} onChange={(e) => setFunding(e.target.value)}>
                {opt(FUNDING_SOURCES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label htmlFor="lg-ref">Nomor bukti (SPP/kuitansi/berita acara)</Label>
              <Input id="lg-ref" className="h-11" maxLength={150} value={ref} onChange={(e) => setRef(e.target.value)} />
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label htmlFor="lg-note">Catatan</Label>
              <Textarea id="lg-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
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
