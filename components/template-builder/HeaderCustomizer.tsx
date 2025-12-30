/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  HeaderConfig,
  HeaderLayout,
  Alignment,
  Size,
  BorderStyle,
  FontFamily,
} from "./types";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";

interface HeaderCustomizerProps {
  config: HeaderConfig;
  onChange: (config: HeaderConfig) => void;
  desaSettings?: any; // Add desaSettings prop
  // Multi-page mode props
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
  // Single-page mode props
  showHeader?: boolean;
  onToggleShowHeader?: (show: boolean) => void;
  // Multi-page global default
  showHeaderDefault?: boolean;
  onToggleShowHeaderDefault?: (show: boolean) => void;
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
  // Ensure config has all required properties with defaults
  const safeConfig: HeaderConfig = {
    ...config,
    font_size: config.font_size || {
      village_name: 16,
      government_label: 12,
      subdistrict_label: 14,
      district_label: 14,
      custom_title: 16,
    },
  };

  const updateConfig = (updates: Partial<HeaderConfig>) => {
    onChange({ ...safeConfig, ...updates });
  };

  const updateFontSize = (key: string, value: number) => {
    onChange({
      ...safeConfig,
      font_size: {
        ...safeConfig.font_size,
        [key]: value,
      },
    });
  };

  // Debug: Log the props to console
  console.log("HeaderCustomizer props:", {
    isMultiPage,
    currentPage: !!currentPage,
    onUpdatePage: !!onUpdatePage,
  });

  return (
    <div className="space-y-6 p-6">
      {/* Multi-page Controls - Only show in multi-page mode */}
      {isMultiPage && currentPage && onUpdatePage && (
        <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-3 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-blue-100">
              Halaman {currentPage.page_number}
            </Badge>
            <span className="text-sm font-semibold text-blue-900">
              Pengaturan Header untuk Halaman Ini
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <Label htmlFor="show-header" className="text-sm font-medium">
                Tampilkan Header di Halaman Ini
              </Label>
              <Switch
                id="show-header"
                checked={currentPage.show_header ?? true}
                onCheckedChange={(checked) =>
                  onUpdatePage({
                    show_header: checked,
                  })
                }
              />
            </div>

            {(currentPage.show_header ?? true) && (
              <>
                <div className="flex items-center justify-between pl-6 pr-2 py-2 bg-white rounded">
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

                <div className="flex items-center justify-between pl-6 pr-2 py-2 bg-white rounded">
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
                  <div className="pl-6 pr-2 space-y-2 bg-white p-3 rounded">
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
                      placeholder="e.g., PENGANTAR NIKAH"
                      className="h-9"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Show message if not in multi-page mode */}
      {!isMultiPage && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-4 text-sm text-gray-600">
          💡 Untuk mengatur header per-halaman, aktifkan{" "}
          <strong>Template Multi-Halaman</strong> di tab Info
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-4">
          Konfigurasi Header{" "}
          {isMultiPage ? "(Global - Berlaku untuk Semua Halaman)" : ""}
        </h3>

        <div className="space-y-4">
          {/* Show/Hide Toggle - Single Page Mode */}
          {!isMultiPage && onToggleShowHeader && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toggle-header-single" className="font-medium">
                    Tampilkan Header
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
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

          {/* Show/Hide Toggle - Multi Page Mode (Global Default) */}
          {isMultiPage && onToggleShowHeaderDefault && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="toggle-header-default"
                    className="font-medium"
                  >
                    Tampilkan Header (Default untuk Halaman Baru)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pengaturan default saat membuat halaman baru
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

          {/* Form Header - Hanya tampilkan jika toggle aktif */}
          {(!isMultiPage ? showHeader ?? true : showHeaderDefault ?? true) && (
            <>
              {/* Layout */}
              <div className="space-y-2">
                <Label>Layout Header</Label>
                <Select
                  value={safeConfig.layout}
                  onValueChange={(value) =>
                    updateConfig({ layout: value as HeaderLayout })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logo_top">
                      Logo di Atas (Centered)
                    </SelectItem>
                    <SelectItem value="logo_left">
                      Logo di Kiri (Side by Side)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Alignment */}
              <div className="space-y-2">
                <Label>Alignment Teks</Label>
                <Select
                  value={safeConfig.alignment}
                  onValueChange={(value) =>
                    updateConfig({ alignment: value as Alignment })
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

              {/* Logo Size */}
              <div className="space-y-2">
                <Label>Ukuran Logo</Label>
                <Select
                  value={safeConfig.logo_size}
                  onValueChange={(value) =>
                    updateConfig({ logo_size: value as Size })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Kecil</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="large">Besar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Logo Position */}
              <div className="space-y-2">
                <Label>Posisi Logo</Label>
                <Select
                  value={safeConfig.logo_position}
                  onValueChange={(value) =>
                    updateConfig({ logo_position: value as Alignment })
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

              {/* Font Family */}
              <div className="space-y-2">
                <Label>Font</Label>
                <Select
                  value={safeConfig.font_family}
                  onValueChange={(value) =>
                    updateConfig({ font_family: value as FontFamily })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (Modern)</SelectItem>
                    <SelectItem value="Literata">Literata (Formal)</SelectItem>
                    <SelectItem value="Times New Roman">
                      Times New Roman (Classic)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Sizes */}
              <div className="space-y-3">
                <Label>Ukuran Font</Label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Nama Desa
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={safeConfig.font_size?.village_name}
                        onChange={(e) =>
                          updateFontSize(
                            "village_name",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-20 h-8"
                        min={10}
                        max={24}
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Label Pemerintahan
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={safeConfig.font_size?.government_label}
                        onChange={(e) =>
                          updateFontSize(
                            "government_label",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-20 h-8"
                        min={10}
                        max={20}
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Alamat
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={safeConfig.font_size?.address}
                        onChange={(e) =>
                          updateFontSize("address", parseInt(e.target.value))
                        }
                        className="w-20 h-8"
                        min={8}
                        max={16}
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Border Style */}
              <div className="space-y-2">
                <Label>Garis Bawah Header</Label>
                <Select
                  value={safeConfig.border_style}
                  onValueChange={(value) =>
                    updateConfig({ border_style: value as BorderStyle })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Garis</SelectItem>
                    <SelectItem value="single">Garis Tunggal</SelectItem>
                    <SelectItem value="double">Garis Ganda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spacing */}
              <div className="space-y-2">
                <Label>Spacing</Label>
                <Select
                  value={safeConfig.spacing}
                  onValueChange={(value) =>
                    updateConfig({ spacing: value as HeaderConfig["spacing"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Kompak</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="relaxed">Longgar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Warna Teks</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={safeConfig.text_color}
                      onChange={(e) =>
                        updateConfig({ text_color: e.target.value })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={safeConfig.text_color}
                      onChange={(e) =>
                        updateConfig({ text_color: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Warna Border</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={safeConfig.border_color}
                      onChange={(e) =>
                        updateConfig({ border_color: e.target.value })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={safeConfig.border_color}
                      onChange={(e) =>
                        updateConfig({ border_color: e.target.value })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
