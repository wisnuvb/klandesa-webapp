"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ExportFormat = "excel" | "csv" | "pdf";

export type ExportFormatOption = {
  id: ExportFormat;
  label: string;
  icon?: React.ReactNode;
};

const DEFAULT_FORMATS: ExportFormatOption[] = [
  { id: "excel", label: "Excel (.xlsx)", icon: <FileSpreadsheet className="h-4 w-4 text-green-600" /> },
  { id: "csv", label: "CSV", icon: <FileText className="h-4 w-4 text-blue-600" /> },
  { id: "pdf", label: "PDF", icon: <FileText className="h-4 w-4 text-red-600" /> },
];

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  formats?: ExportFormatOption[];
  defaultFormat?: ExportFormat;
  filtersSlot?: React.ReactNode;
  onExport: (format: ExportFormat) => void | Promise<void>;
};

export function ExportDialog({
  open,
  onOpenChange,
  title = "Export Data",
  description = "Pilih format file export",
  formats = DEFAULT_FORMATS,
  defaultFormat = "excel",
  filtersSlot,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await onExport(format);
      onOpenChange(false);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {filtersSlot}

          <div className="space-y-2">
            <Label>Format file</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formats.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="flex items-center gap-2">
                      {f.icon}
                      {f.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Batal
          </Button>
          <Button onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
