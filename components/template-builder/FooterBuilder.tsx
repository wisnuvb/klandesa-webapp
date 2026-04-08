/* eslint-disable @typescript-eslint/no-explicit-any */
import { FooterConfig, FooterType, FooterSigner } from "./types";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { VariableTextFieldWithPicker } from "./VariableTextFieldWithPicker";

interface FooterBuilderProps {
  config: FooterConfig;
  onChange: (config: FooterConfig) => void;
  // Multi-page mode props
  isMultiPage?: boolean;
  currentPage?: {
    id: string;
    page_number: number;
    show_footer?: boolean;
    footer?: {
      show_signatures: boolean;
      footer_config?: FooterConfig;
    };
  };
  onUpdatePage?: (updates: any) => void;
  // Single-page mode props
  showFooter?: boolean;
  onToggleShowFooter?: (show: boolean) => void;
  // Multi-page global default
  showFooterDefault?: boolean;
  onToggleShowFooterDefault?: (show: boolean) => void;
}

export function FooterBuilder({
  config,
  onChange,
  isMultiPage = false,
  currentPage,
  onUpdatePage,
  showFooter,
  onToggleShowFooter,
  showFooterDefault,
  onToggleShowFooterDefault,
}: FooterBuilderProps) {
  // Ensure config has all required properties with defaults
  const safeConfig: FooterConfig = {
    ...config,
    signers: config.signers || [
      {
        role: "Kepala Desa",
        name: "{KEPALA_DESA_NAMA}",
        on_behalf_of: null,
        position: "right",
        show_nip: false,
      },
    ],
    footer_type: config.footer_type || "single_right",
    show_date: config.show_date ?? true,
    date_format: config.date_format || "auto",
    date_position: config.date_position || "right",
    show_qr_code: config.show_qr_code ?? false,
    custom_text: config.custom_text || "",
  };

  const updateConfig = (updates: Partial<FooterConfig>) => {
    onChange({ ...safeConfig, ...updates });
  };

  const updateSigner = (index: number, updates: Partial<FooterSigner>) => {
    const newSigners = [...(safeConfig.signers || [])];
    newSigners[index] = { ...newSigners[index], ...updates };
    updateConfig({ signers: newSigners });
  };

  const addSigner = () => {
    const newSigner: FooterSigner = {
      role: "Kepala Desa",
      name: "{KEPALA_DESA_NAMA}",
      on_behalf_of: null,
      position: "right",
      show_nip: false,
      show_stamp: false,
      prefix_text: null,
      nip: null,
    };
    updateConfig({ signers: [...(safeConfig.signers || []), newSigner] });
  };

  const removeSigner = (index: number) => {
    const newSigners = safeConfig.signers?.filter((_, i) => i !== index);
    updateConfig({ signers: newSigners });
  };

  const applyPresetFooter = (type: FooterType) => {
    let newSigners: FooterSigner[] = [];

    switch (type) {
      case "single_right":
        newSigners = [
          {
            role: "Kepala Desa",
            name: "{KEPALA_DESA_NAMA}",
            on_behalf_of: null,
            position: "right",
            show_nip: true,
          },
        ];
        break;

      case "an_kepala_desa":
        newSigners = [
          {
            role: "Sekretaris Desa",
            name: "{SEKRETARIS_NAMA}",
            on_behalf_of: "Kepala Desa",
            position: "right",
            show_nip: false,
            prefix_text: "a.n Kepala Desa",
          },
        ];
        break;

      case "with_camat":
        newSigners = [
          {
            role: "Camat",
            name: "{CAMAT_NAMA}",
            on_behalf_of: null,
            position: "left",
            show_nip: false,
            prefix_text: "Mengetahui,",
          },
          {
            role: "Kepala Desa",
            name: "{KEPALA_DESA_NAMA}",
            on_behalf_of: null,
            position: "right",
            show_nip: true,
          },
        ];
        break;

      case "camat_only":
        newSigners = [
          {
            role: "Camat",
            name: "{CAMAT_NAMA}",
            on_behalf_of: null,
            position: "center",
            show_nip: true,
          },
        ];
        break;

      case "no_signature":
        newSigners = [];
        break;

      case "multi_officials":
        newSigners = [
          {
            role: "Kepala Desa",
            name: "{KEPALA_DESA_NAMA}",
            on_behalf_of: null,
            position: "left",
            show_nip: false,
            prefix_text: "Mengetahui,",
          },
          {
            role: "Sekretaris Desa",
            name: "{SEKRETARIS_NAMA}",
            on_behalf_of: null,
            position: "center",
            show_nip: false,
            prefix_text: null,
          },
        ];
        break;
    }

    updateConfig({ footer_type: type, signers: newSigners });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Multi-page Controls */}
      {isMultiPage && currentPage && onUpdatePage && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Halaman {currentPage.page_number}</Badge>
            <span className="text-sm font-medium">
              Pengaturan Footer untuk Halaman Ini
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-footer" className="text-sm font-medium">
                Tampilkan Footer
              </Label>
              <Switch
                id="show-footer"
                checked={currentPage.show_footer ?? true}
                onCheckedChange={(checked) =>
                  onUpdatePage({
                    show_footer: checked,
                  })
                }
              />
            </div>

            {(currentPage.show_footer ?? true) && (
              <div className="flex items-center justify-between pl-4">
                <Label htmlFor="signatures" className="text-sm">
                  Tampilkan Tanda Tangan
                </Label>
                <Switch
                  id="signatures"
                  checked={currentPage.footer?.show_signatures ?? true}
                  onCheckedChange={(checked) =>
                    onUpdatePage({
                      footer: {
                        ...currentPage.footer,
                        show_signatures: checked,
                      },
                    })
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-4">
          Konfigurasi Footer & Tanda Tangan{" "}
          {isMultiPage ? "(Global untuk Semua Halaman)" : ""}
        </h3>

        <div className="space-y-4">
          {/* Show/Hide Toggle - Single Page Mode */}
          {!isMultiPage && onToggleShowFooter && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toggle-footer-single" className="font-medium">
                    Tampilkan Footer
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aktifkan untuk menampilkan tanda tangan dan tanggal
                  </p>
                </div>
                <Switch
                  id="toggle-footer-single"
                  checked={showFooter ?? true}
                  onCheckedChange={onToggleShowFooter}
                />
              </div>
            </div>
          )}

          {/* Show/Hide Toggle - Multi Page Mode (Global Default) */}
          {isMultiPage && onToggleShowFooterDefault && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="toggle-footer-default"
                    className="font-medium"
                  >
                    Tampilkan Footer (Default untuk Halaman Baru)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pengaturan default saat membuat halaman baru
                  </p>
                </div>
                <Switch
                  id="toggle-footer-default"
                  checked={showFooterDefault ?? true}
                  onCheckedChange={onToggleShowFooterDefault}
                />
              </div>
            </div>
          )}

          {/* Form Footer - Hanya tampilkan jika toggle aktif */}
          {(!isMultiPage ? showFooter ?? true : showFooterDefault ?? true) && (
            <>
              {/* Footer Type Preset */}
              <div className="space-y-2">
                <Label>Template Footer (Preset)</Label>
                <Select
                  value={safeConfig.footer_type}
                  onValueChange={(value) =>
                    applyPresetFooter(value as FooterType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_right">
                      1️⃣ TTD Kepala Desa (Langsung)
                    </SelectItem>
                    <SelectItem value="an_kepala_desa">
                      2️⃣ TTD a.n Kepala Desa
                    </SelectItem>
                    <SelectItem value="with_camat">
                      3️⃣ TTD Kepala Desa + Mengetahui Camat
                    </SelectItem>
                    <SelectItem value="camat_only">
                      4️⃣ TTD Camat (Otoritas Kecamatan)
                    </SelectItem>
                    <SelectItem value="no_signature">
                      5️⃣ Tanpa TTD (Draft/Arsip)
                    </SelectItem>
                    <SelectItem value="multi_officials">
                      6️⃣ Multi-Pejabat (Custom)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pilih preset untuk auto-setup, atau custom manual di bawah
                </p>
              </div>

              {/* Location & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lokasi</Label>
                  <Input
                    value={safeConfig.location}
                    onChange={(e) => updateConfig({ location: e.target.value })}
                    placeholder="Nama Desa/Kecamatan"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Format Tanggal</Label>
                  <Select
                    value={safeConfig.date_format}
                    onValueChange={(value) =>
                      updateConfig({ date_format: value as "auto" | "custom" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        Otomatis (Tanggal Surat)
                      </SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* No Signature Custom Note */}
              {safeConfig.footer_type === "no_signature" && (
                <div className="space-y-2">
                  <Label>Catatan Footer</Label>
                  <Textarea
                    value={safeConfig.custom_note || ""}
                    onChange={(e) =>
                      updateConfig({ custom_note: e.target.value })
                    }
                    placeholder="Misal: Dokumen ini diterbitkan oleh Pemerintah Desa..."
                    rows={3}
                  />
                </div>
              )}

              {/* Signers */}
              {safeConfig.footer_type !== "no_signature" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      Penanda Tangan (
                      {(safeConfig.signers as FooterSigner[])?.length})
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSigner}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Tambah TTD
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {safeConfig.signers?.map((signer, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3 bg-muted/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Penanda Tangan #{index + 1}
                          </span>
                          {(safeConfig.signers as FooterSigner[])?.length >
                            1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSigner(index)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Prefix Text */}
                        <div className="space-y-2">
                          <Label>Teks Prefix (Opsional)</Label>
                          <Input
                            value={signer.prefix_text || ""}
                            onChange={(e) =>
                              updateSigner(index, {
                                prefix_text: e.target.value || null,
                              })
                            }
                            placeholder="Misal: Mengetahui, Menyetujui, dll"
                          />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                          <Label>Jabatan</Label>
                          <Input
                            value={signer.role}
                            onChange={(e) =>
                              updateSigner(index, { role: e.target.value })
                            }
                            placeholder="Misal: Kepala Desa, Camat, dll"
                          />
                        </div>

                        {/* On Behalf Of */}
                        <div className="space-y-2">
                          <Label>Atas Nama (a.n) - Opsional</Label>
                          <Input
                            value={signer.on_behalf_of || ""}
                            onChange={(e) =>
                              updateSigner(index, {
                                on_behalf_of: e.target.value || null,
                              })
                            }
                            placeholder="Misal: Kepala Desa"
                          />
                          <p className="text-xs text-muted-foreground">
                            Kosongkan jika TTD langsung (bukan a.n)
                          </p>
                        </div>

                        <VariableTextFieldWithPicker
                          fieldId={`footer-signer-${index}-name`}
                          label="Nama (variabel)"
                          value={signer.name}
                          onChange={(v) => updateSigner(index, { name: v })}
                          placeholder="{KEPALA_DESA_NAMA}"
                        />

                        <VariableTextFieldWithPicker
                          fieldId={`footer-signer-${index}-nip`}
                          label="NIP (opsional)"
                          value={signer.nip ?? ""}
                          onChange={(v) =>
                            updateSigner(index, {
                              nip: v.trim() === "" ? null : v,
                            })
                          }
                          placeholder="{KEPALA_DESA_NIP}"
                          hint="Contoh: {KEPALA_DESA_NIP} atau ketik NIP tetap. Nilai diambil dari form / pengaturan desa saat surat dicetak."
                        />

                        {/* Position */}
                        <div className="space-y-2">
                          <Label>Posisi TTD</Label>
                          <Select
                            value={signer.position}
                            onValueChange={(value) =>
                              updateSigner(index, {
                                position: value as FooterSigner["position"],
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="left">Kiri</SelectItem>
                              <SelectItem value="center">Tengah</SelectItem>
                              <SelectItem value="right">Kanan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Show Stamp */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`stamp-${index}`}
                            checked={signer.show_stamp}
                            onCheckedChange={(checked) =>
                              updateSigner(index, {
                                show_stamp: checked as boolean,
                              })
                            }
                          />
                          <Label
                            htmlFor={`stamp-${index}`}
                            className="cursor-pointer"
                          >
                            Tampilkan Area Stempel
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
