"use client";

import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon, Download, FileText } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteResidentInput } from "@/components/AutocompleteResidentInput";
import {
  parseSignerRoleFromForm,
  parseSignerRoleOverrideForSlot,
  parseSignerSlotSource,
  signerSlotOfficialIdKey,
  signerSlotOnBehalfKey,
  signerSlotRoleKey,
  signerSlotSourceKey,
  isSignerSlotPersistenceKey,
  SIGNER_OFFICIAL_ID_KEY,
  SIGNER_ROLE_FORM_KEY,
  SIGNER_SOURCE_FORM_KEY,
  SIGNER_JABATAN_FOOTER_KEY,
  SIGNER_ROLE_OPTIONS,
  type SignerRole,
  type SignerSourcePreset,
} from "../_utils/signerPreset";
import {
  buildFooterSignerPatchFromManual,
  buildFooterSignerPatchFromOfficial,
  collectFooterSignerReservedVariableKeys,
  getFooterSignerPlaceholderKeys,
  getFooterSignerSlotsCount,
  type OfficialRow,
} from "../_utils/signFooterPlaceholders";
import { MultiPageLetterForm } from "@/components/MultiPageLetterForm";
import { SURAT_PENGANTAR_NIKAH_TEMPLATE } from "@/data/mockMultiPageTemplate";
import type { DesaSettings, LetterHistory, TemplateBody } from "../types";
import { renderTemplateContent } from "../_utils/letterPreview";
import {
  formatTanggalSuratId,
  getResidentPickerVariable,
  pickWilayahEditorKey,
  wilayahDisplayValue,
  WILAYAH_ADMIN_VARIABLES,
} from "../_utils/letterCreateUtils";

const WILAYAH_LOCK_SET = new Set<string>(WILAYAH_ADMIN_VARIABLES);

const PEMOHON_EXCLUDE = new Set<string>([
  ...WILAYAH_ADMIN_VARIABLES,
  "PENANDA_TANGAN",
]);

/** Diatur lewat panel Penandatangan, bukan grid variabel template. */
const SIGNER_HIDDEN_FORM_KEYS = new Set<string>([
  SIGNER_ROLE_FORM_KEY,
  "ATAS_NAMA",
  SIGNER_SOURCE_FORM_KEY,
  SIGNER_OFFICIAL_ID_KEY,
  SIGNER_JABATAN_FOOTER_KEY,
]);

const PEJABAT_DESA_KEYS = [
  "KEPALA_DESA_NAMA",
  "nama_kades",
  "NAMA_KADES",
  "KEPALA_DESA_NIP",
  "nip_kades",
  "NIP_KEPALA_DESA",
] as const;

interface CreateLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLetterId?: number | null;
  editingLetterStatus?: LetterHistory["status"] | null;
  template: TemplateBody | null;
  formData: Record<string, string>;
  letterDate: Date;
  onLetterDateChange: (d: Date) => void;
  autoFillWilayahDesa: boolean;
  onAutoFillWilayahDesaChange: (on: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedResident: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFormChange: (variable: string, value: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onResidentSelect: (resident: any) => void;
  onSaveLetter: (
    status: "draft" | "completed" | "archived",
  ) => void | Promise<void>;
  /** Menyimpan sebagai selesai lalu membuka cetak hanya jika simpan sukses */
  onSaveAndPrint: () => void | Promise<void>;
  previewRef: RefObject<HTMLDivElement | null>;
  onDownloadPDF: () => void;
  desaSettings: DesaSettings;
  onSignerSlotRoleChange: (slotIndex: number, role: SignerRole | null) => void;
  /** Isi PENANDA_TANGAN + variabel isi dari preset desa untuk slot utama; menghormati override kosong (= ikuti footer). */
  onRefreshSignerPresetFromDesa: () => void;
}

export function CreateLetterDialog({
  open,
  onOpenChange,
  editingLetterId = null,
  editingLetterStatus = null,
  template,
  formData,
  letterDate,
  onLetterDateChange,
  autoFillWilayahDesa,
  onAutoFillWilayahDesaChange,
  selectedResident,
  activeTab,
  onTabChange,
  onFormChange,
  onResidentSelect,
  onSaveLetter,
  onSaveAndPrint,
  previewRef,
  onDownloadPDF,
  desaSettings,
  onSignerSlotRoleChange,
  onRefreshSignerPresetFromDesa,
}: CreateLetterDialogProps) {
  const pejabatKeySet = new Set<string>(PEJABAT_DESA_KEYS);

  const isFieldLockedByAuto = (variable: string) =>
    autoFillWilayahDesa &&
    (WILAYAH_LOCK_SET.has(variable) || pejabatKeySet.has(variable));

  const residentPickerVar = template
    ? getResidentPickerVariable(template.variables)
    : null;
  const templateVarSet = template ? new Set(template.variables) : new Set<string>();
  const kabWilayahKey = pickWilayahEditorKey(templateVarSet, "kabupaten");
  const kecWilayahKey = pickWilayahEditorKey(templateVarSet, "kecamatan");
  const desWilayahKey = pickWilayahEditorKey(templateVarSet, "desa");
  const dualDesaFields =
    templateVarSet.has("DESA") && templateVarSet.has("NAMA_DESA");

  const footerSlotCount = useMemo(
    () => (template ? getFooterSignerSlotsCount(template) : 1),
    [template],
  );

  const footerReservedVarKeys = useMemo(() => {
    if (!template) return new Set<string>();
    return collectFooterSignerReservedVariableKeys(template);
  }, [template]);

  const signerHiddenFormKeys = useMemo(() => {
    const s = new Set<string>(SIGNER_HIDDEN_FORM_KEYS);
    for (let i = 1; i <= 12; i++) {
      s.add(`SIGNER_SLOT_${i}_ROLE`);
      s.add(`SIGNER_JABATAN_SLOT_${i}`);
      s.add(`SIGNER_SLOT_${i}_ATAS_NAMA`);
    }
    return s;
  }, []);

  const footerSignerRoleHints = useMemo(() => {
    if (!template) return [] as string[];
    const signers =
      template.footer?.signers ??
      template.shared_footer?.signers ??
      [];
    if (!signers.length) return ["Penandatangan"];
    return signers.map((s, idx) =>
      String(s.role ?? "").trim()
        ? String(s.role ?? "").slice(0, 72)
        : `Penandatang ${idx + 1}`,
    );
  }, [template]);

  const [officialRows, setOfficialRows] = useState<OfficialRow[]>([]);
  const [officialsLoading, setOfficialsLoading] = useState(false);
  const lastOfficialApplySlots = useRef<Record<number, string>>({});

  const officialSlotsApplyWatch = useMemo(() => {
    const bits: string[] = [];
    for (let i = 0; i < footerSlotCount; i++) {
      bits.push(
        `${parseSignerSlotSource(formData, i)}:${formData[signerSlotOfficialIdKey(i)] ?? ""}:${formData[signerSlotRoleKey(i)] ?? ""}`,
      );
    }
    return bits.join("|");
  }, [footerSlotCount, formData]);

  useEffect(() => {
    if (!open) {
      lastOfficialApplySlots.current = {};
      return;
    }
    let cancel = false;
    queueMicrotask(() => {
      if (!cancel) setOfficialsLoading(true);
    });
    fetch("/api/officials?status=active&pageSize=300")
      .then((r) => r.json())
      .then((j) => {
        if (!cancel && j?.rows) {
          setOfficialRows(j.rows as OfficialRow[]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setOfficialsLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !template) return;

    for (let slotIdx = 0; slotIdx < footerSlotCount; slotIdx++) {
      if (parseSignerSlotSource(formData, slotIdx) !== "official") {
        delete lastOfficialApplySlots.current[slotIdx];
        continue;
      }
      const oidRaw = (formData[signerSlotOfficialIdKey(slotIdx)] ?? "").trim();
      if (!oidRaw) continue;
      const oid = Number(oidRaw);
      if (!Number.isFinite(oid) || oid < 1) continue;
      const o = officialRows.find((row) => row.id === oid);
      if (!o) continue;
      const rolePart =
        parseSignerRoleOverrideForSlot(formData, slotIdx) ??
        (slotIdx === 0 ? parseSignerRoleFromForm(formData) : "_");
      const token = `${template.id}:${slotIdx}:${oid}:${rolePart}:${o.name ?? ""}`;
      if (lastOfficialApplySlots.current[slotIdx] === token) continue;
      lastOfficialApplySlots.current[slotIdx] = token;
      const patch = buildFooterSignerPatchFromOfficial(template, slotIdx, o);
      Object.entries(patch).forEach(([k, val]) => onFormChange(k, val));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formData sudah diwakili officialSlotsApplyWatch
  }, [
    open,
    template,
    footerSlotCount,
    officialSlotsApplyWatch,
    officialRows,
    onFormChange,
    // formData tercakup via officialSlotsApplyWatch
  ]);

  const applyManualSignerSlot = useCallback(
    (slotIdx: number, nama: string, nip: string) => {
      if (!template) return;
      const patch = buildFooterSignerPatchFromManual(template, slotIdx, nama, nip);
      Object.entries(patch).forEach(([k, v]) => onFormChange(k, v));
    },
    [template, onFormChange],
  );

  const slotPlaceholderHint = (
    slotIdx: number,
  ): { nama: string; nip?: string } => {
    if (!template) return { nama: "…" };
    const { nameKeys, nipKeys } = getFooterSignerPlaceholderKeys(template, slotIdx);
    return {
      nama: nameKeys.length
        ? nameKeys.slice(0, 2).map((k) => `{${k}}`).join(", ")
        : "(nama)",
      nip: nipKeys.length
        ? nipKeys.slice(0, 2).map((k) => `{${k}}`).join(", ")
        : undefined,
    };
  };

  const handleSlotModeChange = (
    slotIdx: number,
    mode: "preset" | "official" | "manual",
  ) => {
    delete lastOfficialApplySlots.current[slotIdx];
    if (mode === "preset") {
      onFormChange(signerSlotSourceKey(slotIdx), "");
      onFormChange(signerSlotOfficialIdKey(slotIdx), "");
      if (slotIdx === 0) {
        lastOfficialApplySlots.current = {};
        onRefreshSignerPresetFromDesa();
      }
      return;
    }
    if (mode === "manual") {
      onFormChange(signerSlotSourceKey(slotIdx), "manual");
      onFormChange(signerSlotOfficialIdKey(slotIdx), "");
      return;
    }
    onFormChange(signerSlotSourceKey(slotIdx), "official");
    onFormChange(signerSlotOfficialIdKey(slotIdx), "");
  };

  const modeToSelectValue = (src: SignerSourcePreset) =>
    src === "official" ? "official" : src === "manual" ? "manual" : "preset";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingLetterId != null ? "Edit Surat — " : "Buat Surat — "}
            {template?.name}
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

            <TabsContent value="form" className="mt-4 space-y-6">
              <div className="space-y-4">
                <h3 className="border-b pb-2 text-base font-semibold">
                  Informasi Surat
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Nomor urut / segmen nomor *
                    </label>
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      placeholder="Contoh: 5 atau 005 (sesuai slot di template)"
                      value={formData.NOMOR_SURAT || ""}
                      onChange={(e) =>
                        onFormChange("NOMOR_SURAT", e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Hanya angka. Format lengkap surat mengikuti template
                      (variabel {"{NOMOR_SURAT}"}).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tanggal Surat *</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 font-normal"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {formatTanggalSuratId(letterDate)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={letterDate}
                          onSelect={(d) => {
                            if (d) onLetterDateChange(d);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Dipakai untuk variabel {"{TANGGAL_SURAT}"} dan data surat.
                    </p>
                  </div>
                </div>
              </div>

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
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                      <h3 className="text-base font-semibold">Data Pemohon</h3>
                      {selectedResident && (
                        <Badge variant="default" className="bg-green-500">
                          Data dari: {selectedResident.name}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {template.variables
                        .filter(
                          (v) =>
                            !PEMOHON_EXCLUDE.has(v) &&
                            !signerHiddenFormKeys.has(v) &&
                            !isSignerSlotPersistenceKey(v) &&
                            !footerReservedVarKeys.has(v),
                        )
                        .map((variable) => {
                          const locked = isFieldLockedByAuto(variable);
                          const commonInputProps = {
                            disabled: locked,
                            className: locked ? "opacity-80" : undefined,
                          };
                          return (
                            <div key={variable} className="space-y-2">
                              <label className="text-sm font-medium">
                                {variable.replace(/_/g, " ")} *
                              </label>
                              {variable === residentPickerVar ? (
                                <>
                                  <AutocompleteResidentInput
                                    value={formData[variable] || ""}
                                    onChange={(value) =>
                                      onFormChange(variable, value)
                                    }
                                    onResidentSelect={onResidentSelect}
                                    placeholder={
                                      variable === "NIK"
                                        ? "Ketik NIK atau nama warga..."
                                        : "Ketik nama atau NIK warga..."
                                    }
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Pilih dari hasil pencarian database desa atau
                                    ketik manual. Saat memilih warga, field
                                    terkait (nama, NIK, alamat, dll.) terisi
                                    otomatis dan tetap bisa diubah.
                                  </p>
                                </>
                              ) : variable === "ALAMAT" ||
                                variable === "ALAMAT_LENGKAP" ||
                                variable === "KEPERLUAN" ||
                                variable.includes("KETERANGAN") ? (
                                <Textarea
                                  placeholder={`Masukkan ${variable.toLowerCase().replace(/_/g, " ")}`}
                                  value={formData[variable] || ""}
                                  onChange={(e) =>
                                    onFormChange(variable, e.target.value)
                                  }
                                  rows={3}
                                  {...commonInputProps}
                                />
                              ) : (
                                <Input
                                  placeholder={`Masukkan ${variable.toLowerCase().replace(/_/g, " ")}`}
                                  value={formData[variable] || ""}
                                  onChange={(e) =>
                                    onFormChange(variable, e.target.value)
                                  }
                                  {...commonInputProps}
                                />
                              )}
                              {locked && (
                                <p className="text-xs text-muted-foreground">
                                  Nonaktifkan &quot;Wilayah dari pengaturan
                                  desa&quot; di bawah untuk mengubah manual.
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border border-dashed bg-muted/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold">
                          Wilayah &amp; pejabat desa
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Isi otomatis dari Pengaturan Desa; matikan untuk
                          mengedit manual.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="auto-wilayah"
                          checked={autoFillWilayahDesa}
                          onCheckedChange={onAutoFillWilayahDesaChange}
                        />
                        <Label htmlFor="auto-wilayah" className="cursor-pointer">
                          Wilayah dari pengaturan desa
                        </Label>
                      </div>
                    </div>

                    {autoFillWilayahDesa ? (
                      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                        <div>
                          <span className="text-muted-foreground">Kabupaten:</span>
                          <p className="font-medium">
                            {wilayahDisplayValue(
                              formData,
                              desaSettings,
                              "kabupaten",
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Kecamatan:</span>
                          <p className="font-medium">
                            {wilayahDisplayValue(
                              formData,
                              desaSettings,
                              "kecamatan",
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Desa:</span>
                          <p className="font-medium">
                            {wilayahDisplayValue(formData, desaSettings, "desa")}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {kabWilayahKey && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Kabupaten
                            </label>
                            <Input
                              value={formData[kabWilayahKey] || ""}
                              onChange={(e) =>
                                onFormChange(kabWilayahKey, e.target.value)
                              }
                            />
                          </div>
                        )}
                        {kecWilayahKey && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Kecamatan
                            </label>
                            <Input
                              value={formData[kecWilayahKey] || ""}
                              onChange={(e) =>
                                onFormChange(kecWilayahKey, e.target.value)
                              }
                            />
                          </div>
                        )}
                        {dualDesaFields ? (
                          <>
                            <div className="space-y-2 md:col-span-3">
                              <label className="text-sm font-medium">
                                Nama desa (surat)
                              </label>
                              <Input
                                value={formData.NAMA_DESA || ""}
                                onChange={(e) =>
                                  onFormChange("NAMA_DESA", e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2 md:col-span-3">
                              <label className="text-sm font-medium">Desa</label>
                              <Input
                                value={formData.DESA || ""}
                                onChange={(e) =>
                                  onFormChange("DESA", e.target.value)
                                }
                              />
                            </div>
                          </>
                        ) : desWilayahKey ? (
                          <div className="space-y-2 md:col-span-3">
                            <label className="text-sm font-medium">Desa</label>
                            <Input
                              value={formData[desWilayahKey] || ""}
                              onChange={(e) =>
                                onFormChange(desWilayahKey, e.target.value)
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                    <h3 className="border-b pb-2 text-base font-semibold">
                      Penandatangan
                    </h3>

                    <div className="space-y-3 rounded-lg border border-dashed border-border bg-background/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        {footerSlotCount > 1
                          ? `Template ini punya ${footerSlotCount} blok tanda tangan di footer — atur nama dan nomor identitas (NIP/NIK) per kolom di bawah.`
                          : "Atur nama dan nomor identitas (NIP atau NIK) pada blok tanda tangan footer."}
                      </p>

                      {Array.from({ length: footerSlotCount }, (_, slotIdx) => {
                        const srcResolved = parseSignerSlotSource(formData, slotIdx);
                        const hint = slotPlaceholderHint(slotIdx);
                        const roleCaption =
                          footerSignerRoleHints[slotIdx]?.trim() ?? `Kolom ${slotIdx + 1}`;
                        const keysSlot = getFooterSignerPlaceholderKeys(
                          template,
                          slotIdx,
                        );
                        const nameKey =
                          keysSlot.nameKeys[0] ??
                          (slotIdx === 0 ? "KEPALA_DESA_NAMA" : "");
                        const nipKey =
                          keysSlot.nipKeys[0] ??
                          (slotIdx === 0 ? "KEPALA_DESA_NIP" : "");

                        return (
                          <div
                            key={slotIdx}
                            className="space-y-3 rounded-lg border border-border bg-muted/20 p-3"
                          >
                            <div>
                              <Label className="text-sm font-semibold">
                                {footerSlotCount > 1
                                  ? `Penandatang ${slotIdx + 1} dari ${footerSlotCount}`
                                  : "Nama pada blok TTD / footer"}
                              </Label>
                              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                {roleCaption}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Variabel: <span className="font-mono text-[11px]">{hint.nama}</span>
                                {hint.nip ? (
                                  <>
                                    {" "}
                                    · nomor pengenal:{" "}
                                    <span className="font-mono text-[11px]">{hint.nip}</span>
                                  </>
                                ) : null}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                Peran penandatangan (opsional)
                              </Label>
                              <Select
                                value={
                                  parseSignerRoleOverrideForSlot(formData, slotIdx) ??
                                  "__inherit"
                                }
                                onValueChange={(v) => {
                                  lastOfficialApplySlots.current = {};
                                  if (v === "__inherit") {
                                    onSignerSlotRoleChange(slotIdx, null);
                                  } else {
                                    onSignerSlotRoleChange(
                                      slotIdx,
                                      v as SignerRole,
                                    );
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full max-w-md">
                                  <SelectValue placeholder="Ikuti footer template" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__inherit">
                                    Ikuti teks/footer template
                                  </SelectItem>
                                  {SIGNER_ROLE_OPTIONS.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Kosongkan agar baris jabatan kolom ini mengikuti template; isi
                                jika perlu override (mis. pejabat lain di kolom kedua).
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`signer-an-${slotIdx}`}>
                                Atas nama (a.n.) — opsional
                              </Label>
                              <Input
                                id={`signer-an-${slotIdx}`}
                                placeholder="Contoh nama pejabat induk / yang diwakili…"
                                value={
                                  formData[signerSlotOnBehalfKey(slotIdx)] ?? ""
                                }
                                onChange={(e) =>
                                  onFormChange(
                                    signerSlotOnBehalfKey(slotIdx),
                                    e.target.value,
                                  )
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Baris «a.n. …» pada kolom tanda tangan ini. Kosongkan jika tidak
                                dipakai di template atau mengikuti desain blok.
                              </p>
                            </div>
                            <Select
                              value={modeToSelectValue(srcResolved)}
                              onValueChange={(mode) => {
                                handleSlotModeChange(
                                  slotIdx,
                                  mode as "preset" | "official" | "manual",
                                );
                              }}
                            >
                              <SelectTrigger className="w-full max-w-md">
                                <SelectValue placeholder="Sumber nama penandatangan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="preset">
                                  Sesuai peran &amp; pengaturan desa
                                  {slotIdx > 0 ? " (preset desa)" : ""}
                                </SelectItem>
                                <SelectItem value="official">
                                  Pilih dari perangkat desa
                                </SelectItem>
                                <SelectItem value="manual">
                                  Ketik nama &amp; nomor pengenal sendiri
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {srcResolved === "official" && (
                              <div className="space-y-2">
                                <Label>Perangkat desa</Label>
                                <Select
                                  disabled={officialsLoading}
                                  value={
                                    formData[signerSlotOfficialIdKey(slotIdx)] ?? ""
                                  }
                                  onValueChange={(id) => {
                                    delete lastOfficialApplySlots.current[slotIdx];
                                    onFormChange(signerSlotOfficialIdKey(slotIdx), id);
                                    onFormChange(
                                      signerSlotSourceKey(slotIdx),
                                      "official",
                                    );
                                  }}
                                >
                                  <SelectTrigger className="w-full max-w-md">
                                    <SelectValue
                                      placeholder={
                                        officialsLoading
                                          ? "Memuat data perangkat…"
                                          : "Pilih nama pejabat…"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-72">
                                    {officialRows.map((o) => (
                                      <SelectItem key={o.id} value={String(o.id)}>
                                        {o.name}
                                        {o.position?.name
                                          ? ` — ${o.position.name}`
                                          : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {srcResolved === "manual" && nameKey && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor={`signer-manual-nama-${slotIdx}`}>
                                    Nama
                                  </Label>
                                  <Input
                                    id={`signer-manual-nama-${slotIdx}`}
                                    value={formData[nameKey] ?? ""}
                                    onChange={(e) =>
                                      applyManualSignerSlot(
                                        slotIdx,
                                        e.target.value,
                                        nipKey ? formData[nipKey] ?? "" : "",
                                      )
                                    }
                                  />
                                </div>
                                {nipKey ? (
                                  <div className="space-y-2">
                                    <Label htmlFor={`signer-manual-nip-${slotIdx}`}>
                                      NIK atau NIP (opsional)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Untuk warga/non-perangkat isi sebagai NIK; untuk perangkat desa bisa NIP ASN.
                                    </p>
                                    <Input
                                      id={`signer-manual-nip-${slotIdx}`}
                                      value={formData[nipKey] ?? ""}
                                      onChange={(e) =>
                                        applyManualSignerSlot(
                                          slotIdx,
                                          formData[nameKey] ?? "",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button className="min-w-[9rem]" onClick={() => onTabChange("preview")}>
                  Lihat Preview
                </Button>
                {editingLetterId != null && editingLetterStatus != null && (
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => onSaveLetter(editingLetterStatus)}
                  >
                    Simpan perubahan
                  </Button>
                )}
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Batal
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4 space-y-4">
              <div
                ref={previewRef}
                className="min-h-175 bg-white p-8 font-serif"
              >
                {renderTemplateContent(template, formData, desaSettings)}
              </div>

              <div className="flex gap-2 border-t pt-4">
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
                    void onSaveAndPrint();
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {editingLetterId != null ? "Selesai & cetak" : "Simpan & cetak"}
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
