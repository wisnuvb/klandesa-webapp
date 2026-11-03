"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Plus, ScanText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDialogsSafe } from "@/components/providers/AppDialogProvider";
import {
  emptyHeader, emptyMember, FAMILY_LIMITS, hasBlockingIssues, normalizeGenderOf, validateFamily,
  type FamilyHeader, type FamilyIssues, type FamilyMemberInput,
} from "@/lib/kependudukan/family";
import type { ExistingHousehold } from "@/lib/kependudukan/family-service";
import { KK_HEAD_ROLE } from "@/lib/kependudukan/household";
import { draftToFamily } from "@/lib/kependudukan/kk-ocr/apply";
import type { KkDraft } from "@/lib/kependudukan/kk-ocr/parse";
import { KkOcrDialog } from "./KkOcrDialog";
import { MemberCard, memberFieldId } from "./MemberCard";
import { StepKeluarga } from "./StepKeluarga";
import { StepPeriksa, type DerivedParents } from "./StepPeriksa";

type Step = 1 | 2 | 3 | 4;
const STEP_LABELS = ["Keluarga", "Anggota", "Periksa dan simpan"] as const;
const NO_ISSUES = (n: number): FamilyIssues => ({ header: {}, members: Array.from({ length: n }, () => ({})), general: [], warnings: [] });

interface CheckResponse {
  ok: boolean;
  issues: FamilyIssues;
  existing: ExistingHousehold | null;
  members: DerivedParents[];
}

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<{ status: number; json: T | null }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  return { status: res.status, json: (await res.json().catch(() => null)) as T | null };
}

interface SummaryItem {
  target: string;
  label: string;
  message: string;
}

function focusField(id: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ block: "center" });
    el.focus();
  }
}

function summaryOf(issues: FamilyIssues, members: FamilyMemberInput[], scope: "header" | "members"): SummaryItem[] {
  const out: SummaryItem[] = [];
  if (scope === "header") {
    for (const [k, message] of Object.entries(issues.header)) out.push({ target: k, label: "Keluarga", message });
  } else {
    issues.general.forEach((message) => out.push({ target: memberFieldId(0, "familyRole"), label: "Keluarga", message }));
    issues.members.forEach((m, i) => {
      for (const [k, message] of Object.entries(m)) out.push({ target: memberFieldId(i, k), label: members[i]?.name.trim() || `Anggota ${i + 1}`, message });
    });
  }
  return out;
}

export function TambahKeluargaView() {
  const { appConfirm } = useAppDialogsSafe();
  const [step, setStep] = useState<Step>(1);
  const [header, setHeader] = useState<FamilyHeader>(emptyHeader);
  const [members, setMembers] = useState<FamilyMemberInput[]>(() => [emptyMember({ familyRole: KK_HEAD_ROLE })]);
  const [issues, setIssues] = useState<FamilyIssues>(NO_ISSUES(1));
  const [existing, setExisting] = useState<ExistingHousehold | null>(null);
  const [parents, setParents] = useState<DerivedParents[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  /** Catatan "periksa" hasil baca foto KK, sejajar dengan `members`. */
  const [ocrNotes, setOcrNotes] = useState<string[][]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ created: Array<{ id: number; name: string }>; mutations: number } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const dirty = step < 4 && (header.kk !== "" || header.address !== "" || members.some((m) => m.name !== "" || m.nik !== ""));

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Pindah langkah: fokus ke judul langkah (pembaca layar mengumumkan langkah baru).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // KK sah 16 digit: cek apakah sudah terdaftar (tanpa menunggu tombol Lanjut), dan isi alamat dari KK itu bila masih kosong.
  const kkDigits = header.kk.replace(/\D/g, "");
  useEffect(() => {
    if (kkDigits.length !== 16) {
      setExisting(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await postJson<CheckResponse>("/api/residents/keluarga/periksa", { header: { ...emptyHeader(), kk: kkDigits }, members: [] }, ctrl.signal);
        const ex = r.json?.existing ?? null;
        setExisting(ex);
        if (ex) setHeader((h) => (h.address.trim() ? h : { ...h, address: ex.address ?? "", rt: h.rt || ex.rt || "", rw: h.rw || ex.rw || "", hamlet: h.hamlet || ex.hamlet || "" }));
      } catch {
        /* pemeriksaan KK hanya bantuan; galat jaringan tidak menghalangi pengisian */
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [kkDigits]);

  const showIssues = useCallback((next: FamilyIssues) => {
    setIssues(next);
    queueMicrotask(() => summaryRef.current?.focus());
  }, []);

  function updateHeader(patch: Partial<FamilyHeader>) {
    setHeader((h) => ({ ...h, ...patch }));
    setProblem(null);
    if (patch.arrival && patch.arrival.enabled !== header.arrival.enabled) {
      const on = patch.arrival.enabled;
      setMembers((ms) => ms.map((m) => (on && m.event === "NONE" ? { ...m, event: "MOVE_IN" } : !on && m.event === "MOVE_IN" ? { ...m, event: "NONE" } : m)));
    }
  }

  function updateMember(i: number, patch: Partial<FamilyMemberInput>) {
    setMembers((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
    setProblem(null);
    setAcknowledged(false);
  }

  function addMember() {
    setMembers((ms) => {
      if (ms.length >= FAMILY_LIMITS.maxMembers) return ms;
      const head = ms.find((m) => m.familyRole === KK_HEAD_ROLE);
      const hasSpouse = ms.some((m) => m.familyRole === "Istri" || m.familyRole === "Suami");
      const headGender = head ? normalizeGenderOf(head.gender) : null;
      const role = !existing && head && !hasSpouse && headGender ? (headGender === "Laki-laki" ? "Istri" : "Suami") : ms.length === 0 && !existing ? KK_HEAD_ROLE : "Anak";
      const first = ms[0];
      return [...ms, emptyMember({
        familyRole: role,
        religion: first?.religion ?? "",
        nationality: first?.nationality || "WNI",
        ethnicity: first?.ethnicity ?? "",
        event: header.arrival.enabled ? "MOVE_IN" : "NONE",
      })];
    });
    setIssues((i) => ({ ...i, members: [...i.members, {}] }));
  }

  async function removeMember(i: number) {
    const m = members[i];
    if (m.name.trim() || m.nik.trim()) {
      const ok = await appConfirm({ title: "Hapus anggota ini?", description: `${m.name.trim() || `Anggota ${i + 1}`} dihapus dari daftar yang sedang diisi. Belum ada data yang tersimpan.`, confirmLabel: "Hapus", tone: "destructive" });
      if (!ok) return;
    }
    setMembers((ms) => ms.filter((_, idx) => idx !== i));
    setOcrNotes((n) => n.filter((_, idx) => idx !== i));
    setIssues(NO_ISSUES(members.length - 1));
  }

  async function periksa(): Promise<CheckResponse | null> {
    const r = await postJson<CheckResponse & { error?: string }>("/api/residents/keluarga/periksa", { header, members });
    if (!r.json || r.status >= 400 || !r.json.issues) {
      setProblem(r.json && "error" in r.json && typeof r.json.error === "string" ? r.json.error : "Tidak bisa memeriksa data. Periksa koneksi lalu coba lagi.");
      return null;
    }
    return r.json;
  }

  async function next() {
    setProblem(null);
    if (step === 1) {
      const local = validateFamily({ header, members: [] });
      const hdr = { ...NO_ISSUES(members.length), header: local.header };
      if (Object.keys(hdr.header).length) return showIssues(hdr);
      setIssues(NO_ISSUES(members.length));
      return setStep(2);
    }
    if (step === 2) {
      const local = validateFamily({ header, members }, { existing: existing ? { hasHead: Boolean(existing.headName) } : null });
      if (hasBlockingIssues(local)) return showIssues(local);
      setBusy(true);
      try {
        const r = await periksa();
        if (!r) return;
        setExisting(r.existing);
        setParents(r.members);
        if (!r.ok) {
          showIssues(r.issues);
          return;
        }
        setIssues(r.issues);
        setAcknowledged(false);
        setStep(3);
      } finally {
        setBusy(false);
      }
    }
  }

  function back() {
    setProblem(null);
    setIssues(NO_ISSUES(members.length));
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  async function save() {
    setProblem(null);
    setBusy(true);
    try {
      const r = await postJson<{ success?: boolean; created?: Array<{ id: number; name: string }>; mutations?: number; error?: string; issues?: FamilyIssues }>("/api/residents/keluarga", { header, members });
      if (r.status === 201 && r.json?.created) {
        setSaved({ created: r.json.created, mutations: r.json.mutations ?? 0 });
        setStep(4);
        return;
      }
      if (r.json?.issues) {
        setIssues(r.json.issues);
        setStep(Object.keys(r.json.issues.header).length ? 1 : 2);
        setProblem(r.json.error ?? "Data keluarga bermasalah.");
        queueMicrotask(() => summaryRef.current?.focus());
        return;
      }
      setProblem(r.json?.error ?? "Gagal menyimpan keluarga. Coba lagi.");
    } catch {
      setProblem("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function applyOcr(draft: KkDraft) {
    const hasData = members.some((m) => m.name.trim() || m.nik.trim());
    if (hasData) {
      const ok = await appConfirm({ title: "Ganti anggota yang sudah diisi?", description: "Daftar anggota yang sedang diisi akan diganti dengan hasil bacaan foto KK.", confirmLabel: "Ganti", tone: "destructive" });
      if (!ok) return;
    }
    const applied = draftToFamily(draft, { arrival: header.arrival.enabled });
    const take = (cur: string, next: string) => next || cur;
    setHeader((h) => ({ ...h, kk: take(h.kk, applied.header.kk), address: take(h.address, applied.header.address), rt: take(h.rt, applied.header.rt), rw: take(h.rw, applied.header.rw), hamlet: take(h.hamlet, applied.header.hamlet) }));
    if (applied.members.length) {
      setMembers(applied.members.slice(0, FAMILY_LIMITS.maxMembers));
      setOcrNotes(applied.notes.slice(0, FAMILY_LIMITS.maxMembers));
      setIssues(NO_ISSUES(Math.min(applied.members.length, FAMILY_LIMITS.maxMembers)));
    }
    setAcknowledged(false);
    setProblem(null);
    setStep(1);
    toast.success(`Hasil bacaan diterapkan (${applied.members.length} anggota). Periksa setiap isian sebelum menyimpan.`);
  }

  function reset() {
    setOcrNotes([]);
    setHeader(emptyHeader());
    setMembers([emptyMember({ familyRole: KK_HEAD_ROLE })]);
    setIssues(NO_ISSUES(1));
    setExisting(null);
    setParents([]);
    setSaved(null);
    setAcknowledged(false);
    setStep(1);
  }

  const summary = useMemo(() => (step === 1 ? summaryOf(issues, members, "header") : step === 2 ? summaryOf(issues, members, "members") : []), [issues, members, step]);
  const hasWarnings = issues.warnings.length > 0;
  const canSave = step === 3 && !busy && !hasBlockingIssues(issues) && (!hasWarnings || acknowledged);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <Link href="/data-warga" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Data Warga
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Users aria-hidden="true" className="size-6" />
          Tambah Keluarga
        </h1>
        <p className="max-w-prose text-muted-foreground">Masukkan satu Kartu Keluarga beserta seluruh anggotanya sekaligus. Semuanya tersimpan bersama, atau tidak ada yang tersimpan bila ada yang bermasalah.</p>
      </header>

      {step < 4 ? (
        <nav aria-label="Langkah pengisian">
          <ol className="flex flex-wrap gap-2">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as Step;
              const current = step === n;
              const done = step > n;
              return (
                <li key={label} aria-current={current ? "step" : undefined} className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm ${current ? "border-primary bg-primary text-primary-foreground" : done ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50" : "text-muted-foreground"}`}>
                  <span className="font-semibold tabular-nums">{done ? <CheckCircle2 aria-hidden="true" className="size-4" /> : n}</span>
                  <span>{label}</span>
                  {current ? <span className="sr-only"> (langkah {n} dari {STEP_LABELS.length})</span> : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      {step === 4 && saved ? (
        <section aria-labelledby="done-h" className="space-y-4 rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50">
          <h2 id="done-h" ref={headingRef} tabIndex={-1} className="flex items-center gap-2 text-xl font-semibold outline-none">
            <CheckCircle2 aria-hidden="true" className="size-6" />
            Keluarga tersimpan
          </h2>
          <p>
            {saved.created.length} anggota ditambahkan: {saved.created.map((c) => c.name).join(", ")}.
            {saved.mutations > 0 ? ` ${saved.mutations} catatan Lahir/Datang masuk ke Buku Mutasi.` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-11">
              <Link href="/data-warga">Lihat Data Warga</Link>
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={reset}>
              <Plus aria-hidden="true" />
              Tambah keluarga lain
            </Button>
          </div>
        </section>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 3) void save();
            else void next();
          }}
          className="space-y-6"
        >
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            Langkah {step} dari {STEP_LABELS.length}: {STEP_LABELS[step - 1]}
          </h2>

          {summary.length || problem ? (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
              <p className="font-medium">{problem ?? "Belum bisa dilanjutkan:"}</p>
              {summary.length ? (
                <ul className="list-disc pl-5">
                  {summary.map((s, i) => (
                    <li key={i}>
                      <a
                        href={`#${s.target}`}
                        className="underline"
                        onClick={(e) => {
                          e.preventDefault();
                          focusField(s.target);
                        }}
                      >
                        {s.label}: {s.message}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <section aria-label="Isi cepat dari foto KK" className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <ScanText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm">
                  <span className="font-semibold">Isi cepat dari foto KK</span> <span className="rounded bg-muted px-1.5 py-0.5 text-xs">percobaan</span>
                  <br />
                  <span className="text-muted-foreground">Foto dibaca di perangkat ini, tidak dikirim ke mana pun. Hasilnya draf yang tetap Anda periksa.</span>
                </p>
              </div>
              <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => setOcrOpen(true)}>
                <ScanText aria-hidden="true" />
                Baca dari foto
              </Button>
            </section>
          ) : null}

          {step === 1 ? <StepKeluarga header={header} errors={issues.header} existing={existing} onChange={updateHeader} /> : null}

          {step === 2 ? (
            <div className="space-y-4">
              {members.map((m, i) => (
                <MemberCard
                  key={i}
                  index={i}
                  member={m}
                  errors={issues.members[i] ?? {}}
                  canRemove={members.length > 1}
                  arrivalEnabled={header.arrival.enabled}
                  ocrNotes={ocrNotes[i]}
                  onChange={(patch) => updateMember(i, patch)}
                  onRemove={() => void removeMember(i)}
                />
              ))}
              <Button type="button" variant="outline" className="min-h-11" onClick={addMember} disabled={members.length >= FAMILY_LIMITS.maxMembers}>
                <Plus aria-hidden="true" />
                Tambah anggota
              </Button>
            </div>
          ) : null}

          {step === 3 ? (
            <StepPeriksa
              input={{ header, members }}
              issues={issues}
              existing={existing}
              parents={parents}
              acknowledged={acknowledged}
              onAcknowledge={setAcknowledged}
              onFix={(index) => {
                setStep(index === null && Object.keys(issues.header).length ? 1 : 2);
                if (index !== null) queueMicrotask(() => focusField(memberFieldId(index, "name")));
              }}
            />
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" className="min-h-11" onClick={back} disabled={busy || step === 1}>
              Kembali
            </Button>
            {step < 3 ? (
              <Button type="submit" className="min-h-11" disabled={busy}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {busy ? "Memeriksa…" : "Lanjut"}
              </Button>
            ) : (
              <Button type="submit" className="min-h-11" disabled={!canSave}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {busy ? "Menyimpan…" : `Simpan keluarga (${members.length} orang)`}
              </Button>
            )}
          </div>
        </form>
      )}

      {ocrOpen ? <KkOcrDialog open onOpenChange={setOcrOpen} onApply={(d) => void applyOcr(d)} /> : null}
    </div>
  );
}
