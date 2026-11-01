"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, Info, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { Pill, SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { alertTemplate } from "@/lib/bencana/calc";
import type { AlertLevel, HazardType } from "@/lib/bencana/catalog";
import type { AlertView, AreaOption } from "@/lib/bencana/service";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { ErrorBox, Loading, fmtDateTime, opt } from "./common";
import type { Can } from "./types";

interface Resp {
  rows: AlertView[];
  total: number;
  page: number;
  pageSize: number;
  areas: AreaOption[];
  levels: Record<string, string>;
  hazards: Record<string, string>;
  can: Can;
}
const STATUS_TEXT: Record<string, [string, string]> = { SENT: ["Terkirim", "done"], SENDING: ["Sedang dikirim", "soon"], FAILED: ["Push gagal (kotak masuk tetap terkirim)", "overdue"] };
const key = (a: { rw: string; rt: string | null }) => `${a.rw}|${a.rt ?? "*"}`;

export function AlertsTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApiGet<Resp>(`/api/bencana/peringatan?page=${page}`);
  return (
    <section aria-labelledby="al-h" className="min-w-0 space-y-4">
      <div>
        <h2 id="al-h" className="text-lg font-semibold">
          Peringatan dini ke warga
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">Siaran masuk ke kotak masuk aplikasi warga dan dikirim sebagai notifikasi push, per seluruh desa atau per RW/RT. Warga yang belum memakai aplikasi tidak menerimanya: tetap umumkan lewat pengeras suara, kentongan, atau grup RT.</p>
      </div>
      <div role="note" className="flex items-start gap-2 rounded-md border border-sky-600/40 bg-sky-50 p-3 text-sm text-sky-950">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>Tingkat Informasi/Waspada/Siaga/Awas di sini adalah istilah siaran desa, bukan status resmi. Peringatan resmi tetap bersumber dari BMKG, PVMBG, atau BPBD.</p>
      </div>
      {loading && !data ? <Loading text="Memuat…" /> : null}
      {error ? <ErrorBox message={error} /> : null}
      {data ? (
        <>
          {data.can.approve ? <Compose data={data} onSent={() => { setPage(1); reload(); }} /> : <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Mengirim peringatan dini memerlukan izin Kepala Desa, sekretaris, atau admin. Anda tetap dapat melihat riwayat siaran di bawah.</p>}
          <section aria-labelledby="al-log" className="space-y-2">
            <h3 id="al-log" className="font-semibold">
              Riwayat siaran ({data.total})
            </h3>
            {data.rows.length ? (
              <ul className="space-y-2">
                {data.rows.map((a) => (
                  <li key={a.id} className="min-w-0 rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-medium">{a.title}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill tone={a.level === "AWAS" ? "overdue" : a.level === "SIAGA" ? "soon" : "info"}>{a.levelLabel}</Pill>
                        <Pill tone={STATUS_TEXT[a.status]?.[1] ?? "neutral"}>{STATUS_TEXT[a.status]?.[0] ?? a.status}</Pill>
                      </div>
                    </div>
                    <p className="mt-1 whitespace-pre-line break-words text-sm">{a.message}</p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {fmtDateTime(a.createdAt)} · {a.targetLabel} · {a.recipientAccounts} akun, {a.deviceCount} perangkat{a.hazardLabel ? ` · ${a.hazardLabel}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada siaran peringatan dini.</p>
            )}
            {data.total > data.pageSize ? (
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Sebelumnya
                </Button>
                <span className="text-sm text-muted-foreground">
                  Halaman {data.page} dari {Math.ceil(data.total / data.pageSize)}
                </span>
                <Button type="button" variant="outline" className="min-h-11" disabled={page >= Math.ceil(data.total / data.pageSize)} onClick={() => setPage((p) => p + 1)}>
                  Berikutnya
                </Button>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  );
}

function Compose({ data, onSent }: { data: Resp; onSent: () => void }) {
  const [level, setLevel] = useState<AlertLevel>("WASPADA");
  const [hazard, setHazard] = useState("");
  const [kind, setKind] = useState<"ALL" | "AREA">("AREA");
  const [picked, setPicked] = useState<string[]>([]);
  const init = alertTemplate("WASPADA", null, null);
  const [title, setTitle] = useState(init.title);
  const [message, setMessage] = useState(init.message);
  const [edited, setEdited] = useState(false);
  const [sum, setSum] = useState<{ sig: string; accounts: number; devices: number; truncated: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  const targets = useMemo(
    () => picked.map((k) => data.areas.find((a) => key(a) === k)).filter((a): a is AreaOption => Boolean(a)).map((a) => ({ rw: a.rw, rt: a.rt })),
    [picked, data.areas],
  );
  const body = (preview: boolean) => ({ level, hazardType: hazard, title, message, targetKind: kind, targets: kind === "AREA" ? targets : undefined, preview, ...(preview ? {} : { expectAccounts: sum?.accounts }) });
  // Tanda isian (tanpa jumlah penerima) untuk menandai apakah hasil hitung masih berlaku.
  const sig = JSON.stringify({ ...body(true), preview: undefined });
  const fresh = sum?.sig === sig;

  function retemplate(l: AlertLevel, h: string, k: "ALL" | "AREA", t: { rw: string; rt: string | null }[]) {
    if (edited) return;
    const area = k === "ALL" ? "desa" : t.length === 1 ? (t[0]!.rt ? `RT ${t[0]!.rt}/RW ${t[0]!.rw}` : `RW ${t[0]!.rw}`) : null;
    const tpl = alertTemplate(l, (h || null) as HazardType | null, area);
    setTitle(tpl.title);
    setMessage(tpl.message);
  }
  const area = (a: AreaOption) => (a.rt ? `RT ${a.rt}/RW ${a.rw}` : `RW ${a.rw}`);
  const rws = [...new Set(data.areas.map((a) => a.rw))];

  async function preview() {
    setDone(null);
    const r = await submit<{ accounts: number; devices: number; truncated: boolean }>("/api/bencana/peringatan/kirim", "POST", body(true));
    if (r) setSum({ sig, accounts: r.accounts, devices: r.devices, truncated: r.truncated });
  }
  async function send() {
    const r = await submit<{ accounts: number; devices: number }>("/api/bencana/peringatan/kirim", "POST", body(false));
    setConfirm(false);
    if (r) {
      setDone(`Siaran dikirim ke ${r.accounts} akun warga (${r.devices} perangkat). Push berjalan di latar belakang; status akhir tampil di riwayat.`);
      setSum(null);
      onSent();
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void preview(); }} className="min-w-0 space-y-4 rounded-lg border p-4" noValidate>
      <h3 className="flex items-center gap-2 font-semibold">
        <BellRing aria-hidden="true" className="size-4" />
        Buat siaran baru
      </h3>
      <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ level: "Tingkat", hazardType: "Ancaman", title: "Judul", message: "Pesan", targetKind: "Sasaran", targets: "Wilayah", expectAccounts: "Penerima" }} />
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="al-level">Tingkat *</Label>
          <SearchSelect id="al-level" className={SELECT_CLASS} value={level} onChange={(e) => { const l = e.target.value as AlertLevel; setLevel(l); retemplate(l, hazard, kind, targets); }}>
            {opt(data.levels).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="al-haz">Jenis ancaman</Label>
          <SearchSelect id="al-haz" className={SELECT_CLASS} value={hazard} onChange={(e) => { setHazard(e.target.value); retemplate(level, e.target.value, kind, targets); }}>
            <option value="">(umum)</option>
            {opt(data.hazards).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </SearchSelect>
        </div>
      </div>

      <fieldset className="min-w-0 space-y-2">
        <legend className="text-sm font-medium">Sasaran *</legend>
        <div className="flex flex-wrap gap-4">
          {([["AREA", "RW/RT tertentu"], ["ALL", "Seluruh desa"]] as const).map(([k, l]) => (
            <label key={k} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="al-kind" className="size-5" checked={kind === k} onChange={() => { setKind(k); retemplate(level, hazard, k, targets); }} />
              {l}
            </label>
          ))}
        </div>
        {kind === "AREA" ? (
          data.areas.length ? (
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
              {rws.map((rw) => (
                <div key={rw} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">RW {rw}</p>
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    {data.areas.filter((a) => a.rw === rw).map((a) => (
                      <label key={key(a)} className="flex min-h-11 items-center gap-2 text-sm">
                        <input type="checkbox" className="size-5" checked={picked.includes(key(a))} onChange={(e) => { const n = e.target.checked ? [...picked, key(a)] : picked.filter((x) => x !== key(a)); setPicked(n); retemplate(level, hazard, kind, n.map((k) => data.areas.find((x) => key(x) === k)!).map((x) => ({ rw: x.rw, rt: x.rt }))); }} />
                        <span className="min-w-0 break-words">
                          {a.rt ? area(a) : `Seluruh RW ${a.rw} (tanpa RT)`} <span className="text-muted-foreground">({a.residents} warga)</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Data RT/RW warga belum terisi, jadi hanya sasaran seluruh desa yang tersedia.</p>
          )
        ) : null}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="al-title">Judul *</Label>
        <Input id="al-title" className="h-11" maxLength={120} value={title} onChange={(e) => { setTitle(e.target.value); setEdited(true); }} aria-invalid={Boolean(errors.title)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="al-msg">Pesan *</Label>
        <Textarea id="al-msg" rows={4} maxLength={500} value={message} onChange={(e) => { setMessage(e.target.value); setEdited(true); }} aria-invalid={Boolean(errors.message)} aria-describedby="al-msg-h" />
        <p id="al-msg-h" className="text-xs text-muted-foreground">
          {message.length}/500 karakter. Templat dapat disunting; tanpa tautan, alamat situs, atau deretan angka panjang. Cek sebelum dikirim, siaran tidak dapat ditarik.
        </p>
      </div>

      {fresh && sum ? (
        <div role="status" className="flex items-start gap-2 rounded-md border border-emerald-600/40 bg-emerald-50 p-3 text-sm text-emerald-950">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Akan diterima {sum.accounts} akun warga ({sum.devices} perangkat aktif).{sum.truncated ? " Dibatasi 20.000 akun per siaran." : ""} Akun tanpa perangkat tetap menerima di kotak masuk aplikasi.
          </p>
        </div>
      ) : null}
      {done ? (
        <p role="status" className="rounded-md border border-emerald-600/40 bg-emerald-50 p-3 text-sm text-emerald-950">
          {done}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" className="min-h-11" disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          Hitung penerima
        </Button>
        <Button type="button" className="min-h-11" disabled={busy || !fresh || !sum || sum.accounts === 0} onClick={() => setConfirm(true)}>
          <BellRing aria-hidden="true" />
          Kirim peringatan
        </Button>
      </div>
      {!fresh ? <p className="text-xs text-muted-foreground">Hitung penerima dulu; tombol kirim aktif setelah penghitungan sesuai isian terakhir.</p> : null}

      <AlertDialog open={confirm} onOpenChange={(o) => (!busy ? setConfirm(o) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="size-5 text-amber-600" />
              Kirim peringatan sekarang?
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{title}” akan dikirim ke {sum?.accounts ?? 0} akun warga ({kind === "ALL" ? "seluruh desa" : `${targets.length} wilayah`}). Siaran tidak dapat ditarik kembali, dibatasi 10 siaran per 24 jam, dan judulnya otomatis diberi label tingkat di depan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy}>
              Periksa lagi
            </AlertDialogCancel>
            <AlertDialogAction className="min-h-11" disabled={busy} onClick={(e) => { e.preventDefault(); void send(); }}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Kirim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
