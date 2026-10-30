"use client";

import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Search, Smartphone, Trash2, Wand2, XCircle } from "lucide-react";
import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import {
  FIELDS,
  FIELD_BY_ID,
  OPTIONS,
  mobileReadiness,
  unknownValues,
  type FieldId,
  type ImportRow,
  type Issue,
  type MobileReadiness,
  type RowStatus,
} from "@/lib/residents-import";
import type { ExistingMode, ImportWizard } from "./useImportWizard";

const PAGE_SIZE = 50;

const LIST_IDS: Partial<Record<FieldId, string>> = {
  gender: "imp-dl-gender",
  religion_id: "imp-dl-religion",
  marital_status: "imp-dl-marital",
  status_family_id: "imp-dl-role",
  education_id: "imp-dl-education",
  job_id: "imp-dl-job",
  blood_type_id: "imp-dl-blood",
  nationality: "imp-dl-nationality",
  is_alive: "imp-dl-yn",
  is_illiterate: "imp-dl-yn",
  is_disability: "imp-dl-yn",
  is_pregnant: "imp-dl-yn",
  is_breastfeeding: "imp-dl-yn",
  is_stunting: "imp-dl-yn",
  is_bpjs_kis: "imp-dl-yn",
};

const DATALISTS: Array<[string, string[]]> = [
  ["imp-dl-gender", OPTIONS.gender],
  ["imp-dl-religion", OPTIONS.religion],
  ["imp-dl-marital", OPTIONS.marital],
  ["imp-dl-role", OPTIONS.familyRole],
  ["imp-dl-education", OPTIONS.education],
  ["imp-dl-job", OPTIONS.job],
  ["imp-dl-blood", OPTIONS.blood.filter((b) => b !== "Tidak Tahu")],
  ["imp-dl-nationality", ["Indonesia", "WNA"]],
  ["imp-dl-yn", ["Y", "N"]],
];

const FIXABLE: FieldId[] = ["religion_id", "marital_status", "status_family_id", "education_id", "job_id"];
const FIXABLE_OPTIONS: Partial<Record<FieldId, string[]>> = {
  religion_id: OPTIONS.religion,
  marital_status: OPTIONS.marital,
  status_family_id: OPTIONS.familyRole,
  education_id: OPTIONS.education,
  job_id: OPTIONS.job,
};

function colWidth(id: FieldId): string {
  const kind = FIELD_BY_ID[id].kind;
  if (id === "name") return "min-w-52";
  if (id === "address") return "min-w-64";
  if (kind === "nik" || kind === "kk") return "min-w-44 font-mono";
  if (kind === "date") return "min-w-36";
  if (id === "job_id" || id === "status_family_id" || id === "education_id") return "min-w-48";
  if (id === "rt" || id === "rw") return "min-w-20";
  return "min-w-36";
}

const LEVEL_LABEL: Record<Issue["level"], string> = { error: "Error", warning: "Periksa", fixed: "Diperbaiki otomatis" };
const LEVEL_RANK: Record<Issue["level"], number> = { error: 3, warning: 2, fixed: 1 };

const CELL_STYLE: Record<Issue["level"], string> = {
  error: "border-red-500 bg-red-50 focus-visible:ring-red-500/30 dark:bg-red-950/30",
  warning: "border-amber-500 bg-amber-50 focus-visible:ring-amber-500/30 dark:bg-amber-950/30",
  fixed: "border-sky-400 bg-sky-50 focus-visible:ring-sky-400/30 dark:bg-sky-950/30",
};

interface CellProps {
  rowKey: number;
  field: FieldId;
  value: string;
  issues: Issue[] | undefined;
  onCommit: (key: number, field: FieldId, value: string) => void;
}

/** Sel yang divalidasi saat blur/Enter (bukan tiap ketikan), sesuai praktik validasi inline. */
const Cell = memo(function Cell({ rowKey, field, value, issues, onCommit }: CellProps) {
  const worst = issues?.reduce<Issue["level"] | null>((w, i) => (!w || LEVEL_RANK[i.level] > LEVEL_RANK[w] ? i.level : w), null) ?? null;
  const descId = `imp-msg-${rowKey}-${field}`;
  const input = (
    <Input
      key={value}
      defaultValue={value}
      list={LIST_IDS[field]}
      inputMode={FIELD_BY_ID[field].kind === "nik" || FIELD_BY_ID[field].kind === "kk" ? "numeric" : undefined}
      aria-label={FIELD_BY_ID[field].label}
      aria-invalid={worst === "error" ? true : undefined}
      aria-describedby={issues?.length ? descId : undefined}
      className={cn("h-8 px-2 text-sm", colWidth(field), worst && CELL_STYLE[worst])}
      onBlur={(e) => {
        if (e.target.value !== value) onCommit(rowKey, field, e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
    />
  );
  if (!issues?.length) return input;
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>{input}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <ul className="space-y-1">
            {issues.map((i, idx) => (
              <li key={idx}>
                <strong>{LEVEL_LABEL[i.level]}:</strong> {i.message}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
      <span id={descId} className="sr-only">
        {issues.map((i) => `${LEVEL_LABEL[i.level]}: ${i.message}`).join(". ")}
      </span>
    </>
  );
});

function StatusCell({ status, count, existingNote }: { status: RowStatus; count: number; existingNote: string | null }) {
  const cfg =
    status === "error"
      ? { icon: <XCircle className="size-4 text-red-600" aria-hidden />, text: "Error", cls: "text-red-700 dark:text-red-400" }
      : status === "warning"
        ? { icon: <AlertTriangle className="size-4 text-amber-600" aria-hidden />, text: "Periksa", cls: "text-amber-700 dark:text-amber-400" }
        : { icon: <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />, text: "Siap", cls: "text-emerald-700 dark:text-emerald-400" };
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium", cfg.cls)}>
        {cfg.icon}
        {cfg.text}
        {count > 0 && status !== "ok" && <span className="text-muted-foreground">({count})</span>}
      </span>
      {existingNote && (
        <Badge variant="outline" className="text-[10px]">
          {existingNote}
        </Badge>
      )}
    </div>
  );
}

interface RowProps {
  row: ImportRow;
  fields: FieldId[];
  issues: Issue[];
  status: RowStatus;
  existingNote: string | null;
  showSheet: boolean;
  onCommit: CellProps["onCommit"];
  onRemove: (key: number) => void;
}

const Row = memo(function Row({ row, fields, issues, status, existingNote, showSheet, onCommit, onRemove }: RowProps) {
  const ready = useMemo(() => mobileReadiness(row.values), [row.values]);
  const byField = useMemo(() => {
    const m: Partial<Record<FieldId, Issue[]>> = {};
    for (const i of issues) {
      if (i.field === "row") continue;
      (m[i.field] ??= []).push(i);
    }
    return m;
  }, [issues]);
  return (
    <TableRow className={cn(status === "error" && "bg-red-50/40 dark:bg-red-950/10")}>
      <TableCell className="text-xs tabular-nums text-muted-foreground">{row.srcRow}</TableCell>
      <TableCell>
        <StatusCell status={status} count={issues.filter((i) => i.level !== "fixed").length} existingNote={existingNote} />
      </TableCell>
      {showSheet && <TableCell className="max-w-28 truncate text-xs text-muted-foreground" title={row.sheet}>{row.sheet}</TableCell>}
      {fields.map((f) => (
        <TableCell key={f} className="p-1">
          <Cell rowKey={row.key} field={f} value={row.values[f] ?? ""} issues={byField[f]} onCommit={onCommit} />
        </TableCell>
      ))}
      <TableCell className="whitespace-nowrap text-xs" title={ready.reason ?? "Siap mendaftar mandiri di aplikasi"}>
        <span className={cn("font-medium", READINESS_LABEL[ready.level].cls)}>{READINESS_LABEL[ready.level].text}</span>
      </TableCell>
      <TableCell className="w-10 p-1 text-center">
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Hapus baris ${row.srcRow} dari impor`} onClick={() => onRemove(row.key)}>
          <Trash2 className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </TableCell>
    </TableRow>
  );
});

type Filter = "all" | "error" | "warning" | "fixed" | "ok" | "existing" | "mobile-code" | "mobile-blocked";

const MODE_TEXT: Record<ExistingMode, { label: string; note: string; tag: string }> = {
  skip: { label: "Lewati", note: "Data yang sudah ada tidak diubah.", tag: "Sudah ada: dilewati" },
  fill: { label: "Isi data yang kosong saja", note: "Hanya kolom yang masih kosong pada warga yang sudah ada yang diisi.", tag: "Sudah ada: diisi" },
  overwrite: { label: "Timpa dengan data file", note: "Kolom yang terisi di file menggantikan data lama (sel kosong tidak menghapus).", tag: "Sudah ada: ditimpa" },
  status: {
    label: "Perbarui status meninggal/pindah saja",
    note: "Hanya status meninggal/pindah warga yang sudah ada yang diubah; warga baru tidak ditambahkan. Akun aplikasi mobile mereka ikut dinonaktifkan.",
    tag: "Sudah ada: status diperbarui",
  },
};

const READINESS_LABEL: Record<MobileReadiness, { text: string; cls: string }> = {
  identity: { text: "Mandiri", cls: "text-emerald-700 dark:text-emerald-400" },
  code: { text: "Kode KK", cls: "text-amber-700 dark:text-amber-400" },
  blocked: { text: "Belum bisa", cls: "text-red-700 dark:text-red-400" },
};

export function ReviewStep({ wizard }: { wizard: ImportWizard }) {
  const { rows, summary, existing, existingCount, plans, mode, issuesOf, statusOfRow, editCell, removeRows } = wizard;
  const [filter, setFilter] = useState<Filter>("all");
  const [sheetFilter, setSheetFilter] = useState("__all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);

  const sheets = useMemo(() => [...new Set(rows.map((r) => r.sheet))], [rows]);

  const fields = useMemo(() => {
    const mapped = new Set<FieldId>();
    plans.filter((p) => p.selected).forEach((p) => p.mapping.forEach((f) => f && mapped.add(f)));
    if (mapped.has("birth_place_date")) (["birthplace", "date_of_birth"] as FieldId[]).forEach((f) => mapped.add(f));
    if (mapped.has("rt_rw")) (["rt", "rw"] as FieldId[]).forEach((f) => mapped.add(f));
    const sample = rows.slice(0, 3000);
    return FIELDS.filter((f) => {
      if (f.virtual) return false;
      if (f.core || mapped.has(f.id)) return true;
      return sample.some((r) => !!r.values[f.id]);
    }).map((f) => f.id);
  }, [plans, rows]);

  const statuses = useMemo(() => {
    const m = new Map<number, RowStatus>();
    for (const r of rows) m.set(r.key, statusOfRow(r));
    return m;
  }, [rows, statusOfRow]);

  const isExisting = useCallback((r: ImportRow) => existing.has(r.values.id_number ?? ""), [existing]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const st = statuses.get(r.key);
      if (filter === "error" && st !== "error") return false;
      if (filter === "warning" && st !== "warning") return false;
      if (filter === "ok" && st !== "ok") return false;
      if (filter === "fixed" && !r.issues.some((i) => i.level === "fixed")) return false;
      if (filter === "existing" && !isExisting(r)) return false;
      if ((filter === "mobile-code" || filter === "mobile-blocked") && mobileReadiness(r.values).level !== (filter === "mobile-code" ? "code" : "blocked")) return false;
      if (sheetFilter !== "__all" && r.sheet !== sheetFilter) return false;
      if (q && !(r.values.name ?? "").toLowerCase().includes(q) && !(r.values.id_number ?? "").includes(q)) return false;
      return true;
    });
  }, [rows, statuses, filter, sheetFilter, deferredQuery, isExisting]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const unknown = useMemo(() => unknownValues(rows, FIXABLE).slice(0, 30), [rows]);

  const setFilterReset = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };
  const handleRemove = useCallback((key: number) => removeRows(new Set([key])), [removeRows]);
  const errorKeys = useMemo(() => new Set(rows.filter((r) => statuses.get(r.key) === "error").map((r) => r.key)), [rows, statuses]);

  const chips: Array<{ id: Filter; label: string; count: number; cls: string }> = [
    { id: "all", label: "Semua", count: summary.total, cls: "" },
    { id: "error", label: "Error (dilewati)", count: summary.error, cls: "text-red-700 dark:text-red-400" },
    { id: "warning", label: "Perlu diperiksa", count: summary.warning, cls: "text-amber-700 dark:text-amber-400" },
    { id: "fixed", label: "Diperbaiki otomatis", count: summary.fixed, cls: "text-sky-700 dark:text-sky-400" },
    { id: "ok", label: "Siap", count: summary.ok, cls: "text-emerald-700 dark:text-emerald-400" },
    ...(existingCount > 0 ? [{ id: "existing" as Filter, label: "Sudah terdaftar", count: existingCount, cls: "" }] : []),
    ...(wizard.readiness.code > 0 ? [{ id: "mobile-code" as Filter, label: "Mobile: hanya via kode KK", count: wizard.readiness.code, cls: "text-amber-700 dark:text-amber-400" }] : []),
    ...(wizard.readiness.blocked > 0 ? [{ id: "mobile-blocked" as Filter, label: "Mobile: belum bisa daftar", count: wizard.readiness.blocked, cls: "text-red-700 dark:text-red-400" }] : []),
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {DATALISTS.map(([id, items]) => (
          <datalist key={id} id={id}>
            {items.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        ))}

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Saring baris berdasarkan status">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filter === c.id}
              onClick={() => setFilterReset(c.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600",
                filter === c.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "hover:bg-muted",
                c.cls,
              )}
            >
              {c.label}
              <span className="tabular-nums">{c.count.toLocaleString("id-ID")}</span>
            </button>
          ))}
        </div>

        {(wizard.mergedCount > 0 || wizard.linkedParents > 0) && (
          <ul className="space-y-1 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            {wizard.mergedCount > 0 && (
              <li>
                <strong className="text-foreground">{wizard.mergedCount.toLocaleString("id-ID")}</strong> baris dengan NIK sama di sheet berbeda digabung menjadi satu.
              </li>
            )}
            {wizard.linkedParents > 0 && (
              <li>
                <strong className="text-foreground">{wizard.linkedParents.toLocaleString("id-ID")}</strong> NIK ayah/ibu diisi otomatis dari anggota KK yang sama.
              </li>
            )}
          </ul>
        )}

        <section aria-label="Kesiapan aplikasi mobile" className="rounded-lg border p-3">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="size-4" aria-hidden /> Kesiapan aplikasi mobile
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Impor tidak membuat akun. Warga mendaftar sendiri di aplikasi dengan NIK + tanggal lahir + nama ibu kandung, atau memakai kode aktivasi KK dari desa.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <li>
              <strong className="text-emerald-700 dark:text-emerald-400">{wizard.readiness.identity.toLocaleString("id-ID")}</strong> siap mandiri
            </li>
            <li>
              <strong className="text-amber-700 dark:text-amber-400">{wizard.readiness.code.toLocaleString("id-ID")}</strong> hanya via kode KK (nama ibu kosong)
            </li>
            <li>
              <strong className="text-red-700 dark:text-red-400">{wizard.readiness.blocked.toLocaleString("id-ID")}</strong> belum bisa (meninggal/pindah, atau tanpa nama ibu &amp; KK)
            </li>
          </ul>
        </section>

        {wizard.statusRowCount > 0 && existingCount > 0 && (mode === "skip" || mode === "fill") && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
            <span>
              <strong>{wizard.statusRowCount.toLocaleString("id-ID")}</strong> baris berstatus meninggal/pindah, tetapi mode saat ini tidak mengubah status warga yang sudah terdaftar.
            </span>
            <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={() => wizard.setMode("status")}>
              Pakai “Perbarui status saja”
            </Button>
          </div>
        )}

        {existingCount > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <div className="text-sm">
              <strong>{existingCount.toLocaleString("id-ID")}</strong> warga di file ini sudah terdaftar di desa.
              <span className="block text-xs text-muted-foreground">{MODE_TEXT[mode].note}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Label htmlFor="imp-existing-mode" className="text-xs">
                Jika sudah terdaftar
              </Label>
              <Select value={mode} onValueChange={(v) => wizard.setMode(v as ExistingMode)}>
                <SelectTrigger id="imp-existing-mode" className="h-8 w-60 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODE_TEXT) as ExistingMode[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODE_TEXT[m].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {unknown.length > 0 && (
          <section aria-label="Nilai yang belum dikenali" className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Wand2 className="size-4" aria-hidden /> Nilai belum dikenali ({unknown.length})
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">Pilih padanan sekali; berlaku untuk semua baris yang memakai nilai tersebut.</p>
            <ul className="grid gap-2 md:grid-cols-2">
              {unknown.map((u) => (
                <li key={`${u.field}-${u.value}`} className="flex items-center gap-2 rounded-md border bg-background p-2">
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="text-muted-foreground">{FIELD_BY_ID[u.field].label}</div>
                    <div className="truncate font-medium" title={u.value}>
                      “{u.value}” <span className="font-normal text-muted-foreground">· {u.count} baris</span>
                    </div>
                  </div>
                  <Select onValueChange={(to) => wizard.replaceValue(u.field, u.value, to)}>
                    <SelectTrigger className="h-8 w-48" aria-label={`Padanan untuk ${u.value}`}>
                      <SelectValue placeholder="Pilih padanan…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {(FIXABLE_OPTIONS[u.field] ?? []).map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama atau NIK…"
              aria-label="Cari nama atau NIK"
              className="h-9 w-64 pl-8"
            />
          </div>
          {sheets.length > 1 && (
            <Select
              value={sheetFilter}
              onValueChange={(v) => {
                setSheetFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-48" aria-label="Saring berdasarkan sheet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Semua sheet</SelectItem>
                {sheets.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errorKeys.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="ml-auto gap-2 text-red-700">
                  <Trash2 className="size-4" aria-hidden /> Hapus {errorKeys.size.toLocaleString("id-ID")} baris error
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus semua baris error?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {errorKeys.size.toLocaleString("id-ID")} baris yang masih error akan dikeluarkan dari impor. Baris ini sudah otomatis dilewati; menghapusnya hanya merapikan daftar. Anda masih bisa mengunduh laporannya sebelum menghapus.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removeRows(errorKeys)}>Hapus baris error</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="max-h-[48vh] overflow-auto rounded-lg border" tabIndex={0} aria-label="Tabel data warga yang akan diimpor">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead className="w-12">Baris</TableHead>
                <TableHead className="min-w-28">Status</TableHead>
                {sheets.length > 1 && <TableHead className="min-w-24">Sheet</TableHead>}
                {fields.map((f) => (
                  <TableHead key={f} className="whitespace-nowrap">
                    {FIELD_BY_ID[f].label}
                  </TableHead>
                ))}
                <TableHead className="whitespace-nowrap">Aplikasi mobile</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={fields.length + 5} className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada baris yang cocok dengan saringan ini.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => (
                  <Row
                    key={r.key}
                    row={r}
                    fields={fields}
                    issues={issuesOf(r)}
                    status={statuses.get(r.key) ?? "ok"}
                    existingNote={isExisting(r) ? MODE_TEXT[mode].tag : null}
                    showSheet={sheets.length > 1}
                    onCommit={editCell}
                    onRemove={handleRemove}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground" aria-live="polite">
            {filtered.length.toLocaleString("id-ID")} baris · halaman {safePage} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Halaman sebelumnya">
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} aria-label="Halaman berikutnya">
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ubah sel langsung di tabel; perubahan diperiksa saat Anda pindah sel atau menekan Enter. Warna dan label menandai status:{" "}
          <span className="font-medium text-red-700 dark:text-red-400">merah = error, baris dilewati</span>,{" "}
          <span className="font-medium text-amber-700 dark:text-amber-400">kuning = perlu diperiksa, tetap diimpor</span>,{" "}
          <span className="font-medium text-sky-700 dark:text-sky-400">biru = diperbaiki otomatis</span>.
        </p>
      </div>
    </TooltipProvider>
  );
}
