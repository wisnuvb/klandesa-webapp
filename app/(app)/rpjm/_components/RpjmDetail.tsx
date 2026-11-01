"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, LockOpen, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { ConfirmAction } from "./ConfirmAction";
import { Pill, SELECT_CLASS, STEP_STATE_LABEL, WarningList, fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { AlignmentTab, ContentTab } from "./ContentTab";
import { ProgramsTab } from "./ProgramsTab";
import { TeamTab } from "./TeamTab";
import type { DetailResponse, Step } from "./types";

type Tab = "tahapan" | "isi" | "program" | "tim" | "keselarasan";

export function RpjmDetail({ id }: { id: number }) {
  const { data, loading, error, reload } = useApiGet<DetailResponse>(Number.isInteger(id) && id > 0 ? `/api/perencanaan/rpjm/${id}` : null);
  const [tab, setTab] = useState<Tab>("tahapan");
  const [reopening, setReopening] = useState(false);

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Memuat RPJM Desa…
      </p>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error ?? "RPJM Desa tidak ditemukan."}
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/rpjm">Kembali ke daftar</Link>
        </Button>
      </div>
    );
  }

  const { plan: p, can } = data;
  const editable = !p.locked && can.update;
  const needCount = p.flags.filter((f) => f.level === "perlu").length;

  return (
    <div className="space-y-6 pb-24">
      <Button asChild variant="ghost" className="min-h-11">
        <Link href="/rpjm">
          <ArrowLeft aria-hidden="true" />
          Tahapan RPJM Desa
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="break-words text-2xl font-semibold">{p.title}</h1>
            <p className="text-muted-foreground">
              Periode {p.periodStart}–{p.periodEnd} ({p.termYears} tahun)
              {p.reopenCount > 0 ? ` · dibuka untuk perubahan ${p.reopenCount} kali` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {p.locked ? (
              <Pill tone="done">
                <Lock aria-hidden="true" className="mr-1 size-3" />
                Ditetapkan dengan Perdes
              </Pill>
            ) : null}
            {needCount > 0 ? <Pill tone="soon">Perlu penyesuaian ({needCount})</Pill> : null}
            <Pill tone="info">
              {p.progress.done}/{p.progress.total} tahap
            </Pill>
          </div>
        </div>
        {p.untouched ? <p className="rounded-md border border-sky-600/40 bg-sky-50 p-3 text-sm text-sky-950">Dokumen RPJM Desa ini dibuat sebelum ada tahapan. Isinya tidak diubah; isi tahapan di bawah bila ingin mencatat proses penyusunannya dan mengunci setelah Perdes.</p> : null}
        {p.flags
          .filter((f) => f.code === "TERM_LEGACY" || f.code === "TERM_OTHER")
          .map((f) => (
            <WarningList key={f.code} title="Jangka waktu RPJM Desa" items={[f.message]} />
          ))}
        {p.locked ? <p className="text-sm text-muted-foreground">Isi dokumen terkunci karena Peraturan Desa sudah ditetapkan. Perubahan hanya karena peristiwa khusus atau perubahan kebijakan, dibahas dalam musyawarah, dan ditetapkan dengan Peraturan Desa (Permendagri 114/2014 Pasal 28; PP 16/2026 Pasal 148).</p> : null}
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="tahapan" className="min-h-11">Tahapan</TabsTrigger>
          <TabsTrigger value="isi" className="min-h-11">Isi rancangan</TabsTrigger>
          <TabsTrigger value="program" className="min-h-11">Program ({p.summary.count})</TabsTrigger>
          <TabsTrigger value="tim" className="min-h-11">Tim penyusun ({p.team.length})</TabsTrigger>
          <TabsTrigger value="keselarasan" className="min-h-11">Keselarasan{needCount > 0 ? ` (${needCount})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="tahapan" className="space-y-3 pt-4">
          {p.steps.map((s, i) => (
            <StepCard key={s.key} step={s} index={i + 1} data={data} reload={reload} onTab={setTab} />
          ))}
          {p.locked && can.approve ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">Perubahan RPJM Desa</p>
              <p className="mt-1 text-sm text-muted-foreground">Membuka kunci membatalkan penanda rancangan selesai, persetujuan, dan tautan musyawarah pembahasan serta Perdes; semuanya perlu dilakukan lagi untuk perubahan. Alasan dicatat.</p>
              <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => setReopening(true)}>
                <LockOpen aria-hidden="true" />
                Buka kunci untuk perubahan
              </Button>
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="isi" className="pt-4">
          <ContentTab key={`${p.id}-${p.locked}`} data={data} reload={reload} />
        </TabsContent>
        <TabsContent value="program" className="space-y-4 pt-4">
          <ProgramsTab data={data} editable={editable} canDelete={!p.locked && can.delete} reload={reload} />
        </TabsContent>
        <TabsContent value="tim" className="space-y-4 pt-4">
          <TeamTab data={data} editable={editable} reload={reload} />
        </TabsContent>
        <TabsContent value="keselarasan" className="pt-4">
          <AlignmentTab data={data} />
        </TabsContent>
      </Tabs>

      <section aria-labelledby="cetak-h" className="space-y-2 border-t pt-4">
        <h2 id="cetak-h" className="text-lg font-semibold">
          Cetak
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            ["rancangan", "Dokumen RPJM Desa"],
            ["matriks", "Matriks program dan anggaran"],
            ["tim", "Lampiran tim penyusun"],
          ].map(([k, label]) => (
            <Button key={k} asChild variant="outline" className="min-h-11">
              <Link href={`/rpjm/cetak?id=${p.id}&kind=${k}`}>
                <Printer aria-hidden="true" />
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      {reopening ? <ReopenDialog data={data} onClose={() => setReopening(false)} onDone={() => { setReopening(false); reload(); }} /> : null}
    </div>
  );
}

// --- Tahapan --------------------------------------------------------------------

function StepCard({ step, index, data, reload, onTab }: { step: Step; index: number; data: DetailResponse; reload: () => void; onTab: (t: Tab) => void }) {
  const p = data.plan;
  const canEditStep = !p.locked && data.can.update;
  return (
    <div className="min-w-0 space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="break-words font-medium">
            {index}. {step.label}
          </p>
          <p className="break-words text-sm text-muted-foreground">{step.basis}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {step.due ? <span className="text-sm text-muted-foreground">Tenggat {fmtDate(step.due)}</span> : null}
          <Pill tone={step.state}>{STEP_STATE_LABEL[step.state]}</Pill>
          {step.doneLate ? <Pill tone="soon">Selesai terlambat</Pill> : null}
        </div>
      </div>
      {step.doneAt ? <p className="text-sm">Selesai pada {fmtDate(step.doneAt)}.</p> : null}
      <StepEditor step={step} data={data} editable={canEditStep} reload={reload} onTab={onTab} />
    </div>
  );
}

function StepEditor({ step, data, editable, reload, onTab }: { step: Step; data: DetailResponse; editable: boolean; reload: () => void; onTab: (t: Tab) => void }) {
  const p = data.plan;
  const [date, setDate] = useState("");
  const [ref, setRef] = useState("");
  const [pick, setPick] = useState("");
  const [existing, setExisting] = useState(p.enactedBeforeApp);
  const [existingReason, setExistingReason] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const url = `/api/perencanaan/rpjm/${p.id}`;

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
  const saveBtn = (onClick: () => void, label = "Simpan", disabled = false, describedBy?: string, confirm?: { title: string; description: string }) =>
    editable && confirm ? (
      <ConfirmAction label={label} title={confirm.title} description={confirm.description} disabled={disabled} busy={busy} describedBy={describedBy} onConfirm={onClick} />
    ) : editable ? (
      <Button type="button" variant="outline" className="min-h-11" disabled={busy || disabled} aria-describedby={describedBy} onClick={onClick}>
        {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
        {label}
      </Button>
    ) : null;
  const tabLink = (t: Tab, label: string) => (
    <button type="button" className="inline-flex min-h-11 items-center underline underline-offset-2" onClick={() => onTab(t)}>
      {label}
    </button>
  );

  switch (step.key) {
    case "musdes":
    case "pembahasan": {
      const linked = step.key === "musdes" ? p.musdesMeeting : p.draftMeeting;
      const field = step.key === "musdes" ? "musdesMeetingId" : "draftMeetingId";
      const kinds = step.key === "musdes" ? ["MUSDES_PERENCANAAN"] : p.reopenCount > 0 ? ["MUSRENBANGDES", "MUSDES_PERENCANAAN", "MUSDES_PERUBAHAN"] : ["MUSRENBANGDES", "MUSDES_PERENCANAAN"];
      const options = data.options.meetings.filter((m) => kinds.includes(m.kind));
      return (
        <div className="space-y-2">
          {errBox}
          {linked ? (
            <p className="break-words text-sm">
              Terhubung:{" "}
              <Link href={`/musdes/${linked.id}`} className="inline-flex min-h-11 items-center underline underline-offset-2">
                {linked.title}
              </Link>{" "}
              ({linked.status === "HELD" || linked.status === "FINAL" ? `terlaksana ${fmtDate(linked.heldOn)}` : "belum terlaksana — tandai terlaksana di menu Musyawarah Desa"})
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum terhubung. Jadwalkan dan laksanakan di menu{" "}
              <Link href="/musdes" className="inline-flex min-h-11 items-center underline underline-offset-2">
                Musyawarah Desa
              </Link>
              , lalu pilih di sini.
              {step.key === "pembahasan" ? " Boleh Musrenbangdes atau Musyawarah Desa; sumber aturan berbeda dalam hal ini, dan aplikasi menerima keduanya." : ""}
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
              {saveBtn(() => save({ [field]: pick ? Number(pick) : null }), "Hubungkan", !pick)}
              {linked ? saveBtn(() => save({ [field]: null }), "Lepas tautan", false, undefined, { title: "Lepas tautan musyawarah?", description: step.key === "pembahasan" ? "Rancangan tidak lagi tercatat sudah dibahas dalam musyawarah; Peraturan Desa tidak bisa dihubungkan sampai musyawarah ditautkan lagi." : "Langkah Musdes kembali belum selesai. Data musyawarah di menu Musyawarah Desa tidak berubah." }) : null}
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
            {dateField("date", "Tanggal keputusan Kepala Desa tentang tim", p.teamFormedAt)}
            {refField("ref", "Nomor keputusan", p.teamDecreeRef)}
          </div>
          {saveBtn(() => save({ teamFormedAt: date || p.teamFormedAt, teamDecreeRef: ref || p.teamDecreeRef }))}
          <p className="text-sm text-muted-foreground">Isi anggota tim di tab {tabLink("tim", "Tim penyusun")} ({p.team.length} orang tercatat).</p>
        </div>
      );
    case "pengkajian":
      return (
        <div className="space-y-2">
          {errBox}
          <div className="grid gap-3 sm:grid-cols-2">
            {dateField("date", "Tanggal berita acara hasil pengkajian", p.reviewDoneAt)}
            {refField("ref", "Nomor berita acara", p.reviewMinutesRef)}
          </div>
          {saveBtn(() => save({ reviewDoneAt: date || p.reviewDoneAt, reviewMinutesRef: ref || p.reviewMinutesRef }))}
          <p className="text-sm text-muted-foreground">Ringkasan hasil pengkajian ditulis di tab {tabLink("isi", "Isi rancangan")}.</p>
        </div>
      );
    case "rancangan": {
      const blockers = p.gates.draftReady;
      return (
        <div className="space-y-2">
          {errBox}
          <div className="grid gap-3 sm:grid-cols-2">
            {dateField("date", "Tanggal berita acara tim penyusun", p.draftReadyAt)}
            {refField("ref", "Nomor berita acara tim penyusun", p.draftMinutesRef)}
          </div>
          {blockers.length && !p.draftReadyAt ? (
            <div id="gate-draft" className="rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-medium">Belum bisa ditandai selesai:</p>
              <ul className="mt-1 list-disc pl-6">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-1">
                Lengkapi di tab {tabLink("isi", "Isi rancangan")} dan {tabLink("program", "Program")}.
              </p>
            </div>
          ) : null}
          {saveBtn(() => save({ draftReadyAt: date || p.draftReadyAt || localToday(), draftMinutesRef: ref || p.draftMinutesRef }), p.draftReadyAt ? "Simpan" : "Tandai rancangan selesai", !p.draftReadyAt && blockers.length > 0, "gate-draft")}
          {p.draftReadyAt && !p.draftApprovedAt ? saveBtn(() => save({ draftReadyAt: null }), "Batalkan penanda selesai", false, undefined, { title: "Batalkan penanda rancangan selesai?", description: "Rancangan kembali berstatus belum selesai dan perlu ditandai lagi oleh tim penyusun sebelum disetujui." }) : null}
          <p className="text-sm text-muted-foreground">
            {p.summary.count} program tercatat, {p.summary.complete} di antaranya lengkap.
          </p>
        </div>
      );
    }
    case "disetujui":
      return (
        <div className="space-y-2">
          {errBox}
          {p.draftApprovedAt ? <p className="text-sm">Disetujui Kepala Desa pada {fmtDate(p.draftApprovedAt)}.</p> : <p className="text-sm text-muted-foreground">Menunggu persetujuan Kepala Desa{p.draftReadyAt ? "" : " (rancangan belum ditandai selesai)"}.</p>}
          {!p.locked && data.can.approve ? (
            p.draftApprovedAt ? (
              saveBtn(() => approve(true), "Cabut persetujuan", false, undefined, { title: "Cabut persetujuan Kepala Desa?", description: "Rancangan perlu disetujui ulang sebelum Peraturan Desa dapat dihubungkan." })
            ) : (
              <Button type="button" className="min-h-11" disabled={busy || !p.draftReadyAt} onClick={() => approve(false)}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                Setujui rancangan
              </Button>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Persetujuan hanya dapat diberikan oleh Kepala Desa atau admin.</p>
          )}
        </div>
      );
    case "perdes": {
      const blockers = p.gates.perdes;
      const gateOpen = (existing && data.can.approve) || blockers.length === 0;
      return (
        <div className="space-y-2">
          {errBox}
          {p.legalDocument ? (
            <p className="break-words text-sm">
              Peraturan Desa {p.legalDocument.number}/{p.legalDocument.year} — {p.legalDocument.title} (ditetapkan {fmtDate(p.legalDocument.enactedAt)}).
              {p.enactedBeforeApp ? " Dicatat sebagai Perdes yang sudah ada sebelum memakai aplikasi (tanpa gerbang tahapan)." : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Catat Perdes RPJM Desa di menu{" "}
              <Link href="/produk-hukum" className="inline-flex min-h-11 items-center underline underline-offset-2">
                Produk Hukum
              </Link>{" "}
              lebih dulu, lalu hubungkan di sini. Setelah terhubung, isi dokumen terkunci.
            </p>
          )}
          {!p.locked && editable ? (
            <>
              {!(existing && data.can.approve) && blockers.length ? (
                <div id="gate-perdes" className="rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="font-medium">Belum bisa dihubungkan:</p>
                  <ul className="mt-1 list-disc pl-6">
                    {blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {data.can.approve ? (
                <>
                  <label className="flex min-h-11 items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1 size-5 shrink-0" checked={existing} onChange={(e) => setExisting(e.target.checked)} />
                    <span>Perdes ini sudah ditetapkan sebelum desa memakai aplikasi (lewati gerbang tahapan; alasan dicatat dan isi tetap dikunci). Hanya Kepala Desa atau admin.</span>
                  </label>
                  {existing ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="st-perdes-reason">Alasan melewati gerbang *</Label>
                      <Input id="st-perdes-reason" className="h-11" maxLength={300} value={existingReason} onChange={(e) => setExistingReason(e.target.value)} placeholder="Contoh: Perdes RPJM Desa ditetapkan 2019, sebelum aplikasi dipakai" />
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-64 flex-1 space-y-1.5">
                  <Label htmlFor="st-perdes-pick">Pilih Peraturan Desa</Label>
                  <SearchSelect id="st-perdes-pick" className={SELECT_CLASS} value={pick} onChange={(e) => setPick(e.target.value)}>
                    <option value="">{data.options.perdes.length ? "Pilih Perdes…" : "Belum ada Perdes tercatat"}</option>
                    {data.options.perdes.map((x) => (
                      <option key={x.id} value={x.id}>
                        Perdes {x.number}/{x.year} — {x.title}
                      </option>
                    ))}
                  </SearchSelect>
                </div>
                {saveBtn(() => save(existing ? { enactedBeforeApp: true, enactedReason: existingReason, legalDocumentId: Number(pick) } : { legalDocumentId: Number(pick) }), "Hubungkan dan kunci", !pick || !gateOpen || (existing && existingReason.trim().length < 10), !gateOpen ? "gate-perdes" : undefined, { title: "Hubungkan Perdes dan kunci RPJM Desa?", description: "Setelah terhubung, seluruh isi RPJM Desa (visi, misi, program, tim, tautan) dikunci. Perubahan berikutnya hanya lewat Buka kunci beralasan oleh Kepala Desa atau admin." })}
              </div>
            </>
          ) : null}
        </div>
      );
    }
  }
}

// --- Buka kunci -------------------------------------------------------------------

function ReopenDialog({ data, onClose, onDone }: { data: DetailResponse; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/perencanaan/rpjm/${data.plan.id}/buka-kunci`, "POST", { reason, note });
    if (r) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buka kunci untuk perubahan</DialogTitle>
          <DialogDescription>RPJM Desa hanya diubah karena peristiwa khusus atau perubahan mendasar kebijakan (Permendagri 114/2014 Pasal 28; PP 16/2026 Pasal 148). Perubahan dibahas dalam musyawarah lalu ditetapkan dengan Peraturan Desa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ reason: "Alasan", note: "Penjelasan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="ro-reason">Alasan perubahan *</Label>
            <SearchSelect id="ro-reason" className={SELECT_CLASS} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Pilih alasan…</option>
              {Object.entries(data.terms.changeReasons).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </SearchSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ro-note">Penjelasan singkat *</Label>
            <Textarea id="ro-note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Buka kunci
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
