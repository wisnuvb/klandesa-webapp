"use client";

import { AlertTriangle, Download, Eye, EyeOff, FilterX, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { cn } from "@/components/ui/utils";
import {
  KK_FLAG_META,
  KK_HAS,
  KK_HAS_LABEL,
  KK_PRESET_LABEL,
  KK_SIZES,
  KK_SIZE_LABEL,
  type KkFlag,
  type KkHas,
  type KkListRow,
  type KkPreset,
  type KkSize,
  type KkSummary,
} from "@/lib/kependudukan/kk-list";

const nf = new Intl.NumberFormat("id-ID");

export interface KkFilters {
  dusun: string;
  rw: string;
  rt: string;
  size: KkSize | "";
  has: KkHas | "";
  preset: KkPreset | "";
}

export const EMPTY_FILTERS: KkFilters = { dusun: "", rw: "", rt: "", size: "", has: "", preset: "" };
export const hasActiveFilter = (f: KkFilters) => Object.values(f).some(Boolean);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PresetTile({ label, value, active, onClick, attention }: { label: string; value: number; active: boolean; onClick: () => void; attention?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 flex-col items-start justify-start rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
    >
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {attention ? <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" /> : null}
        {label}
      </span>
      <span className="mt-1 block text-2xl font-semibold tabular-nums">{nf.format(value)}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{active ? "Filter aktif, klik untuk mematikan" : "Klik untuk menyaring"}</span>
    </button>
  );
}

/** Ringkasan di atas tabel: tiga angka dan tiga pintasan filter. Memuat data sendiri lewat `summary` (null = belum ada). */
export function KkSummaryStrip({ summary, preset, onPreset }: { summary: KkSummary | null; preset: KkPreset | ""; onPreset: (p: KkPreset | "") => void }) {
  if (!summary) {
    return <div aria-hidden="true" className="grid h-24 grid-cols-2 gap-3 lg:grid-cols-6"><div className="col-span-2 rounded-lg border bg-muted/40 lg:col-span-6" /></div>;
  }
  const toggle = (p: KkPreset) => onPreset(preset === p ? "" : p);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <Stat label="Total KK" value={nf.format(summary.totalKk)} />
      <Stat label="Jiwa aktif" value={nf.format(summary.totalJiwa)} hint="Hidup dan belum pindah" />
      <Stat label="Rata-rata anggota" value={summary.rataRataAnggota.toLocaleString("id-ID")} hint="Per KK yang berpenghuni" />
      <PresetTile attention label={KK_PRESET_LABEL.perhatian} value={summary.perhatian} active={preset === "perhatian"} onClick={() => toggle("perhatian")} />
      <PresetTile label={KK_PRESET_LABEL.lansia_sendiri} value={summary.lansiaSendiri} active={preset === "lansia_sendiri"} onClick={() => toggle("lansia_sendiri")} />
      <PresetTile label={KK_PRESET_LABEL.tanpa_dewasa} value={summary.tanpaDewasa} active={preset === "tanpa_dewasa"} onClick={() => toggle("tanpa_dewasa")} />
    </div>
  );
}

const SELECT_CLASS = "w-full";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Baris filter: semua dropdown bisa dicari (SearchSelect). Nilai pilihan wilayah berasal dari data desa. */
export function KkFilterBar({ summary, filters, onChange }: { summary: KkSummary | null; filters: KkFilters; onChange: (patch: Partial<KkFilters>) => void }) {
  const w = summary?.wilayah ?? { dusun: [], rw: [], rt: [] };
  return (
    <div role="group" aria-label="Filter daftar KK" className="rounded-lg border bg-card p-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Field id="kk-f-dusun" label="Dusun">
          <SearchSelect id="kk-f-dusun" className={SELECT_CLASS} value={filters.dusun} onChange={(e) => onChange({ dusun: e.target.value })}>
            <option value="">Semua dusun</option>
            {w.dusun.map((d) => <option key={d} value={d}>{d}</option>)}
          </SearchSelect>
        </Field>
        <Field id="kk-f-rw" label="RW">
          <SearchSelect id="kk-f-rw" className={SELECT_CLASS} value={filters.rw} onChange={(e) => onChange({ rw: e.target.value })}>
            <option value="">Semua RW</option>
            {w.rw.map((r) => <option key={r} value={r}>RW {r}</option>)}
          </SearchSelect>
        </Field>
        <Field id="kk-f-rt" label="RT">
          <SearchSelect id="kk-f-rt" className={SELECT_CLASS} value={filters.rt} onChange={(e) => onChange({ rt: e.target.value })}>
            <option value="">Semua RT</option>
            {w.rt.map((r) => <option key={r} value={r}>RT {r}</option>)}
          </SearchSelect>
        </Field>
        <Field id="kk-f-size" label="Jumlah anggota aktif">
          <SearchSelect id="kk-f-size" className={SELECT_CLASS} value={filters.size} onChange={(e) => onChange({ size: e.target.value as KkSize | "" })}>
            <option value="">Berapa pun</option>
            {KK_SIZES.map((s) => <option key={s} value={s}>{KK_SIZE_LABEL[s]}</option>)}
          </SearchSelect>
        </Field>
        <Field id="kk-f-has" label="Ada anggota">
          <SearchSelect id="kk-f-has" className={SELECT_CLASS} value={filters.has} onChange={(e) => onChange({ has: e.target.value as KkHas | "" })}>
            <option value="">Semua keluarga</option>
            {KK_HAS.map((h) => <option key={h} value={h}>{KK_HAS_LABEL[h]}</option>)}
          </SearchSelect>
        </Field>
      </div>
      {hasActiveFilter(filters) ? (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={() => onChange(EMPTY_FILTERS)}>
            <FilterX aria-hidden="true" className="h-4 w-4" />
            Hapus semua filter
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Tombol admin: tampilkan/sembunyikan nomor KK lengkap di tabel. Hanya dirender bila pengguna boleh. */
export function RevealToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Button type="button" variant={on ? "default" : "outline"} className="min-h-10 gap-2" aria-pressed={on} onClick={onToggle}>
      {on ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
      {on ? "Sembunyikan nomor lengkap" : "Tampilkan nomor lengkap"}
    </Button>
  );
}

/** Menu unduh hasil yang sedang tampil. Hanya dirender bagi pemegang izin ekspor (admin). */
export function ExportMenu({ busy, onExport }: { busy: boolean; onExport: (format: "excel" | "csv") => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="min-h-10 gap-2" disabled={busy}>
          {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
          {busy ? "Menyiapkan berkas…" : "Unduh hasil"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onExport("excel")}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onExport("csv")}>CSV (.csv)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Lencana masalah data. Selalu ada teks (bukan hanya warna); KK tanpa anggota aktif ditampilkan netral. */
export function KkFlagBadges({ flags }: { flags: KkFlag[] }) {
  if (flags.length === 0) return <span className="text-muted-foreground" aria-label="Tidak ada masalah data">-</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {flags.map((f) => {
        const m = KK_FLAG_META[f];
        return (
          <li key={f}>
            <Badge
              variant="outline"
              title={m.help}
              className={cn("gap-1 whitespace-normal text-left", m.attention && "border-amber-500 bg-amber-50 text-amber-900")}
            >
              {m.attention ? <AlertTriangle aria-hidden="true" className="h-3 w-3 shrink-0" /> : null}
              {m.label}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

const CHIPS: { key: keyof KkListRow["komposisi"]; label: string; help: string }[] = [
  { key: "balita", label: "Balita", help: "Anggota aktif berusia di bawah 5 tahun" },
  { key: "lansia", label: "Lansia", help: "Anggota aktif berusia 60 tahun atau lebih" },
  { key: "hamil", label: "Hamil", help: "Anggota aktif yang tercatat sedang hamil" },
  { key: "disabilitas", label: "Disabilitas", help: "Anggota aktif yang tercatat penyandang disabilitas" },
  { key: "stunting", label: "Stunting", help: "Anggota aktif yang tercatat stunting" },
];

/** Chip komposisi/kesehatan: hanya jumlah (tanpa nama). Kosong berarti belum tercatat, bukan pasti tidak ada. */
export function KkCompositionChips({ komposisi }: { komposisi: KkListRow["komposisi"] }) {
  const shown = CHIPS.filter((c) => komposisi[c.key] > 0);
  if (shown.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <li key={c.key}>
          <Badge variant="secondary" title={c.help} className="gap-1 tabular-nums">
            {c.label}
            <span className="font-semibold">{komposisi[c.key]}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
