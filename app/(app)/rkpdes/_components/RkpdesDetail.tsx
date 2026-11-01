"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS, STEP_STATE_LABEL, WarningList, fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { ActivitiesTab } from "./ActivitiesTab";
import { PaguTab } from "./PaguTab";
import { TeamTab } from "./TeamTab";
import type { DetailResponse, Step } from "./types";

type Tab = "tahapan" | "tim" | "pagu" | "kegiatan" | "evaluasi";

export function RkpdesDetail({ id }: { id: number }) {
  const router = useRouter();
  const { data, loading, error, reload } = useApiGet<DetailResponse>(Number.isInteger(id) && id > 0 ? `/api/perencanaan/rkpdes/${id}` : null);
  const [tab, setTab] = useState<Tab>("tahapan");
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Memuat RKP Desa…
      </p>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error ?? "RKP Desa tidak ditemukan."}
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/rkpdes">Kembali ke daftar</Link>
        </Button>
      </div>
    );
  }

  const { document: d, can } = data;
  const editable = !d.locked && can.update;

  async function remove() {
    setDeleting(true);
    setDelError(null);
    const res = await fetch(`/api/perencanaan/rkpdes/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return router.push("/rkpdes");
    const j = await res?.json().catch(() => null);
    setDelError(typeof j?.error === "string" ? j.error : "Gagal menghapus.");
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="min-h-11">
        <Link href="/rkpdes">
          <ArrowLeft aria-hidden="true" />
          Siklus RKP Desa
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">
              RKP Desa {d.year}
              {d.revision > 0 ? ` — perubahan ke-${d.revision}` : ""}
            </h1>
            <p className="text-muted-foreground">
              {d.plan ? `Dijabarkan dari ${d.plan.title} (${d.plan.periodStart}–${d.plan.periodEnd})` : "Belum terhubung ke RPJM Desa yang mencakup tahun ini"}
              {d.changeReasonLabel ? ` · ${d.changeReasonLabel}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {d.locked ? (
              <Pill tone="done">
                <Lock aria-hidden="true" className="mr-1 size-3" />
                Ditetapkan dengan Perdes
              </Pill>
            ) : null}
            <Pill tone="info">
              {d.progress.done}/{d.progress.total} tahap
            </Pill>
          </div>
        </div>
        {!d.plan ? <WarningList title="RPJM Desa belum ada" items={[`Kegiatan baru dapat dibuat setelah ada RPJM Desa yang mencakup tahun ${d.year}. Buat di menu RPJM Desa, lalu buat ulang dokumen ini.`]} /> : null}
        {d.plan?.termNote ? <WarningList title="Jangka waktu RPJM Desa" items={[d.plan.termNote]} /> : null}
        {d.locked ? <p className="text-sm text-muted-foreground">Isi dokumen terkunci karena Peraturan Desa sudah ditetapkan. Perubahan dilakukan lewat RKP Desa perubahan (Pasal 49–50); hanya data daftar usulan yang masih dapat dicatat.</p> : null}
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="tahapan" className="min-h-11">Tahapan</TabsTrigger>
          <TabsTrigger value="tim" className="min-h-11">Tim penyusun ({d.team.length})</TabsTrigger>
          <TabsTrigger value="pagu" className="min-h-11">Pagu dan program masuk</TabsTrigger>
          <TabsTrigger value="kegiatan" className="min-h-11">Kegiatan ({d.activitySummary.count})</TabsTrigger>
          <TabsTrigger value="evaluasi" className="min-h-11">Evaluasi dan usulan</TabsTrigger>
        </TabsList>

        <TabsContent value="tahapan" className="space-y-3 pt-4">
          {d.steps.map((s, i) => (
            <StepCard key={s.key} step={s} index={i + 1} data={data} reload={reload} />
          ))}
        </TabsContent>
        <TabsContent value="tim" className="space-y-4 pt-4">
          <TeamTab data={data} editable={editable} reload={reload} />
        </TabsContent>
        <TabsContent value="pagu" className="space-y-6 pt-4">
          <PaguTab data={data} editable={editable} reload={reload} />
        </TabsContent>
        <TabsContent value="kegiatan" className="space-y-4 pt-4">
          <ActivitiesTab data={data} editable={editable} canDelete={!d.locked && can.delete} reload={reload} />
        </TabsContent>
        <TabsContent value="evaluasi" className="space-y-6 pt-4">
          <EvaluationTab data={data} reload={reload} />
        </TabsContent>
      </Tabs>

      <section aria-labelledby="cetak-h" className="space-y-2 border-t pt-4">
        <h2 id="cetak-h" className="text-lg font-semibold">
          Cetak
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            ["rancangan", "Rancangan RKP Desa"],
            ["usulan", "Daftar usulan RKP Desa"],
            ["tim", "Lampiran tim penyusun"],
            ["pagu", "Pagu indikatif dan program masuk"],
          ].map(([k, label]) => (
            <Button key={k} asChild variant="outline" className="min-h-11">
              <Link href={`/rkpdes/cetak?id=${d.id}&kind=${k}`}>
                <Printer aria-hidden="true" />
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      {!d.locked && can.delete ? (
        <div className="border-t pt-4">
          {delError ? <p role="alert" className="mb-2 text-sm text-destructive">{delError}</p> : null}
          <Button type="button" variant="outline" className="min-h-11 text-destructive" onClick={remove} disabled={deleting}>
            {deleting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
            Hapus dokumen ini
          </Button>
          <p className="mt-1 text-sm text-muted-foreground">Hanya dokumen tanpa kegiatan yang dapat dihapus.</p>
        </div>
      ) : null}
    </div>
  );
}

// --- Tahapan --------------------------------------------------------------------

function StepCard({ step, index, data, reload }: { step: Step; index: number; data: DetailResponse; reload: () => void }) {
  const d = data.document;
  const canEditStep = !d.locked ? data.can.update : step.key === "usulan" && data.can.update;
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-medium">
            {index}. {step.label}
          </p>
          <p className="text-sm text-muted-foreground">{step.basis}</p>
        </div>
        <div className="flex items-center gap-2">
          {step.due ? <span className="text-sm text-muted-foreground">Tenggat {fmtDate(step.due)}</span> : null}
          <Pill tone={step.state}>{STEP_STATE_LABEL[step.state]}</Pill>
          {step.doneLate ? <Pill tone="soon">Selesai terlambat</Pill> : null}
        </div>
      </div>
      {step.doneAt ? <p className="text-sm">Selesai pada {fmtDate(step.doneAt)}.</p> : null}
      <StepEditor step={step} data={data} editable={canEditStep} reload={reload} />
    </div>
  );
}

function StepEditor({ step, data, editable, reload }: { step: Step; data: DetailResponse; editable: boolean; reload: () => void }) {
  const d = data.document;
  const [date, setDate] = useState("");
  const [ref, setRef] = useState("");
  const [pick, setPick] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const url = `/api/perencanaan/rkpdes/${d.id}`;

  const save = async (body: Record<string, unknown>) => {
    const r = await submit(url, "PATCH", body);
    if (r) {
      setDate("");
      setRef("");
      setPick("");
      reload();
    }
  };
  const approve = async (revoke: boolean) => {
    const r = await submit(`${url}/persetujuan`, "POST", revoke ? { revoke: true } : { date: localToday() });
    if (r) reload();
  };
  const meetingKind = step.key === "musdes" ? "MUSDES_PERENCANAAN" : d.revision > 0 ? "MUSDES_PERUBAHAN" : "MUSRENBANGDES";
  const errBox = <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{}} />;
  const dateField = (k: string, label: string, current: string | null) => (
    <div className="space-y-1.5">
      <Label htmlFor={`st-${step.key}-${k}`}>{label}</Label>
      <Input id={`st-${step.key}-${k}`} className="h-11" type="date" value={date || current || ""} onChange={(e) => setDate(e.target.value)} disabled={!editable} />
    </div>
  );
  const refField = (k: string, label: string, current: string | null) => (
    <div className="space-y-1.5">
      <Label htmlFor={`st-${step.key}-${k}`}>{label}</Label>
      <Input id={`st-${step.key}-${k}`} className="h-11" maxLength={150} value={ref || current || ""} onChange={(e) => setRef(e.target.value)} disabled={!editable} />
    </div>
  );
  const saveBtn = (onClick: () => void, label = "Simpan") =>
    editable ? (
      <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClick}>
        {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
        {label}
      </Button>
    ) : null;

  switch (step.key) {
    case "musdes":
    case "musrenbang": {
      const linked = step.key === "musdes" ? d.musdesMeeting : d.musrenbangMeeting;
      const field = step.key === "musdes" ? "musdesMeetingId" : "musrenbangMeetingId";
      const options = data.options.meetings.filter((m) => m.kind === meetingKind);
      return (
        <div className="space-y-2">
          {errBox}
          {linked ? (
            <p className="text-sm">
              Terhubung:{" "}
              <Link href={`/musdes/${linked.id}`} className="underline underline-offset-2">
                {linked.title}
              </Link>{" "}
              ({linked.status === "HELD" || linked.status === "FINAL" ? `terlaksana ${fmtDate(linked.heldOn)}` : "belum terlaksana — tandai terlaksana di menu Musyawarah Desa"})
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum terhubung. Jadwalkan dan laksanakan di menu{" "}
              <Link href="/musdes" className="underline underline-offset-2">
                Musyawarah Desa
              </Link>
              , lalu pilih di sini.
            </p>
          )}
          {editable ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-64 flex-1 space-y-1.5">
                <Label htmlFor={`st-${step.key}-pick`}>Hubungkan musyawarah yang sudah terlaksana</Label>
                <SearchSelect id={`st-${step.key}-pick`} className={SELECT_CLASS} value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">{options.length ? "Pilih musyawarah…" : "Belum ada yang terlaksana"}</option>
                  {options.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} — {fmtDate(m.heldOn)}
                    </option>
                  ))}
                </SearchSelect>
              </div>
              {saveBtn(() => save({ [field]: pick ? Number(pick) : null }), "Hubungkan")}
              {linked ? saveBtn(() => save({ [field]: null }), "Lepas tautan") : null}
            </div>
          ) : null}
        </div>
      );
    }
    case "tim":
      return (
        <div className="space-y-2">
          {errBox}
          <div className="grid gap-3 sm:grid-cols-2">
            {dateField("date", "Tanggal keputusan Kepala Desa tentang tim", d.teamFormedAt)}
            {refField("ref", "Nomor keputusan", d.teamDecreeRef)}
          </div>
          {saveBtn(() => save({ teamFormedAt: date || d.teamFormedAt, teamDecreeRef: ref || d.teamDecreeRef }))}
          <p className="text-sm text-muted-foreground">Isi anggota tim di tab Tim penyusun ({d.team.length} orang tercatat).</p>
        </div>
      );
    case "pagu":
      return (
        <div className="space-y-2">
          {errBox}
          <div className="max-w-xs">{dateField("date", "Tanggal informasi pagu diterima dari kabupaten/kota", d.paguReceivedAt)}</div>
          {saveBtn(() => save({ paguReceivedAt: date || d.paguReceivedAt }))}
          <p className="text-sm text-muted-foreground">Rincian pagu dan program yang masuk Desa diisi di tab Pagu dan program masuk.</p>
        </div>
      );
    case "rancangan":
      return (
        <div className="space-y-2">
          {errBox}
          <div className="grid gap-3 sm:grid-cols-2">
            {dateField("date", "Tanggal berita acara tim penyusun", d.draftReadyAt)}
            {refField("ref", "Nomor berita acara tim penyusun", d.draftMinutesRef)}
          </div>
          {saveBtn(() => save({ draftReadyAt: date || d.draftReadyAt, draftMinutesRef: ref || d.draftMinutesRef }))}
          <p className="text-sm text-muted-foreground">{d.activitySummary.count} kegiatan tercatat, {d.activitySummary.complete} di antaranya lengkap.</p>
        </div>
      );
    case "disetujui":
      return (
        <div className="space-y-2">
          {errBox}
          {d.draftApprovedAt ? <p className="text-sm">Disetujui Kepala Desa pada {fmtDate(d.draftApprovedAt)}.</p> : <p className="text-sm text-muted-foreground">Menunggu persetujuan Kepala Desa{d.draftReadyAt ? "" : " (rancangan belum ditandai selesai)"}.</p>}
          {!d.locked && data.can.approve ? (
            d.draftApprovedAt ? (
              saveBtn(() => approve(true), "Cabut persetujuan")
            ) : (
              <Button type="button" className="min-h-11" disabled={busy || !d.draftReadyAt} onClick={() => approve(false)}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                Setujui rancangan
              </Button>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Persetujuan hanya dapat diberikan oleh Kepala Desa atau admin.</p>
          )}
        </div>
      );
    case "perdes":
      return (
        <div className="space-y-2">
          {errBox}
          {d.legalDocument ? (
            <p className="text-sm">
              Peraturan Desa {d.legalDocument.number}/{d.legalDocument.year} — {d.legalDocument.title} (ditetapkan {fmtDate(d.legalDocument.enactedAt)}).
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Catat Perdes RKP Desa di menu{" "}
              <Link href="/produk-hukum" className="underline underline-offset-2">
                Produk Hukum
              </Link>{" "}
              lebih dulu, lalu hubungkan di sini. Setelah terhubung, isi dokumen RKP Desa terkunci.
            </p>
          )}
          {!d.locked && editable ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-64 flex-1 space-y-1.5">
                <Label htmlFor="st-perdes-pick">Pilih Peraturan Desa</Label>
                <SearchSelect id="st-perdes-pick" className={SELECT_CLASS} value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">{data.options.perdes.length ? "Pilih Perdes…" : "Belum ada Perdes tercatat"}</option>
                  {data.options.perdes.map((p) => (
                    <option key={p.id} value={p.id}>
                      Perdes {p.number}/{p.year} — {p.title}
                    </option>
                  ))}
                </SearchSelect>
              </div>
              {saveBtn(() => save({ legalDocumentId: pick ? Number(pick) : null }), "Hubungkan dan kunci")}
            </div>
          ) : null}
        </div>
      );
    case "usulan":
      return (
        <div className="space-y-2">
          {errBox}
          <div className="grid gap-3 sm:grid-cols-2">
            {dateField("date", "Tanggal disampaikan ke bupati/wali kota melalui camat", d.usulanSubmittedAt)}
            {refField("ref", "Nomor surat pengantar", d.usulanRef)}
          </div>
          {saveBtn(() => save({ usulanSubmittedAt: date || d.usulanSubmittedAt, usulanRef: ref || d.usulanRef }))}
          <p className="text-sm text-muted-foreground">{d.activitySummary.proposed} kegiatan ditandai sebagai usulan. Cetak daftarnya di bagian Cetak.</p>
        </div>
      );
  }
}

// --- Evaluasi dan usulan ---------------------------------------------------------

function EvaluationTab({ data, reload }: { data: DetailResponse; reload: () => void }) {
  const d = data.document;
  const [text, setText] = useState(d.evaluationText ?? "");
  const [saved, setSaved] = useState(false);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const editable = !d.locked && data.can.update;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/perencanaan/rkpdes/${d.id}`, "PATCH", { evaluationText: text });
    if (r) {
      setSaved(true);
      reload();
    }
  }
  const proposed = d.activities.filter((a) => a.proposeToRegency);
  return (
    <>
      <form onSubmit={save} className="space-y-3" noValidate>
        <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ evaluationText: "Evaluasi" }} />
        <div className="space-y-1.5">
          <Label htmlFor="ev-text">Evaluasi pelaksanaan RKP Desa tahun sebelumnya</Label>
          <Textarea id="ev-text" rows={10} maxLength={20000} value={text} disabled={!editable} onChange={(e) => { setText(e.target.value); setSaved(false); }} />
          <p className="text-sm text-muted-foreground">Bagian wajib rancangan RKP Desa (Pasal 41 ayat 1 huruf a): kegiatan yang selesai, tertunda, dan pelajarannya.</p>
        </div>
        {editable ? (
          <div className="flex items-center gap-3">
            <Button type="submit" variant="outline" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan evaluasi
            </Button>
            {saved ? <span role="status" className="text-sm text-muted-foreground">Tersimpan.</span> : null}
          </div>
        ) : null}
      </form>
      <section aria-labelledby="usul-h" className="space-y-2">
        <h2 id="usul-h" className="text-lg font-semibold">
          Daftar usulan ke kabupaten/kota ({proposed.length})
        </h2>
        {proposed.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada kegiatan yang ditandai sebagai usulan. Tandai di formulir kegiatan pada kolom “Ajukan sebagai usulan ke bupati/wali kota”.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {proposed.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground">
                  {a.location ?? "lokasi belum diisi"} · {a.outputVolume ? `${a.outputVolume} ${a.outputUnit ?? ""}` : "volume belum diisi"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
