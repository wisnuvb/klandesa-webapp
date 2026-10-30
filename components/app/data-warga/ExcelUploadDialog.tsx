"use client";

import { ArrowLeft, ArrowRight, Check, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/components/ui/utils";
import { buildReportWorkbook, buildTemplateWorkbook } from "@/lib/residents-import/template";
import {
  ColumnMappingStep,
  MAX_FILE_MB,
  MAX_IMPORT_ROWS,
  ResultStep,
  ReviewStep,
  useImportWizard,
  type Step,
} from "./import";

interface ExcelUploadDialogProps {
  showExcelDialog: boolean;
  setShowExcelDialog: (show: boolean) => void;
  onUploadSuccess?: () => void;
}

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "upload", label: "Unggah" },
  { id: "map", label: "Cocokkan kolom" },
  { id: "review", label: "Tinjau & perbaiki" },
  { id: "result", label: "Hasil" },
];

function Stepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" aria-label="Langkah impor">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold",
                done && "border-emerald-600 bg-emerald-600 text-white",
                active && "border-blue-600 bg-blue-600 text-white",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn(active ? "font-semibold" : "text-muted-foreground")}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export const ExcelUploadDialog: React.FC<ExcelUploadDialogProps> = ({ showExcelDialog, setShowExcelDialog, onUploadSuccess }) => {
  const wizard = useImportWizard(onUploadSuccess);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { step, busy, sending } = wizard;

  const close = useCallback(() => {
    wizard.reset();
    setShowExcelDialog(false);
  }, [wizard, setShowExcelDialog]);

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    if (sending) {
      toast.info("Impor sedang berjalan. Tunggu selesai atau tekan “Hentikan”.");
      return;
    }
    if (step === "review" && wizard.rows.length > 0 && !window.confirm("Tutup dan buang hasil tinjauan? Data belum diimpor.")) return;
    close();
  };

  const downloadTemplate = () => {
    XLSX.writeFile(buildTemplateWorkbook(), "template_data_warga.xlsx");
    toast.success("Template berhasil diunduh");
  };

  const downloadReport = () => {
    XLSX.writeFile(buildReportWorkbook(wizard.buildReport()), "laporan_impor_warga.xlsx");
  };

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void wizard.loadFile(f);
  };

  const sendable = wizard.sendableRows.length;

  return (
    <Dialog open={showExcelDialog} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] flex-col gap-0 p-0 sm:max-w-6xl">
        <DialogHeader className="space-y-3 border-b px-6 pb-4 pt-6">
          <DialogTitle>Impor Data Warga dari Excel</DialogTitle>
          <DialogDescription>
            Sistem mengenali kolom Excel desa Anda sendiri; template tidak wajib. Anda tetap bisa meninjau dan mengedit semua data sebelum disimpan.
          </DialogDescription>
          <Stepper current={step} />
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {busy && (
            <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden /> {busy.label}
              </div>
              {busy.total ? <Progress value={Math.round(((busy.done ?? 0) / busy.total) * 100)} aria-label="Kemajuan" /> : null}
            </div>
          )}

          {step === "upload" && (
            <div className="mx-auto max-w-2xl space-y-5">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  onFiles(e.dataTransfer.files);
                }}
                disabled={!!busy}
                className={cn(
                  "flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60",
                  dragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/40",
                )}
              >
                <FileSpreadsheet className="size-10 text-blue-600" aria-hidden />
                <span className="text-base font-medium">Pilih atau seret file Excel ke sini</span>
                <span className="text-sm text-muted-foreground">
                  .xlsx, .xls, atau .csv · maksimal {MAX_FILE_MB} MB · hingga {MAX_IMPORT_ROWS.toLocaleString("id-ID")} baris
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xls,.csv,.ods"
                className="sr-only"
                aria-label="Pilih file Excel"
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              <ul className="space-y-1.5 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                <li>• Judul kolom boleh berbeda (mis. “Nomor NIK”, “Hub. Keluarga”, “Kawin”); sistem menebak dari nama dan isinya.</li>
                <li>• Kolom Jenis Kelamin yang dipecah L/P, kolom berisi kode angka, dan beberapa sheet dalam satu file didukung.</li>
                <li>• Tanggal lahir atau jenis kelamin yang kosong diisi dari NIK. Tanggal tidak pernah diisi “hari ini”.</li>
                <li>• Sheet meninggal/pindah/pecahan RW dikenali; Anda yang memutuskan mana yang diimpor.</li>
              </ul>

              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="text-muted-foreground">Belum punya file?</span>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
                  <Download className="size-4" aria-hidden /> Unduh template (opsional)
                </Button>
              </div>
            </div>
          )}

          {step === "map" && <ColumnMappingStep wizard={wizard} />}
          {step === "review" && <ReviewStep wizard={wizard} />}
          {step === "result" && <ResultStep wizard={wizard} onDownloadReport={downloadReport} />}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3 border-t px-6 py-4 sm:justify-between">
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {step === "review" && (
              <>
                <strong className="text-foreground">{sendable.toLocaleString("id-ID")}</strong> baris akan diimpor
                {wizard.summary.error > 0 && <> · {wizard.summary.error.toLocaleString("id-ID")} error dilewati</>}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {step === "map" && (
              <>
                <Button type="button" variant="outline" onClick={() => wizard.reset()} disabled={!!busy} className="gap-2">
                  <ArrowLeft className="size-4" aria-hidden /> Ganti file
                </Button>
                <Button type="button" onClick={() => void wizard.proceedToReview()} disabled={!!busy || wizard.mappingProblems.length > 0} className="gap-2">
                  Lanjut: tinjau data <ArrowRight className="size-4" aria-hidden />
                </Button>
              </>
            )}
            {step === "review" && (
              <>
                <Button type="button" variant="outline" onClick={() => wizard.setStep("map")} className="gap-2">
                  <ArrowLeft className="size-4" aria-hidden /> Kembali
                </Button>
                <Button type="button" onClick={() => void wizard.submit()} disabled={sendable === 0} className="gap-2">
                  <Upload className="size-4" aria-hidden /> Impor {sendable.toLocaleString("id-ID")} baris
                </Button>
              </>
            )}
            {step === "result" && !sending && (
              <>
                {wizard.result?.failedMessage && (
                  <Button type="button" variant="outline" onClick={() => wizard.setStep("review")}>
                    Kembali ke tinjauan
                  </Button>
                )}
                <Button type="button" onClick={close}>
                  Selesai
                </Button>
              </>
            )}
            {step === "upload" && (
              <Button type="button" variant="outline" onClick={close}>
                Batal
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
