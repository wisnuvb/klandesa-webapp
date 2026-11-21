"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, MapPin, Phone, Undo2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiJson, formatWib } from "@/components/admin/security/api";
import { CLAIM_LABELS, LIMITS, type ClaimStatus } from "@/lib/aspirasi/catalog";
import { Pager } from "./Pager";
import type { AdminClaim, ClaimPage } from "./types";

const MATCH_TEXT = [
  "Tidak ada kesamaan nama dengan wilayah yang diklaim. Periksa bukti dengan teliti.",
  "Hanya 1 dari 3 (desa, kecamatan, kabupaten) yang cocok. Perlu verifikasi tambahan.",
  "2 dari 3 cocok. Periksa bagian yang berbeda.",
  "Nama desa, kecamatan, dan kabupaten cocok. Tetap periksa buktinya.",
];

type Decision = "approve" | "reject" | "revoke";

export function ClaimsTab({ onCounts }: { onCounts: (pending: number) => void }) {
  const sid = useId();
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ClaimPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dlg, setDlg] = useState<{ claim: AdminClaim; decision: Decision } | null>(null);
  const seq = useRef(0);

  const run = useCallback(async (st: string, pg: number) => {
    const my = ++seq.current;
    try {
      const sp = new URLSearchParams({ status: st });
      if (pg > 1) sp.set("page", String(pg));
      const r = await apiJson<ClaimPage>(`/api/admin/aspirasi/claims?${sp}`);
      if (my !== seq.current) return;
      setData(r);
      setError(null);
      onCounts(r.pending);
    } catch (e) {
      if (my !== seq.current) return;
      setError(e instanceof Error ? e.message : "Gagal memuat klaim.");
      setData((d) => d ?? { items: [], total: 0, page: 1, pageSize: 20, pending: 0 });
    }
  }, [onCounts]);
  useEffect(() => {
    // Muat ulang saat saringan/halaman berubah; state baru diisi sesudah await (urutan dijaga seq).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run(status, page);
  }, [status, page, run]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={sid}>Status klaim</Label>
            <SearchSelect id={sid} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full">
              {(Object.keys(CLAIM_LABELS) as ClaimStatus[]).map((s) => (
                <option key={s} value={s}>
                  {CLAIM_LABELS[s]}
                </option>
              ))}
            </SearchSelect>
          </div>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Setujui hanya bila bukti menunjukkan pemohon benar mewakili pemerintah desa (situs resmi desa, SK, email resmi). Persetujuan menyerahkan hak menjawab laporan atas nama desa itu.
          </p>
        </CardContent>
      </Card>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {data ? `${data.total} permohonan.` : "Memuat…"}
      </p>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
          <Button size="sm" variant="outline" onClick={() => void run(status, page)}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!data ? (
        <Skeleton className="h-40 w-full" aria-busy="true" />
      ) : data.items.length === 0 && !error ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Tidak ada permohonan klaim dengan status ini.</p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((c) => (
            <li key={c.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-base font-semibold">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="break-words">
                      Klaim: {c.area.name}, Kec. {c.area.district}, {c.area.regency}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">Diajukan {formatWib(c.createdAt)}</p>
                </div>
                <Badge variant={c.status === "PENDING" ? "outline" : c.status === "APPROVED" ? "secondary" : "destructive"}>{CLAIM_LABELS[c.status]}</Badge>
              </div>

              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md bg-muted/40 p-3">
                  <dt className="font-medium">Desa pemohon (terdaftar di Klandesa)</dt>
                  <dd className="mt-1 break-words text-muted-foreground">
                    {c.village.name}, Kec. {c.village.district}, {c.village.regency}, {c.village.province}
                    <br />
                    Langganan: {c.village.subscriptionStatus}
                  </dd>
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <dt className="font-medium">Pemohon</dt>
                  <dd className="mt-1 break-words text-muted-foreground">
                    {c.user.name ?? "Tanpa nama"} · {c.position}
                    <br />
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      {c.user.email ?? "tanpa email"}
                    </span>
                    {c.contactPhone ? (
                      <>
                        {" · "}
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          {c.contactPhone}
                        </span>
                      </>
                    ) : null}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-sm">
                <Badge variant={c.matchScore >= 2 ? "secondary" : "outline"} className="mr-2">
                  Kecocokan nama {c.matchScore}/3
                </Badge>
                {MATCH_TEXT[c.matchScore]}
              </p>
              {c.area.claimedByOther ? <p className="mt-1 text-sm text-destructive">Peringatan: wilayah ini sudah dikelola desa lain.</p> : null}

              <div className="mt-3 rounded-md border p-3 text-sm">
                <p className="font-medium">Bukti dari pemohon</p>
                <p className="mt-1 whitespace-pre-line break-words text-muted-foreground">{c.evidenceNote}</p>
              </div>
              {c.reviewNote ? <p className="mt-2 text-sm text-muted-foreground">Catatan keputusan: {c.reviewNote}</p> : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {c.status === "PENDING" ? (
                  <>
                    <Button className="min-h-11" onClick={() => setDlg({ claim: c, decision: "approve" })}>
                      <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Setujui
                    </Button>
                    <Button variant="outline" className="min-h-11" onClick={() => setDlg({ claim: c, decision: "reject" })}>
                      <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                      Tolak
                    </Button>
                  </>
                ) : null}
                {c.status === "APPROVED" ? (
                  <Button variant="outline" className="min-h-11 text-destructive" onClick={() => setDlg({ claim: c, decision: "revoke" })}>
                    <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Cabut klaim
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data ? <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} /> : null}

      <DecisionDialog
        dlg={dlg}
        onClose={() => setDlg(null)}
        onDone={() => {
          setDlg(null);
          void run(status, page);
        }}
      />
    </div>
  );
}

function DecisionDialog({ dlg, onClose, onDone }: { dlg: { claim: AdminClaim; decision: Decision } | null; onClose: () => void; onDone: () => void }) {
  const noteId = useId();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setNote("");
    setErr(null);
  }, [dlg]);
  if (!dlg) return null;
  const { claim, decision } = dlg;
  const needsNote = decision !== "approve";
  const copy = {
    approve: { title: "Setujui klaim desa", desc: `Desa ${claim.village.name} akan dapat menjawab semua laporan di halaman ${claim.area.name}, atas nama pemerintah desa.`, cta: "Setujui klaim" },
    reject: { title: "Tolak klaim desa", desc: "Pemohon menerima email berisi alasan ini dan boleh mengajukan lagi.", cta: "Tolak klaim" },
    revoke: { title: "Cabut klaim desa", desc: "Halaman kembali tanpa pengelola. Tanggapan yang sudah ditulis desa tetap tampil sampai dihapus.", cta: "Cabut klaim" },
  }[decision];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (needsNote && note.trim().length < 5) {
      setErr("Tulis alasan (minimal 5 karakter).");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiJson(`/api/admin/aspirasi/claims/${claim.id}`, { method: "PATCH", body: { decision, note: note.trim() } });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan keputusan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.desc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={noteId}>{needsNote ? "Alasan (wajib)" : "Catatan (opsional)"}</Label>
            <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={LIMITS.noteMax} />
          </div>
          {err ? (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant={decision === "approve" ? "default" : "destructive"} className="min-h-11" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
              {copy.cta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
