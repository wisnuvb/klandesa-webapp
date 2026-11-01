"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Loader2, Pencil, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { LEGAL_STATUS, OFFICER_ROLE, RANKING_LEVEL } from "@/lib/bumdes/catalog";
import type { LegalOverview, OfficerView } from "@/lib/bumdes/service";
import { Busy, EmptyNote, Findings, INPUT_CLASS, SELECT_CLASS } from "./shared";

type Resp = LegalOverview & { canManage: boolean };

export function LegalTab() {
  const { data, loading, error, reload } = useApiGet<Resp>("/api/bumdes/legalitas");
  const [officer, setOfficer] = useState<OfficerView | "new" | null>(null);
  if (loading && !data) return <Busy>Memuat legalitas…</Busy>;
  if (error) return <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">{error}</div>;
  if (!data) return null;
  const p = data.profile;
  return (
    <div className="min-w-0 space-y-6">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Data untuk pendaftaran dan pemutakhiran BUM Desa melalui Sistem Informasi Desa (PP 11/2021 Pasal 7-9, 11; Permendesa PDTT 3/2021 Pasal 2-10). Aplikasi ini tidak mengirim ke Kementerian: data dicatat dan dicetak untuk diisikan.
      </p>
      <Findings items={data.findings} />

      <section aria-labelledby="lg-cl" className="min-w-0 space-y-2 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="lg-cl" className="text-lg font-semibold">
            Kelengkapan dokumen pendaftaran
          </h2>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/bumdes/cetak">
              <Printer aria-hidden="true" />
              Lembar pendaftaran (cetak)
            </Link>
          </Button>
        </div>
        <ul className="space-y-1.5 text-sm">
          {data.checklist.map((c) => (
            <li key={c.key} className="flex items-start gap-2">
              {c.done ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-700" /> : <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 break-words">
                {c.label}: <strong>{c.done ? "lengkap" : "belum"}</strong>
                {!c.done && c.hint ? <span className="text-muted-foreground"> ({c.hint})</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <LegalForm key={JSON.stringify(p)} data={data} onSaved={reload} />

      <section aria-labelledby="lg-off" className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="lg-off" className="text-lg font-semibold">
              Pengurus dan organ
            </h2>
            <p className="text-sm text-muted-foreground">Penasihat dijabat rangkap Kepala Desa (Pasal 21). Pelaksana operasional dan pengawas menjabat 5 tahun (Pasal 26 dan 30); diangkat Musyawarah Desa (Pasal 17).</p>
          </div>
          {data.canManage ? (
            <Button type="button" className="min-h-11" onClick={() => setOfficer("new")}>
              <Plus aria-hidden="true" />
              Tambah pengurus
            </Button>
          ) : null}
        </div>
        {data.officers.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[42rem] text-sm">
              <caption className="sr-only">Pengurus BUM Desa</caption>
              <thead className="bg-muted text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Jabatan</th>
                  <th scope="col" className="px-3 py-2">Nama</th>
                  <th scope="col" className="px-3 py-2">SK</th>
                  <th scope="col" className="px-3 py-2">Masa jabatan</th>
                  <th scope="col" className="px-3 py-2"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.officers.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2">{o.roleLabel}</td>
                    <td className="break-words px-3 py-2 font-medium">{o.name}</td>
                    <td className="break-words px-3 py-2">
                      {o.skNumber ?? "-"}
                      {o.skDate ? <span className="block text-xs text-muted-foreground">{fmtDate(o.skDate)}</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      {o.startOn ? fmtDate(o.startOn) : "-"} s.d. {o.termEnd ? fmtDate(o.termEnd) : "-"}
                      {!o.endOn && o.startOn ? <span className="block text-xs text-muted-foreground">(5 tahun sejak mulai)</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-right">
                      {data.canManage ? (
                        <>
                          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah ${o.name}`} onClick={() => setOfficer(o)}>
                            <Pencil aria-hidden="true" />
                          </Button>
                          <ConfirmDelete label={`Hapus ${o.name}`} title="Hapus pengurus?" description={`${o.name} (${o.roleLabel}) dihapus dari daftar. Tindakan tercatat di jejak audit.`} url={`/api/bumdes/pengurus/${o.id}`} onDone={reload} />
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>Belum ada pengurus tercatat.</EmptyNote>
        )}
      </section>
      {officer ? <OfficerDialog officer={officer === "new" ? null : officer} onClose={() => setOfficer(null)} onDone={() => { setOfficer(null); reload(); }} /> : null}
    </div>
  );
}

type FormState = Record<string, string>;
function Field({ f, set, errors, k, label, type = "text", max, hint, req }: { f: FormState; set: (k: string) => (e: { target: { value: string } }) => void; errors: Record<string, string>; k: string; label: string; type?: string; max?: number; hint?: string; req?: boolean }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={`lg-${k}`}>{label}{req ? " *" : ""}</Label>
      <Input id={`lg-${k}`} type={type} className={INPUT_CLASS} maxLength={max} value={f[k] ?? ""} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `lg-${k}-err` : hint ? `lg-${k}-h` : undefined} inputMode={k === "nib" || k === "npwp" ? "numeric" : undefined} />
      {errors[k] ? <p id={`lg-${k}-err`} className="text-sm text-destructive">{errors[k]}</p> : hint ? <p id={`lg-${k}-h`} className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function LegalForm({ data, onSaved }: { data: Resp; onSaved: () => void }) {
  const p = data.profile;
  const [f, setF] = useState({
    legalStatus: p.legalStatus,
    establishMeetingId: p.establishMeetingId ? String(p.establishMeetingId) : "",
    establishedOn: p.establishedOn ?? "",
    perdesNumber: p.perdesNumber ?? "",
    perdesDate: p.perdesDate ?? "",
    artNumber: p.artNumber ?? "",
    artDate: p.artDate ?? "",
    nameApprovalNo: p.nameApprovalNo ?? "",
    nameApprovalDate: p.nameApprovalDate ?? "",
    certificateNo: p.certificateNo ?? "",
    certificateDate: p.certificateDate ?? "",
    nib: p.nib ?? "",
    npwp: p.npwp ?? "",
    businessFields: p.businessFields ?? "",
    initialCapital: p.initialCapital ? String(Math.round(Number(p.initialCapital))) : "",
    rankingYear: p.rankingYear ? String(p.rankingYear) : "",
    rankingLevel: p.rankingLevel ?? "",
    note: p.note ?? "",
  });
  const set = (k: string) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit("/api/bumdes/legalitas", "PUT", f)) {
      toast.success("Data legalitas disimpan");
      onSaved();
    }
  }
  return (
    <form onSubmit={go} noValidate className="min-w-0 space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">Data legalitas</h2>
      <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ legalStatus: "Status", certificateNo: "Nomor sertifikat", nib: "NIB", npwp: "NPWP", establishMeetingId: "Musyawarah Desa", initialCapital: "Modal awal", rankingYear: "Tahun peringkat", rankingLevel: "Level peringkat" }} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="lg-status">Status badan hukum</Label>
          <SearchSelect id="lg-status" className={SELECT_CLASS} value={f.legalStatus} onChange={set("legalStatus")}>
            {Object.entries(LEGAL_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SearchSelect>
          <p className="text-xs text-muted-foreground">Berbadan hukum sejak sertifikat pendaftaran elektronik terbit (PP 11/2021 Pasal 8).</p>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="lg-meet">Musyawarah Desa pendirian</Label>
          <SearchSelect id="lg-meet" className={SELECT_CLASS} value={f.establishMeetingId} onChange={set("establishMeetingId")} placeholder="Belum dihubungkan">
            <option value="">Belum dihubungkan</option>
            {data.meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
                {m.heldOn ? ` (${fmtDate(m.heldOn)})` : ""}
              </option>
            ))}
          </SearchSelect>
          <p className="text-xs text-muted-foreground">Hanya Musyawarah Desa berberita acara final. Buat di menu Musyawarah Desa.</p>
        </div>
      </div>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold">Pendirian dan peraturan</legend>
        <Field f={f} set={set} errors={errors} k="establishedOn" label="Tanggal pendirian" type="date" />
        <div className="hidden sm:block" />
        <Field f={f} set={set} errors={errors} k="perdesNumber" label="Nomor Peraturan Desa pendirian" max={100} hint="Memuat Anggaran Dasar (Pasal 7 ayat 6)." />
        <Field f={f} set={set} errors={errors} k="perdesDate" label="Tanggal Peraturan Desa" type="date" />
        <Field f={f} set={set} errors={errors} k="artNumber" label="Nomor Peraturan Kepala Desa (ART)" max={100} hint="Anggaran Rumah Tangga (Pasal 13 ayat 3)." />
        <Field f={f} set={set} errors={errors} k="artDate" label="Tanggal Peraturan Kepala Desa" type="date" />
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold">Pendaftaran dan identitas usaha</legend>
        <Field f={f} set={set} errors={errors} k="nameApprovalNo" label="Nomor persetujuan nama" max={100} />
        <Field f={f} set={set} errors={errors} k="nameApprovalDate" label="Tanggal persetujuan nama" type="date" />
        <Field f={f} set={set} errors={errors} k="certificateNo" label="Nomor sertifikat pendaftaran" max={100} />
        <Field f={f} set={set} errors={errors} k="certificateDate" label="Tanggal sertifikat" type="date" />
        <Field f={f} set={set} errors={errors} k="nib" label="NIB" max={20} hint="13 angka." />
        <Field f={f} set={set} errors={errors} k="npwp" label="NPWP" max={30} hint="15 atau 16 angka; titik dan strip boleh." />
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold">Usaha dan modal</legend>
        <div className="min-w-0 space-y-1.5 sm:col-span-2">
          <Label htmlFor="lg-fields">Bidang usaha</Label>
          <Textarea id="lg-fields" rows={2} maxLength={500} value={f.businessFields} onChange={set("businessFields")} />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="lg-cap">Modal awal</Label>
          <CurrencyInput id="lg-cap" inputClassName="h-11" value={f.initialCapital} onValueChange={(v) => setF((s) => ({ ...s, initialCapital: v }))} aria-invalid={Boolean(errors.initialCapital)} />
        </div>
        <div className="hidden sm:block" />
        <Field f={f} set={set} errors={errors} k="rankingYear" label="Tahun pemeringkatan terakhir" hint="Hasil peringkat Kementerian dicatat apa adanya (Permendesa PDTT 3/2021 Pasal 22)." />
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="lg-rank">Level peringkat</Label>
          <SearchSelect id="lg-rank" className={SELECT_CLASS} value={f.rankingLevel} onChange={set("rankingLevel")} placeholder="Belum ada">
            <option value="">Belum ada</option>
            {Object.entries(RANKING_LEVEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div className="min-w-0 space-y-1.5 sm:col-span-2">
          <Label htmlFor="lg-note">Catatan</Label>
          <Textarea id="lg-note" rows={2} maxLength={500} value={f.note} onChange={set("note")} />
        </div>
      </fieldset>
      {data.canManage ? (
        <Button type="submit" className="min-h-11" disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          Simpan data legalitas
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Hanya admin dan Kepala Desa yang dapat mengubah data legalitas.</p>
      )}
    </form>
  );
}

function OfficerDialog({ officer, onClose, onDone }: { officer: OfficerView | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ role: officer?.role ?? "", name: officer?.name ?? "", skNumber: officer?.skNumber ?? "", skDate: officer?.skDate ?? "", startOn: officer?.startOn ?? "", endOn: officer?.endOn ?? "", note: officer?.note ?? "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (await submit(officer ? `/api/bumdes/pengurus/${officer.id}` : "/api/bumdes/pengurus", officer ? "PATCH" : "POST", f)) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{officer ? "Ubah pengurus" : "Tambah pengurus"}</DialogTitle>
          <DialogDescription>Catat nama, jabatan, dan SK pengangkatan. Masa jabatan kosong dihitung 5 tahun sejak tanggal mulai.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-3" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ role: "Jabatan", name: "Nama", skNumber: "Nomor SK", skDate: "Tanggal SK", startOn: "Mulai", endOn: "Berakhir", note: "Catatan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="of-role">Jabatan *</Label>
            <SearchSelect id="of-role" className={SELECT_CLASS} value={f.role} onChange={set("role")} aria-invalid={Boolean(errors.role)} placeholder="Pilih jabatan">
              <option value="">Pilih jabatan</option>
              {Object.entries(OFFICER_ROLE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="of-name">Nama *</Label>
            <Input id="of-name" className={INPUT_CLASS} maxLength={150} value={f.name} onChange={set("name")} aria-invalid={Boolean(errors.name)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="of-sk">Nomor SK</Label>
              <Input id="of-sk" className={INPUT_CLASS} maxLength={100} value={f.skNumber} onChange={set("skNumber")} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="of-skd">Tanggal SK</Label>
              <Input id="of-skd" type="date" className={INPUT_CLASS} value={f.skDate} onChange={set("skDate")} aria-invalid={Boolean(errors.skDate)} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="of-start">Mulai menjabat</Label>
              <Input id="of-start" type="date" className={INPUT_CLASS} value={f.startOn} onChange={set("startOn")} aria-invalid={Boolean(errors.startOn)} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="of-end">Berakhir</Label>
              <Input id="of-end" type="date" className={INPUT_CLASS} value={f.endOn} onChange={set("endOn")} aria-invalid={Boolean(errors.endOn)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="of-note">Catatan</Label>
            <Input id="of-note" className={INPUT_CLASS} maxLength={300} value={f.note} onChange={set("note")} />
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

