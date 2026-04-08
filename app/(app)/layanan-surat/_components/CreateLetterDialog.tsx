"use client";

import { RefObject } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutocompleteResidentInput } from "@/components/AutocompleteResidentInput";
import { MultiPageLetterForm } from "@/components/MultiPageLetterForm";
import { SURAT_PENGANTAR_NIKAH_TEMPLATE } from "@/data/mockMultiPageTemplate";
import type { DesaSettings, TemplateBody } from "../types";
import { renderTemplateContent } from "../_utils/letterPreview";

interface CreateLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateBody | null;
  formData: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedResident: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFormChange: (variable: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResidentSelect: (resident: any) => void;
  onSaveLetter: (status: "draft" | "completed") => void;
  previewRef: RefObject<HTMLDivElement | null>;
  onDownloadPDF: () => void;
  onPrint: () => void;
  desaSettings: DesaSettings;
}

export function CreateLetterDialog({
  open,
  onOpenChange,
  template,
  formData,
  selectedResident,
  activeTab,
  onTabChange,
  onFormChange,
  onResidentSelect,
  onSaveLetter,
  previewRef,
  onDownloadPDF,
  onPrint,
  desaSettings,
}: CreateLetterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Buat Surat — {template?.name}
          </DialogTitle>
          <DialogDescription>
            Isi data yang diperlukan. Data header dan footer otomatis diambil
            dari pengaturan desa.
          </DialogDescription>
        </DialogHeader>

        {template && (
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Form Input</TabsTrigger>
              <TabsTrigger value="preview">Preview Surat</TabsTrigger>
            </TabsList>

            {/* ── Tab Form ─────────────────────────────────────────── */}
            <TabsContent value="form" className="space-y-6 mt-4">
              {/* Informasi surat */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base border-b pb-2">
                  Informasi Surat
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nomor Surat *</label>
                    <Input
                      placeholder="Contoh: 475/039/424.304.2.02/2019"
                      value={formData.NOMOR_SURAT || ""}
                      onChange={(e) => onFormChange("NOMOR_SURAT", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tanggal Surat *</label>
                    <Input
                      placeholder="Contoh: 08 Maret 2019"
                      value={formData.TANGGAL_SURAT || ""}
                      onChange={(e) => onFormChange("TANGGAL_SURAT", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Multi-page atau form biasa */}
              {template.id === 5 ? (
                <MultiPageLetterForm
                  template={SURAT_PENGANTAR_NIKAH_TEMPLATE}
                  formData={formData}
                  onFormDataChange={(data) => {
                    Object.entries(data).forEach(([k, v]) => onFormChange(k, v));
                  }}
                />
              ) : (
                <>
                  {/* Data pemohon */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-semibold text-base">Data Pemohon</h3>
                      {selectedResident && (
                        <Badge variant="default" className="bg-green-500">
                          Data dari: {selectedResident.name}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {template.variables
                        .filter(
                          (v) =>
                            !["KABUPATEN", "KECAMATAN", "DESA", "PENANDA_TANGAN"].includes(v),
                        )
                        .map((variable) => (
                          <div key={variable} className="space-y-2">
                            <label className="text-sm font-medium">
                              {variable.replace(/_/g, " ")} *
                            </label>
                            {variable === "NAMA" ? (
                              <AutocompleteResidentInput
                                value={formData[variable] || ""}
                                onChange={(value) => onFormChange(variable, value)}
                                onResidentSelect={onResidentSelect}
                                placeholder="Ketik nama atau NIK warga..."
                              />
                            ) : variable === "ALAMAT" ||
                              variable === "KEPERLUAN" ||
                              variable.includes("KETERANGAN") ? (
                              <Textarea
                                placeholder={`Masukkan ${variable.toLowerCase().replace(/_/g, " ")}`}
                                value={formData[variable] || ""}
                                onChange={(e) => onFormChange(variable, e.target.value)}
                                rows={3}
                              />
                            ) : (
                              <Input
                                placeholder={`Masukkan ${variable.toLowerCase().replace(/_/g, " ")}`}
                                value={formData[variable] || ""}
                                onChange={(e) => onFormChange(variable, e.target.value)}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Data otomatis desa */}
                  <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                    <h3 className="font-semibold text-base">
                      Data Otomatis (Dari Pengaturan Desa)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Kabupaten:</span>
                        <p className="font-medium">{formData.KABUPATEN || desaSettings.kabupaten}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kecamatan:</span>
                        <p className="font-medium">{formData.KECAMATAN || desaSettings.kecamatan}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Desa:</span>
                        <p className="font-medium">{formData.DESA || desaSettings.nama_desa}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" onClick={() => onTabChange("preview")}>
                  Lihat Preview
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Batal
                </Button>
              </div>
            </TabsContent>

            {/* ── Tab Preview ──────────────────────────────────────── */}
            <TabsContent value="preview" className="space-y-4 mt-4">
              <div
                ref={previewRef}
                className="p-8 bg-white min-h-175 font-serif"
              >
                {renderTemplateContent(template, formData, desaSettings)}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1 gap-2 bg-primary"
                  onClick={onDownloadPDF}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    onSaveLetter("completed");
                    onPrint();
                  }}
                >
                  <FileText className="h-4 w-4" />
                  Simpan &amp; Cetak
                </Button>
                <Button variant="outline" onClick={() => onTabChange("form")}>
                  Kembali ke Form
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
