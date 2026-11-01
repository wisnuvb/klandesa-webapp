"use client";

import { useState } from "react";
import { CalendarDays, Pencil, Plus, Siren, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill } from "@/components/app/perencanaan/shared";
import { ErrorBox, FormDialog, Loading, NoteDialog, fmtDateTime, opt, toLocalInput, type Field } from "@/components/app/incident/common";
import { DOMAIN_DEFS } from "@/lib/incident/catalog";
import { useApiGet } from "@/hooks/useApiGet";
import type { GroupView } from "@/lib/keamanan/ronda";
import { ScheduleDialog } from "./Schedule";
import { ActionError, Empty, Field as TextField, Findings, FormShell, Pick, ResidentField, fmtDay, s, useAction, where, type ResidentHit } from "./shared";
import type { GroupsResp, LogsResp, SwapsResp } from "./types";

const groupFields: Field[] = [
  { key: "name", label: "Nama regu", type: "text", required: true, max: 120, hint: "Contoh: Ronda RT 02/RW 01." },
  { key: "rw", label: "RW", type: "text", max: 10, half: true },
  { key: "rt", label: "RT", type: "text", max: 10, half: true },
  { key: "hamlet", label: "Dusun", type: "text", max: 100, half: true },
  { key: "postName", label: "Nama pos ronda", type: "text", max: 120, half: true },
  { key: "startTime", label: "Mulai jaga (JJ:MM)", type: "text", max: 5, half: true, hint: "Contoh: 22:00." },
  { key: "endTime", label: "Selesai jaga (JJ:MM)", type: "text", max: 5, half: true, hint: "Contoh: 04:00 (lewat tengah malam tidak apa-apa)." },
  { key: "perShift", label: "Petugas per malam", type: "number", half: true, hint: "1 sampai 20." },
  { key: "note", label: "Catatan", type: "textarea", max: 300 },
];

export function RondaTab({ onChanged }: { onChanged: () => void }) {
  const groups = useApiGet<GroupsResp>("/api/keamanan/regu");
  const swaps = useApiGet<SwapsResp>("/api/keamanan/tukar?status=PENDING");
  const [logPage, setLogPage] = useState(1);
  const logs = useApiGet<LogsResp>(`/api/keamanan/ronda/catatan?page=${logPage}`);
  const reloadAll = () => {
    groups.reload();
    swaps.reload();
    logs.reload();
    onChanged();
  };
  const act = useAction(reloadAll);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<GroupView | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<number | null>(null);
  const [decide, setDecide] = useState<{ id: number; kind: "REJECT" | "CANCEL" } | null>(null);
  const [logging, setLogging] = useState(false);
  const [escalate, setEscalate] = useState<number | null>(null);
  const can = groups.data?.can;
  const swapData = swaps.data;
  const logData = logs.data;
  const gAt = (id: number | null) => groups.data?.rows.find((g) => g.id === id) ?? null;

  return (
    <div className="min-w-0 space-y-8">
      <section aria-labelledby="rd-regu" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="rd-regu" className="text-lg font-semibold">
              Regu ronda
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">Ronda/siskamling dibentuk warga per RT/RW dan dilaporkan ke Polri lewat Polsek (Perpol 4/2020 Pasal 35). Pos memuat daftar dan jadwal penugasan serta buku catatan ronda (Pasal 41).</p>
          </div>
          {can?.create ? (
            <Button type="button" className="min-h-11" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Tambah regu
            </Button>
          ) : null}
        </div>
        {groups.loading && !groups.data ? <Loading text="Memuat regu ronda…" /> : null}
        {groups.error ? <ErrorBox message={groups.error} /> : null}
        <ActionError message={act.error} />
        {groups.data && !groups.data.rows.length ? <Empty>Belum ada regu ronda. Tambahkan regu per RT/RW, masukkan pesertanya, lalu buat jadwal rotasi otomatis.</Empty> : null}
        {groups.data?.rows.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {groups.data.rows.map((g) => (
              <li key={g.id} className="min-w-0 space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{g.name}</p>
                    <p className="break-words text-sm text-muted-foreground">
                      {[where(g), g.postName ? `Pos ${g.postName}` : null, `${g.startTime}-${g.endTime}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Pill tone={g.active ? "done" : "neutral"}>{g.active ? "Aktif" : "Nonaktif"}</Pill>
                </div>
                <p className="text-sm">
                  {g.activePeople} peserta aktif · {g.perShift} petugas per malam
                </p>
                <Findings items={g.findings} label={`Temuan ${g.name}`} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="min-h-11" onClick={() => setSchedule(g.id)}>
                    <CalendarDays aria-hidden="true" />
                    Jadwal dan kehadiran
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setPeople(g.id)}>
                    <Users aria-hidden="true" />
                    Peserta
                  </Button>
                  {can?.update ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(g)}>
                      <Pencil aria-hidden="true" />
                      Ubah
                    </Button>
                  ) : null}
                  {can?.delete ? <ConfirmDelete label={`Hapus regu ${g.name}`} title="Hapus regu ini?" description="Hanya regu yang belum punya jadwal atau catatan yang dapat dihapus. Selebihnya nonaktifkan lewat Ubah agar riwayat tetap tersimpan." url={`/api/keamanan/regu/${g.id}`} onDone={reloadAll} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="rd-swap" className="min-w-0 space-y-3">
        <h2 id="rd-swap" className="text-lg font-semibold">
          Permintaan tukar giliran ({swaps.data?.rows.length ?? 0})
        </h2>
        {swaps.error ? <ErrorBox message={swaps.error} /> : null}
        {swaps.data && !swaps.data.rows.length ? <Empty>Tidak ada permintaan yang menunggu keputusan. Ajukan tukar/ganti dari jadwal regu; baru berlaku setelah disetujui di sini.</Empty> : null}
        {swaps.data?.rows.length ? (
          <ul className="space-y-2">
            {swaps.data.rows.map((w) => (
              <li key={w.id} className="min-w-0 space-y-2 rounded-lg border p-3">
                <p className="break-words text-sm">
                  <span className="font-medium">{w.groupName}</span> · malam {fmtDay(w.date)}: <span className="font-medium">{w.requester.name}</span> {w.counterpartShift ? "bertukar dengan" : "digantikan oleh"} <span className="font-medium">{w.counterpart.name}</span>
                  {w.counterpartShift ? ` (giliran ${fmtDay(w.counterpartShift.date)})` : ""}
                </p>
                <p className="break-words text-sm text-muted-foreground">
                  {w.counterpartAgreed ? "Pihak kedua tercatat setuju" : "Pihak kedua BELUM tercatat setuju (tidak dapat disetujui)"}
                  {w.reason ? ` · ${w.reason}` : ""}
                </p>
                {swapData?.can.update ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" className="min-h-11" disabled={act.busy !== null || !w.counterpartAgreed} onClick={() => act.run(`a${w.id}`, `/api/keamanan/tukar/${w.id}`, "POST", { decision: "APPROVE" })}>
                      Setujui
                    </Button>
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setDecide({ id: w.id, kind: "REJECT" })}>
                      Tolak
                    </Button>
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setDecide({ id: w.id, kind: "CANCEL" })}>
                      Batalkan
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="rd-log" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="rd-log" className="text-lg font-semibold">
              Buku catatan ronda
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">Catat situasi aman atau temuan tiap malam. Temuan yang perlu penanganan dapat dijadikan kejadian. Jangan menulis identitas korban.</p>
          </div>
          {can?.create && groups.data?.rows.length ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setLogging(true)}>
              <Plus aria-hidden="true" />
              Catat ronda
            </Button>
          ) : null}
        </div>
        {logs.error ? <ErrorBox message={logs.error} /> : null}
        {logs.data && !logs.data.rows.length ? <Empty>Belum ada catatan ronda.</Empty> : null}
        {logs.data?.rows.length ? (
          <ul className="space-y-2">
            {logs.data.rows.map((l) => (
              <li key={l.id} className="flex min-w-0 items-start justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="flex flex-wrap items-center gap-2 break-words">
                    <Pill tone={l.kind === "TEMUAN" ? "soon" : "done"}>{l.kindLabel}</Pill>
                    <span className="font-medium">{l.groupName}</span>
                    <span className="text-muted-foreground">malam {fmtDay(l.shiftDate)} · {fmtDateTime(l.loggedAt)}</span>
                  </p>
                  <p className="whitespace-pre-line break-words">{l.description}</p>
                  {l.reporter ? <p className="text-muted-foreground">Pencatat: {l.reporter}</p> : null}
                  {l.eventId ? <p className="text-muted-foreground">Sudah menjadi kejadian (tab Kejadian).</p> : null}
                  {l.kind === "TEMUAN" && !l.eventId && logData?.can.create ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setEscalate(l.id)}>
                      <Siren aria-hidden="true" />
                      Jadikan kejadian
                    </Button>
                  ) : null}
                </div>
                {!l.eventId && logData?.can.delete ? <ConfirmDelete label="Hapus catatan ronda" title="Hapus catatan ronda?" description="Catatan ini dihapus dari buku ronda." url={`/api/keamanan/ronda/catatan/${l.id}`} onDone={reloadAll} /> : null}
              </li>
            ))}
          </ul>
        ) : null}
        {logs.data && logs.data.total > logs.data.pageSize ? (
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <span className="text-sm text-muted-foreground">
              Halaman {logs.data.page} dari {Math.ceil(logs.data.total / logs.data.pageSize)}
            </span>
            <Button type="button" variant="outline" className="min-h-11" disabled={logPage >= Math.ceil(logs.data.total / logs.data.pageSize)} onClick={() => setLogPage((p) => p + 1)}>
              Berikutnya
            </Button>
          </div>
        ) : null}
      </section>

      {creating ? <FormDialog title="Tambah regu ronda" fields={groupFields} initial={{ name: "", rw: "", rt: "", hamlet: "", postName: "", startTime: "22:00", endTime: "04:00", perShift: "2", note: "" }} url="/api/keamanan/regu" method="POST" onClose={() => setCreating(false)} onDone={(r) => { setCreating(false); reloadAll(); if (typeof r.id === "number") setPeople(r.id); }} /> : null}
      {editing ? (
        <FormDialog
          title={`Ubah regu: ${editing.name}`}
          fields={[...groupFields, { key: "active", label: "Status", type: "select", options: [["true", "Aktif"], ["false", "Nonaktif"]], half: true }]}
          initial={{ name: editing.name, rw: s(editing.rw), rt: s(editing.rt), hamlet: s(editing.hamlet), postName: s(editing.postName), startTime: editing.startTime, endTime: editing.endTime, perShift: String(editing.perShift), note: s(editing.note), active: String(editing.active) }}
          transform={(v) => ({ ...v, active: v.active === "true" })}
          url={`/api/keamanan/regu/${editing.id}`}
          method="PATCH"
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); reloadAll(); }}
        />
      ) : null}
      {people && gAt(people) ? <PeopleDialog group={gAt(people)!} canManage={Boolean(can?.create)} canDelete={Boolean(can?.delete)} onClose={() => setPeople(null)} onChanged={reloadAll} /> : null}
      {schedule && gAt(schedule) ? <ScheduleDialog group={gAt(schedule)!} onClose={() => setSchedule(null)} onChanged={reloadAll} /> : null}
      {decide ? <NoteDialog title={decide.kind === "REJECT" ? "Tolak permintaan tukar" : "Batalkan permintaan tukar"} label="Alasan" confirm={decide.kind === "REJECT" ? "Tolak" : "Batalkan"} required url={`/api/keamanan/tukar/${decide.id}`} build={(note) => ({ decision: decide.kind, note })} onClose={() => setDecide(null)} onDone={() => { setDecide(null); reloadAll(); }} /> : null}
      {logging && groups.data ? <LogDialog groups={groups.data.rows} today={groups.data.today} onClose={() => setLogging(false)} onDone={() => { setLogging(false); reloadAll(); }} /> : null}
      {escalate ? <EscalateDialog id={escalate} onClose={() => setEscalate(null)} onDone={() => { setEscalate(null); reloadAll(); }} /> : null}
    </div>
  );
}

function PeopleDialog({ group, canManage, canDelete, onClose, onChanged }: { group: GroupView; canManage: boolean; canDelete: boolean; onClose: () => void; onChanged: () => void }) {
  const act = useAction(onChanged);
  const [pick, setPick] = useState<ResidentHit | null>(null);
  const [note, setNote] = useState<string | null>(null);
  async function add() {
    if (!pick) return;
    const r = await act.run("add", `/api/keamanan/regu/${group.id}/peserta`, "POST", { residentId: pick.id });
    if (r) setPick(null);
  }
  async function toggle(id: number, active: boolean) {
    const r = await act.run(`t${id}`, `/api/keamanan/regu/${group.id}/peserta/${id}`, "PATCH", { active });
    setNote(r && typeof r.futureShifts === "number" && r.futureShifts > 0 ? `${r.futureShifts} giliran mendatang peserta ini tetap ada di jadwal. Hapus atau ganti manual bila perlu.` : null);
  }
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="break-words">Peserta: {group.name}</DialogTitle>
          <DialogDescription>Peserta ronda adalah warga setempat (Perpol 4/2020 Pasal 37); tidak harus anggota Satlinmas. Peserta nonaktif tidak dijadwalkan.</DialogDescription>
        </DialogHeader>
        <ActionError message={act.error} />
        {note ? (
          <p role="status" className="rounded-md border border-amber-600/50 bg-amber-50 p-3 text-sm text-amber-950">
            {note}
          </p>
        ) : null}
        {canManage ? (
          <div className="min-w-0 space-y-2">
            <ResidentField id="pp-res" label="Tambah peserta" value={pick} onChange={setPick} />
            {pick ? (
              <Button type="button" className="min-h-11" disabled={act.busy !== null} onClick={add}>
                Tambahkan {pick.name}
              </Button>
            ) : null}
          </div>
        ) : null}
        {group.people.length ? (
          <ul className="divide-y rounded-md border">
            {group.people.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="min-w-0 break-words text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground"> · {p.active ? "aktif" : "nonaktif"}</span>
                </p>
                <div className="flex shrink-0 items-center">
                  {canManage ? (
                    <Button type="button" variant="outline" className="min-h-11" disabled={act.busy !== null} onClick={() => toggle(p.id, !p.active)}>
                      {p.active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  ) : null}
                  {canDelete ? <ConfirmDelete label={`Hapus peserta ${p.name}`} title="Hapus peserta?" description="Hanya peserta tanpa riwayat giliran yang dapat dihapus. Selebihnya nonaktifkan." url={`/api/keamanan/regu/${group.id}/peserta/${p.id}`} onDone={onChanged} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Belum ada peserta. Cari warga lalu tambahkan.</Empty>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LogDialog({ groups, today, onClose, onDone }: { groups: GroupView[]; today: string; onClose: () => void; onDone: () => void }) {
  const [groupId, setGroupId] = useState(String(groups[0]?.id ?? ""));
  const [shiftDate, setShiftDate] = useState(today);
  const [loggedAt, setLoggedAt] = useState(toLocalInput(null));
  const [kind, setKind] = useState("NIHIL");
  const [desc, setDesc] = useState("");
  const [reporter, setReporter] = useState("");
  return (
    <FormShell
      title="Catat ronda"
      description="Situasi aman atau temuan selama ronda. Tanpa identitas korban."
      labels={{ groupId: "Regu", shiftDate: "Malam ronda", loggedAt: "Waktu", kind: "Jenis", description: "Uraian", reporter: "Pencatat" }}
      url="/api/keamanan/ronda/catatan"
      body={() => ({ groupId: groupId ? Number(groupId) : "", shiftDate, loggedAt: loggedAt ? new Date(loggedAt).toISOString() : "", kind, description: desc, reporter })}
      onClose={onClose}
      onDone={() => onDone()}
    >
      {(errors) => (
        <>
          <Pick id="lg-group" label="Regu" value={groupId} onChange={setGroupId} options={groups.map((g): [string, string] => [String(g.id), g.name])} error={errors.groupId} required />
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <TextField id="lg-date" label="Malam ronda (tanggal mulai jaga)" type="date" value={shiftDate} onChange={setShiftDate} error={errors.shiftDate} required />
            <TextField id="lg-time" label="Waktu catatan" type="datetime-local" value={loggedAt} onChange={setLoggedAt} error={errors.loggedAt} required />
          </div>
          <Pick id="lg-kind" label="Jenis catatan" value={kind} onChange={setKind} options={[["NIHIL", "Situasi aman"], ["TEMUAN", "Temuan"]]} error={errors.kind} required />
          <TextField id="lg-desc" label="Uraian" type="textarea" rows={3} max={1000} value={desc} onChange={setDesc} error={errors.description} required />
          <TextField id="lg-rep" label="Pencatat" value={reporter} onChange={setReporter} error={errors.reporter} max={150} />
        </>
      )}
    </FormShell>
  );
}

function EscalateDialog({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const kinds = Object.fromEntries(Object.entries(DOMAIN_DEFS.KEAMANAN.kinds).map(([k, v]) => [k, v.label]));
  const [kind, setKind] = useState("ORANG_MENCURIGAKAN");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  return (
    <FormShell title="Jadikan kejadian" description="Kejadian dibuat dari uraian, waktu, dan wilayah regu pada catatan ini; lanjutkan penanganannya di tab Kejadian." labels={{ kind: "Jenis", title: "Judul", severity: "Tingkat" }} url={`/api/keamanan/ronda/catatan/${id}/eskalasi`} body={() => ({ kind, title, severity })} submitText="Buat kejadian" onClose={onClose} onDone={() => onDone()}>
      {(errors) => (
        <>
          <Pick id="es-kind" label="Jenis kejadian" value={kind} onChange={setKind} options={opt(kinds)} error={errors.kind} required />
          <TextField id="es-title" label="Judul kejadian" value={title} onChange={setTitle} error={errors.title} max={200} required />
          <Pick id="es-sev" label="Tingkat keparahan" value={severity} onChange={setSeverity} options={[["LOW", "Ringan"], ["MEDIUM", "Sedang"], ["HIGH", "Berat"], ["CRITICAL", "Sangat berat"]]} error={errors.severity} />
        </>
      )}
    </FormShell>
  );
}

