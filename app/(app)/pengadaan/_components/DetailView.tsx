"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FindingList } from "@/components/app/FindingList";
import { PatchFieldsDialog, type FieldDef } from "@/components/app/PatchFieldsDialog";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, fmtDate, rupiah } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { OffersSection } from "./OffersSection";
import { PackageDialog } from "./PackageDialog";
import { TeamSection } from "./TeamSection";
import { STATUS_TONE, moneyRaw, type DetailResp } from "./types";

type Group = "rincian" | "negosiasi" | "spk" | "bast" | "pengumuman";
const STAGES = ["PERSIAPAN", "PEMILIHAN", "PELAKSANAAN", "SELESAI"] as const;

export function DetailView({ id }: { id: number }) {
  const router = useRouter();
  const { data: d, loading, error, reload } = useApiGet<DetailResp>(Number.isInteger(id) && id > 0 ? `/api/pengadaan/${id}` : null);
  const [group, setGroup] = useState<Group | null>(null);
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveErr, setMoveErr] = useState<string[]>([]);

  async function move(to: string) {
    setMoving(to);
    setMoveErr([]);
    const res = await fetch(`/api/pengadaan/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }) }).catch(() => null);
    setMoving(null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setMoveErr(Array.isArray(j?.errors) ? j.errors : [typeof j?.error === "string" ? j.error : "Gagal mengubah tahap."]);
  }

  if (loading && !d)
    return (
      <p role="status" className="flex items-center gap-2 pb-24 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Memuat paket…
      </p>
    );
  if (error || !d)
    return (
      <div className="space-y-3 pb-24">
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error ?? "Paket tidak ditemukan."}
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/pengadaan">Kembali ke daftar</Link>
        </Button>
      </div>
    );

  const final = d.status === "SELESAI" || d.status === "BATAL";
  const penyedia = d.mode === "PENYEDIA";
  const canEdit = d.can.update && !final;
  const stageIndex = STAGES.indexOf(d.status as (typeof STAGES)[number]);
  const stages = penyedia ? STAGES : STAGES.filter((s) => s !== "PEMILIHAN");

  const fieldsFor = (g: Group): { title: string; description?: string; fields: FieldDef[] } => {
    const t = (key: string, label: string, value: string | null, o: Partial<FieldDef> = {}): FieldDef => ({ key, label, value, type: "text", ...o });
    switch (g) {
      case "rincian":
        return {
          title: "Rincian paket",
          fields: [
            t("title", "Nama paket", d.title, { max: 200 }),
            t("scope", "Lingkup pekerjaan", d.scope, { type: "textarea", max: 1000 }),
            t("location", "Lokasi", d.location, { max: 200 }),
            t("executorName", "Kasi/Kaur pelaksana", d.executorName, { max: 150, hint: "Kaur Keuangan tidak boleh menjadi pengelola pengadaan." }),
            t("executorTitle", "Jabatan Kasi/Kaur", d.executorTitle, { max: 100 }),
            t("plannedStartOn", "Rencana mulai", d.plannedStartOn, { type: "date" }),
            t("plannedEndOn", "Rencana selesai", d.plannedEndOn, { type: "date" }),
            t("tpkDecreeNumber", "Nomor Keputusan Kepala Desa penetapan TPK", d.tpkDecreeNumber, { max: 100 }),
            t("tpkDecreeDate", "Tanggal keputusan TPK", d.tpkDecreeDate, { type: "date" }),
          ],
        };
      case "pengumuman":
        return {
          title: "Pengumuman dan penyerahan",
          description: "Kepala Desa mengumumkan perencanaan pengadaan; TPK mengumumkan hasilnya; hasil diserahkan kepada Kepala Desa dengan berita acara. Cukup catat tanggalnya.",
          fields: [t("planAnnouncedOn", "Perencanaan diumumkan pada", d.planAnnouncedOn, { type: "date" }), t("resultAnnouncedOn", "Hasil pengadaan diumumkan pada", d.resultAnnouncedOn, { type: "date" }), t("handoverToHeadOn", "Diserahkan kepada Kepala Desa pada", d.handoverToHeadOn, { type: "date" })],
        };
      case "negosiasi":
        return {
          title: "Berita acara negosiasi",
          description: "Wajib bila hanya satu penyedia lulus atau harga terendah kembar. Harga hasil negosiasi dicatat pada penawaran masing-masing.",
          fields: [t("negotiationNumber", "Nomor berita acara", d.negotiation.number, { max: 100 }), t("negotiationDate", "Tanggal", d.negotiation.date, { type: "date" }), t("negotiationNote", "Hasil/catatan", d.negotiation.note, { type: "textarea", max: 500 }), t("singleProviderReason", "Alasan hanya satu penyedia diminta penawaran (bila berlaku)", d.singleProviderReason, { max: 300 })],
        };
      case "spk":
        return {
          title: "SPK / surat perjanjian",
          description: "Untuk pembelian langsung dan permintaan penawaran, boleh berupa bukti pembelian (nota/kuitansi): isi nomor dan tanggalnya.",
          fields: [t("contractNumber", "Nomor SPK / bukti transaksi", d.contract.number, { max: 100 }), t("contractDate", "Tanggal", d.contract.date, { type: "date" }), t("contract", "Nilai kontrak", moneyRaw(d.contract.value), { type: "money" }), t("contractStartOn", "Mulai pekerjaan", d.contract.startOn, { type: "date" }), t("contractEndOn", "Selesai pekerjaan", d.contract.endOn, { type: "date" })],
        };
      case "bast":
        return {
          title: "Berita Acara Serah Terima (BAST)",
          description: "Wajib sebelum paket ditandai selesai. Swakelola: TPK menyerahkan kepada Kasi/Kaur; penyedia: penyedia menyerahkan kepada Kasi/Kaur.",
          fields: [t("bastNumber", "Nomor BAST", d.bast.number, { max: 100 }), t("bastDate", "Tanggal BAST", d.bast.date, { type: "date" }), t("bastHandedBy", penyedia ? "Diserahkan oleh (penyedia)" : "Diserahkan oleh (Ketua TPK)", d.bast.handedBy), t("bastReceivedBy", "Diterima oleh (Kasi/Kaur)", d.bast.receivedBy), t("progressPct", "Progres pekerjaan (%)", String(d.progressPct), { type: "number" }), t("bastNote", "Catatan hasil pemeriksaan", d.bast.note, { type: "textarea", max: 500 })],
        };
    }
  };
  const gf = group ? fieldsFor(group) : null;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href="/pengadaan">
            <ArrowLeft aria-hidden="true" />
            Semua paket
          </Link>
        </Button>
      </div>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-2xl font-semibold">{d.title}</h1>
          <Pill tone={STATUS_TONE[d.status]}>{d.statusLabel}</Pill>
        </div>
        <p className="break-words text-sm text-muted-foreground">
          Paket {d.number}/{d.year} · {d.activityCode} {d.activityName}
          {d.accountCode ? ` · ${d.accountCode} ${d.accountName ?? ""}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {d.status === "PERSIAPAN" && d.can.update ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Ubah kegiatan, cara, HPS
            </Button>
          ) : null}
          {d.can.update ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup("rincian")} disabled={final}>
              <Pencil aria-hidden="true" />
              Rincian
            </Button>
          ) : null}
          {d.can.update ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup("pengumuman")}>
              Pengumuman dan penyerahan
            </Button>
          ) : null}
          {d.status !== "BATAL" ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/pengadaan/cetak?id=${d.id}&doc=sk`}>
                <Printer aria-hidden="true" />
                Dokumen cetak
              </Link>
            </Button>
          ) : null}
          {d.can.delete && (d.status === "PERSIAPAN" || d.status === "BATAL") ? <ConfirmDelete label={`Hapus paket ${d.title}`} title={`Hapus paket ${d.title}?`} description="Tim pelaksana dan penawaran paket ikut terhapus. Paket yang sudah berjalan tidak dapat dihapus; batalkan saja." url={`/api/pengadaan/${d.id}`} onDone={() => router.push("/pengadaan")} buttonText="Hapus paket" /> : null}
        </div>
      </header>

      {d.status === "BATAL" ? (
        <p role="status" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Paket dibatalkan. Alasan: {d.cancelReason ?? "-"}
        </p>
      ) : (
        <section aria-labelledby="pg-stage-h" className="space-y-3 rounded-lg border p-4">
          <h2 id="pg-stage-h" className="text-lg font-semibold">
            Tahap
          </h2>
          <ol className="flex flex-wrap gap-2">
            {stages.map((s) => {
              const i = STAGES.indexOf(s);
              const done = i < stageIndex || d.status === "SELESAI";
              const cur = s === d.status;
              return (
                <li key={s} aria-current={cur ? "step" : undefined} className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm ${cur ? "border-primary bg-primary/10 font-medium" : done ? "border-emerald-600/40 bg-emerald-50 text-emerald-900" : "text-muted-foreground"}`}>
                  {done ? <Check aria-hidden="true" className="size-4" /> : null}
                  {d.catalog.status[s]}
                  <span className="sr-only">{cur ? " (tahap sekarang)" : done ? " (sudah)" : " (belum)"}</span>
                </li>
              );
            })}
          </ol>
          {moveErr.length ? (
            <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Belum bisa dipindahkan:</p>
              <ul className="list-disc pl-5">
                {moveErr.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {d.can.update || d.can.approve
            ? d.transitions
                .filter((t) => t.to !== "BATAL" && (t.to === "PELAKSANAAN" ? d.can.approve : d.can.update))
                .map((t) => (
                  <div key={t.to} className="space-y-1.5 rounded-md border p-3">
                    <Button type="button" className="min-h-11" disabled={moving !== null || t.blockers.length > 0} onClick={() => move(t.to)}>
                      {moving === t.to ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                      {t.label}
                    </Button>
                    {t.blockers.length ? (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Syarat yang belum terpenuhi:</p>
                        <ul className="list-disc space-y-0.5 pl-6">
                          {t.blockers.map((b) => (
                            <li key={b} className="break-words">
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Semua syarat terpenuhi.</p>
                    )}
                  </div>
                ))
            : null}
          {d.can.update && d.transitions.some((t) => t.to === "PELAKSANAAN") && !d.can.approve ? <p className="text-sm text-muted-foreground">Memulai pelaksanaan (mengikat anggaran) dan menetapkan penyedia terpilih dilakukan oleh Kepala Desa atau admin.</p> : null}
          {d.can.update && d.transitions.some((t) => t.to === "BATAL") ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setCancelling(true)}>
              Batalkan paket
            </Button>
          ) : null}
        </section>
      )}

      <FindingList findings={d.findings} />

      <section aria-labelledby="pg-sum-h" className="space-y-2 rounded-lg border p-4">
        <h2 id="pg-sum-h" className="text-lg font-semibold">
          Ringkasan
        </h2>
        <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Cara", d.modeLabel + (d.methodLabel ? `, ${d.methodLabel.toLowerCase()}` : "")],
            [penyedia ? "HPS" : "RAB pengadaan", rupiah(d.hps)],
            ["Nilai kontrak", d.contract.value ? rupiah(d.contract.value) : "-"],
            ["Sisa anggaran kegiatan", d.budget ? (d.budget.available ? rupiah(d.budget.available) : "Tidak ada") : "APB Desa belum ditetapkan"],
            ["Dasar anggaran", d.budget?.label ?? "-"],
            ["Lokasi", d.location ?? "-"],
            ["Kasi/Kaur pelaksana", d.executorName ? `${d.executorName}${d.executorTitle ? ` (${d.executorTitle})` : ""}` : "-"],
            ["Rencana", d.plannedStartOn || d.plannedEndOn ? `${fmtDate(d.plannedStartOn)} s.d. ${fmtDate(d.plannedEndOn)}` : "-"],
            ["Keputusan TPK", d.tpkDecreeNumber ? `${d.tpkDecreeNumber}${d.tpkDecreeDate ? `, ${fmtDate(d.tpkDecreeDate)}` : ""}` : "-"],
            ["Perencanaan diumumkan", fmtDate(d.planAnnouncedOn)],
            ["Hasil diumumkan", fmtDate(d.resultAnnouncedOn)],
            ["Progres", `${d.progressPct}%`],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
        {d.scope ? <p className="whitespace-pre-line break-words text-sm">{d.scope}</p> : null}
        {d.suggestedMethod && penyedia && d.suggestedMethod !== d.method ? <p className="text-sm text-amber-900">Menurut ambang metode desa, HPS ini condong ke: {d.catalog.methods[d.suggestedMethod]}.</p> : null}
      </section>

      <TeamSection d={d} locked={final} reload={reload} />

      {penyedia ? (
        <>
          <OffersSection d={d} reload={reload} />
          <section aria-labelledby="pg-ct-h" className="space-y-3 rounded-lg border p-4">
            <h2 id="pg-ct-h" className="text-lg font-semibold">
              Negosiasi dan SPK
            </h2>
            <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Berita acara negosiasi{d.negotiation.required ? " (diperlukan)" : ""}</dt>
                <dd className="break-words">{d.negotiation.number ? `${d.negotiation.number}, ${fmtDate(d.negotiation.date)}` : d.negotiation.required ? "Belum dicatat" : "Tidak diperlukan saat ini"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">SPK / bukti transaksi</dt>
                <dd className="break-words">{d.contract.number ? `${d.contract.number}, ${fmtDate(d.contract.date)}, ${rupiah(d.contract.value)}` : "Belum dicatat"}</dd>
              </div>
            </dl>
            {canEdit && d.status === "PEMILIHAN" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup("negosiasi")}>
                  Isi berita acara negosiasi
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup("spk")}>
                  Isi SPK / bukti transaksi
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Diisi pada tahap pemilihan penyedia; setelah pelaksanaan dimulai, nilai dan nomor SPK terkunci.</p>
            )}
          </section>
        </>
      ) : null}

      <section aria-labelledby="pg-bast-h" className="space-y-3 rounded-lg border p-4">
        <h2 id="pg-bast-h" className="text-lg font-semibold">
          Serah terima (BAST)
        </h2>
        <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">BAST</dt>
            <dd className="break-words">{d.bast.number ? `${d.bast.number}, ${fmtDate(d.bast.date)}` : "Belum dicatat"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Penyerah → penerima</dt>
            <dd className="break-words">{d.bast.handedBy || d.bast.receivedBy ? `${d.bast.handedBy ?? "-"} → ${d.bast.receivedBy ?? "-"}` : "-"}</dd>
          </div>
        </dl>
        {canEdit && d.status === "PELAKSANAAN" ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup("bast")}>
            Isi BAST dan progres
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">BAST dicatat pada tahap pelaksanaan, sebelum paket ditandai selesai.</p>
        )}
      </section>

      <section aria-labelledby="pg-spp-h" className="space-y-2 rounded-lg border p-4">
        <h2 id="pg-spp-h" className="text-lg font-semibold">
          SPP dan panjar terkait (hanya baca)
        </h2>
        <p className="text-sm text-muted-foreground">SPP pada kegiatan {d.activityCode} di tahun {d.year}. SPP diajukan, diverifikasi, dan dibayar di menu APBDes; paket ini tidak mengubahnya.</p>
        {d.spp.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">SPP pada kegiatan paket ini</caption>
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 pr-3">SPP</th>
                  <th scope="col" className="py-1 pr-3">Cara</th>
                  <th scope="col" className="py-1 pr-3">Status</th>
                  <th scope="col" className="py-1 pr-3 text-right">Jumlah</th>
                  <th scope="col" className="py-1">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {d.spp.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="py-2 pr-3 tabular-nums">No. {s.number}</td>
                    <td className="py-2 pr-3">{s.mode === "PENYEDIA" ? "Penyedia" : "Swakelola"}</td>
                    <td className="py-2 pr-3">{s.status === "DIBAYAR" ? `Dibayar ${fmtDate(s.paidAt)}` : s.status.charAt(0) + s.status.slice(1).toLowerCase()}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{rupiah(s.total)}</td>
                    <td className="break-words py-2 text-xs">
                      {s.mode === "PENYEDIA" ? (s.hasReceipt ? "Bukti penerimaan dilampirkan" : "Belum ada bukti penerimaan") : null}
                      {s.panjar ? <span className="block">Panjar {rupiah(s.panjar.given)} kepada {s.panjar.holderName}, jatuh tempo {fmtDate(s.panjar.dueAt)}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada SPP pada kegiatan ini.</p>
        )}
        <Link href="/apbdes" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
          Buka menu APBDes
        </Link>
      </section>

      {editing ? (
        <PackageDialog year={d.year} catalog={d.catalog} initial={{ id: d.id, activityCode: d.activityCode, accountCode: d.accountCode, title: d.title, scope: d.scope, location: d.location, mode: d.mode, method: d.method, hps: d.hps, executorName: d.executorName, executorTitle: d.executorTitle }} onClose={() => setEditing(false)} onDone={() => { setEditing(false); reload(); }} />
      ) : null}
      {group && gf ? <PatchFieldsDialog url={`/api/pengadaan/${d.id}`} title={gf.title} description={gf.description} fields={gf.fields} onClose={() => setGroup(null)} onDone={() => { setGroup(null); reload(); }} /> : null}
      {cancelling ? <CancelDialog id={d.id} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); reload(); }} /> : null}
    </div>
  );
}

function CancelDialog({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit(`/api/pengadaan/${id}/status`, "POST", { to: "BATAL", reason })) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batalkan paket</DialogTitle>
          <DialogDescription>Paket yang dibatalkan tidak dapat dilanjutkan. Alasan masuk ke riwayat audit.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ reason: "Alasan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="cx-reason">Alasan pembatalan *</Label>
            <Textarea id="cx-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Kembali
            </Button>
            <Button type="submit" variant="destructive" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Batalkan paket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
