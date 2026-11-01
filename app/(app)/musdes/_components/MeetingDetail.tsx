"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Loader2, Lock, Pencil, Printer, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, ReasonDialog, ResidentPicker, SELECT_CLASS, WarningList, fmtDate, type PickedResident } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import { UNSUR, UNSUR_KEYS } from "@/lib/musdes/catalog";
import { MeetingFormDialog } from "./MeetingFormDialog";
import type { AttendeeView, DecisionView, DetailResponse } from "./types";

const TONE: Record<string, string> = { PLANNED: "info", HELD: "soon", FINAL: "done", CANCELLED: "neutral" };

export function MeetingDetail({ id }: { id: number }) {
  const router = useRouter();
  const { data, loading, error, reload } = useApiGet<DetailResponse>(Number.isInteger(id) && id > 0 ? `/api/musdes/${id}` : null);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<null | "held" | "cancel" | "reopen" | "finalize" | "delete" | "bulk">(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown, method: "POST" | "PATCH" | "DELETE" = "POST"): Promise<boolean> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(typeof j?.error === "string" ? j.error : "Gagal memproses. Coba lagi.");
        return false;
      }
      reload();
      return true;
    } catch {
      setActionError("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Memuat musyawarah…
      </p>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {error ?? "Musyawarah tidak ditemukan."}
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/musdes">Kembali ke daftar</Link>
        </Button>
      </div>
    );
  }

  const { meeting: m, attendees, decisions, counts, warnings, can } = data;
  const locked = m.status === "FINAL" || m.status === "CANCELLED";
  const aksi = `/api/musdes/${m.id}/aksi`;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="min-h-11">
        <Link href="/musdes">
          <ArrowLeft aria-hidden="true" />
          Daftar musyawarah
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{m.title}</h1>
            <p className="text-muted-foreground">
              {m.kindLabel} · diselenggarakan oleh {m.organizer}
            </p>
            <p className="text-sm text-muted-foreground">Dasar: {m.basis}</p>
          </div>
          <Pill tone={TONE[m.status]}>{m.statusLabel}</Pill>
        </div>
        <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Jadwal:</dt>
            <dd>
              {fmtDate(m.scheduledOn)}
              {m.startTime ? ` pukul ${m.startTime}` : ""}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Tempat:</dt>
            <dd>{m.location ?? "-"}</dd>
          </div>
          {m.heldOn ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Terlaksana:</dt>
              <dd>{fmtDate(m.heldOn)}</dd>
            </div>
          ) : null}
          {m.planYear ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Tahun rencana:</dt>
              <dd>{m.planYear}</dd>
            </div>
          ) : null}
          {m.topic ? (
            <div className="flex gap-2 sm:col-span-2">
              <dt className="text-muted-foreground">Pokok bahasan:</dt>
              <dd>{m.topic}</dd>
            </div>
          ) : null}
          {m.cancelReason ? (
            <div className="flex gap-2 sm:col-span-2">
              <dt className="text-muted-foreground">Alasan batal:</dt>
              <dd>{m.cancelReason}</dd>
            </div>
          ) : null}
        </dl>
        {m.agenda ? <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{m.agenda}</p> : null}

        <div className="flex flex-wrap gap-2">
          {m.status === "PLANNED" && can.update ? (
            <>
              <Button type="button" className="min-h-11" onClick={() => setDialog("held")}>
                <Check aria-hidden="true" />
                Tandai terlaksana
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                Ubah
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setDialog("cancel")}>
                Batalkan
              </Button>
            </>
          ) : null}
          {m.status === "HELD" && can.update ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Ubah jadwal/pokok bahasan
            </Button>
          ) : null}
          {m.status === "FINAL" && can.approve ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setDialog("reopen")}>
              Buka kembali berita acara
            </Button>
          ) : null}
          {(m.status === "PLANNED" || m.status === "CANCELLED") && can.delete ? (
            <Button type="button" variant="outline" className="min-h-11 text-destructive" onClick={() => setDialog("delete")}>
              <Trash2 aria-hidden="true" />
              Hapus
            </Button>
          ) : null}
          {m.status !== "CANCELLED" ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/musdes/cetak?id=${m.id}&kind=hadir`}>
                <Printer aria-hidden="true" />
                Daftar hadir
              </Link>
            </Button>
          ) : null}
          {m.status === "HELD" || m.status === "FINAL" ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link href={`/musdes/cetak?id=${m.id}&kind=berita-acara`}>
                <Printer aria-hidden="true" />
                Berita acara
              </Link>
            </Button>
          ) : null}
        </div>
        {actionError ? (
          <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}
        {locked && m.status === "FINAL" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden="true" className="size-4" />
            Berita acara final{m.finalizedAt ? ` (${fmtDate(m.finalizedAt)})` : ""}: peserta, keputusan, dan isi berita acara terkunci.
          </p>
        ) : null}
      </header>

      <WarningList title={m.status === "PLANNED" ? "Keterwakilan undangan belum lengkap" : "Keterwakilan peserta yang hadir belum lengkap"} items={warnings.map((w) => w.message)} />

      <section aria-labelledby="peserta-h" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="peserta-h" className="flex items-center gap-2 text-lg font-semibold">
            <Users aria-hidden="true" className="size-5" />
            Peserta
          </h2>
          <p className="text-sm text-muted-foreground">
            {counts.invited} diundang · {counts.present} hadir · {counts.women} perempuan hadir
          </p>
        </div>
        {!locked && can.update ? <AttendeeAdd meetingId={m.id} onAdded={reload} onBulk={() => setDialog("bulk")} onAllPresent={() => post(aksi, { action: "all-present", present: true })} busy={busy} /> : null}
        <AttendeeTable meetingId={m.id} attendees={attendees} editable={!locked && can.update} onChanged={reload} />
      </section>

      {m.status === "HELD" || m.status === "FINAL" ? (
        <>
          <section aria-labelledby="keputusan-h" className="space-y-3">
            <h2 id="keputusan-h" className="text-lg font-semibold">
              Keputusan
            </h2>
            <DecisionPanel meetingId={m.id} decisions={decisions} editable={m.status === "HELD" && can.update} onChanged={reload} />
          </section>
          <section aria-labelledby="ba-h" className="space-y-3">
            <h2 id="ba-h" className="text-lg font-semibold">
              Berita acara
            </h2>
            <MinutesPanel meeting={m} editable={m.status === "HELD" && can.update} onSaved={reload} onFinalize={() => setDialog("finalize")} />
          </section>
        </>
      ) : null}

      {editing ? <MeetingFormDialog meeting={m} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} /> : null}
      {dialog === "held" ? <HeldDialog url={aksi} defaultDate={m.scheduledOn ?? localToday()} onClose={() => setDialog(null)} onDone={() => { setDialog(null); reload(); }} /> : null}
      {dialog === "cancel" ? (
        <ReasonDialog title="Batalkan musyawarah" description="Musyawarah yang dibatalkan tidak dapat diubah lagi, tetapi tetap tercatat." label="Alasan pembatalan" confirm="Batalkan musyawarah" url={aksi} build={(t) => ({ action: "cancel", reason: t })} onClose={() => setDialog(null)} onDone={() => { setDialog(null); reload(); }} />
      ) : null}
      {dialog === "reopen" ? (
        <ReasonDialog title="Buka kembali berita acara" description="Berita acara akan dapat dikoreksi lagi dan harus difinalkan ulang. Alasan dicatat dalam jejak audit." label="Alasan membuka kembali" confirm="Buka kembali" url={aksi} build={(t) => ({ action: "reopen", reason: t })} onClose={() => setDialog(null)} onDone={() => { setDialog(null); reload(); }} />
      ) : null}
      {dialog === "finalize" ? <FinalizeDialog warnings={warnings.length} onClose={() => setDialog(null)} onConfirm={async () => { if (await post(aksi, { action: "finalize" })) setDialog(null); }} busy={busy} /> : null}
      {dialog === "delete" ? <DeleteDialog onClose={() => setDialog(null)} onConfirm={async () => { if (await post(`/api/musdes/${m.id}`, undefined, "DELETE")) router.push("/musdes"); }} busy={busy} /> : null}
      {dialog === "bulk" ? <BulkDialog meetingId={m.id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); reload(); }} /> : null}
    </div>
  );
}

// --- Peserta -----------------------------------------------------------------

function AttendeeAdd({ meetingId, onAdded, onBulk, onAllPresent, busy }: { meetingId: number; onAdded: () => void; onBulk: () => void; onAllPresent: () => void; busy: boolean }) {
  const [name, setName] = useState("");
  const [unsur, setUnsur] = useState("WARGA");
  const [gender, setGender] = useState("");
  const [present, setPresent] = useState(true);
  const [residentId, setResidentId] = useState<number | null>(null);
  const { busy: saving, errors, general, summaryRef, submit } = useFormSubmit();

  function pick(r: PickedResident) {
    setResidentId(r.id);
    setName(r.name);
    setGender(r.gender ?? "");
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/musdes/${meetingId}/peserta`, "POST", { name, unsur, gender: gender || null, present, residentId });
    if (r) {
      setName("");
      setGender("");
      setResidentId(null);
      onAdded();
    }
  }
  return (
    <form onSubmit={add} className="min-w-0 space-y-3 rounded-lg border p-4" noValidate>
      <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ name: "Nama", unsur: "Unsur", gender: "Jenis kelamin" }} />
      <ResidentPicker onPick={pick} disabled={saving} />
      <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="pa-name">Nama peserta *</Label>
          <Input id="pa-name" className="h-11" maxLength={150} value={name} onChange={(e) => { setName(e.target.value); setResidentId(null); }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pa-unsur">Unsur *</Label>
          <SearchSelect id="pa-unsur" className={SELECT_CLASS} value={unsur} onChange={(e) => setUnsur(e.target.value)}>
            {UNSUR_KEYS.map((k) => (
              <option key={k} value={k}>
                {UNSUR[k]}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pa-gender">Jenis kelamin</Label>
          <SearchSelect id="pa-gender" className={SELECT_CLASS} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">-</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </SearchSelect>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={present} onChange={(e) => setPresent(e.target.checked)} />
          Langsung ditandai hadir
        </label>
        <Button type="submit" className="min-h-11" disabled={saving}>
          {saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : <UserPlus aria-hidden="true" />}
          Tambah peserta
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onBulk}>
          Tambah banyak sekaligus
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onAllPresent} disabled={busy}>
          Tandai semua hadir
        </Button>
      </div>
    </form>
  );
}

function AttendeeTable({ meetingId, attendees, editable, onChanged }: { meetingId: number; attendees: AttendeeView[]; editable: boolean; onChanged: () => void }) {
  const [pending, setPending] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function call(a: AttendeeView, method: "PATCH" | "DELETE") {
    setPending(a.id);
    setErr(null);
    try {
      const res = await fetch(`/api/musdes/${meetingId}/peserta/${a.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PATCH" ? JSON.stringify({ name: a.name, unsur: a.unsur, gender: a.gender, present: !a.present, note: a.note }) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setErr(typeof j?.error === "string" ? j.error : "Gagal menyimpan.");
      } else onChanged();
    } catch {
      setErr("Tidak bisa terhubung.");
    } finally {
      setPending(null);
    }
  }

  if (!attendees.length) return <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada peserta. Tambahkan dari data warga atau ketik namanya.</p>;
  return (
    <div className="space-y-2">
      {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">Daftar peserta musyawarah</caption>
          <thead className="bg-muted text-left">
            <tr>
              <th scope="col" className="px-3 py-2">Hadir</th>
              <th scope="col" className="px-3 py-2">Nama</th>
              <th scope="col" className="px-3 py-2">Unsur</th>
              <th scope="col" className="px-3 py-2">L/P</th>
              {editable ? <th scope="col" className="px-3 py-2"><span className="sr-only">Aksi</span></th> : null}
            </tr>
          </thead>
          <tbody className="divide-y">
            {attendees.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-1">
                  {editable ? (
                    <label className="flex min-h-11 items-center">
                      <input type="checkbox" className="size-5" checked={a.present} disabled={pending === a.id} onChange={() => call(a, "PATCH")} aria-label={`Hadir: ${a.name}`} />
                    </label>
                  ) : (
                    <span>{a.present ? "Ya" : "Tidak"}</span>
                  )}
                </td>
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{a.unsurLabel}</td>
                <td className="px-3 py-2">{a.gender ?? "-"}</td>
                {editable ? (
                  <td className="px-3 py-1 text-right">
                    <Button type="button" variant="ghost" size="icon" className="size-11" disabled={pending === a.id} onClick={() => call(a, "DELETE")} aria-label={`Hapus peserta ${a.name}`}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkDialog({ meetingId, onClose, onDone }: { meetingId: number; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [unsur, setUnsur] = useState("WARGA");
  const [present, setPresent] = useState(true);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const names = text.split("\n").map((s) => s.trim()).filter(Boolean);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/musdes/${meetingId}/peserta`, "POST", { names, unsur, present });
    if (r) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah banyak peserta</DialogTitle>
          <DialogDescription>Satu nama per baris, maksimal 100 nama, semuanya dengan unsur yang sama. Jenis kelamin dapat dilengkapi kemudian.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ unsur: "Unsur" }} />
          <div className="space-y-1.5">
            <Label htmlFor="bulk-names">Daftar nama *</Label>
            <Textarea id="bulk-names" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
            <p className="text-sm text-muted-foreground">{names.length} nama terbaca.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-unsur">Unsur *</Label>
            <SearchSelect id="bulk-unsur" className={SELECT_CLASS} value={unsur} onChange={(e) => setUnsur(e.target.value)}>
              {UNSUR_KEYS.map((k) => (
                <option key={k} value={k}>
                  {UNSUR[k]}
                </option>
              ))}
            </SearchSelect>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="size-5" checked={present} onChange={(e) => setPresent(e.target.checked)} />
            Langsung ditandai hadir
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy || names.length === 0}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Tambahkan {names.length || ""} nama
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Keputusan ---------------------------------------------------------------

function DecisionPanel({ meetingId, decisions, editable, onChanged }: { meetingId: number; decisions: DecisionView[]; editable: boolean; onChanged: () => void }) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/musdes/${meetingId}/keputusan`, "POST", { text });
    if (r) {
      setText("");
      onChanged();
    }
  }
  async function saveEdit(d: DecisionView) {
    const r = await submit(`/api/musdes/${meetingId}/keputusan/${d.id}`, "PATCH", { text: editText, refType: d.refType, refId: d.refId });
    if (r) {
      setEditingId(null);
      onChanged();
    }
  }
  async function remove(d: DecisionView) {
    const r = await submit(`/api/musdes/${meetingId}/keputusan/${d.id}`, "DELETE");
    if (r) onChanged();
  }
  return (
    <div className="space-y-3">
      <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ text: "Keputusan" }} />
      {decisions.length ? (
        <ol className="space-y-2">
          {decisions.map((d) => (
            <li key={d.id} className="rounded-md border p-3">
              {editingId === d.id ? (
                <div className="space-y-2">
                  <Label htmlFor={`dec-${d.id}`} className="sr-only">
                    Ubah keputusan {d.no}
                  </Label>
                  <Textarea id={`dec-${d.id}`} rows={3} maxLength={1000} value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <div className="flex gap-2">
                    <Button type="button" className="min-h-11" disabled={busy} onClick={() => saveEdit(d)}>
                      Simpan
                    </Button>
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditingId(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm">
                    <span className="mr-2 font-medium">{d.no}.</span>
                    {d.text}
                  </p>
                  {editable ? (
                    <div className="flex shrink-0">
                      <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah keputusan ${d.no}`} onClick={() => { setEditingId(d.id); setEditText(d.text); }}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus keputusan ${d.no}`} disabled={busy} onClick={() => remove(d)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada keputusan tercatat.</p>
      )}
      {editable ? (
        <form onSubmit={add} className="min-w-0 space-y-2" noValidate>
          <Label htmlFor="dec-new">Tambah keputusan</Label>
          <Textarea id="dec-new" rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Contoh: Menyepakati rancangan RKP Desa tahun 2027" />
          <Button type="submit" className="min-h-11" disabled={busy || !text.trim()}>
            Catat keputusan
          </Button>
        </form>
      ) : null}
    </div>
  );
}

// --- Berita acara -------------------------------------------------------------

function MinutesPanel({ meeting, editable, onSaved, onFinalize }: { meeting: DetailResponse["meeting"]; editable: boolean; onSaved: () => void; onFinalize: () => void }) {
  const [no, setNo] = useState(meeting.minutesNo ?? "");
  const [heldOn, setHeldOn] = useState(meeting.heldOn ?? "");
  const [text, setText] = useState(meeting.minutesText ?? "");
  const [saved, setSaved] = useState(false);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(`/api/musdes/${meeting.id}/aksi`, "POST", { action: "minutes", minutesNo: no, minutesText: text, heldOn: heldOn || null });
    if (r) {
      setSaved(true);
      onSaved();
    }
  }
  if (!editable) {
    return (
      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Nomor:</span> {meeting.minutesNo ?? "-"}
        </p>
        <p className="whitespace-pre-wrap">{meeting.minutesText ?? "Belum ada isi berita acara."}</p>
      </div>
    );
  }
  return (
    <form onSubmit={save} className="min-w-0 space-y-3" noValidate>
      <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ minutesNo: "Nomor", minutesText: "Isi berita acara", heldOn: "Tanggal pelaksanaan" }} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ba-no">Nomor berita acara</Label>
          <Input id="ba-no" className="h-11" maxLength={100} value={no} onChange={(e) => { setNo(e.target.value); setSaved(false); }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ba-held">Tanggal pelaksanaan</Label>
          <Input id="ba-held" className="h-11" type="date" value={heldOn} onChange={(e) => { setHeldOn(e.target.value); setSaved(false); }} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ba-text">Isi berita acara *</Label>
        <Textarea id="ba-text" rows={10} maxLength={20000} value={text} onChange={(e) => { setText(e.target.value); setSaved(false); }} />
        <p className="text-sm text-muted-foreground">Tuliskan jalannya musyawarah dan hal yang disepakati. Keputusan di atas ikut dicetak otomatis.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="outline" className="min-h-11" disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          Simpan berita acara
        </Button>
        <Button type="button" className="min-h-11" onClick={onFinalize} disabled={busy}>
          <Lock aria-hidden="true" />
          Finalkan berita acara
        </Button>
        {saved ? <span role="status" className="text-sm text-muted-foreground">Tersimpan.</span> : null}
      </div>
    </form>
  );
}

// --- Dialog kecil ---------------------------------------------------------------

function HeldDialog({ url, defaultDate, onClose, onDone }: { url: string; defaultDate: string; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(defaultDate);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(url, "POST", { action: "held", heldOn: date || null });
    if (r) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tandai musyawarah terlaksana</DialogTitle>
          <DialogDescription>Setelah ini Anda dapat menandai peserta yang hadir, mencatat keputusan, dan menyusun berita acara.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ heldOn: "Tanggal pelaksanaan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="held-date">Tanggal pelaksanaan</Label>
            <Input id="held-date" className="h-11" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Tandai terlaksana
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FinalizeDialog({ warnings, onClose, onConfirm, busy }: { warnings: number; onClose: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalkan berita acara?</DialogTitle>
          <DialogDescription>Setelah final, peserta, keputusan, dan isi berita acara terkunci. Hanya Kepala Desa atau admin yang dapat membukanya kembali, dengan alasan yang dicatat.</DialogDescription>
        </DialogHeader>
        {warnings > 0 ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Masih ada {warnings} catatan keterwakilan peserta. Anda tetap dapat memfinalkan; catatan ini tidak memblokir.
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button type="button" className="min-h-11" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Finalkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ onClose, onConfirm, busy }: { onClose: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus musyawarah?</DialogTitle>
          <DialogDescription>Musyawarah beserta daftar undangannya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button type="button" variant="destructive" className="min-h-11" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
