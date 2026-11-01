"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArchiveRestore, Info, Loader2, Pencil, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FAMILY_ROLES, formatTanggal, MUTASI_TYPES } from "@/lib/kependudukan/mutasi-labels";
import { MUTATION_LABEL, type MutationType } from "@/lib/kependudukan/mutation";
import { useApiGet } from "@/hooks/useApiGet";
import { SearchSelect } from "@/components/ui/search-select";

interface HouseholdRow {
  id: number;
  kkNumber: string;
  status: string;
  address: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  head: { id: number; name: string } | null;
  memberCount: number;
}
interface HouseholdList {
  total: number;
  items: HouseholdRow[];
}
interface HouseholdDetail {
  id: number;
  kkNumber: string;
  address: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  headResidentId: number | null;
  members: { id: number; name: string; nikLast4: string; gender: string; familyRole: string; birthDate: string; status: "aktif" | "meninggal" | "pindah" }[];
  mutations: { id: string; type: string; status: string; effectiveDate: string; residentName: string | null }[];
}
interface WilayahNode {
  id: number;
  name: string;
  residents: number;
  households: number;
}
interface WilayahTree {
  dusun: WilayahNode[];
  rw: (WilayahNode & { rt: WilayahNode[] })[];
  rtTanpaRw: WilayahNode[];
}

const maskKk = (kk: string) => `•••• •••• •••• ${kk.slice(-4)}`;
const spaced = (kk: string) => kk.replace(/(\d{4})(?=\d)/g, "$1 ");
const STATUS_TEXT = { aktif: "Aktif", meninggal: "Meninggal", pindah: "Sudah pindah" } as const;
const MUTASI_STATUS = { PENDING: "menunggu", APPLIED: "diterapkan", REJECTED: "ditolak", CANCELLED: "dibatalkan" } as Record<string, string>;
const isMutType = (t: string): t is MutationType => (MUTASI_TYPES as readonly string[]).includes(t);


const SELECT_CLASS = "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

async function sendJson(url: string, method: string, body: unknown): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: j ?? {} };
    return { ok: false, error: typeof j?.error === "string" ? j.error : "Permintaan gagal. Coba lagi." };
  } catch {
    return { ok: false, error: "Tidak bisa terhubung. Periksa koneksi lalu coba lagi." };
  }
}

interface StatusInfo {
  enabled?: boolean;
  isAdmin?: boolean;
  canManage?: boolean;
}

function OffNotice() {
  return (
    <div className="flex gap-3 rounded-lg border bg-card p-6">
      <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="font-semibold">Fitur ini belum diaktifkan untuk desa Anda</h2>
        <p className="text-sm text-muted-foreground">Daftar keluarga dan wilayah dinyalakan bertahap oleh tim Klandesa setelah data KK desa diperiksa.</p>
      </div>
    </div>
  );
}

function Failure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
      <p>{message}</p>
      <Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>
        Coba lagi
      </Button>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <p role="status" className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
      <Loader2 aria-hidden="true" className="size-5 animate-spin" />
      {text}
    </p>
  );
}


function ChangeHeadPanel({ detail, onDone }: { detail: HouseholdDetail; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [newHead, setNewHead] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = detail.members.filter((m) => m.status === "aktif");
  const candidates = active.filter((m) => m.id !== detail.headResidentId || active.filter((x) => x.familyRole === "Kepala Keluarga").length > 1);
  const otherHeads = active.filter((m) => m.familyRole === "Kepala Keluarga" && String(m.id) !== newHead);
  if (active.length === 0) return null;

  async function save() {
    if (!newHead) return setError("Pilih siapa Kepala Keluarga yang baru.");
    if (otherHeads.length > 0 && !role) return setError(`Pilih hubungan keluarga yang baru untuk ${otherHeads.map((o) => o.name).join(", ")}.`);
    setBusy(true);
    setError(null);
    const r = await sendJson(`/api/kependudukan/households/${detail.id}`, "PATCH", { headResidentId: Number(newHead), otherHeadsRole: role || undefined });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success("Kepala Keluarga diganti.");
    setOpen(false);
    onDone();
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        <Pencil aria-hidden="true" />
        Ganti Kepala Keluarga
      </Button>
    );
  }
  return (
    <section aria-label="Ganti Kepala Keluarga" className="space-y-3 rounded-md border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="kepala-baru">Kepala Keluarga yang baru</Label>
        <SearchSelect id="kepala-baru" className={SELECT_CLASS} value={newHead} onChange={(e) => setNewHead(e.target.value)}>
          <option value="">Pilih anggota…</option>
          {candidates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.familyRole})
            </option>
          ))}
        </SearchSelect>
      </div>
      {otherHeads.length > 0 ? (
        <div className="space-y-1.5">
          <Label htmlFor="kepala-lama">Hubungan keluarga yang baru untuk {otherHeads.map((o) => o.name).join(", ")}</Label>
          <SearchSelect id="kepala-lama" className={SELECT_CLASS} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Pilih…</option>
            {FAMILY_ROLES.filter((r) => r !== "Kepala Keluarga").map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SearchSelect>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" className="min-h-11" disabled={busy} onClick={() => void save()}>
          {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          Simpan
        </Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setOpen(false)}>
          Batal
        </Button>
      </div>
    </section>
  );
}

function HouseholdDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const d = useApiGet<HouseholdDetail>(`/api/kependudukan/households/${id}`);
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{d.data ? `KK ${spaced(d.data.kkNumber)}` : "Detail keluarga"}</DialogTitle>
          <DialogDescription>
            {d.data ? `${d.data.address}${d.data.rt || d.data.rw ? ` · RT ${d.data.rt ?? "-"}/RW ${d.data.rw ?? "-"}` : ""}${d.data.hamlet ? ` · ${d.data.hamlet}` : ""}` : "Memuat…"}
          </DialogDescription>
        </DialogHeader>
        {d.loading ? <Loading text="Memuat anggota…" /> : null}
        {d.error ? <Failure message={d.error} onRetry={d.reload} /> : null}
        {d.data ? (
          <div className="space-y-5">
            {d.data.headResidentId == null ? (
              <p className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Keluarga ini belum punya Kepala Keluarga yang aktif. Perbaiki lewat halaman Perbaikan Data KK.
              </p>
            ) : null}
            <ChangeHeadPanel key={d.data.members.map((m) => m.familyRole).join("|")} detail={d.data} onDone={d.reload} />
            <section aria-labelledby="anggota-title">
              <h3 id="anggota-title" className="mb-2 font-semibold">
                Anggota ({d.data.members.length})
              </h3>
              <ul className="divide-y rounded-md border">
                {d.data.members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div>
                      <p className="font-medium">
                        {m.name}
                        {m.id === d.data!.headResidentId ? " (Kepala Keluarga)" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {m.familyRole} · {m.gender} · lahir {formatTanggal(m.birthDate)} · NIK ••••{m.nikLast4}
                      </p>
                    </div>
                    <span className="text-sm">{STATUS_TEXT[m.status]}</span>
                  </li>
                ))}
              </ul>
            </section>
            {d.data.mutations.length ? (
              <section aria-labelledby="riwayat-title">
                <h3 id="riwayat-title" className="mb-2 font-semibold">
                  Riwayat mutasi
                </h3>
                <ul className="space-y-1 text-sm">
                  {d.data.mutations.map((m) => (
                    <li key={m.id}>
                      {formatTanggal(m.effectiveDate)} · {isMutType(m.type) ? MUTATION_LABEL[m.type] : m.type} · {m.residentName ?? "-"} ({MUTASI_STATUS[m.status] ?? m.status})
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Keluarga() {
  const [q, setQ] = useState("");
  const [noHead, setNoHead] = useState(false);
  const [limit, setLimit] = useState(20);
  const [open, setOpen] = useState<number | null>(null);
  const dq = useDeferredValue(q.trim());
  const params = new URLSearchParams({ limit: String(limit) });
  if (dq) params.set("q", dq);
  if (noHead) params.set("tanpaKepala", "1");
  const list = useApiGet<HouseholdList>(`/api/kependudukan/households?${params}`);

  if (list.off) return <OffNotice />;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Cari keluarga" className="h-11 pl-9" placeholder="Cari nama anggota atau 4 angka akhir KK" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={noHead} onChange={(e) => setNoHead(e.target.checked)} />
          Hanya yang belum punya Kepala Keluarga
        </label>
      </div>

      {list.error ? <Failure message={list.error} onRetry={list.reload} /> : null}
      {list.loading && !list.data ? <Loading text="Memuat keluarga…" /> : null}
      {list.data ? (
        <>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {list.data.total} keluarga
          </p>
          {list.data.items.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada keluarga yang cocok.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {list.data.items.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(h.id)}
                    className="flex min-h-11 w-full flex-col gap-1 rounded-lg border bg-card p-4 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-semibold">{h.head ? h.head.name : "Belum ada Kepala Keluarga"}</span>
                    <span className="text-sm text-muted-foreground">
                      KK {maskKk(h.kkNumber)} · {h.memberCount} anggota
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {h.rt || h.rw ? `RT ${h.rt ?? "-"}/RW ${h.rw ?? "-"}` : "Wilayah belum diisi"}
                      {h.hamlet ? ` · ${h.hamlet}` : ""}
                    </span>
                    {!h.head ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 dark:text-amber-200">
                        <AlertTriangle aria-hidden="true" className="size-4" />
                        Perlu dicek
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {list.data.items.length < list.data.total && limit < 100 ? (
            <div className="flex justify-center">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setLimit((l) => Math.min(100, l + 20))}>
                Tampilkan lebih banyak
              </Button>
            </div>
          ) : null}
          {list.data.items.length < list.data.total && limit >= 100 ? <p className="text-center text-sm text-muted-foreground">Persempit pencarian untuk melihat keluarga lainnya.</p> : null}
        </>
      ) : null}
      {open != null ? <HouseholdDetailDialog key={open} id={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

type Unit = { id: number; name: string; type: "dusun" | "RW" | "RT"; residents: number };
const normName = (v: string) => v.trim().replace(/\s+/g, " ").toUpperCase().replace(/^0+(?=\d)/, "");

function RenameDialog({ unit, siblings, onClose, onDone }: { unit: Unit; siblings: string[]; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(unit.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const merges = siblings.some((n) => normName(n) === normName(name)) && normName(name) !== normName(unit.name);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Nama wajib diisi.");
    setBusy(true);
    setError(null);
    const r = await sendJson(`/api/kependudukan/wilayah/${unit.id}`, "PATCH", { name });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success(r.data.merged ? `Digabung. ${r.data.moved} warga dipindahkan.` : `Nama diubah. ${r.data.moved} warga diperbarui.`);
    onDone();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah nama atau gabungkan</DialogTitle>
          <DialogDescription>
            {unit.type === "dusun" ? "Dusun" : unit.type} {unit.name} · {unit.residents} warga. Berlaku untuk semua warga di wilayah ini.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="wilayah-nama">Nama baru</Label>
            <Input id="wilayah-nama" list="wilayah-nama-list" className="h-11" value={name} onChange={(e) => setName(e.target.value)} maxLength={unit.type === "dusun" ? 100 : 10} />
            <datalist id="wilayah-nama-list">
              {siblings.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <p className="text-sm text-muted-foreground">Pilih nama yang sudah ada dari daftar untuk menggabungkan, misalnya memperbaiki salah ketik.</p>
          </div>
          {merges ? (
            <p role="status" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Nama ini sudah ada. Kedua wilayah akan digabung menjadi satu.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {merges ? "Gabungkan" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Wilayah({ canManage }: { canManage: boolean }) {
  const w = useApiGet<WilayahTree>("/api/kependudukan/wilayah");
  const [editing, setEditing] = useState<{ unit: Unit; siblings: string[] } | null>(null);
  if (w.off) return <OffNotice />;
  if (w.loading) return <Loading text="Memuat wilayah…" />;
  if (w.error) return <Failure message={w.error} onRetry={w.reload} />;
  if (!w.data) return null;
  const { dusun, rw, rtTanpaRw } = w.data;
  const edit = (unit: Unit, siblings: WilayahNode[]) =>
    canManage ? (
      <Button type="button" variant="ghost" className="min-h-11" aria-label={`Ubah atau gabungkan ${unit.type === "dusun" ? "dusun" : unit.type} ${unit.name}`} onClick={() => setEditing({ unit, siblings: siblings.filter((s) => s.id !== unit.id).map((s) => s.name) })}>
        <Pencil aria-hidden="true" />
        Ubah
      </Button>
    ) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="dusun-title" className="space-y-2">
        <h2 id="dusun-title" className="text-lg font-semibold">
          Dusun ({dusun.length})
        </h2>
        <p className="text-sm text-muted-foreground">Dusun dan RW bisa saling silang, jadi dihitung terpisah.</p>
        <ul className="divide-y rounded-md border">
          {dusun.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-3">
              <span className="font-medium">{d.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {d.residents} warga · {d.households} KK
                </span>
                {edit({ id: d.id, name: d.name, type: "dusun", residents: d.residents }, dusun)}
              </span>
            </li>
          ))}
          {dusun.length === 0 ? <li className="p-3 text-sm text-muted-foreground">Belum ada dusun tercatat.</li> : null}
        </ul>
      </section>
      <section aria-labelledby="rw-title" className="space-y-2">
        <h2 id="rw-title" className="text-lg font-semibold">
          RW dan RT ({rw.length} RW)
        </h2>
        <ul className="space-y-2">
          {rw.map((r) => (
            <li key={r.id}>
              <details className="rounded-md border">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 p-3 font-medium">
                  <span>RW {r.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {r.rt.length} RT · {r.rt.reduce((a, x) => a + x.residents, 0) + r.residents} warga
                  </span>
                </summary>
                <div className="flex justify-end border-t px-2">{edit({ id: r.id, name: r.name, type: "RW", residents: r.rt.reduce((a, x) => a + x.residents, 0) + r.residents }, rw)}</div>
                <ul className="divide-y border-t">
                  {r.rt.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-1 text-sm">
                      <span>RT {t.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {t.residents} warga · {t.households} KK
                        </span>
                        {edit({ id: t.id, name: t.name, type: "RT", residents: t.residents }, r.rt)}
                      </span>
                    </li>
                  ))}
                  {r.rt.length === 0 ? <li className="px-4 py-2 text-sm text-muted-foreground">Belum ada RT tercatat.</li> : null}
                </ul>
              </details>
            </li>
          ))}
          {rtTanpaRw.length ? (
            <li className="rounded-md border p-3 text-sm">
              <p className="font-medium">RT tanpa RW ({rtTanpaRw.length})</p>
              <p className="text-muted-foreground">Warga ini mengisi RT tetapi RW-nya kosong. Lengkapi lewat Data Warga.</p>
            </li>
          ) : null}
        </ul>
      </section>
      {editing ? <RenameDialog key={editing.unit.id} unit={editing.unit} siblings={editing.siblings} onClose={() => setEditing(null)} onDone={w.reload} /> : null}
    </div>
  );
}

interface ArsipList {
  retentionDays: number;
  total: number;
  items: { id: string; name: string; nikLast4: string; familyRole: string; deletedAt: string; reason: string | null; expiresAt: string }[];
}

function Arsip() {
  const a = useApiGet<ArsipList>("/api/kependudukan/arsip?limit=50");
  const [target, setTarget] = useState<ArsipList["items"][number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (a.off) return <OffNotice />;
  if (a.loading) return <Loading text="Memuat arsip…" />;
  if (a.error) return <Failure message={a.error} onRetry={a.reload} />;
  if (!a.data) return null;

  async function restore() {
    if (!target) return;
    setBusy(true);
    setError(null);
    const r = await sendJson("/api/kependudukan/arsip/pulihkan", "POST", { id: target.id });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success(`${target.name} dipulihkan ke Data Warga.`);
    setTarget(null);
    a.reload();
  }

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Warga yang dihapus dari Data Warga disimpan di sini selama {a.data.retentionDays} hari, lalu dihapus permanen. Yang dipulihkan hanya data warganya; kunjungan
        posyandu, keanggotaan koperasi, dan akun aplikasinya tidak ikut kembali.
      </p>
      {a.data.items.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Tidak ada warga terhapus yang tersimpan.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {a.data.items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="font-medium">{i.name}</p>
                <p className="text-sm text-muted-foreground">
                  NIK ••••{i.nikLast4} · {i.familyRole} · dihapus {formatTanggal(i.deletedAt.slice(0, 10))} · disimpan sampai {formatTanggal(i.expiresAt.slice(0, 10))}
                </p>
              </div>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(null); setTarget(i); }}>
                <ArchiveRestore aria-hidden="true" />
                Pulihkan
              </Button>
            </li>
          ))}
        </ul>
      )}
      {target ? (
        <Dialog open onOpenChange={(o) => (!o && !busy ? setTarget(null) : undefined)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Pulihkan {target.name}?</DialogTitle>
              <DialogDescription>Data warga ini dikembalikan ke Data Warga dan dimasukkan lagi ke keluarganya.</DialogDescription>
            </DialogHeader>
            {error ? (
              <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setTarget(null)}>
                Batal
              </Button>
              <Button type="button" className="min-h-11" disabled={busy} onClick={() => void restore()}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                Ya, pulihkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

type Tab = "keluarga" | "wilayah" | "arsip";
const TAB_LABEL: Record<Tab, string> = { keluarga: "Keluarga (KK)", wilayah: "Wilayah", arsip: "Warga terhapus" };

export function KeluargaView() {
  const [tab, setTab] = useState<Tab>("keluarga");
  const status = useApiGet<StatusInfo>("/api/kependudukan/status");
  const tabs: Tab[] = status.data?.isAdmin ? ["keluarga", "wilayah", "arsip"] : ["keluarga", "wilayah"];
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/data-warga" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Data Warga
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Users aria-hidden="true" className="size-6" />
          Keluarga dan Wilayah
        </h1>
        <p className="max-w-prose text-muted-foreground">Daftar KK beserta anggotanya, dan pembagian dusun, RW, dan RT desa. Dibentuk otomatis dari Data Warga.</p>
      </header>
      <div role="tablist" aria-label="Tampilan" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-full border px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "keluarga" ? <Keluarga /> : tab === "wilayah" ? <Wilayah canManage={Boolean(status.data?.canManage)} /> : <Arsip />}
      </div>
    </div>
  );
}
