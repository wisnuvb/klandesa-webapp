"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import {
  HeaderConfig,
  HeaderLayout,
  Alignment,
  Size,
  BorderStyle,
  FontFamily,
} from "./types";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import {
  renderHeader,
  resolveHeaderLogoWidthPx,
  HEADER_LOGO_WIDTH_PX_MIN,
  HEADER_LOGO_WIDTH_PX_MAX,
} from "@/utils/templateRenderer";

interface HeaderCustomizerProps {
  config: HeaderConfig;
  onChange: (config: HeaderConfig) => void;
  desaSettings?: any;
  isMultiPage?: boolean;
  currentPage?: {
    id: string;
    page_number: number;
    show_header?: boolean;
    header?: {
      show_letterhead: boolean;
      show_title: boolean;
      custom_title?: string;
    };
  };
  onUpdatePage?: (updates: any) => void;
  showHeader?: boolean;
  onToggleShowHeader?: (show: boolean) => void;
  showHeaderDefault?: boolean;
  onToggleShowHeaderDefault?: (show: boolean) => void;
}

function clampLogoPx(v: number): number {
  return Math.min(
    HEADER_LOGO_WIDTH_PX_MAX,
    Math.max(HEADER_LOGO_WIDTH_PX_MIN, Math.round(v)),
  );
}

/** Sinkronkan preset `logo_size` agar template lama/API tetap konsisten. */
function pxToSyncedLogoSize(px: number): Size {
  if (px <= 54) return "small";
  if (px >= 74) return "large";
  return "medium";
}

const FONT_CHOICES: {
  value: FontFamily;
  label: string;
  sample: string;
  stack: string;
}[] = [
  {
    value: "Inter",
    label: "Inter (modern)",
    sample: "Aa Bb 123",
    stack: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  {
    value: "Literata",
    label: "Literata (formal)",
    sample: "Aa Bb 123",
    stack: "Literata, Georgia, 'Times New Roman', serif",
  },
  {
    value: "Times New Roman",
    label: "Times New Roman (klasik)",
    sample: "Aa Bb 123",
    stack: "'Times New Roman', Times, serif",
  },
];

const PREVIEW_DESA_FALLBACK = {
  logo_url: "/vercel.svg",
  kabupaten: "PASURUAN",
  kecamatan: "GONDANGWETAN",
  nama_desa: "BRAMBANG",
  alamat_desa: "Jl. Contoh No. 1",
  kode_pos: "67174",
  email_desa: "pemdes@contoh.desa",
};

function headerPreviewData(desa?: any): Record<string, string> {
  const d = { ...PREVIEW_DESA_FALLBACK, ...desa };
  return {
    LOGO_URL: String(d.logo_url ?? "").trim() || PREVIEW_DESA_FALLBACK.logo_url,
    KABUPATEN: d.kabupaten ?? "",
    KECAMATAN: d.kecamatan ?? "",
    NAMA_DESA: d.nama_desa ?? "",
    DESA: d.nama_desa ?? "",
    ALAMAT_DESA: d.alamat_desa ?? "",
    KODE_POS: d.kode_pos ?? "",
    EMAIL_DESA: String(d.email_desa ?? "").trim(),
  };
}

function HeaderKopLivePreview({
  headerConfig,
  desaSettings,
}: {
  headerConfig: HeaderConfig;
  desaSettings?: any;
}) {
  const data = useMemo(
    () => headerPreviewData(desaSettings),
    [desaSettings],
  );

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 md:p-5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-foreground">
          Pratinjau kop surat
        </p>
        <span className="text-xs text-muted-foreground">
          Data dari pengaturan desa · lebar mengikuti modal
        </span>
      </div>
      <div
        className="min-h-[min(320px,45vh)] max-h-[min(560px,72vh)] overflow-auto rounded-lg border border-border/80 bg-white p-6 shadow-inner md:p-10"
        style={{ fontVariantLigatures: "none" }}
      >
        <div className="mx-auto max-w-none text-black sm:max-w-3xl">
          {renderHeader(headerConfig, data)}
        </div>
      </div>
    </div>
  );
}

function radioCardClass(checked: boolean) {
  return cn(
    "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
    checked
      ? "border-primary bg-primary/5 shadow-sm"
      : "border-border bg-background hover:bg-muted/50",
  );
}

export function HeaderCustomizer({
  config,
  onChange,
  desaSettings,
  isMultiPage = false,
  currentPage,
  onUpdatePage,
  showHeader,
  onToggleShowHeader,
  showHeaderDefault,
  onToggleShowHeaderDefault,
}: HeaderCustomizerProps) {
  const safeConfig: HeaderConfig = {
    ...config,
    font_size: {
      village_name: 16,
      government_label: 12,
      subdistrict_label: 14,
      district_label: 14,
      custom_title: 16,
      address: 12,
      ...config.font_size,
    },
  };

  const updateConfig = (updates: Partial<HeaderConfig>) => {
    onChange({ ...safeConfig, ...updates });
  };

  const updateFontSize = (key: string, value: number) => {
    const n = Number.isFinite(value) ? value : 0;
    onChange({
      ...safeConfig,
      font_size: {
        ...safeConfig.font_size,
        [key]: n,
      },
    });
  };

  const resolvedLogoPx = resolveHeaderLogoWidthPx(safeConfig);

  const setLogoWidthPx = (raw: number) => {
    const px = clampLogoPx(raw);
    updateConfig({
      logo_width_px: px,
      logo_size: pxToSyncedLogoSize(px),
    });
  };

  const showForm = !isMultiPage ? showHeader ?? true : showHeaderDefault ?? true;

  return (
    <div className="space-y-6 p-6">
      {isMultiPage && currentPage && onUpdatePage && (
        <div className="space-y-3 rounded-lg border-2 border-blue-300 bg-blue-50 p-4 mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100">
              Halaman {currentPage.page_number}
            </Badge>
            <span className="text-sm font-semibold text-blue-900">
              Pengaturan Header untuk Halaman Ini
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded bg-white p-2">
              <Label htmlFor="show-header" className="text-sm font-medium">
                Tampilkan Header di Halaman Ini
              </Label>
              <Switch
                id="show-header"
                checked={currentPage.show_header ?? true}
                onCheckedChange={(checked) =>
                  onUpdatePage({ show_header: checked })
                }
              />
            </div>

            {(currentPage.show_header ?? true) && (
              <>
                <div className="flex items-center justify-between rounded bg-white py-2 pl-6 pr-2">
                  <Label htmlFor="letterhead" className="text-sm">
                    Tampilkan Kop Surat
                  </Label>
                  <Switch
                    id="letterhead"
                    checked={currentPage.header?.show_letterhead ?? true}
                    onCheckedChange={(checked) =>
                      onUpdatePage({
                        header: {
                          ...currentPage.header,
                          show_letterhead: checked,
                          show_title: currentPage.header?.show_title ?? true,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded bg-white py-2 pl-6 pr-2">
                  <Label htmlFor="show-title" className="text-sm">
                    Tampilkan Judul
                  </Label>
                  <Switch
                    id="show-title"
                    checked={currentPage.header?.show_title ?? true}
                    onCheckedChange={(checked) =>
                      onUpdatePage({
                        header: {
                          ...currentPage.header,
                          show_letterhead:
                            currentPage.header?.show_letterhead ?? true,
                          show_title: checked,
                        },
                      })
                    }
                  />
                </div>

                {currentPage.header?.show_title && (
                  <div className="space-y-2 rounded bg-white p-3 pl-6 pr-2">
                    <Label className="text-sm">Custom Title (Optional)</Label>
                    <Input
                      value={currentPage.header?.custom_title || ""}
                      onChange={(e) =>
                        onUpdatePage({
                          header: {
                            ...currentPage.header,
                            show_letterhead:
                              currentPage.header?.show_letterhead ?? true,
                            show_title: true,
                            custom_title: e.target.value,
                          },
                        })
                      }
                      placeholder="contoh: PENGANTAR NIKAH"
                      className="h-9"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!isMultiPage && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Catatan: </span>
          Untuk mengatur header per-halaman, aktifkan{" "}
          <strong>Template Multi-Halaman</strong> di tab Info
        </div>
      )}

      <div>
        <h3 className="mb-4 font-semibold">
          Konfigurasi Header{" "}
          {isMultiPage ? "(Global — berlaku untuk semua halaman)" : ""}
        </h3>

        <div className="space-y-4">
          {!isMultiPage && onToggleShowHeader && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label
                    htmlFor="toggle-header-single"
                    className="font-medium"
                  >
                    Tampilkan Header
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aktifkan untuk menampilkan kop surat
                  </p>
                </div>
                <Switch
                  id="toggle-header-single"
                  checked={showHeader ?? true}
                  onCheckedChange={onToggleShowHeader}
                />
              </div>
            </div>
          )}

          {isMultiPage && onToggleShowHeaderDefault && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label
                    htmlFor="toggle-header-default"
                    className="font-medium"
                  >
                    Tampilkan Header (default halaman baru)
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Default saat membuat halaman baru
                  </p>
                </div>
                <Switch
                  id="toggle-header-default"
                  checked={showHeaderDefault ?? true}
                  onCheckedChange={onToggleShowHeaderDefault}
                />
              </div>
            </div>
          )}

          {showForm && (
            <div className="flex flex-col gap-8">
              <div className="min-w-0 space-y-6">
                <div className="space-y-2">
                  <Label className="text-base">Layout header</Label>
                  <RadioGroup
                    value={safeConfig.layout || "logo_top"}
                    onValueChange={(v) =>
                      updateConfig({ layout: v as HeaderLayout })
                    }
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    {(
                      [
                        {
                          value: "logo_top" as const,
                          title: "Logo di atas",
                          desc: "Logo di baris pertama, teks di bawah",
                        },
                        {
                          value: "logo_left" as const,
                          title: "Logo di kiri",
                          desc: "Logo dan teks sejajar horizontal",
                        },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.value}
                        htmlFor={`hdr-layout-${opt.value}`}
                        className={radioCardClass(
                          safeConfig.layout === opt.value,
                        )}
                      >
                        <RadioGroupItem
                          value={opt.value}
                          id={`hdr-layout-${opt.value}`}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium">{opt.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {opt.desc}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Alignment teks</Label>
                    <RadioGroup
                      value={safeConfig.alignment || "center"}
                      onValueChange={(v) =>
                        updateConfig({ alignment: v as Alignment })
                      }
                      className="grid gap-2"
                    >
                      {(
                        [
                          ["left", "Kiri"],
                          ["center", "Tengah"],
                          ["right", "Kanan"],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          htmlFor={`hdr-aln-${value}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                            safeConfig.alignment === value
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background",
                          )}
                        >
                          <RadioGroupItem value={value} id={`hdr-aln-${value}`} />
                          {label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Posisi logo (baris logo)</Label>
                    <p className="text-xs text-muted-foreground">
                      Hanya memengaruhi layout &quot;Logo di atas&quot;
                    </p>
                    <RadioGroup
                      value={safeConfig.logo_position || "center"}
                      onValueChange={(v) =>
                        updateConfig({ logo_position: v as Alignment })
                      }
                      className="grid gap-2"
                    >
                      {(
                        [
                          ["left", "Kiri"],
                          ["center", "Tengah"],
                          ["right", "Kanan"],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          htmlFor={`hdr-lp-${value}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                            safeConfig.logo_position === value
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background",
                          )}
                        >
                          <RadioGroupItem
                            value={value}
                            id={`hdr-lp-${value}`}
                          />
                          {label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <Label>Ukuran logo (px)</Label>
                      <p className="text-xs text-muted-foreground">
                        Geser atau isi angka; pratinjau di kanan ikut langsung
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={HEADER_LOGO_WIDTH_PX_MIN}
                        max={HEADER_LOGO_WIDTH_PX_MAX}
                        value={resolvedLogoPx}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (Number.isFinite(n)) setLogoWidthPx(n);
                        }}
                        className="h-9 w-16 text-right tabular-nums"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>
                  <Slider
                    min={HEADER_LOGO_WIDTH_PX_MIN}
                    max={HEADER_LOGO_WIDTH_PX_MAX}
                    step={2}
                    value={[resolvedLogoPx]}
                    onValueChange={([v]) => setLogoWidthPx(v)}
                    className="w-full"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["small", "Kecil", 48],
                        ["medium", "Sedang", 64],
                        ["large", "Besar", 80],
                      ] as const
                    ).map(([size, label, px]) => (
                      <Button
                        key={size}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() =>
                          updateConfig({
                            logo_size: size,
                            logo_width_px: px,
                          })
                        }
                      >
                        {label} ({px}px)
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font</Label>
                  <RadioGroup
                    value={safeConfig.font_family || "Literata"}
                    onValueChange={(v) =>
                      updateConfig({ font_family: v as FontFamily })
                    }
                    className="grid gap-2 sm:grid-cols-1"
                  >
                    {FONT_CHOICES.map((f) => (
                      <label
                        key={f.value}
                        htmlFor={`hdr-font-${f.value}`}
                        className={radioCardClass(
                          safeConfig.font_family === f.value,
                        )}
                      >
                        <RadioGroupItem
                          value={f.value}
                          id={`hdr-font-${f.value}`}
                          className="mt-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-foreground">
                            {f.label}
                          </span>
                          <span
                            className="mt-1 block text-lg text-foreground"
                            style={{ fontFamily: f.stack }}
                          >
                            {f.sample}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Ukuran font</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
                      <span className="text-sm text-muted-foreground">
                        Nama desa
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={safeConfig.font_size?.village_name}
                          onChange={(e) =>
                            updateFontSize(
                              "village_name",
                              parseInt(e.target.value, 10),
                            )
                          }
                          className="h-8 w-20"
                          min={10}
                          max={24}
                        />
                        <span className="text-sm text-muted-foreground">px</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
                      <span className="text-sm text-muted-foreground">
                        Label pemerintahan
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={safeConfig.font_size?.government_label}
                          onChange={(e) =>
                            updateFontSize(
                              "government_label",
                              parseInt(e.target.value, 10),
                            )
                          }
                          className="h-8 w-20"
                          min={10}
                          max={28}
                        />
                        <span className="text-sm text-muted-foreground">px</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 sm:col-span-2">
                      <span className="text-sm text-muted-foreground">
                        Alamat
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={safeConfig.font_size?.address}
                          onChange={(e) =>
                            updateFontSize(
                              "address",
                              parseInt(e.target.value, 10),
                            )
                          }
                          className="h-8 w-20"
                          min={8}
                          max={18}
                        />
                        <span className="text-sm text-muted-foreground">px</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Garis bawah header</Label>
                    <RadioGroup
                      value={safeConfig.border_style || "double"}
                      onValueChange={(v) =>
                        updateConfig({ border_style: v as BorderStyle })
                      }
                      className="grid gap-2"
                    >
                      {(
                        [
                          ["none", "Tanpa garis"],
                          ["single", "Garis tunggal"],
                          ["double", "Garis ganda"],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          htmlFor={`hdr-bd-${value}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                            safeConfig.border_style === value
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background",
                          )}
                        >
                          <RadioGroupItem
                            value={value}
                            id={`hdr-bd-${value}`}
                          />
                          {label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Spacing baris kop</Label>
                    <RadioGroup
                      value={safeConfig.spacing || "normal"}
                      onValueChange={(v) =>
                        updateConfig({
                          spacing: v as HeaderConfig["spacing"],
                        })
                      }
                      className="grid gap-2"
                    >
                      {(
                        [
                          ["compact", "Kompak"],
                          ["normal", "Normal"],
                          ["relaxed", "Longgar"],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          htmlFor={`hdr-sp-${value}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                            safeConfig.spacing === value
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background",
                          )}
                        >
                          <RadioGroupItem
                            value={value}
                            id={`hdr-sp-${value}`}
                          />
                          {label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warna teks</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={safeConfig.text_color || "#000000"}
                        onChange={(e) =>
                          updateConfig({ text_color: e.target.value })
                        }
                        className="h-10 w-12 shrink-0 p-1"
                      />
                      <Input
                        type="text"
                        value={safeConfig.text_color || "#000000"}
                        onChange={(e) =>
                          updateConfig({ text_color: e.target.value })
                        }
                        className="min-w-0 flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Warna border</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={safeConfig.border_color || "#000000"}
                        onChange={(e) =>
                          updateConfig({ border_color: e.target.value })
                        }
                        className="h-10 w-12 shrink-0 p-1"
                      />
                      <Input
                        type="text"
                        value={safeConfig.border_color || "#000000"}
                        onChange={(e) =>
                          updateConfig({ border_color: e.target.value })
                        }
                        className="min-w-0 flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <HeaderKopLivePreview
                  headerConfig={safeConfig}
                  desaSettings={desaSettings}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
