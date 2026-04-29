/* eslint-disable @typescript-eslint/no-explicit-any */
import { LetterNumberConfig, Alignment, FontFamily } from "./types";
import { replaceVariables } from "@/utils/templateRenderer";
import {
  buildLetterNumberPreviewVariableData,
} from "./letter-number-utils";
import { StyleControls } from "./StyleControls";
import { Type, Hash, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

interface LetterNumberBuilderProps {
  config: LetterNumberConfig;
  onChange: (config: LetterNumberConfig) => void;
  // Multi-page mode props
  isMultiPage?: boolean;
  currentPage?: {
    id: string;
    page_number: number;
    letterNumber?: LetterNumberConfig;
  };
  onUpdatePage?: (updates: any) => void;
}

const AlignmentButtons = ({
  value,
  onChange,
}: {
  value: Alignment;
  onChange: (align: Alignment) => void;
}) => (
  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
    {[
      { icon: AlignLeft, value: "left" as Alignment },
      { icon: AlignCenter, value: "center" as Alignment },
      { icon: AlignRight, value: "right" as Alignment },
    ].map(({ icon: Icon, value: alignValue }) => (
      <button
        key={alignValue}
        type="button"
        onClick={() => onChange(alignValue)}
        className={`p-2 rounded transition-colors ${
          value === alignValue
            ? "bg-teal-600 text-white"
            : "text-gray-600 hover:bg-gray-200"
        }`}
      >
        <Icon className="w-4 h-4" />
      </button>
    ))}
  </div>
);

const FontSelector = ({
  value,
  onChange,
}: {
  value: FontFamily;
  onChange: (font: FontFamily) => void;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as FontFamily)}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
  >
    <option value="Inter">Inter</option>
    <option value="Literata">Literata</option>
    <option value="Times New Roman">Times New Roman</option>
  </select>
);

export function LetterNumberBuilder({
  config,
  onChange,
  isMultiPage = false,
  currentPage,
  onUpdatePage,
}: LetterNumberBuilderProps) {
  // Ensure config has required properties with defaults
  const safeConfig = {
    enabled: config?.enabled ?? false,
    heading: {
      text: config?.heading?.text ?? "SURAT KETERANGAN",
      font: config?.heading?.font ?? "Inter",
      size: config?.heading?.size ?? 16,
      bold: config?.heading?.bold ?? true,
      underline: config?.heading?.underline ?? true,
      align: config?.heading?.align ?? "center",
    },
    number: {
      format:
        config?.number?.format ?? "{NOMOR_SURAT}/SK-DS/{BULAN_ROMAWI}/{TAHUN}",
      prefix: config?.number?.prefix ?? "Nomor: ",
      font: config?.number?.font ?? "Inter",
      size: config?.number?.size ?? 12,
      bold: config?.number?.bold ?? false,
      underline: config?.number?.underline ?? false,
      align: config?.number?.align ?? "center",
    },
    auto_numbering: {
      enabled: config?.auto_numbering?.enabled ?? false,
      number_format: config?.auto_numbering?.number_format ?? "001",
      current_number: config?.auto_numbering?.current_number ?? 0,
      reset_period: config?.auto_numbering?.reset_period ?? "never",
      last_reset_date: config?.auto_numbering?.last_reset_date,
    },
  } as LetterNumberConfig;

  const updateHeading = (field: string, value: any) => {
    onChange({
      ...safeConfig,
      heading: {
        ...(safeConfig.heading as any),
        [field]: value,
      },
    });
  };

  const updateNumber = (field: string, value: any) => {
    onChange({
      ...safeConfig,
      number: {
        ...safeConfig.number,
        [field]: value,
      },
    });
  };

  const updateAutoNumbering = (field: string, value: any) => {
    onChange({
      ...safeConfig,
      auto_numbering: {
        ...safeConfig.auto_numbering,
        [field]: value,
      },
    });
  };

  const numberFormatPreview = replaceVariables(
    safeConfig.number?.format ?? "",
    buildLetterNumberPreviewVariableData(safeConfig as LetterNumberConfig),
  );

  return (
    <div className="space-y-6">
      {/* Multi-page Controls */}
      {isMultiPage && currentPage && onUpdatePage && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Halaman {currentPage.page_number}</Badge>
            <span className="text-sm font-medium">
              Pengaturan Nomor Surat untuk Halaman Ini
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-letter-number" className="text-sm font-medium">
              Tampilkan Nomor Surat di Halaman Ini
            </Label>
            <Switch
              id="show-letter-number"
              checked={currentPage.letterNumber?.enabled ?? false}
              onCheckedChange={(checked) =>
                onUpdatePage({
                  letterNumber: {
                    ...currentPage.letterNumber,
                    enabled: checked,
                  } as any,
                })
              }
            />
          </div>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg border border-teal-200">
        <div>
          <h4 className="font-medium text-gray-900">
            Nomor Surat {isMultiPage ? "(Global/Default)" : ""}
          </h4>
          <p className="text-sm text-gray-600">
            Tampilkan heading dan nomor surat
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={safeConfig.enabled}
            onChange={(e) =>
              onChange({ ...safeConfig, enabled: e.target.checked })
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
        </label>
      </div>

      {safeConfig.enabled && (
        <>
          {/* Heading Section */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-teal-600" />
              <h4 className="font-medium text-gray-900">
                Heading (Judul Surat)
              </h4>
            </div>

            <div className="space-y-4">
              {/* Heading Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teks Heading
                </label>
                <input
                  type="text"
                  value={safeConfig.heading?.text}
                  onChange={(e) => updateHeading("text", e.target.value)}
                  placeholder="Contoh: SURAT KETERANGAN AHLI WARIS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kosongkan jika tidak perlu heading
                </p>
              </div>

              {/* Heading Font */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font
                </label>
                <FontSelector
                  value={safeConfig.heading?.font || "Inter"}
                  onChange={(font) => updateHeading("font", font)}
                />
              </div>

              {/* Heading Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ukuran Font: {safeConfig.heading?.size}px
                </label>
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={safeConfig.heading?.size}
                  onChange={(e) =>
                    updateHeading("size", parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>

              {/* Heading Alignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alignment
                </label>
                <AlignmentButtons
                  value={safeConfig.heading?.align || "center"}
                  onChange={(align) => updateHeading("align", align)}
                />
              </div>

              {/* Heading Style */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Style
                </label>
                <StyleControls
                  bold={safeConfig.heading?.bold ?? false}
                  underline={safeConfig.heading?.underline ?? false}
                  onBoldChange={(bold) => updateHeading("bold", bold)}
                  onUnderlineChange={(underline) =>
                    updateHeading("underline", underline)
                  }
                />
              </div>
            </div>
          </div>

          {/* Number Section */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4 text-teal-600" />
              <h4 className="font-medium text-gray-900">Nomor Surat</h4>
            </div>

            <div className="space-y-4">
              {/* Number Prefix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prefix
                </label>
                <input
                  type="text"
                  value={safeConfig.number?.prefix || ""}
                  onChange={(e) => updateNumber("prefix", e.target.value)}
                  placeholder="Contoh: Nomor: "
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Number Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format Nomor
                </label>
                <input
                  type="text"
                  value={safeConfig.number?.format}
                  onChange={(e) => updateNumber("format", e.target.value)}
                  placeholder="{NOMOR_SURAT}/SK-DS/{BULAN_ROMAWI}/{TAHUN}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variable tersedia: {"{NOMOR_SURAT}"} (manual),{" "}
                  {"{NOMOR_URUT}"} (auto), {"{BULAN_ROMAWI}"}, {"{TAHUN}"}
                </p>
              </div>

              {/* Auto-Numbering Section */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900">
                      Nomor Urut Otomatis
                    </h5>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Gunakan {"{NOMOR_URUT}"} di format untuk penomoran
                      otomatis
                    </p>
                  </div>
                  <Switch
                    checked={safeConfig.auto_numbering?.enabled}
                    onCheckedChange={(checked) =>
                      updateAutoNumbering("enabled", checked)
                    }
                  />
                </div>

                {safeConfig.auto_numbering?.enabled && (
                  <div className="space-y-3 bg-teal-50 p-3 rounded-lg border border-teal-200">
                    {/* Number Format (Padding) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Format Angka
                      </label>
                      <select
                        value={safeConfig.auto_numbering.number_format}
                        onChange={(e) =>
                          updateAutoNumbering("number_format", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="1">1, 2, 3... (tanpa padding)</option>
                        <option value="01">01, 02, 03... (2 digit)</option>
                        <option value="001">001, 002, 003... (3 digit)</option>
                        <option value="0001">
                          0001, 0002, 0003... (4 digit)
                        </option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Contoh:{" "}
                        {safeConfig.auto_numbering?.number_format?.replace(
                          /0+/g,
                          (m) => m + "1"
                        )}
                      </p>
                    </div>

                    {/* Current Number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Nomor Terakhir Digunakan
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={safeConfig.auto_numbering.current_number}
                        onChange={(e) =>
                          updateAutoNumbering(
                            "current_number",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Nomor berikutnya:{" "}
                        <strong>
                          {(safeConfig.auto_numbering?.current_number ?? 0) + 1}
                        </strong>
                      </p>
                    </div>

                    {/* Reset Period */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Reset Counter
                      </label>
                      <select
                        value={safeConfig.auto_numbering.reset_period}
                        onChange={(e) =>
                          updateAutoNumbering("reset_period", e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="never">Tidak Pernah</option>
                        <option value="yearly">Setiap Tahun Baru</option>
                        <option value="monthly">Setiap Bulan Baru</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Counter akan direset ke 1 sesuai periode
                      </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 p-2.5 rounded text-xs">
                      <p className="text-blue-900 font-medium">
                        💡 Cara Penggunaan:
                      </p>
                      <ol className="list-decimal ml-4 mt-1 space-y-0.5 text-blue-800">
                        <li>
                          Gunakan{" "}
                          <code className="bg-blue-100 px-1 rounded">
                            {"{NOMOR_URUT}"}
                          </code>{" "}
                          di Format Nomor
                        </li>
                        <li>
                          Nomor akan otomatis bertambah setiap surat dibuat
                        </li>
                        <li>
                          Jika auto-numbering non-aktif, gunakan{" "}
                          <code className="bg-blue-100 px-1 rounded">
                            {"{NOMOR_SURAT}"}
                          </code>{" "}
                          untuk input manual
                        </li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Number Font */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Font
                </label>
                <FontSelector
                  value={safeConfig.number?.font || "Inter"}
                  onChange={(font) => updateNumber("font", font)}
                />
              </div>

              {/* Number Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ukuran Font: {safeConfig.number?.size}px
                </label>
                <input
                  type="range"
                  min="8"
                  max="18"
                  value={safeConfig.number?.size}
                  onChange={(e) =>
                    updateNumber("size", parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
              </div>

              {/* Number Alignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alignment
                </label>
                <AlignmentButtons
                  value={safeConfig.number?.align || "center"}
                  onChange={(align) => updateNumber("align", align)}
                />
              </div>

              {/* Number Style */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Style
                </label>
                <StyleControls
                  bold={safeConfig.number?.bold ?? false}
                  underline={safeConfig.number?.underline ?? false}
                  onBoldChange={(bold) => updateNumber("bold", bold)}
                  onUnderlineChange={(underline) =>
                    updateNumber("underline", underline)
                  }
                />
              </div>
            </div>
          </div>

          {/* Preview Example */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">Preview:</p>
            <div className="bg-white p-4 rounded border border-blue-300 space-y-0">
              {safeConfig.heading?.text && (
                <div
                  className={cn(
                    "text-center",
                    safeConfig.heading?.align === "right" && "text-right",
                    safeConfig.heading?.align === "left" && "text-left",
                    safeConfig.heading?.bold && "font-bold",
                    safeConfig.heading?.underline && "underline",
                  )}
                  style={{
                    fontFamily: safeConfig.heading.font,
                    fontSize: `${safeConfig.heading.size}px`,
                  }}
                >
                  {safeConfig.heading.text}
                </div>
              )}
              <div
                className={cn(
                  "text-center",
                  safeConfig.number?.align === "right" && "text-right",
                  safeConfig.number?.align === "left" && "text-left",
                  safeConfig.number?.bold && "font-bold",
                  safeConfig.number?.underline && "underline",
                )}
                style={{
                  fontFamily: safeConfig.number?.font,
                  fontSize: `${safeConfig.number?.size}px`,
                }}
              >
                {safeConfig.number?.prefix}
                {numberFormatPreview}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
