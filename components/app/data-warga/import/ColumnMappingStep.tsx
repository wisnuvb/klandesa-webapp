"use client";

import { AlertTriangle, CheckCircle2, EyeOff, Info, Sparkles, Wand2 } from "lucide-react";
import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FIELDS,
  FIELD_BY_ID,
  FIELD_GROUP_ORDER,
  SHEET_ROLE_LABEL,
  type ColumnGuess,
  type FieldId,
  type PlannedSheet,
  type SheetRole,
} from "@/lib/residents-import";
import { cn } from "@/components/ui/utils";
import type { ImportWizard } from "./useImportWizard";

const NONE = "__none";
const CODE_FIELDS = new Set<FieldId>(["gender", "religion_id", "marital_status", "status_family_id", "education_id", "job_id", "blood_type_id"]);

const colLetter = (i: number) => {
  let n = i;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

function distinctSamples(samples: Array<string | number | boolean | null>, max = 3): string[] {
  const out: string[] = [];
  for (const s of samples) {
    const t = String(s ?? "").trim();
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function ConfidenceBadge({ guess, field }: { guess: ColumnGuess; field: FieldId | null }) {
  if (!field) {
    if (guess.reason === "ignored") {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <EyeOff aria-hidden /> Diabaikan
        </Badge>
      );
    }
    return <span className="text-xs text-muted-foreground">Tidak dipakai</span>;
  }
  if (guess.reason === "manual") return <Badge variant="secondary">Dipilih manual</Badge>;
  if (guess.reason === "saved") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Sparkles aria-hidden /> Tersimpan
      </Badge>
    );
  }
  if (guess.confidence >= 0.85) {
    return (
      <Badge className="gap-1 border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 aria-hidden /> Otomatis
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
      <AlertTriangle aria-hidden /> Periksa
    </Badge>
  );
}

function MappingTable({ plan, sheetIndex, wizard }: { plan: PlannedSheet; sheetIndex: number; wizard: ImportWizard }) {
  const rows = useMemo(
    () => plan.guesses.filter((g) => plan.sheet.columns[g.index].samples.length > 0 || g.header.trim() !== ""),
    [plan],
  );
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[28%] min-w-44">Kolom di Excel</TableHead>
            <TableHead className="w-[26%] min-w-40">Contoh isi</TableHead>
            <TableHead className="w-[28%] min-w-52">Masuk ke kolom sistem</TableHead>
            <TableHead className="min-w-32">Keyakinan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((g) => {
            const field = plan.mapping[g.index];
            const samples = distinctSamples(plan.sheet.columns[g.index].samples);
            const numericCodes =
              field &&
              CODE_FIELDS.has(field) &&
              plan.sheet.columns[g.index].samples.length > 0 &&
              plan.sheet.columns[g.index].samples.every((s) => /^\d{1,2}$/.test(String(s).trim()));
            const suggestion = !field && g.reason !== "ignored" ? g.alternatives[0] : undefined;
            return (
              <TableRow key={g.index} className={cn(!field && "bg-muted/20")}>
                <TableCell className="align-top">
                  <div className="flex items-baseline gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{colLetter(g.index)}</span>
                    <span className="text-sm font-medium break-words">{g.header || <em className="font-normal text-muted-foreground">(tanpa judul)</em>}</span>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-wrap gap-1">
                    {samples.length === 0 ? (
                      <span className="text-xs text-muted-foreground">kosong</span>
                    ) : (
                      samples.map((s) => (
                        <code key={s} className="max-w-36 truncate rounded bg-muted px-1.5 py-0.5 text-xs" title={s}>
                          {s}
                        </code>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Select
                    value={field ?? NONE}
                    onValueChange={(v) => wizard.setColumnField(sheetIndex, g.index, v === NONE ? null : (v as FieldId))}
                  >
                    <SelectTrigger
                      className="h-9 w-full"
                      aria-label={`Kolom sistem untuk kolom ${colLetter(g.index)} ${g.header}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value={NONE}>— Abaikan kolom ini —</SelectItem>
                      {FIELD_GROUP_ORDER.map((group) => {
                        const items = FIELDS.filter((f) => f.group === group);
                        if (!items.length) return null;
                        return (
                          <SelectGroup key={group}>
                            <SelectLabel>{group}</SelectLabel>
                            {items.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {numericCodes && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                      <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
                      Angka dibaca sebagai kode Dukcapil (mis. 1 = {FIELD_BY_ID[field!].label === "Jenis Kelamin" ? "Laki-laki" : "pilihan pertama"}).
                    </p>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col items-start gap-1">
                    <ConfidenceBadge guess={g} field={field} />
                    {suggestion && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded text-xs text-blue-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-400"
                        onClick={() => wizard.setColumnField(sheetIndex, g.index, suggestion.field)}
                      >
                        <Wand2 className="size-3" aria-hidden />
                        Mungkin: {FIELD_BY_ID[suggestion.field].label}
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ColumnMappingStep({ wizard }: { wizard: ImportWizard }) {
  const { plans, activeSheet } = wizard;
  const plan = plans[activeSheet];
  const selectedRows = plans.filter((p) => p.selected).reduce((n, p) => n + p.sheet.dataRows.length, 0);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Ditemukan <strong className="text-foreground">{plans.length} sheet</strong> di <span className="font-medium text-foreground">{wizard.fileName}</span>.
        Sistem sudah menebak sheet dan kolom; periksa dan ubah bila perlu.{" "}
        <span className="whitespace-nowrap">
          Terpilih: <strong className="text-foreground">{selectedRows.toLocaleString("id-ID")}</strong> baris.
        </span>
      </div>

      {wizard.mappingProblems.length > 0 && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle aria-hidden />
          <AlertTitle>Pemetaan belum lengkap</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {wizard.mappingProblems.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label="Daftar sheet" className="space-y-2">
          {plans.map((p, i) => {
            const active = i === activeSheet;
            const empty = p.sheet.dataRows.length === 0;
            return (
              <div
                key={`${p.sheet.name}-${i}`}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  active ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30" : "hover:bg-muted/50",
                  empty && "opacity-60",
                )}
              >
                <Checkbox
                  id={`sheet-${i}`}
                  checked={p.selected}
                  disabled={empty}
                  onCheckedChange={(c) => wizard.setSheetSelected(i, c === true)}
                  aria-label={`Impor sheet ${p.sheet.name}`}
                  className="mt-1"
                />
                <button
                  type="button"
                  onClick={() => wizard.setActiveSheet(i)}
                  aria-current={active ? "true" : undefined}
                  className="min-w-0 flex-1 rounded text-left focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <div className="truncate text-sm font-medium">{p.sheet.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.sheet.dataRows.length.toLocaleString("id-ID")} baris · {SHEET_ROLE_LABEL[p.role].split(" (")[0]}
                  </div>
                  {p.note && !p.selected && <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">{p.note}</div>}
                </button>
              </div>
            );
          })}
        </nav>

        {plan ? (
          <section aria-label={`Pemetaan kolom sheet ${plan.sheet.name}`} className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Sheet “{plan.sheet.name}”</h3>
                <p className="text-xs text-muted-foreground">
                  Header terdeteksi di baris {plan.sheet.headerRow + 1}
                  {plan.sheet.skipped.summary + plan.sheet.skipped.empty > 0 &&
                    ` · ${plan.sheet.skipped.empty + plan.sheet.skipped.summary} baris kosong/total dilewati`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sheet-role" className="text-xs text-muted-foreground">
                  Jenis sheet
                </Label>
                <Select value={plan.role} onValueChange={(v) => wizard.setSheetRole(activeSheet, v as SheetRole)}>
                  <SelectTrigger id="sheet-role" className="h-8 w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SHEET_ROLE_LABEL) as SheetRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {SHEET_ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <MappingTable plan={plan} sheetIndex={activeSheet} wizard={wizard} />
          </section>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="save-mapping" checked={wizard.saveMapping} onCheckedChange={(c) => wizard.setSaveMapping(c === true)} />
        <Label htmlFor="save-mapping" className="text-sm font-normal">
          Ingat pemetaan ini di peramban ini, agar file dengan susunan kolom yang sama berikutnya langsung siap
        </Label>
      </div>
    </div>
  );
}
