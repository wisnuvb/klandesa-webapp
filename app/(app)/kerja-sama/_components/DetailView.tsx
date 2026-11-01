"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FindingList } from "@/components/app/FindingList";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { PatchFieldsDialog, type FieldDef } from "@/components/app/PatchFieldsDialog";
import { Pill, SELECT_CLASS, fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { BudgetSection, PartiesSection } from "./PartiesBudget";
import { STATUS_TONE, type DetailResp } from "./types";

type Group = "isi" | "proses" | "pelaporan";
type Dlg = "sign" | "end" | "cancel";
const STAGES = ["PERSIAPAN", "PENAWARAN", "PENYUSUNAN", "DITANDATANGANI", "PELAKSANAAN", "SELESAI"] as const;

const DECISION = [
  { value: "SEPAKAT", label: "Menyepakati kerja sama" },
  { value: "TIDAK", label: "Tidak menyepakati" },
];

export function DetailView({ id }: { id: number }) {
  const router = useRouter();
  const { data: d, loading, error, reload } = useApiGet<DetailResp>(Number.isInteger(id) && id > 0 ? `/api/kerja-sama/${id}` : null);
  const [group, setGroup] = useState<Group | null>(null);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveErr, setMoveErr] = useState<string[]>([]);

  async function move(to: string) {
    setMoving(to);
    setMoveErr([]);
    const res = await fetch(`/api/kerja-sama/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }) }).catch(() => null);
    setMoving(null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setMoveErr(Array.isArray(j?.errors) ? j.errors : [typeof j?.error === "string" ? j.error : "Gagal mengubah tahap."]);
  }

  if (loading && !d)
    return (
      <p role="status" className="flex items-center gap-2 pb-24 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Memuat kerja sama…
      </p>
    );
  if (error || !d)
    return (
      <div className="space-y-3 pb-24">
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error ?? "Kerja sama tidak ditemukan."}
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/kerja-sama">Kembali ke daftar</Link>
        </Button>
      </div>
    );

  const ended = d.status === "SELESAI" || d.status === "BATAL";
  const signed = d.status === "DITANDATANGANI" || d.status === "PELAKSANAAN";
  const stageIndex = STAGES.indexOf(d.status as (typeof STAGES)[number]);
  const meetingOptions = d.meetings.map((m) => ({ value: String(m.id), label: `${m.title}${m.heldOn ? ` (${fmtDate(m.heldOn)})` : ""} - ${m.status === "HELD" || m.status === "FINAL" ? "terlaksana" : "belum terlaksana"}` }));
  const t = (key: string, label: string, value: string | null, o: Partial<FieldDef> = {}): FieldDef => ({ key, label, value, type: "text", ...o });

  const fieldsFor = (g: Group): { title: string; description?: string; fields: FieldDef[] } => {
    if (g === "isi")
      return {
        title: "Isi kerja sama",
        description: "Delapan muatan minimal Peraturan Bersama/Perjanjian Bersama (Permendagri 96/2017 Pasal 6). Terkunci setelah ditandatangani.",
        fields: [
          t("title", "Judul", d.title, { max: 200 }),
          t("field", "Bidang kerja sama", d.field, { type: "select", options: Object.entries(d.catalog.fields).map(([value, label]) => ({ value, label })) }),
          t("scope", "Ruang lingkup kerja sama", d.scope, { type: "textarea", max: 2000 }),
          t("procedures", "Tata cara dan ketentuan pelaksanaan", d.procedures, { type: "textarea", max: 2000 }),
          t("termStartOn", "Jangka waktu: mulai", d.termStartOn, { type: "date" }),
          t("termEndOn", "Jangka waktu: berakhir", d.termEndOn, { type: "date" }),
          t("rights", "Hak dan kewajiban para pihak", d.rights, { type: "textarea", max: 2000 }),
          t("funding", "Pendanaan", d.funding, { type: "textarea", max: 1000, hint: "Mis. dibebankan pada APB Desa masing-masing sesuai RAB bersama." }),
          t("amendment", "Tata cara perubahan, penundaan, dan pembatalan", d.amendment, { type: "textarea", max: 1000 }),
          t("dispute", "Penyelesaian perselisihan", d.dispute, { type: "textarea", max: 1000, hint: "Antar-Desa: musyawarah, difasilitasi camat atau bupati/wali kota. Dengan pihak ketiga: musyawarah, lalu arbitrase bila tidak selesai." }),
        ],
      };
    if (g === "proses")
      return {
        title: "Proses dan Musyawarah Desa",
        description: "Hubungkan Musyawarah Desa dari menu Musyawarah Desa. Kerja sama harus disepakati dalam Musyawarah Desa dan tercantum dalam RPJM Desa serta RKP Desa.",
        fields: [
          t("prepMusdesId", "Musyawarah Desa pembahasan bidang/potensi", d.prepMusdes ? String(d.prepMusdes.id) : "", { type: "select", options: meetingOptions }),
          t("inPlanConfirmed", "Tercantum dalam RPJM Desa dan RKP Desa", d.inPlanConfirmed ? "true" : "false", { type: "bool", hint: "Sudah tercantum dalam RPJM Desa dan RKP Desa (atau diubah lewat musyawarah perencanaan khusus)" }),
          t("offerSentOn", "Tanggal surat penawaran dikirim/diterima", d.offerSentOn, { type: "date" }),
          t("offerMusdesId", "Musyawarah Desa pembahasan penawaran", d.offerMusdes ? String(d.offerMusdes.id) : "", { type: "select", options: meetingOptions }),
          t("offerDecision", "Hasil musyawarah atas penawaran", d.offerDecision ?? "", { type: "select", options: DECISION }),
          t("offerReplyOn", "Tanggal jawaban tertulis Kepala Desa", d.offerReplyOn, { type: "date" }),
          t("consultRequired", "Perlu konsultasi", d.consultRequired ? "true" : "false", { type: "bool", hint: "Menyangkut tata ruang, pungutan, atau organisasi (pembebanan APB Desa dihitung otomatis dari RAB)" }),
          t("consultedOn", "Tanggal rancangan dikonsultasikan ke bupati/wali kota melalui camat", d.consultedOn, { type: "date" }),
          t("agreedOn", "Tanggal kesepakatan para pihak", d.agreedOn, { type: "date", hint: "Penandatanganan paling lama 7 hari kerja setelah tanggal ini." }),
        ],
      };
    return {
      title: "Pelaporan dan saksi",
      description: "Hasil pelaksanaan dilaporkan kepada Kepala Desa/BPD dengan tembusan bupati/wali kota melalui camat, dan dimuat dalam Laporan Penyelenggaraan Pemerintahan Desa.",
      fields: [t("witnessName", "Nama camat/saksi penandatanganan", d.witnessName, { max: 150 }), t("reportedOn", "Tanggal laporan kepada Kepala Desa/BPD", d.reportedOn, { type: "date" }), t("reportedToCamatOn", "Tanggal laporan kepada camat/bupati", d.reportedToCamatOn, { type: "date" })],
    };
  };
  const gf = group ? fieldsFor(group) : null;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href="/kerja-sama">
            <ArrowLeft aria-hidden="true" />
            Semua kerja sama
          </Link>
        </Button>
      </div>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-2xl font-semibold">{d.title}</h1>
          <Pill tone={STATUS_TONE[d.status]}>{d.statusLabel}</Pill>
        </div>
        <p className="text-sm text-muted-foreground">
          {d.kindLabel}
          {d.initiativeLabel ? ` · ${d.initiativeLabel}` : ""} · {d.fieldLabel} · Tahun {d.year}
        </p>
        <div className="flex flex-wrap gap-2">
          {d.can.update && !ended ? (
            <>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup("isi")} disabled={signed}>
                <Pencil aria-hidden="true" />
                Isi kerja sama
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup("proses")} disabled={signed}>
                <Pencil aria-hidden="true" />
                Proses dan musyawarah
              </Button>
            </>
          ) : null}
          {d.can.update && d.status !== "BATAL" && (signed || d.status === "SELESAI") ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup("pelaporan")}>
              Pelaporan dan saksi
            </Button>
          ) : null}
          {d.status !== "BATAL" ? (
            <>
              <Button asChild variant="outline" className="min-h-11">
                <Link href={`/kerja-sama/cetak?id=${d.id}&doc=penawaran`}>
                  <Printer aria-hidden="true" />
                  Surat penawaran
                </Link>
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <Link href={`/kerja-sama/cetak?id=${d.id}&doc=kesepakatan`}>
                  <Printer aria-hidden="true" />
                  Berita acara kesepakatan
                </Link>
              </Button>
            </>
          ) : null}
          {d.can.delete && (d.status === "PERSIAPAN" || d.status === "BATAL") ? <ConfirmDelete label={`Hapus ${d.title}`} title={`Hapus ${d.title}?`} description="Para pihak dan RAB ikut terhapus." url={`/api/kerja-sama/${d.id}`} onDone={() => router.push("/kerja-sama")} buttonText="Hapus" /> : null}
        </div>
      </header>

      {d.status === "BATAL" ? (
        <p role="status" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Kerja sama dibatalkan sebelum ditandatangani. Alasan: {d.endNote ?? "-"}
        </p>
      ) : (
        <section aria-labelledby="ks-stage-h" className="space-y-3 rounded-lg border p-4">
          <h2 id="ks-stage-h" className="text-lg font-semibold">
            Tahap
          </h2>
          <ol className="flex flex-wrap gap-2">
            {STAGES.map((s, i) => {
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
          {d.transitions
            .filter((x) => x.to !== "BATAL")
            .map((x) => {
              const needsApprove = x.to === "DITANDATANGANI";
              const allowed = needsApprove ? d.can.approve : d.can.update;
              if (!allowed && !needsApprove) return null;
              return (
                <div key={x.to} className="space-y-1.5 rounded-md border p-3">
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={moving !== null || x.blockers.length > 0 || !allowed}
                    onClick={() => (x.to === "DITANDATANGANI" ? setDlg("sign") : x.to === "SELESAI" ? setDlg("end") : move(x.to))}
                  >
                    {moving === x.to ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                    {x.label}
                  </Button>
                  {needsApprove && !d.can.approve ? <p className="text-sm text-muted-foreground">Penandatanganan dicatat oleh Kepala Desa atau admin.</p> : null}
                  {x.blockers.length ? (
                    <div className="text-sm">
                      <p className="text-muted-foreground">Syarat yang belum terpenuhi:</p>
                      <ul className="list-disc space-y-0.5 pl-6">
                        {x.blockers.map((b) => (
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
              );
            })}
          {d.can.update && d.transitions.some((x) => x.to === "BATAL") ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg("cancel")}>
              Batalkan kerja sama
            </Button>
          ) : null}
        </section>
      )}

      <FindingList findings={d.findings} />

      <section aria-labelledby="ks-sum-h" className="space-y-2 rounded-lg border p-4">
        <h2 id="ks-sum-h" className="text-lg font-semibold">
          Ringkasan isi
        </h2>
        <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
          {[
            ["Ruang lingkup", d.scope],
            ["Tata cara dan ketentuan pelaksanaan", d.procedures],
            ["Jangka waktu", d.termStartOn || d.termEndOn ? `${fmtDate(d.termStartOn)} s.d. ${fmtDate(d.termEndOn)}` : null],
            ["Hak dan kewajiban", d.rights],
            ["Pendanaan", d.funding],
            ["Perubahan, penundaan, pembatalan", d.amendment],
            ["Penyelesaian perselisihan", d.dispute],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="whitespace-pre-line break-words">{v ?? <span className="text-amber-900">Belum diisi</span>}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="ks-proc-h" className="space-y-2 rounded-lg border p-4">
        <h2 id="ks-proc-h" className="text-lg font-semibold">
          Musyawarah Desa dan proses
        </h2>
        <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Musyawarah pembahasan bidang/potensi</dt>
            <dd className="break-words">
              {d.prepMusdes ? (
                <Link href={`/musdes/${d.prepMusdes.id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
                  {d.prepMusdes.title}
                </Link>
              ) : (
                "Belum dikaitkan"
              )}
              {d.prepMusdes ? ` (${d.prepMusdes.status === "HELD" || d.prepMusdes.status === "FINAL" ? `terlaksana ${fmtDate(d.prepMusdes.heldOn)}` : "belum terlaksana"})` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tercantum di RPJM Desa dan RKP Desa</dt>
            <dd>{d.inPlanConfirmed ? "Ya" : "Belum dikonfirmasi"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Penawaran</dt>
            <dd>{d.offerSentOn ? fmtDate(d.offerSentOn) : "Belum dicatat"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Musyawarah pembahasan penawaran</dt>
            <dd className="break-words">
              {d.offerMusdes ? (
                <Link href={`/musdes/${d.offerMusdes.id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
                  {d.offerMusdes.title}
                </Link>
              ) : (
                "Belum dikaitkan"
              )}
              {d.offerDecision ? ` · hasil: ${d.offerDecision === "SEPAKAT" ? "menyepakati" : "tidak menyepakati"}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Konsultasi ke bupati/wali kota melalui camat</dt>
            <dd>{d.consultedOn ? fmtDate(d.consultedOn) : d.consultRequired || Number(d.selfShare) > 0 ? "Wajib, belum dicatat" : "Tidak diwajibkan saat ini"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Kesepakatan dan penandatanganan</dt>
            <dd className="break-words">
              {d.agreedOn ? `Sepakat ${fmtDate(d.agreedOn)}` : "Belum ada tanggal kesepakatan"}
              {d.signedOn ? ` · ditandatangani ${fmtDate(d.signedOn)} (No. ${d.signedNumber ?? "-"})` : ""}
            </dd>
          </div>
          {d.reportedOn || d.endedOn ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Pelaporan dan berakhirnya</dt>
              <dd className="break-words">
                {d.reportedOn ? `Laporan ${fmtDate(d.reportedOn)}` : "Laporan belum dicatat"}
                {d.endedOn ? ` · berakhir ${fmtDate(d.endedOn)}: ${d.endReasonLabel ?? ""}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <PartiesSection d={d} reload={reload} />
      <BudgetSection d={d} reload={reload} />

      {group && gf ? <PatchFieldsDialog url={`/api/kerja-sama/${d.id}`} title={gf.title} description={gf.description} fields={gf.fields} onClose={() => setGroup(null)} onDone={() => { setGroup(null); reload(); }} /> : null}
      {dlg === "sign" ? <ActionDialog d={d} kind="sign" onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}
      {dlg === "end" ? <ActionDialog d={d} kind="end" onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}
      {dlg === "cancel" ? <ActionDialog d={d} kind="cancel" onClose={() => setDlg(null)} onDone={() => { setDlg(null); reload(); }} /> : null}
    </div>
  );
}

function ActionDialog({ d, kind, onClose, onDone }: { d: DetailResp; kind: "sign" | "end" | "cancel"; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(localToday());
  const [number, setNumber] = useState("");
  const [witness, setWitness] = useState(d.witnessName ?? "");
  const [reason, setReason] = useState("");
  const [endReason, setEndReason] = useState("");
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r =
      kind === "sign"
        ? await submit(`/api/kerja-sama/${d.id}/penandatanganan`, "POST", { signedOn: date, signedNumber: number, witnessName: witness })
        : kind === "end"
          ? await submit(`/api/kerja-sama/${d.id}/status`, "POST", { to: "SELESAI", endReason, endedOn: date, endNote: note })
          : await submit(`/api/kerja-sama/${d.id}/status`, "POST", { to: "BATAL", reason });
    if (r) onDone();
  }
  const title = kind === "sign" ? "Catat penandatanganan" : kind === "end" ? "Tandai kerja sama berakhir" : "Batalkan kerja sama";
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {kind === "sign" ? "Penandatanganan disaksikan camat atas nama bupati/wali kota dan paling lama 7 hari kerja sejak disepakati. Setelah ini isi kerja sama terkunci." : kind === "end" ? "Pilih sebab berakhir menurut Permendagri 96/2017 Pasal 17." : "Hanya untuk kerja sama yang belum ditandatangani."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ signedOn: "Tanggal", signedNumber: "Nomor", witnessName: "Saksi", reason: "Alasan", endReason: "Sebab berakhir", endedOn: "Tanggal berakhir", endNote: "Catatan" }} />
          {kind === "sign" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ac-date">Tanggal penandatanganan *</Label>
                <Input id="ac-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.signedOn)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-num">Nomor {d.kind === "ANTAR_DESA" ? "Peraturan Bersama Kepala Desa" : "Perjanjian Bersama"} *</Label>
                <Input id="ac-num" className="h-11" maxLength={100} value={number} onChange={(e) => setNumber(e.target.value)} aria-invalid={Boolean(errors.signedNumber)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-wit">Nama camat (saksi)</Label>
                <Input id="ac-wit" className="h-11" maxLength={150} value={witness} onChange={(e) => setWitness(e.target.value)} />
              </div>
            </>
          ) : null}
          {kind === "end" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ac-er">Sebab berakhir *</Label>
                <SearchSelect id="ac-er" className={SELECT_CLASS} value={endReason} onChange={(e) => setEndReason(e.target.value)} aria-invalid={Boolean(errors.endReason)}>
                  <option value="">Pilih sebab</option>
                  {Object.entries(d.catalog.endReasons).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </SearchSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-ed">Tanggal berakhir *</Label>
                <Input id="ac-ed" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(errors.endedOn)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-en">Catatan</Label>
                <Input id="ac-en" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </>
          ) : null}
          {kind === "cancel" ? (
            <div className="space-y-1.5">
              <Label htmlFor="ac-re">Alasan pembatalan *</Label>
              <Textarea id="ac-re" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(errors.reason)} />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Kembali
            </Button>
            <Button type="submit" variant={kind === "cancel" ? "destructive" : "default"} className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
