"use client";

import { useId, useMemo, useState } from "react";
import { AlertTriangle, Info, Loader2, Split } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { KK_HEAD_ROLE, normalizeKk } from "@/lib/kependudukan/household";
import { FAMILY_ROLES } from "@/lib/kependudukan/mutasi-labels";
import {
  emptySplitInput,
  firstIssue,
  hasSplitIssues,
  sourceNeedsNewHead,
  validateSplit,
  type SplitInput,
  type SplitIssues,
  type SplitMember,
} from "@/lib/kependudukan/split";

export interface SplitHousehold {
  /** Nomor KK sekarang (16 digit), atau versi tersamar bila pemanggil tidak boleh melihat nomor lengkap. */
  kk: string;
  /** Pegangan buram (id salah satu anggota) untuk memanggil API tanpa nomor KK; bila ada, dipakai menggantikan `kk`. */
  ref?: number;
  members: { id: number; name: string; nikLast4: string; familyRole: string; /** Hidup dan belum pindah keluar. */ active: boolean }[];
}

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
const TEXTAREA_CLASS =
  "flex min-h-20 w-full rounded-md border border-input bg-input-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const spaced = (kk: string) => kk.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
const last4 = (kk: string) => `•••• ${kk.slice(-4)}`;

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}

/**
 * Pecah KK: pilih anggota yang pindah ke nomor KK baru. Atomik di server dan langsung berlaku; tiap anggota tercatat di
 * Buku Mutasi sebagai "Perubahan KK". Isian diperiksa di layar (aturan yang sama dengan server), tetapi nomor KK yang
 * sudah dipakai hanya bisa diketahui server.
 */
export function SplitHouseholdPanel({
  household,
  onDone,
  allowed = true,
  defaultOpen = false,
  onClosed,
}: {
  household: SplitHousehold;
  /** Dipanggil setelah berhasil; `movedIds` = anggota yang pindah ke KK baru (pemanggil memakainya untuk memuat ulang KK asal). */
  onDone: (info: { movedIds: number[] }) => void;
  /** `false` (mis. peran tanpa izin ubah warga) = tidak ditampilkan. */
  allowed?: boolean;
  /** Mulai dalam keadaan terbuka (pemicunya ada di tempat lain, mis. footer modal). */
  defaultOpen?: boolean;
  /** Dipanggil saat operator menekan Batal. */
  onClosed?: () => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [input, setInput] = useState<SplitInput>(() => ({ ...emptySplitInput(), effectiveDate: todayIso() }));
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverIssues, setServerIssues] = useState<SplitIssues | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const members: SplitMember[] = useMemo(
    () => household.members.map((m) => ({ id: m.id, name: m.name, familyRole: m.familyRole, active: m.active })),
    [household.members],
  );
  const active = household.members.filter((m) => m.active);
  const moving = useMemo(() => new Set(input.moves.map((m) => m.residentId)), [input.moves]);
  const remaining = active.filter((m) => !moving.has(m.id));
  const needsHead = sourceNeedsNewHead(members, moving);

  const local = useMemo(
    () => validateSplit(input, { sourceKk: household.kk, members, newKkTakenBy: null, now: new Date() }),
    [input, household.kk, members],
  );
  // Setelah dikirim, galat server (mis. KK sudah dipakai) dipakai bersama galat layar.
  const issues: SplitIssues = serverIssues && !hasSplitIssues(local) ? serverIssues : local;
  const show = submitted;
  const newKkDigits = normalizeKk(input.newKk);

  if (!allowed || active.length < 2) return null;

  const patch = (p: Partial<SplitInput>) => {
    setInput((cur) => ({ ...cur, ...p }));
    setServerIssues(null);
    setFormError(null);
  };

  const toggle = (id: number, checked: boolean) => {
    if (!checked) return patch({ moves: input.moves.filter((m) => m.residentId !== id), newSourceHeadId: null });
    // Orang pertama yang dipilih biasanya kepala KK baru; yang lain dipilih sadar oleh operator.
    const firstGetsHead = input.moves.length === 0;
    patch({ moves: [...input.moves, { residentId: id, familyRole: firstGetsHead ? KK_HEAD_ROLE : "" }] });
  };
  const setRole = (id: number, familyRole: string) =>
    patch({ moves: input.moves.map((m) => (m.residentId === id ? { ...m, familyRole } : m)) });

  async function submit() {
    setSubmitted(true);
    setFormError(null);
    if (hasSplitIssues(local)) return setFormError(firstIssue(local));
    setBusy(true);
    try {
      const res = await fetch(`/api/kk/${household.ref ?? household.kk}/pecah`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        if (j?.issues) setServerIssues(j.issues as SplitIssues);
        setFormError(typeof j?.error === "string" ? j.error : "Gagal memecah KK. Coba lagi.");
        return;
      }
      toast.success(`KK dipecah: ${j?.moved?.length ?? input.moves.length} anggota pindah ke KK ${last4(input.newKk.replace(/\D/g, ""))}.`);
      setOpen(false);
      onDone({ movedIds: input.moves.map((m) => m.residentId) });
    } catch {
      setFormError("Tidak bisa terhubung. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        <Split aria-hidden="true" />
        Pecah KK
      </Button>
    );
  }

  const kkId = `${uid}-kk`;
  const dateId = `${uid}-date`;
  const headId = `${uid}-head`;
  const addrId = `${uid}-addr`;

  return (
    <section aria-label="Pecah KK" className="w-full space-y-5 rounded-md border p-4">
      <header className="space-y-1">
        <h3 className="flex items-center gap-2 font-semibold">
          <Split aria-hidden="true" className="size-4" />
          Pecah KK
        </h3>
        <p className="text-sm text-muted-foreground">
          Pindahkan sebagian anggota ke nomor KK baru. Anggota yang tidak dipilih tetap di KK ini. Hanya untuk KK baru; untuk pindah ke KK yang sudah ada, pakai Mutasi › Perubahan KK.
        </p>
      </header>

      <fieldset className="space-y-2" aria-describedby={issues.moves && show ? `${uid}-moves-err` : undefined}>
        <legend className="mb-1 text-sm font-medium">Siapa yang pindah ke KK baru?</legend>
        <ul className="divide-y rounded-md border">
          {active.map((m) => {
            const mv = input.moves.find((x) => x.residentId === m.id);
            const err = show ? issues.members[m.id] : undefined;
            const roleId = `${uid}-role-${m.id}`;
            return (
              <li key={m.id} className="space-y-2 p-3">
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input type="checkbox" className="size-5 shrink-0" checked={Boolean(mv)} onChange={(e) => toggle(m.id, e.target.checked)} />
                  <span className="min-w-0">
                    <span className="block font-medium [overflow-wrap:anywhere]">{m.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {m.familyRole} saat ini · NIK ••••{m.nikLast4}
                    </span>
                  </span>
                </label>
                {mv ? (
                  <div className="space-y-1.5 pl-8">
                    <Label htmlFor={roleId}>Hubungan {m.name} di KK baru</Label>
                    <SearchSelect
                      id={roleId}
                      className={SELECT_CLASS}
                      value={mv.familyRole}
                      aria-invalid={err ? true : undefined}
                      onChange={(e) => setRole(m.id, e.target.value)}
                    >
                      <option value="">Pilih hubungan…</option>
                      {FAMILY_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </SearchSelect>
                    <FieldError id={`${roleId}-err`}>{err}</FieldError>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {show ? <FieldError id={`${uid}-moves-err`}>{issues.moves}</FieldError> : null}
        {show ? <FieldError id={`${uid}-heads-err`}>{issues.heads}</FieldError> : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={kkId}>Nomor KK baru</Label>
          <Input
            id={kkId}
            className="h-11 font-mono"
            inputMode="numeric"
            autoComplete="off"
            maxLength={19}
            value={input.newKk}
            aria-invalid={show && issues.newKk ? true : undefined}
            aria-describedby={`${kkId}-hint${show && issues.newKk ? ` ${kkId}-err` : ""}`}
            onChange={(e) => patch({ newKk: spaced(e.target.value.replace(/\D/g, "").slice(0, 16)) })}
          />
          <p id={`${kkId}-hint`} className="text-sm text-muted-foreground">
            16 angka, sesuai KK baru dari Dukcapil.{newKkDigits ? "" : ` ${input.newKk.replace(/\D/g, "").length}/16`}
          </p>
          {show ? <FieldError id={`${kkId}-err`}>{issues.newKk}</FieldError> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={dateId}>Tanggal KK baru berlaku</Label>
          <Input
            id={dateId}
            type="date"
            className="h-11"
            max={todayIso()}
            value={input.effectiveDate}
            aria-invalid={show && issues.effectiveDate ? true : undefined}
            aria-describedby={show && issues.effectiveDate ? `${dateId}-err` : undefined}
            onChange={(e) => patch({ effectiveDate: e.target.value })}
          />
          {show ? <FieldError id={`${dateId}-err`}>{issues.effectiveDate}</FieldError> : null}
        </div>
      </div>

      {needsHead ? (
        <div className="space-y-2">
          <p className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Kepala Keluarga lama ikut pindah. KK ini perlu Kepala Keluarga baru. Hubungan anggota lain tidak diubah otomatis.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={headId}>Kepala Keluarga baru untuk KK ini</Label>
            <SearchSelect
              id={headId}
              className={SELECT_CLASS}
              value={input.newSourceHeadId == null ? "" : String(input.newSourceHeadId)}
              aria-invalid={show && issues.newSourceHead ? true : undefined}
              onChange={(e) => patch({ newSourceHeadId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Pilih anggota yang tinggal…</option>
              {remaining.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.familyRole})
                </option>
              ))}
            </SearchSelect>
            {show ? <FieldError id={`${headId}-err`}>{issues.newSourceHead}</FieldError> : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-5 shrink-0"
            checked={input.address.enabled}
            onChange={(e) => patch({ address: { ...input.address, enabled: e.target.checked } })}
          />
          KK baru beralamat berbeda (alamat/RT/RW/dusun diganti untuk yang pindah)
        </label>
        {input.address.enabled ? (
          <div className="space-y-3 pl-8">
            <div className="space-y-1.5">
              <Label htmlFor={addrId}>Alamat KK baru</Label>
              <textarea
                id={addrId}
                className={TEXTAREA_CLASS}
                maxLength={500}
                value={input.address.address}
                aria-invalid={show && issues.address ? true : undefined}
                aria-describedby={show && issues.address ? `${addrId}-err` : undefined}
                onChange={(e) => patch({ address: { ...input.address, address: e.target.value } })}
              />
              {show ? <FieldError id={`${addrId}-err`}>{issues.address}</FieldError> : null}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(["rt", "rw", "hamlet"] as const).map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`${uid}-${k}`}>{k === "hamlet" ? "Dusun" : k.toUpperCase()}</Label>
                  <Input
                    id={`${uid}-${k}`}
                    className="h-11"
                    maxLength={k === "hamlet" ? 100 : 10}
                    value={input.address[k]}
                    onChange={(e) => patch({ address: { ...input.address, [k]: e.target.value } })}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div role="status" aria-live="polite" className="flex gap-2 rounded-md bg-muted p-3 text-sm">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p>
          {input.moves.length === 0
            ? "Pilih anggota yang pindah untuk melihat ringkasannya."
            : `${input.moves.length} orang pindah ke KK ${newKkDigits ? last4(newKkDigits) : "baru"}; ${remaining.length} orang tetap di KK ${last4(household.kk)}. Langsung berlaku dan tercatat di Buku Mutasi sebagai Perubahan KK.`}
        </p>
      </div>

      {formError ? (
        <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" className="min-h-11" disabled={busy} onClick={() => void submit()}>
          {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {busy ? "Memecah…" : "Pecah KK"}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => { setOpen(false); onClosed?.(); }}>
          Batal
        </Button>
      </div>
    </section>
  );
}
