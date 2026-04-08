"use client";

import { useState } from "react";
import { mapResidentToFormData } from "@/components/AutocompleteResidentInput";
import type { DesaSettings, TemplateBody } from "../types";

/**
 * Hook untuk mengelola state form pembuatan surat.
 */
export function useLetterForm(desaSettings: DesaSettings) {
  const [formData, setFormData] = useState<Record<string, string>>({
    NOMOR_SURAT: "",
    TANGGAL_SURAT: new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateBody | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("form");

  const handleCreateSurat = (template: TemplateBody) => {
    const initialForm: Record<string, string> = {
      NOMOR_SURAT: "",
      TANGGAL_SURAT: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      KABUPATEN: desaSettings.kabupaten,
      KECAMATAN: desaSettings.kecamatan,
      DESA: desaSettings.nama_desa,
      PENANDA_TANGAN: "Kepala Desa " + desaSettings.nama_desa,
    };
    template.variables.forEach((variable) => {
      if (!initialForm[variable]) initialForm[variable] = "";
    });

    const vars = new Set(template.variables);
    const namaKades = desaSettings.kepala_desa_nama;
    const nipKades = desaSettings.kepala_desa_nip;
    if (vars.has("KEPALA_DESA_NAMA")) initialForm.KEPALA_DESA_NAMA = namaKades;
    if (vars.has("nama_kades")) initialForm.nama_kades = namaKades;
    if (vars.has("NAMA_KADES")) initialForm.NAMA_KADES = namaKades;
    if (vars.has("KEPALA_DESA_NIP")) initialForm.KEPALA_DESA_NIP = nipKades;
    if (vars.has("nip_kades")) initialForm.nip_kades = nipKades;
    if (vars.has("NIP_KEPALA_DESA")) initialForm.NIP_KEPALA_DESA = nipKades;

    setFormData(initialForm);
    setSelectedTemplate(template);
    setSelectedResident(null);
    setActiveTab("form");
    setShowCreateDialog(true);
  };

  const handleFormChange = (variable: string, value: string) => {
    setFormData((prev) => ({ ...prev, [variable]: value }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleResidentSelect = (resident: any) => {
    setSelectedResident(resident);
    if (resident) {
      const residentData = mapResidentToFormData(resident);
      setFormData((prev) => ({ ...prev, ...residentData }));
    }
  };

  const handleDuplicateLetter = (
    templateId: number,
    letterFormData: Record<string, string>,
    templates: TemplateBody[],
  ) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData(letterFormData);
      setSelectedTemplate(template);
      setActiveTab("form");
      setShowCreateDialog(true);
    }
  };

  const resetForm = () => {
    setFormData({
      NOMOR_SURAT: "",
      TANGGAL_SURAT: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    });
    setSelectedResident(null);
    setSelectedTemplate(null);
  };

  return {
    formData,
    selectedResident,
    selectedTemplate,
    showCreateDialog,
    activeTab,
    setFormData,
    setActiveTab,
    setShowCreateDialog,
    handleCreateSurat,
    handleFormChange,
    handleResidentSelect,
    handleDuplicateLetter,
    resetForm,
  };
}
