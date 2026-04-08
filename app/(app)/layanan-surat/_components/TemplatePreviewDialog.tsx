"use client";

import { RefObject } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DesaSettings, TemplateBody } from "../types";
import { renderTemplateContent, getTemplatePreviewData } from "../_utils/letterPreview";

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateBody | null;
  /** formData & selectedTemplate dari useLetterForm, untuk merge real data */
  formData: Record<string, string>;
  selectedTemplate: TemplateBody | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedResident: any;
  previewRef: RefObject<HTMLDivElement | null>;
  onDownload: () => void;
  onPrint: () => void;
  desaSettings: DesaSettings;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
  formData,
  selectedTemplate,
  selectedResident,
  previewRef,
  onDownload,
  onPrint,
  desaSettings,
}: TemplatePreviewDialogProps) {
  const previewMeta = template
    ? getTemplatePreviewData(template, formData, selectedTemplate, selectedResident, desaSettings)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Preview Template — {template?.name}
          </DialogTitle>
          <DialogDescription>
            {previewMeta?.hasRealData
              ? "Preview menggunakan data real terbaru, dengan fallback data contoh untuk field yang masih kosong."
              : "Preview menggunakan data contoh karena data real belum tersedia."}
          </DialogDescription>
        </DialogHeader>

        {template && previewMeta && (
          <div
            ref={previewRef}
            className="p-8 bg-white min-h-175 font-serif"
          >
            {renderTemplateContent(template, previewMeta.data, desaSettings)}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button className="flex-1 gap-2 bg-primary" onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={onPrint}>
            <FileText className="h-4 w-4" />
            Cetak
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
