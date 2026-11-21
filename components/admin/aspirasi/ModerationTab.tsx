"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, EyeOff, Loader2, MapPin, MessageCircle, Pencil, RotateCcw, Search, ShieldOff, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiJson, formatWib } from "@/components/admin/security/api";
import { LIMITS, MODERATION_LABELS, PROGRESS_LABELS, categoryLabel, type AspirationProgress, type ModerationStatus } from "@/lib/aspirasi/catalog";
import { contactWaLink } from "@/lib/contacts/lead";
import { Pager } from "./Pager";
import { canDo, type AdminAspiration, type AspirationPage, type ModerationAction } from "./types";

type Props = {
  /** Lompat dari tab Laporan konten: cari kode ini di semua status. */
  focus: { code: string; nonce: number } | null;
  onCounts: (pending: number) => void;
};

const STATUS_TONE: Record<string, string> = {
  PENDING: "border-amber-500/60 text-amber-900 dark:text-amber-200",
  PUBLISHED: "border-emerald-600/50 text-emerald-900 dark:text-emerald-200",
  HIDDEN: "border-violet-600/50 text-violet-900 dark:text-violet-200",
  REJECTED: "border-destructive/50 text-destructive",
  REMOVED: "border-destructive/50 text-destructive",
};

type Dlg = { kind: "reject" | "hide" | "remove" | "edit"; item: AdminAspiration } | null;

export function ModerationTab({ focus, onCounts }: Props) {
  const ids = { status: useId(), q: useId() };
  const [status, setStatus] = useState("PENDING");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({ status: "PENDING", q: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AspirationPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const seq = useRef(0);

  const run = useCallback(async (f: { status: string; q: string }, pg: number) => {
    const my = ++seq.current;
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (f.status) sp.set("status", f.status);
      if (f.q.trim()) sp.set("q", f.q.trim());
      if (pg > 1) sp.set("page", String(pg));
      const r = await apiJson<AspirationPage>(`/api/admin/aspirasi${sp.size ? `?${sp}` : ""}`);
      if (my !== seq.current) return;
      setData(r);
      onCounts(r.counts.PENDING ?? 0);
    } catch (e) {
      if (my !== seq.current) return;
      setError(e instanceof Error ? e.message : "Gagal memuat aspirasi.");
      setData((d) => d ?? { items: [], total: 0, page: 1, pageSize: 20, counts: {} });
    }
  }, [onCounts]);
  useEffect(() => {
    void run(applied, page);
  }, [applied, page, run]);

  useEffect(() => {
    if (!focus) return;
    setStatus("");
    setQ(focus.code);
    setApplied({ status: "", q: focus.code });
    setPage(1);
  }, [focus]);

  async function act(item: AdminAspiration, action: ModerationAction, extra: Record<string, unknown> = {}): Promise<string | null> {
    setBusy(`${item.id}:${action}`);
    setError(null);
    try {
      await apiJson(`/api/admin/aspirasi/${item.id}`, { method: "PATCH", body: { action, ...extra } });
      await run(applied, page);
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Aksi gagal.";
      setError(msg);
      return msg;
    } finally {
      setBusy(null);
    }
  }

  const counts = data?.counts ?? {};

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 pt-6 text-sm">
          <p className="font-medium">Pedoman singkat moderasi</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Tolak bila memuat data pribadi (nama warga, nomor telepon, alamat rumah), menyerang orang tertentu, atau berupa iklan/spam. Alasan penolakan dibaca pelapor.</li>
            <li>Bila ragu, pilih Sembunyikan, bukan Hapus: laporan bisa ditayangkan kembali setelah diperiksa. Hapus bersifat takedown final.</li>
            <li>Periksa foto: wajah dan plat nomor harus tidak terbaca. Buang foto yang bermasalah lewat Sunting.</li>
            <li>Wilayah bertanda &quot;diketik manual&quot; belum diverifikasi ke daftar resmi; periksa ejaan nama desa, kecamatan, dan kabupaten sebelum menayangkan.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setApplied({ status, q });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor={ids.status}>Status</Label>
              <SearchSelect id={ids.status} value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                <option value="">Semua status</option>
                {(Object.keys(MODERATION_LABELS) as ModerationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {MODERATION_LABELS[s]}
                    {counts[s] != null ? ` (${counts[s]})` : ""}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={ids.q}>Cari (judul, kode, nama desa, kabupaten)</Label>
              <Input id={ids.q} value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" className="min-h-11">
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                Terapkan
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => { setStatus("PENDING"); setQ(""); setPage(1); setApplied({ status: "PENDING", q: "" }); }}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {data ? `${data.total} laporan.` : "Memuat…"}
      </p>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
          <Button size="sm" variant="outline" onClick={() => void run(applied, page)}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!data ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : data.items.length === 0 && !error ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{applied.status === "PENDING" && !applied.q ? "Antrean kosong. Semua laporan sudah ditinjau." : "Tidak ada laporan yang cocok."}</p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((it) => (
            <ItemCard key={it.id} item={it} busy={busy} onAct={act} onDialog={(kind) => setDlg({ kind, item: it })} />
          ))}
        </ul>
      )}
      {data ? <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} /> : null}

      <ActionDialog dlg={dlg} onClose={() => setDlg(null)} onSubmit={act} />
    </div>
  );
}

function ItemCard({ item, busy, onAct, onDialog }: { item: AdminAspiration; busy: string | null; onAct: (i: AdminAspiration, a: ModerationAction) => Promise<string | null>; onDialog: (k: "reject" | "hide" | "remove" | "edit") => void }) {
  const [open, setOpen] = useState(false);
  const wa = contactWaLink(item.reporter.phone, `Halo, kami dari Klandesa terkait laporan Anda (${item.code}).`);
  const isBusy = (a: string) => busy === `${item.id}:${a}`;
  const anyBusy = busy?.startsWith(`${item.id}:`) ?? false;
  const quick = (action: ModerationAction, label: string, icon: React.ReactNode, variant: "default" | "outline" = "outline") =>
    canDo(item.status, action) ? (
      <Button variant={variant} className="min-h-11" disabled={anyBusy} onClick={() => void onAct(item, action)}>
        {isBusy(action) ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
        {label}
      </Button>
    ) : null;
  const dialog = (kind: "reject" | "hide" | "remove" | "edit", action: ModerationAction, label: string, icon: React.ReactNode, destructive = false) =>
    canDo(item.status, action) ? (
      <Button variant="outline" className={`min-h-11 ${destructive ? "text-destructive" : ""}`} disabled={anyBusy} onClick={() => onDialog(kind)}>
        {icon}
        {label}
      </Button>
    ) : null;

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className="break-words text-base font-semibold">{item.title}</h3>
          <p className="text-xs text-muted-foreground">
            {categoryLabel(item.category)} · masuk {formatWib(item.createdAt)} · kode {item.code}
            {item.status === "PUBLISHED" ? ` · ${PROGRESS_LABELS[item.progress as AspirationProgress] ?? item.progress} · ${item.replies} tanggapan` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={STATUS_TONE[item.status]}>
            {MODERATION_LABELS[item.status]}
          </Badge>
          {item.noindex ? (
            <Badge variant="outline" className="gap-1">
              <ShieldOff className="h-3 w-3" aria-hidden="true" />
              Noindex
            </Badge>
          ) : null}
          {item.openFlags > 0 ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {item.openFlags} laporan konten
            </Badge>
          ) : null}
        </div>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {item.area.name}, Kec. {item.area.district}, {item.area.regency}, {item.area.province}
        {item.area.claimed ? <Badge variant="secondary">Dikelola desa</Badge> : null}
        {item.manualArea ? (
          <Badge variant="outline" className="gap-1 border-amber-500/60 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Wilayah diketik manual, periksa namanya
          </Badge>
        ) : null}
      </p>

      <p className={`mt-3 whitespace-pre-line break-words text-sm ${open ? "" : "line-clamp-4"}`}>{item.body}</p>
      <button type="button" className="mt-1 min-h-9 text-sm text-muted-foreground underline-offset-2 hover:underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Ringkas isi" : "Baca isi lengkap"}
      </button>
      {item.locationNote ? <p className="mt-1 text-sm text-muted-foreground">Patokan lokasi: {item.locationNote}</p> : null}

      {item.photos.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Foto laporan">
          {item.photos.map((src, i) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Buka foto ${i + 1} ukuran penuh di tab baru`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto laporan ${i + 1} dari ${item.photos.length}`} loading="lazy" className="h-24 w-24 object-cover" />
              </a>
            </li>
          ))}
        </ul>
      ) : item.photoKeys.length > 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{item.photoKeys.length} foto terlampir, tetapi penyimpanan foto belum dikonfigurasi sehingga tidak dapat ditampilkan.</p>
      ) : null}

      <div className="mt-3 rounded-md border border-dashed bg-muted/40 p-3 text-sm">
        <p className="font-medium">Kontak pelapor (hanya admin platform, jangan dibagikan)</p>
        <p className="mt-1 break-words text-muted-foreground">
          {item.reporter.name ?? "Tanpa nama"} · {item.reporter.phone ?? "tanpa nomor"} · {item.reporter.email ?? "tanpa email"}
        </p>
        {wa ? (
          <Button asChild variant="outline" size="sm" className="mt-2 min-h-10">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Chat WhatsApp pelapor
            </a>
          </Button>
        ) : null}
      </div>

      {item.rejectReason ? <p className="mt-2 text-sm">Alasan penolakan (dibaca pelapor): {item.rejectReason}</p> : null}
      {item.moderationNote ? <p className="mt-1 text-sm text-muted-foreground">Catatan internal: {item.moderationNote}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {quick("publish", "Tayangkan", <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />, "default")}
        {dialog("reject", "reject", "Tolak", <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />)}
        {dialog("hide", "hide", "Sembunyikan", <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />)}
        {quick("reopen", "Buka kembali", <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />)}
        {dialog("edit", "edit", "Sunting", <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />)}
        {item.noindex ? quick("index", "Izinkan indeks", <ShieldOff className="mr-2 h-4 w-4" aria-hidden="true" />) : quick("noindex", "Tandai noindex", <ShieldOff className="mr-2 h-4 w-4" aria-hidden="true" />)}
        {dialog("remove", "remove", "Hapus (takedown)", <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />, true)}
      </div>
    </li>
  );
}

function ActionDialog({ dlg, onClose, onSubmit }: { dlg: Dlg; onClose: () => void; onSubmit: (i: AdminAspiration, a: ModerationAction, extra: Record<string, unknown>) => Promise<string | null> }) {
  const ids = { reason: useId(), note: useId(), title: useId(), body: useId(), loc: useId() };
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loc, setLoc] = useState("");
  const [keep, setKeep] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const item = dlg?.item ?? null;
  // Mengisi ulang formulir setiap dialog dibuka untuk laporan lain (nilai awal berasal dari prop, bukan sistem luar).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!item) return;
    setReason("");
    setNote(item.moderationNote ?? "");
    setTitle(item.title);
    setBody(item.body);
    setLoc(item.locationNote ?? "");
    setKeep(item.photoKeys);
    setErr(null);
  }, [item]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!dlg || !item) return null;
  const kind = dlg.kind;
  const copy = {
    reject: { title: "Tolak laporan", desc: "Tulis alasan yang jelas dan sopan; pelapor dapat membacanya lewat cek status.", cta: "Tolak laporan", action: "reject" as const },
    hide: { title: "Sembunyikan laporan", desc: "Laporan hilang dari halaman publik sementara, dan bisa ditayangkan kembali setelah diperiksa.", cta: "Sembunyikan", action: "hide" as const },
    remove: { title: "Hapus laporan (takedown)", desc: "Laporan dihapus permanen dari tampilan publik dan tidak dapat dikembalikan. Bila ragu, pilih Sembunyikan.", cta: "Hapus laporan", action: "remove" as const },
    edit: { title: "Sunting laporan", desc: "Perbaiki judul, isi, patokan lokasi, atau buang foto bermasalah. Alamat halaman tidak berubah. Data pribadi disamarkan otomatis.", cta: "Simpan perubahan", action: "edit" as const },
  }[kind];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const extra: Record<string, unknown> = {};
    if (kind === "reject") {
      if (reason.trim().length < 5) {
        setErr("Tulis alasan penolakan (minimal 5 karakter).");
        return;
      }
      extra.rejectReason = reason.trim();
    }
    if (kind === "edit") {
      extra.title = title;
      extra.body = body;
      extra.locationNote = loc;
      extra.keepPhotoKeys = keep;
    }
    if (note.trim() || kind !== "edit") extra.note = note.trim();
    setBusy(true);
    const msg = await onSubmit(item, copy.action, extra);
    setBusy(false);
    if (msg) setErr(msg);
    else onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.desc}</DialogDescription>
          </DialogHeader>
          <p className="break-words text-sm font-medium">{item.title}</p>

          {kind === "reject" ? (
            <div className="space-y-1.5">
              <Label htmlFor={ids.reason}>Alasan penolakan (dibaca pelapor)</Label>
              <Textarea id={ids.reason} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} required />
            </div>
          ) : null}

          {kind === "edit" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={ids.title}>Judul</Label>
                <Input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.titleMax} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={ids.body}>Isi laporan</Label>
                <Textarea id={ids.body} value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={LIMITS.bodyMax} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={ids.loc}>Patokan lokasi</Label>
                <Input id={ids.loc} value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={LIMITS.locationMax} />
              </div>
              {item.photoKeys.length > 0 ? (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Foto yang dipertahankan</legend>
                  {item.photoKeys.map((k, i) => (
                    <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 shrink-0" checked={keep.includes(k)} onChange={(e) => setKeep((cur) => (e.target.checked ? [...cur, k] : cur.filter((x) => x !== k)))} />
                      {item.photos.length === item.photoKeys.length ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photos[i]} alt="" className="h-12 w-12 rounded object-cover" />
                      ) : null}
                      <span>Foto {i + 1}</span>
                    </label>
                  ))}
                </fieldset>
              ) : null}
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={ids.note}>Catatan internal (opsional, tidak tampil ke publik)</Label>
            <Textarea id={ids.note} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={LIMITS.noteMax} />
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
            <Button type="submit" variant={kind === "remove" ? "destructive" : "default"} className="min-h-11" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
              {copy.cta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
