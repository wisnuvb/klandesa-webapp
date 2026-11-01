"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill, rupiah } from "@/components/app/perencanaan/shared";
import { DOMAIN_DEFS } from "@/lib/incident/catalog";
import { ErrorBox, FormDialog, Loading, NoteDialog, SEVERITY_TONE, fmtDateTime, opt, toLocalInput, type Field } from "@/components/app/incident/common";
import { useApiGet } from "@/hooks/useApiGet";
import { eventFields, eventInitial } from "./EventsTab";
import { FollowupSection, MediationSection, ReportSection } from "./Mediation";
import { Findings, Item, STATUS_TONE, where } from "./shared";
import type { DetailResp, SecurityEventRow } from "./types";

const ACTION_TEXT: Record<string, string> = { RESPONDING: "Mulai penanganan", RESOLVED: "Tandai selesai ditangani", CLOSED: "Tutup kejadian", CANCELLED: "Batalkan kejadian" };
const STATUS_LABEL: Record<string, string> = { OPEN: "Dilaporkan", RESPONDING: "Ditangani", RESOLVED: "Selesai ditangani", CLOSED: "Ditutup", CANCELLED: "Dibatalkan" };

export function EventDetailDialog({ id, kinds, responseKinds, onClose, onChanged }: { id: number; kinds: Record<string, string>; responseKinds: Record<string, string>; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useApiGet<DetailResp>(`/api/keamanan/kejadian/${id}`);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [addResp, setAddResp] = useState(false);
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
            <Findings items={e.findings} label="Temuan kejadian" />

            <section aria-labelledby="ke-status" className="min-w-0 space-y-2">
              <h3 id="ke-status" className="font-semibold">
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
                    <span className="font-medium">{STATUS_LABEL[l.to] ?? l.to}</span> · {fmtDateTime(l.at)}
                    {l.note ? <span className="block text-muted-foreground">{l.note}</span> : null}
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="ke-info" className="min-w-0 space-y-2">
              <h3 id="ke-info" className="font-semibold">
                Lokasi, dampak, dan pelaporan
              </h3>
              <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                <Item k="Lokasi" v={[e.locationText, where(e)].filter(Boolean).join(", ") || "-"} />
                <Item k="Dampak" v={e.impactSummary || "Belum diisi"} />
                <Item k="Perkiraan kerugian materi" v={e.loss ? rupiah(e.loss) : "-"} />
                <Item k="Dilaporkan ke aparat/supra-desa" v={e.supra ? `${fmtDateTime(e.supra.reportedAt)}${e.supra.to ? ` · ${e.supra.to}` : ""}${e.supra.reference ? ` · ${e.supra.reference}` : ""}` : "Belum dicatat"} />
                <Item k="Ringkasan penyelesaian" v={e.resolutionNote ?? "-"} />
              </dl>
              {e.description ? <p className="whitespace-pre-line break-words text-sm">{e.description}</p> : null}
              {e.impactNote ? <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{e.impactNote}</p> : null}
            </section>

            <section aria-labelledby="ke-resp" className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="ke-resp" className="font-semibold">
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
                      {editable && can.delete ? <ConfirmDelete label={`Hapus catatan tindakan ${r.kindLabel}`} title="Hapus catatan tindakan?" description="Catatan ini dihapus dari kejadian. Lakukan hanya untuk mengoreksi salah catat." url={`/api/keamanan/kejadian/${id}/respons/${r.id}`} onDone={refresh} /> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada tindakan tercatat. Catat patroli, koordinasi dengan Bhabinkamtibmas, atau tindak lanjut agar jejak penanganan lengkap.</p>
              )}
            </section>

            <MediationSection eventId={id} data={data} editable={editable} onChanged={refresh} />
            <FollowupSection eventId={id} data={data} editable={editable} onChanged={refresh} />
            <ReportSection eventId={id} data={data} editable={editable} onChanged={refresh} />

            {can.delete && (e.status === "OPEN" || e.status === "CANCELLED") ? (
              <div className="border-t pt-4">
                <ConfirmDelete buttonText="Hapus kejadian" label="Hapus kejadian" title="Hapus kejadian ini?" description="Kejadian dan catatan tindakannya dihapus permanen. Hanya untuk kejadian salah catat tanpa mediasi atau tindak lanjut." url={`/api/keamanan/kejadian/${id}`} onDone={() => { onChanged(); onClose(); }} />
              </div>
            ) : null}
          </div>
        ) : null}

        {editing && e ? <FormDialog title="Ubah kejadian" fields={eventFields(kinds)} initial={eventInitial(e as SecurityEventRow)} url={`/api/keamanan/kejadian/${id}`} method="PATCH" onClose={() => setEditing(false)} onDone={() => { setEditing(false); refresh(); }} /> : null}
        {moving && e ? (
          <NoteDialog
            title={moving === "RESPONDING" && e.status !== "OPEN" ? "Buka kembali penanganan" : ACTION_TEXT[moving]!}
            description={moving === "CLOSED" ? "Kejadian yang ditutup tidak dapat diubah lagi kecuali dibuka kembali oleh Kepala Desa atau admin. Tindak lanjut belum selesai atau mediasi terjadwal harus dituntaskan, atau tulis alasannya." : moving === "RESOLVED" ? "Pastikan sudah ada minimal satu tindakan tercatat." : undefined}
            label={moving === "CANCELLED" ? "Alasan pembatalan" : moving === "RESPONDING" && e.status !== "OPEN" ? "Alasan membuka kembali" : moving === "RESOLVED" ? "Ringkasan penyelesaian" : moving === "CLOSED" ? "Catatan penutupan" : "Catatan (opsional)"}
            required={moving === "CANCELLED" || (moving === "RESPONDING" && e.status !== "OPEN") || (moving === "RESOLVED" && !e.resolutionNote)}
            confirm="Simpan"
            url={`/api/keamanan/kejadian/${id}/status`}
            build={(note) => ({ to: moving, note })}
            onClose={() => setMoving(null)}
            onDone={() => { setMoving(null); refresh(); }}
          />
        ) : null}
        {addResp ? <FormDialog title="Catat tindakan" fields={respFields(responseKinds)} initial={{ loggedAt: toLocalInput(null), kind: "PATROLI", description: "", actor: "" }} url={`/api/keamanan/kejadian/${id}/respons`} method="POST" onClose={() => setAddResp(false)} onDone={() => { setAddResp(false); refresh(); }} /> : null}
      </DialogContent>
    </Dialog>
  );
}

const respFields = (kinds: Record<string, string>): Field[] => [
  { key: "kind", label: "Jenis tindakan", type: "select", options: opt(Object.keys(kinds).length ? kinds : DOMAIN_DEFS.KEAMANAN.responses), required: true, half: true },
  { key: "loggedAt", label: "Waktu tindakan", type: "datetime", required: true, half: true },
  { key: "description", label: "Uraian tindakan", type: "textarea", required: true, max: 1000, hint: "Tanpa identitas korban." },
  { key: "actor", label: "Pelaksana / tim", type: "text", max: 150 },
];
