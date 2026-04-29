"use client";

import { useCallback, useState } from "react";
import { mapResidentToFormData } from "@/components/AutocompleteResidentInput";
import type { DesaSettings, LetterHistory, TemplateBody } from "../types";
import { getFooterSignerSlotsCount } from "../_utils/signFooterPlaceholders";
import {
  applyWilayahDariPengaturanDesa,
  formatTanggalSuratId,
  parseIndonesianLetterDateString,
  sanitizeNomorUrutSegment,
  startOfLocalDay,
  WILAYAH_ADMIN_VARIABLES,
} from "../_utils/letterCreateUtils";
import {
  applySignerPresetToForm,
  footerRoleLabel,
  parseSignerRoleFromForm,
  parseSignerRoleOverrideForSlot,
  parseSignerSlotSource,
  signerSlotJabatanKey,
  signerSlotOnBehalfKey,
  signerSlotRoleKey,
  SIGNER_ROLE_FORM_KEY,
  type SignerRole,
} from "../_utils/signerPreset";

function clearSignerRoleOverridesMultiFooter(
  form: Record<string, string>,
  template: Pick<TemplateBody, "footer" | "shared_footer">,
): void {
  const n = getFooterSignerSlotsCount(template);
  if (n <= 1) return;
  form[SIGNER_ROLE_FORM_KEY] = "";
  form[signerSlotJabatanKey(0)] = "";
  for (let i = 0; i < n; i++) {
    form[signerSlotOnBehalfKey(i)] = "";
  }
  for (let i = 1; i < n; i++) {
    form[signerSlotRoleKey(i)] = "";
    form[signerSlotJabatanKey(i)] = "";
  }
}

const PEJABAT_AUTO_KEYS = [
  "KEPALA_DESA_NAMA",
  "nama_kades",
  "NAMA_KADES",
  "KEPALA_DESA_NIP",
  "nip_kades",
  "NIP_KEPALA_DESA",
] as const;

const AUTO_FILL_DISABLE_KEYS = new Set<string>([
  ...WILAYAH_ADMIN_VARIABLES,
  "PENANDA_TANGAN",
  ...PEJABAT_AUTO_KEYS,
]);

/**
 * Hook untuk mengelola state form pembuatan surat.
 */
export function useLetterForm(desaSettings: DesaSettings) {
  const now = startOfLocalDay();
  const [formData, setFormData] = useState<Record<string, string>>({
    NOMOR_SURAT: "",
    TANGGAL_SURAT: formatTanggalSuratId(now),
  });
  const [letterDate, setLetterDateState] = useState<Date>(now);
  /** true = isi wilayah/pejabat mengikuti Pengaturan Desa; false = nilai dari snapshot (duplikat) atau manual. */
  const [autoFillWilayahDesa, setAutoFillWilayahDesa] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateBody | null>(
    null,
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  /** Surat yang sedang diedit (PATCH); null = buat surat baru. */
  const [editingLetterId, setEditingLetterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("form");

  const setLetterDate = useCallback((d: Date) => {
    const day = startOfLocalDay(d);
    setLetterDateState(day);
    setFormData((prev) => ({
      ...prev,
      TANGGAL_SURAT: formatTanggalSuratId(day),
    }));
  }, []);

  const handleCreateSurat = (template: TemplateBody) => {
    setEditingLetterId(null);
    const initialForm: Record<string, string> = {
      NOMOR_SURAT: "",
      TANGGAL_SURAT: formatTanggalSuratId(startOfLocalDay()),
      KABUPATEN: desaSettings.kabupaten,
      KECAMATAN: desaSettings.kecamatan,
      DESA: desaSettings.nama_desa,
    };
    template.variables.forEach((variable) => {
      if (!initialForm[variable]) initialForm[variable] = "";
    });

    applyWilayahDariPengaturanDesa(initialForm, template, desaSettings);
    applySignerPresetToForm(initialForm, template, "kepala_desa", desaSettings);
    clearSignerRoleOverridesMultiFooter(initialForm, template);
    initialForm.ATAS_NAMA = initialForm.ATAS_NAMA ?? "";

    setLetterDateState(startOfLocalDay());
    setFormData(initialForm);
    setAutoFillWilayahDesa(true);
    setSelectedTemplate(template);
    setSelectedResident(null);
    setActiveTab("form");
    setShowCreateDialog(true);
  };

  const handleFormChange = useCallback(
    (variable: string, value: string) => {
      let v = value;
      if (variable === "NOMOR_SURAT") {
        v = sanitizeNomorUrutSegment(value);
      }
      if (autoFillWilayahDesa && AUTO_FILL_DISABLE_KEYS.has(variable)) {
        setAutoFillWilayahDesa(false);
      }
      setFormData((prev) => ({ ...prev, [variable]: v }));
    },
    [autoFillWilayahDesa],
  );

  const applyDesaOfficialSnapshot = useCallback(
    (tmpl: TemplateBody) => {
      setFormData((prev) => {
        const next = { ...prev };
        applyWilayahDariPengaturanDesa(next, tmpl, desaSettings);
        applySignerPresetToForm(
          next,
          tmpl,
          parseSignerRoleFromForm(next),
          desaSettings,
        );
        clearSignerRoleOverridesMultiFooter(next, tmpl);
        return next;
      });
    },
    [desaSettings],
  );

  const setAutoFillWilayahDesaState = useCallback(
    (on: boolean) => {
      setAutoFillWilayahDesa(on);
      if (on && selectedTemplate) {
        applyDesaOfficialSnapshot(selectedTemplate);
      }
    },
    [applyDesaOfficialSnapshot, selectedTemplate],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleResidentSelect = (resident: any) => {
    setSelectedResident(resident);
    if (resident) {
      const residentData = mapResidentToFormData(resident);
      setFormData((prev) => ({ ...prev, ...residentData }));
    }
  };

  const refreshSignerPresetFromDesa = useCallback(() => {
    setFormData((prev) => {
      const tmpl = selectedTemplate;
      if (!tmpl) return prev;
      const next = { ...prev };
      const role = parseSignerRoleFromForm(next);
      applySignerPresetToForm(next, tmpl, role, desaSettings, {
        skipRoleFooterPersistence:
          parseSignerRoleOverrideForSlot(next, 0) == null,
      });
      return next;
    });
  }, [selectedTemplate, desaSettings]);

  const handleSignerSlotRoleChange = useCallback(
    (slotIndex: number, role: SignerRole | null) => {
      setFormData((prev) => {
        const tmpl = selectedTemplate;
        if (!tmpl) return prev;
        const next = { ...prev };
        const rk = signerSlotRoleKey(slotIndex);
        const jk = signerSlotJabatanKey(slotIndex);
        if (role === null) {
          next[rk] = "";
          next[jk] = "";
          return next;
        }
        next[rk] = role;
        next[jk] = footerRoleLabel(role, desaSettings);
        if (slotIndex === 0 && parseSignerSlotSource(next, 0) === "preset") {
          applySignerPresetToForm(next, tmpl, role, desaSettings);
        }
        return next;
      });
    },
    [selectedTemplate, desaSettings],
  );

  const handleDuplicateLetter = (
    templateId: number,
    letterFormData: Record<string, string>,
    templates: TemplateBody[],
  ) => {
    setEditingLetterId(null);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const cloned = { ...letterFormData };
      const parsed = parseIndonesianLetterDateString(cloned.TANGGAL_SURAT);
      const nextDate = parsed ?? startOfLocalDay();
      setLetterDateState(nextDate);
      cloned.TANGGAL_SURAT = formatTanggalSuratId(nextDate);

      cloned.NOMOR_SURAT = sanitizeNomorUrutSegment(cloned.NOMOR_SURAT ?? "");

      setFormData(cloned);
      setAutoFillWilayahDesa(false);
      setSelectedTemplate(template);
      setSelectedResident(null);
      setActiveTab("form");
      setShowCreateDialog(true);
    }
  };

  const handleEditLetter = (
    letter: LetterHistory,
    templates: TemplateBody[],
  ) => {
    const template = templates.find((t) => t.id === letter.template_id);
    if (!template) return;

    const cloned = { ...letter.form_data };
    if (!cloned[SIGNER_ROLE_FORM_KEY]) {
      cloned[SIGNER_ROLE_FORM_KEY] = letter.signer_role;
    }
    const parsed = parseIndonesianLetterDateString(cloned.TANGGAL_SURAT);
    const nextDate = parsed ?? startOfLocalDay();
    setLetterDateState(nextDate);
    cloned.TANGGAL_SURAT = formatTanggalSuratId(nextDate);
    cloned.NOMOR_SURAT = sanitizeNomorUrutSegment(cloned.NOMOR_SURAT ?? "");

    setFormData(cloned);
    setAutoFillWilayahDesa(false);
    setSelectedTemplate(template);
    setSelectedResident(null);
    setEditingLetterId(letter.id);
    setActiveTab("form");
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    const t = startOfLocalDay();
    setLetterDateState(t);
    setFormData({
      NOMOR_SURAT: "",
      TANGGAL_SURAT: formatTanggalSuratId(t),
    });
    setAutoFillWilayahDesa(true);
    setSelectedResident(null);
    setSelectedTemplate(null);
    setEditingLetterId(null);
  };

  return {
    formData,
    letterDate,
    setLetterDate,
    selectedResident,
    selectedTemplate,
    showCreateDialog,
    editingLetterId,
    activeTab,
    autoFillWilayahDesa,
    setAutoFillWilayahDesa: setAutoFillWilayahDesaState,
    setFormData,
    setActiveTab,
    setShowCreateDialog,
    handleCreateSurat,
    handleFormChange,
    handleResidentSelect,
    refreshSignerPresetFromDesa,
    handleSignerSlotRoleChange,
    handleDuplicateLetter,
    handleEditLetter,
    resetForm,
  };
}
