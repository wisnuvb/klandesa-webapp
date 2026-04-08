import * as TemplateRenderer from "@/utils/templateRenderer";
import {
  isFooterBlockVisible,
  isLetterheadVisible,
} from "@/utils/letterheadVisibility";
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
} from "@/components/template-builder/types";
import type { DesaSettings, TemplateBody } from "../types";
import { TEMPLATE_DUMMY_DATA } from "../constants";

type LegacyRenderableBlock = {
  id: string;
  type: "text" | "table" | "list";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  style: Record<string, unknown>;
};

function parseLegacyRenderableBlocks(contentTemplate: string): LegacyRenderableBlock[] {
  const blocks: LegacyRenderableBlock[] = [];
  if (!contentTemplate?.trim()) return blocks;

  // Support legacy content that mixed paragraph text + JSON array snippets.
  const jsonArrayRegex = /\[[\s\S]*?\]/g;
  let cursor = 0;
  let idx = 0;

  const pushText = (text: string) => {
    const normalized = text.replace(/\u00a0/g, " ").trim();
    if (!normalized) return;

    normalized
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        blocks.push({
          id: `legacy-text-${idx++}`,
          type: "text",
          content: part,
          style: { align: "justify", font: "Literata" },
        });
      });
  };

  for (const match of contentTemplate.matchAll(jsonArrayRegex)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    pushText(contentTemplate.slice(cursor, start));

    const jsonSnippet = match[0].trim();
    try {
      const parsed = JSON.parse(jsonSnippet);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstRow = parsed[0];

        if (typeof firstRow === "object" && firstRow !== null) {
          if ("label" in firstRow && "value" in firstRow) {
            blocks.push({
              id: `legacy-table-${idx++}`,
              type: "table",
              content: parsed,
              style: { border: false },
            });
            cursor = end;
            continue;
          }

          if ("text" in firstRow) {
            blocks.push({
              id: `legacy-list-${idx++}`,
              type: "list",
              content: parsed,
              style: { font: "Literata" },
            });
            cursor = end;
            continue;
          }
        }
      }
    } catch {
      // Not a valid JSON array snippet, render as regular text below.
    }

    pushText(jsonSnippet);
    cursor = end;
  }

  pushText(contentTemplate.slice(cursor));
  return blocks;
}

/**
 * Merge raw data with default values from desaSettings.
 * Values from `data` always take precedence over defaults.
 */
export function buildPreviewData(
  data: Record<string, string>,
  desaSettings: DesaSettings,
): Record<string, string> {
  const kepala =
    data.KEPALA_DESA_NAMA ||
    data.nama_kades ||
    data.NAMA_KADES ||
    desaSettings.kepala_desa_nama;
  const nip =
    data.KEPALA_DESA_NIP ||
    data.nip_kades ||
    data.NIP_KEPALA_DESA ||
    desaSettings.kepala_desa_nip ||
    "";

  return {
    ...data,
    KABUPATEN: data.KABUPATEN || desaSettings.kabupaten,
    KECAMATAN: data.KECAMATAN || desaSettings.kecamatan,
    DESA: data.DESA || desaSettings.nama_desa,
    NAMA_DESA: data.NAMA_DESA || data.DESA || desaSettings.nama_desa,
    ALAMAT_DESA: data.ALAMAT_DESA || desaSettings.alamat_desa,
    KODE_POS: data.KODE_POS || desaSettings.kode_pos,
    TANGGAL_SURAT: data.TANGGAL_SURAT || "",
    KEPALA_DESA_NAMA: kepala,
    KEPALA_DESA_NIP: nip,
    nama_kades: data.nama_kades || kepala,
    NAMA_KADES: data.NAMA_KADES || kepala,
    nip_kades: data.nip_kades || nip,
    NIP_KEPALA_DESA: data.NIP_KEPALA_DESA || nip,
    PENANDA_TANGAN: data.PENANDA_TANGAN || "Kepala Desa " + desaSettings.nama_desa,
  };
}

/**
 * Render letter content based on the template and form data.
 * Supports multi-page, blocks, and content_template string.
 */
export function renderTemplateContent(
  template: TemplateBody,
  rawData: Record<string, string>,
  desaSettings: DesaSettings,
): React.ReactNode {
  const previewData = buildPreviewData(rawData, desaSettings);
  const hasPages = template.is_multi_page && (template.pages?.length || 0) > 0;
  const hasBlocks = (template.blocks?.length || 0) > 0;

  const sharedHeader =
    template.shared_header ||
    template.header ||
    DEFAULT_HEADER_CONFIG;
  const sharedFooter =
    template.shared_footer ||
    template.footer ||
    DEFAULT_FOOTER_CONFIG;

  if (hasPages) {
    return (
      <div className="space-y-10">
        {template.pages!.map((page, index) => {
          const pageBlocks = page.blocks || [];
          const isLastPage = index === template.pages!.length - 1;
          const showPageHeader = isLetterheadVisible(template, page);
          const showPageFooter = isFooterBlockVisible(template, page);

          return (
            <div
              key={page.id || `page-${index}`}
              className={isLastPage ? "" : "pb-10 border-b"}
            >
              {showPageHeader &&
                TemplateRenderer.renderHeader(sharedHeader, previewData, page.header)}
              {TemplateRenderer.renderLetterNumber(
                page.letterNumber || template.letterNumber,
                previewData,
                page.header,
              )}
              <div className="space-y-3">
                {pageBlocks.map((block) =>
                  TemplateRenderer.renderBlock(block, previewData),
                )}
              </div>
              {showPageFooter &&
                TemplateRenderer.renderFooter(sharedFooter, previewData, page.footer)}
            </div>
          );
        })}
      </div>
    );
  }

  const showSingleHeader = isLetterheadVisible(template);
  const showSingleFooter = isFooterBlockVisible(template);

  return (
    <div style={{ fontFamily: "Literata", fontSize: "14px", lineHeight: "1.8" }}>
      {showSingleHeader &&
        TemplateRenderer.renderHeader(
          template.header || template.shared_header || DEFAULT_HEADER_CONFIG,
          previewData,
        )}
      {TemplateRenderer.renderLetterNumber(template.letterNumber, previewData)}

      <div className="space-y-3">
        {hasBlocks
          ? template.blocks.map((block) =>
              TemplateRenderer.renderBlock(block, previewData),
            )
          : (
            parseLegacyRenderableBlocks(
              TemplateRenderer.replaceVariables(template.content_template || "", previewData),
            ).map((block) => TemplateRenderer.renderBlock(block, previewData))
          )}
      </div>

      {showSingleFooter &&
        TemplateRenderer.renderFooter(
          template.footer || template.shared_footer || DEFAULT_FOOTER_CONFIG,
          previewData,
        )}
    </div>
  );
}

/**
 * Combine dummy data with real data (from form & resident).
 * Real data always overrides dummy data for filled fields.
 * Returns the combined data and a flag indicating if there is any real data.
 */
export function getTemplatePreviewData(
  template: TemplateBody,
  formData: Record<string, string>,
  selectedTemplate: TemplateBody | null,
  selectedResident: Record<string, string> | null,
  desaSettings: DesaSettings,
): { data: Record<string, string>; hasRealData: boolean } {
  const dummyBase: Record<string, string> = {
    ...TEMPLATE_DUMMY_DATA,
    KABUPATEN: desaSettings.kabupaten,
    KECAMATAN: desaSettings.kecamatan,
    DESA: desaSettings.nama_desa,
    PENANDA_TANGAN: "Kepala Desa " + desaSettings.nama_desa,
  };

  const isSameTemplate = selectedTemplate?.id === template.id;
  const templateVariables = template.variables || [];

  const STANDARD_FIELDS = new Set([
    "NOMOR_SURAT", "TANGGAL_SURAT", "KABUPATEN", "KECAMATAN", "DESA", "PENANDA_TANGAN",
  ]);

  const realDataEntries = isSameTemplate
    ? Object.entries(formData || {}).filter(([key, value]) => {
        const normalized = String(value ?? "").trim();
        return normalized && (STANDARD_FIELDS.has(key) || templateVariables.includes(key));
      })
    : [];

  const residentData: Record<string, string> = selectedResident
    ? {
        NAMA: selectedResident.name || "",
        NIK: selectedResident.nik || "",
        TEMPAT_LAHIR: selectedResident.birthPlace || "",
        TANGGAL_LAHIR: selectedResident.birthDate || "",
        JENIS_KELAMIN: selectedResident.gender || "",
        PEKERJAAN: selectedResident.occupation || "",
        ALAMAT: selectedResident.address || "",
      }
    : {};

  // Filter nilai kosong dari residentData
  const cleanResidentData = Object.fromEntries(
    Object.entries(residentData).filter(([, v]) => String(v ?? "").trim()),
  );

  const realData = {
    ...cleanResidentData,
    ...Object.fromEntries(realDataEntries),
  };

  const hasRealData = Object.values(realData).some(
    (value) => String(value ?? "").trim().length > 0,
  );

  return {
    data: { ...dummyBase, ...realData },
    hasRealData,
  };
}
