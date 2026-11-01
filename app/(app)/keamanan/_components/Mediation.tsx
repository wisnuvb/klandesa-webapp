"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill } from "@/components/app/perencanaan/shared";
import { FormDialog, NoteDialog, SearchPick, fmtDateTime, toLocalInput, type Field } from "@/components/app/incident/common";
import { MEDIATION_OUTCOMES, PARTY_SIDES, reportStatusLabel } from "@/lib/keamanan/catalog";
import type { MediationView } from "@/lib/keamanan/kejadian";
import { ActionError, Check, Empty, Field as TextField, FormShell, Pick, ResidentField, fmtDay, opt, useAction, type ResidentHit } from "./shared";
import type { DetailResp } from "./types";

interface Props {
  eventId: number;
  data: DetailResp;
  editable: boolean;
  onChanged: () => void;
}

const MED_STATUS_TONE: Record<string, string> = { SCHEDULED: "info", COMPLETED: "done", CANCELLED: "neutral" };

// ---------------------------------------------------------------------------------------------------------------------
// Mediasi
// ---------------------------------------------------------------------------------------------------------------------
export function MediationSection({ eventId, data, editable, onChanged }: Props) {
  const { can, detail } = data;
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="ke-med" className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ke-med" className="font-semibold">
          Mediasi dan berita acara ({data.mediations.length})
        </h3>
        {editable && can.create ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Jadwalkan mediasi
          </Button>
        ) : null}
      </div>
      {!detail && data.mediations.some((m) => m.parties.length) ? (
        <p className="text-sm text-muted-foreground">Nama para pihak, catatan pihak, dan isi kesepakatan disembunyikan karena Anda tidak punya izin baca rinci (Kepala Desa, sekretaris, dan admin yang punya). Nama pihak anak selalu tersamar.</p>
      ) : null}
      {data.mediations.length ? (
        <ul className="space-y-3">
          {data.mediations.map((m) => (
            <MediationCard key={m.id} m={m} data={data} editable={editable} onChanged={onChanged} />
          ))}
        </ul>
      ) : (
        <Empty>Belum ada mediasi. Untuk perselisihan antarwarga, jadwalkan mediasi lalu catat para pihak, hasil, dan tindak lanjutnya sebagai berita acara.</Empty>
      )}
      {adding ? <MediationForm title="Jadwalkan mediasi" url={`/api/keamanan/kejadian/${eventId}/mediasi`} method="POST" initial={null} onClose={() => setAdding(false)} onDone={() => { setAdding(false); onChanged(); }} /> : null}
    </section>
  );
}

const mediationFields: Field[] = [
  { key: "scheduledAt", label: "Waktu mediasi", type: "datetime", required: true, half: true },
  { key: "place", label: "Tempat", type: "text", required: true, max: 200, half: true },
  { key: "mediator", label: "Mediator", type: "text", required: true, max: 150, hint: "Mis. Kepala Desa, Kaur Pemerintahan, tokoh masyarakat." },
  { key: "documentRef", label: "Nomor berita acara", type: "text", max: 150 },
  { key: "note", label: "Catatan", type: "textarea", max: 500 },
];

function MediationForm({ title, url, method, initial, onClose, onDone }: { title: string; url: string; method: "POST" | "PATCH"; initial: MediationView | null; onClose: () => void; onDone: () => void }) {
  return (
    <FormDialog
      title={title}
      description="Mediasi dapat didanai Dana Desa operasional (biaya transportasi dan konsumsi forum mediasi, Permendesa 16/2025 Lampiran II.I butir 2.b). Pencatatan uang tetap lewat SPP dan Buku Kas."
      fields={mediationFields}
      initial={{ scheduledAt: toLocalInput(initial?.scheduledAt), place: initial?.place ?? "", mediator: initial?.mediator ?? "", documentRef: initial?.documentRef ?? "", note: initial?.note ?? "" }}
      url={url}
      method={method}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

function MediationCard({ m, data, editable, onChanged }: { m: MediationView; data: DetailResp; editable: boolean; onChanged: () => void }) {
  const { can } = data;
  const [editing, setEditing] = useState(false);
  const [addParty, setAddParty] = useState(false);
  const [editParty, setEditParty] = useState<MediationView["parties"][number] | null>(null);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const sched = m.status === "SCHEDULED" && editable;
  const hasMinor = m.parties.some((p) => p.isMinor);
  return (
    <li className="min-w-0 space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold">
            {fmtDateTime(m.scheduledAt)} · {m.place}
          </p>
          <p className="break-words text-sm text-muted-foreground">
            Mediator: {m.mediator}
            {m.documentRef ? ` · BA ${m.documentRef}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={MED_STATUS_TONE[m.status]}>{m.statusLabel}</Pill>
          {m.outcomeLabel ? <Pill tone="done">{m.outcomeLabel}</Pill> : null}
        </div>
      </div>

      {hasMinor ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-600/50 bg-amber-50 p-2.5 text-sm text-amber-950">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Ada pihak berusia di bawah 18 tahun. Libatkan orang tua/wali sebagai pendamping. Bila ada dugaan kekerasan terhadap anak, hentikan mediasi dan rujuk ke layanan (tab Rujukan).</span>
        </p>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-medium">Para pihak ({m.parties.length})</h4>
          {sched && can.create ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setAddParty(true)}>
              <Plus aria-hidden="true" />
              Tambah pihak
            </Button>
          ) : null}
        </div>
        {m.parties.length ? (
          <ul className="divide-y rounded-md border">
            {m.parties.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-2 px-3 py-2">
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words">
                    <UserRound aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.sideLabel}</span>
                    {p.isMinor ? <Pill tone="soon">Anak (&lt; 18 tahun)</Pill> : null}
                  </p>
                  <p className="break-words text-muted-foreground">
                    {p.attended ? "Hadir" : "Belum/tidak hadir"}
                    {p.agrees === true ? " · menyetujui hasil" : p.agrees === false ? " · tidak menyetujui" : ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                {sched ? (
                  <div className="flex shrink-0 items-center">
                    {can.update ? (
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditParty(p)}>
                        Ubah
                      </Button>
                    ) : null}
                    {can.delete ? <ConfirmDelete label={`Hapus pihak ${p.name}`} title="Hapus pihak ini?" description="Pihak dihapus dari berita acara yang belum diselesaikan." url={`/api/keamanan/mediasi/${m.id}/pihak/${p.id}`} onDone={onChanged} /> : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada pihak tercatat. Catat nama saja: NIK, alamat, dan telepon tidak disimpan di berita acara.</p>
        )}
      </div>

      {m.status === "COMPLETED" ? (
        <div className="space-y-1 rounded-md bg-muted/40 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Hasil: {m.outcomeLabel}
          </p>
          {m.agreement ? <p className="whitespace-pre-line break-words">{m.agreement}</p> : null}
          {m.agreementHidden ? <p className="text-muted-foreground">Isi kesepakatan tersimpan dan hanya tampak bagi pemegang izin baca rinci.</p> : null}
          {m.referredTo ? <p className="break-words">Dirujuk ke: {m.referredTo}</p> : null}
          <p className="text-xs text-muted-foreground">Berita acara yang sudah diselesaikan bersifat final dan disimpan sebagai arsip.</p>
        </div>
      ) : null}
      {m.status === "CANCELLED" && m.note ? <p className="break-words text-sm text-muted-foreground">Alasan pembatalan: {m.note}</p> : null}

      {sched ? (
        <div className="flex flex-wrap gap-2">
          {can.update ? (
            <>
              <Button type="button" className="min-h-11" onClick={() => setCompleting(true)}>
                Selesaikan berita acara
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(true)}>
                Ubah jadwal
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setCancelling(true)}>
                Batalkan mediasi
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
      {editable && can.delete && m.status !== "COMPLETED" ? <ConfirmDelete buttonText="Hapus mediasi" label="Hapus mediasi" title="Hapus mediasi ini?" description="Mediasi beserta daftar pihaknya dihapus. Berita acara yang sudah selesai tidak dapat dihapus." url={`/api/keamanan/mediasi/${m.id}`} onDone={onChanged} /> : null}

      {editing ? <MediationForm title="Ubah jadwal mediasi" url={`/api/keamanan/mediasi/${m.id}`} method="PATCH" initial={m} onClose={() => setEditing(false)} onDone={() => { setEditing(false); onChanged(); }} /> : null}
      {addParty ? <PartyDialog mediationId={m.id} party={null} onClose={() => setAddParty(false)} onDone={() => { setAddParty(false); onChanged(); }} /> : null}
      {editParty ? <PartyDialog mediationId={m.id} party={editParty} onClose={() => setEditParty(null)} onDone={() => { setEditParty(null); onChanged(); }} /> : null}
      {completing ? <CompleteDialog m={m} onClose={() => setCompleting(false)} onDone={() => { setCompleting(false); onChanged(); }} /> : null}
      {cancelling ? <NoteDialog title="Batalkan mediasi" label="Alasan pembatalan" confirm="Batalkan mediasi" required url={`/api/keamanan/mediasi/${m.id}/batal`} build={(note) => ({ note })} onClose={() => setCancelling(false)} onDone={() => { setCancelling(false); onChanged(); }} /> : null}
    </li>
  );
}

function PartyDialog({ mediationId, party, onClose, onDone }: { mediationId: number; party: MediationView["parties"][number] | null; onClose: () => void; onDone: () => void }) {
  const [side, setSide] = useState(party?.side ?? "PIHAK_A");
  const [person, setPerson] = useState<ResidentHit | null>(null);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState("");
  const [minor, setMinor] = useState(false);
  const [attended, setAttended] = useState(party?.attended ?? false);
  const [agrees, setAgrees] = useState(party?.agrees === true ? "yes" : party?.agrees === false ? "no" : "");
  const [note, setNote] = useState(party?.note ?? "");
  const edit = Boolean(party);
  const agreesVal = agrees === "yes" ? true : agrees === "no" ? false : null;
  return (
    <FormShell
      title={edit ? `Ubah pihak: ${party!.name}` : "Tambah pihak"}
      description="Hanya nama dan perannya yang dicatat. NIK, alamat, dan telepon tidak disimpan."
      labels={{ side: "Peran", name: "Nama", residentId: "Warga", attended: "Kehadiran", agrees: "Persetujuan", note: "Catatan" }}
      url={edit ? `/api/keamanan/mediasi/${mediationId}/pihak/${party!.id}` : `/api/keamanan/mediasi/${mediationId}/pihak`}
      method={edit ? "PATCH" : "POST"}
      body={() => (edit ? { side, attended, agrees: agreesVal, note } : { side, residentId: manual ? null : (person?.id ?? null), name: manual ? name : null, isMinor: manual ? minor : false, attended, agrees: agreesVal, note })}
      onClose={onClose}
      onDone={() => onDone()}
    >
      {(errors) => (
        <>
          <Pick id="pt-side" label="Peran" value={side} onChange={setSide} options={opt(PARTY_SIDES)} error={errors.side} required />
          {edit ? null : (
            <>
              <Check id="pt-manual" label="Pihak bukan warga desa ini (ketik nama)" checked={manual} onChange={setManual} />
              {manual ? (
                <>
                  <TextField id="pt-name" label="Nama" value={name} onChange={setName} error={errors.name} max={150} required />
                  <Check id="pt-minor" label="Berusia di bawah 18 tahun" checked={minor} onChange={setMinor} />
                </>
              ) : (
                <>
                  <ResidentField id="pt-res" label="Cari warga *" value={person} onChange={setPerson} hint="Ketik minimal 3 huruf nama warga. Anak (< 18 tahun) ditandai otomatis dari tanggal lahir." />
                  {errors.name || errors.residentId ? <p className="text-sm text-destructive">{errors.name ?? errors.residentId}</p> : null}
                </>
              )}
            </>
          )}
          <Check id="pt-att" label="Hadir pada mediasi" checked={attended} onChange={setAttended} />
          <Pick id="pt-agree" label="Persetujuan atas hasil" value={agrees} onChange={setAgrees} options={[["", "Belum/tidak berlaku"], ["yes", "Menyetujui"], ["no", "Tidak menyetujui"]]} error={errors.agrees} />
          <TextField id="pt-note" label="Catatan" value={note} onChange={setNote} error={errors.note} max={300} type="textarea" rows={2} hint="Tanpa identitas korban kekerasan." />
        </>
      )}
    </FormShell>
  );
}

function CompleteDialog({ m, onClose, onDone }: { m: MediationView; onClose: () => void; onDone: () => void }) {
  const [outcome, setOutcome] = useState("SEPAKAT");
  const [agreement, setAgreement] = useState("");
  const [referred, setReferred] = useState("");
  // Mediasi yang dijadwalkan di masa depan belum bisa diselesaikan pada waktu jadwalnya: bawaan = sekarang.
  const [heldAt, setHeldAt] = useState(toLocalInput(new Date(m.scheduledAt) > new Date() ? new Date().toISOString() : m.scheduledAt));
  const needsAgreement = outcome === "SEPAKAT" || outcome === "SEPAKAT_SEBAGIAN";
  return (
    <FormShell
      title="Selesaikan berita acara"
      description="Setelah diselesaikan, berita acara bersifat final. Sepakat: semua pihak pertama/kedua yang hadir harus tercatat menyetujui. Bila salah satu pihak tidak hadir, pilih Ditunda."
      labels={{ outcome: "Hasil", agreement: "Isi kesepakatan", referredTo: "Dirujuk ke", heldAt: "Waktu pelaksanaan" }}
      url={`/api/keamanan/mediasi/${m.id}/selesai`}
      body={() => ({ outcome, agreement: needsAgreement ? agreement : "", referredTo: outcome === "DIRUJUK" ? referred : "", heldAt: heldAt ? new Date(heldAt).toISOString() : null })}
      submitText="Selesaikan"
      onClose={onClose}
      onDone={() => onDone()}
    >
      {(errors) => (
        <>
          <Pick id="cm-outcome" label="Hasil mediasi" value={outcome} onChange={setOutcome} options={opt(MEDIATION_OUTCOMES)} error={errors.outcome} required />
          <TextField id="cm-held" label="Waktu pelaksanaan" type="datetime-local" value={heldAt} onChange={setHeldAt} error={errors.heldAt} />
          {needsAgreement ? <TextField id="cm-agree" label="Isi kesepakatan" type="textarea" rows={4} max={2000} value={agreement} onChange={setAgreement} error={errors.agreement} required hint="Minimal 10 karakter. Tuliskan butir kesepakatan, bukan identitas korban." /> : null}
          {outcome === "DIRUJUK" ? <TextField id="cm-ref" label="Dirujuk ke" value={referred} onChange={setReferred} error={errors.referredTo} max={200} required hint="Mis. Polsek, Pengadilan Negeri, kecamatan." /> : null}
        </>
      )}
    </FormShell>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Tindak lanjut
// ---------------------------------------------------------------------------------------------------------------------
export function FollowupSection({ eventId, data, editable, onChanged }: Props) {
  const { can } = data;
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const medOptions: [string, string][] = [["", "Tidak terkait mediasi tertentu"], ...data.mediations.map((m): [string, string] => [String(m.id), `${fmtDateTime(m.scheduledAt)} · ${m.place}`])];
  const [medId, setMedId] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [who, setWho] = useState("");
  return (
    <section aria-labelledby="ke-fu" className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ke-fu" className="font-semibold">
          Tindak lanjut ({data.followups.length})
        </h3>
        {editable && can.create ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Tambah tindak lanjut
          </Button>
        ) : null}
      </div>
      {data.followups.length ? (
        <ul className="divide-y rounded-md border">
          {data.followups.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-2 px-3 py-2">
              <div className="min-w-0 text-sm">
                <p className="flex flex-wrap items-center gap-2 break-words">
                  <span className="font-medium">{f.description}</span>
                  <Pill tone={f.status === "DONE" ? "done" : f.overdue ? "overdue" : "info"}>{f.status === "DONE" ? "Selesai" : f.overdue ? "Lewat batas waktu" : "Belum selesai"}</Pill>
                </p>
                <p className="break-words text-muted-foreground">
                  {f.dueOn ? `Batas ${fmtDay(f.dueOn)}` : "Tanpa batas waktu"}
                  {f.assignee ? ` · ${f.assignee}` : ""}
                  {f.doneAt ? ` · selesai ${fmtDateTime(f.doneAt)}` : ""}
                  {f.doneNote ? ` · ${f.doneNote}` : ""}
                </p>
              </div>
              {editable && f.status === "OPEN" ? (
                <div className="flex shrink-0 items-center">
                  {can.update ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setDone(f.id)}>
                      Selesai
                    </Button>
                  ) : null}
                  {can.delete ? <ConfirmDelete label={`Hapus tindak lanjut ${f.description}`} title="Hapus tindak lanjut?" description="Tindak lanjut yang belum selesai dihapus. Yang sudah selesai disimpan sebagai riwayat." url={`/api/keamanan/tindak-lanjut/${f.id}`} onDone={onChanged} /> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Belum ada tindak lanjut. Catat apa yang harus dilakukan setelah mediasi atau penanganan, siapa yang bertanggung jawab, dan batas waktunya.</Empty>
      )}
      {adding ? (
        <FormShell title="Tambah tindak lanjut" labels={{ description: "Tindak lanjut", dueOn: "Batas waktu", assignee: "Penanggung jawab", mediationId: "Mediasi" }} url={`/api/keamanan/kejadian/${eventId}/tindak-lanjut`} body={() => ({ description: desc, dueOn: due, assignee: who, mediationId: medId || null })} onClose={() => setAdding(false)} onDone={() => { setAdding(false); setDesc(""); setDue(""); setWho(""); setMedId(""); onChanged(); }}>
          {(errors) => (
            <>
              <TextField id="fu-desc" label="Tindak lanjut" type="textarea" rows={3} max={500} value={desc} onChange={setDesc} error={errors.description} required hint="Mis. Pasang lampu jalan di tikungan; pantau kesepakatan batas tanah bulan depan." />
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <TextField id="fu-due" label="Batas waktu" type="date" value={due} onChange={setDue} error={errors.dueOn} />
                <TextField id="fu-who" label="Penanggung jawab" value={who} onChange={setWho} error={errors.assignee} max={150} />
              </div>
              {data.mediations.length ? <Pick id="fu-med" label="Terkait mediasi" value={medId} onChange={setMedId} options={medOptions} error={errors.mediationId} /> : null}
            </>
          )}
        </FormShell>
      ) : null}
      {done ? <NoteDialog title="Tandai tindak lanjut selesai" label="Catatan penyelesaian (opsional)" confirm="Tandai selesai" required={false} url={`/api/keamanan/tindak-lanjut/${done}/selesai`} build={(note) => ({ doneNote: note })} onClose={() => setDone(null)} onDone={() => { setDone(null); onChanged(); }} /> : null}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Pengaduan warga yang tertaut (baca-saja)
// ---------------------------------------------------------------------------------------------------------------------
interface ReportHit {
  id: string;
  title: string;
  status: string;
  category: string | null;
  createdAt: string;
}

export function ReportSection({ eventId, data, editable, onChanged }: Props) {
  const { can } = data;
  const { error, run, busy, clear } = useAction(onChanged);
  const [adding, setAdding] = useState(false);
  return (
    <section aria-labelledby="ke-rp" className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ke-rp" className="font-semibold">
          Pengaduan warga terkait ({data.reports.length})
        </h3>
        {editable && can.create ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => { clear(); setAdding(true); }}>
            <Link2 aria-hidden="true" />
            Tautkan pengaduan
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">Tautan baca-saja ke modul Pengaduan Warga: isi dan pelapor pengaduan tidak disalin ke sini.</p>
      <ActionError message={error} />
      {data.reports.length ? (
        <ul className="divide-y rounded-md border">
          {data.reports.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-2 px-3 py-2">
              <div className="min-w-0 text-sm">
                <p className="break-words font-medium">{r.title ?? "Judul disembunyikan (butuh izin baca Pengaduan Warga)"}</p>
                <p className="text-muted-foreground">
                  {r.status ? `Status ${reportStatusLabel(r.status)}` : ""}
                  {r.category ? ` · ${r.category}` : ""}
                  {r.createdAt ? ` · ${fmtDay(r.createdAt)}` : ""}
                </p>
              </div>
              {editable && can.delete ? (
                <Button type="button" variant="ghost" className="min-h-11 shrink-0" disabled={busy !== null} onClick={() => run(`rl${r.id}`, `/api/keamanan/kejadian/${eventId}/pengaduan/${r.id}`, "DELETE")}>
                  Lepas
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Belum ada pengaduan tertaut.</Empty>
      )}
      {adding ? (
        <LinkDialog eventId={eventId} onClose={() => setAdding(false)} onDone={() => { setAdding(false); onChanged(); }} />
      ) : null}
    </section>
  );
}

function LinkDialog({ eventId, onClose, onDone }: { eventId: number; onClose: () => void; onDone: () => void }) {
  const [hit, setHit] = useState<ReportHit | null>(null);
  return (
    <FormShell title="Tautkan pengaduan warga" description="Cari pengaduan menurut judul. Hanya judul dan status yang ditampilkan." labels={{ citizenReportId: "Pengaduan" }} url={`/api/keamanan/kejadian/${eventId}/pengaduan`} body={() => ({ citizenReportId: hit?.id ?? "" })} onClose={onClose} onDone={() => onDone()} submitText="Tautkan">
      {(errors) => (
        <>
          {hit ? (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
              <p className="min-w-0 break-words text-sm">
                <span className="font-medium">{hit.title}</span> · {reportStatusLabel(hit.status)}
              </p>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setHit(null)}>
                Ganti
              </Button>
            </div>
          ) : (
            <SearchPick<ReportHit> id="lk-q" label="Cari judul pengaduan *" hint="Ketik minimal 3 huruf judul." url={(q) => `/api/keamanan/pengaduan?q=${encodeURIComponent(q)}`} render={(r) => <>{r.title} · {reportStatusLabel(r.status)}{r.category ? ` · ${r.category}` : ""}</>} onPick={setHit} />
          )}
          {errors.citizenReportId ? <p className="text-sm text-destructive">{errors.citizenReportId}</p> : null}
        </>
      )}
    </FormShell>
  );
}
