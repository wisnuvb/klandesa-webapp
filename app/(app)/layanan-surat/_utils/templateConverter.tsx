import * as TemplateRenderer from "@/utils/templateRenderer";
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
} from "@/components/template-builder/types";
import {
  isFooterBlockVisible,
  isLetterheadVisible,
} from "@/utils/letterheadVisibility";
import type {
  DesaSettings,
  TemplateBody,
  TemplateFooter,
  LetterHistory,
  TemplateData,
} from "../types";
import { generateHeader, generateFooter } from "../constants";
import { buildPreviewData } from "./letterPreview";

/**
 * Konversi TemplateBody (format dari API) ke TemplateData (format builder).
 * Dipakai saat membuka template di editor.
 */
export function convertToTemplateData(
  template: TemplateBody,
  desaSettings: DesaSettings,
): TemplateData {
  let footerType:
    | "single_right"
    | "single"
    | "an_kepala_desa"
    | "with_camat"
    | "camat_only"
    | "no_signature"
    | "multi_officials" = "single";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let signers: any[] = [];

  if (template.footer?.signers?.length) {
    footerType = template.footer.footer_type || "single";
    signers = template.footer.signers;
  } else {
    signers = [
      {
        role: desaSettings.kepala_desa_jabatan,
        name: desaSettings.kepala_desa_nama,
        on_behalf_of: null,
        position: "right" as const,
        show_stamp: true,
        prefix_text: desaSettings.nama_desa,
        nip: null,
      },
    ];
  }

  const blocks =
    template.blocks && template.blocks.length > 0
      ? template.blocks
      : [
          {
            id: `block-${template.id}`,
            type: "text" as const,
            content: template.content_template,
            style: {
              align: "justify" as const,
              size: "medium" as const,
              bold: false,
              font: "Literata" as const,
            },
          },
        ];

  const defaultHeader = {
    layout: "logo_top" as const,
    alignment: "center" as const,
    logo_size: "medium" as const,
    logo_position: "center" as const,
    font_family: "Inter" as const,
    font_size: { village_name: 20, government_label: 14, address: 12 },
    border_style: "single" as const,
    border_color: "#000000",
    text_color: "#000000",
    spacing: "normal" as const,
  };

  const resolvedHeader = template.header || defaultHeader;
  const resolvedFooter = template.footer || {
    footer_type: footerType,
    signers,
    location: desaSettings.nama_desa,
    date_format: "auto",
    custom_note: null,
  };

  return {
    id: String(template.id),
    name: template.name,
    description: template.description,
    category: template.category,
    is_multi_page: template.is_multi_page || false,
    header: resolvedHeader,
    shared_header: template.shared_header || resolvedHeader,
    shared_footer: template.shared_footer || resolvedFooter,
    letterNumber: template.letterNumber || {
      enabled: true,
      heading: {
        text: template.name.toUpperCase(),
        font: "Inter",
        size: 16,
        bold: true,
        underline: true,
        align: "center",
      },
      number: {
        format: "{NOMOR_SURAT}/SK-DS/{BULAN_ROMAWI}/{TAHUN}",
        prefix: "Nomor: ",
        font: "Inter",
        size: 13,
        bold: false,
        underline: false,
        align: "center",
      },
    },
    blocks,
    pages: template.pages || [],
    footer: resolvedFooter,
    show_header: template.show_header,
    show_footer: template.show_footer,
    show_header_default: template.show_header_default,
    show_footer_default: template.show_footer_default,
    variable_groups: template.variable_groups,
    variables: template.variables,
    is_active: template.is_active,
  };
}

/**
 * Generate HTML string untuk preview surat dari LetterHistory.
 * Dipakai sebagai fallback untuk surat format lama (tanpa templateData).
 */
export function generateLetterPreviewHtml(
  letter: LetterHistory,
  templates: TemplateBody[],
  templateFooters: TemplateFooter[],
): string {
  const template = templates.find((t) => t.id === letter.template_id);
  if (!template) return "";

  const footer = templateFooters.find((f) => f.signer_role === letter.signer_role);
  if (!footer) return "";

  const headerHTML = generateHeader(letter.letter_number, letter.template_name.toUpperCase());

  let bodyContent = template.content_template;
  Object.entries(letter.form_data).forEach(([key, value]) => {
    bodyContent = bodyContent.replaceAll(`{${key}}`, value);
  });

  const footerHTML = generateFooter(footer, letter.form_data.TANGGAL_SURAT || "");

  return `${headerHTML}<div class="body-surat" style="font-size: 14px; line-height: 1.8; text-align: justify; margin: 20px 0;">${bodyContent}</div>${footerHTML}`;
}

/**
 * Render preview surat history menggunakan TemplateRenderer (format modern/blocks).
 */
export function renderHistoryLetterContent(
  letter: LetterHistory,
  desaSettings?: DesaSettings | null,
): React.ReactNode {
  if (!letter.templateData) return null;

  const { templateData, form_data } = letter;
  const previewData = desaSettings
    ? buildPreviewData(form_data, desaSettings, {
        footer: templateData.footer || undefined,
        shared_footer: templateData.shared_footer || undefined,
      })
    : form_data;

  const showHead = isLetterheadVisible(templateData);
  const showFoot = isFooterBlockVisible(templateData);

  return (
    <div style={{ fontFamily: "Literata", fontSize: "14px", lineHeight: "1.8" }}>
      {showHead &&
        TemplateRenderer.renderHeader(
          templateData.header ||
            templateData.shared_header ||
            DEFAULT_HEADER_CONFIG,
          previewData,
        )}
      {TemplateRenderer.renderLetterNumber(templateData.letterNumber, previewData)}
      <div className="space-y-3">
        {(templateData.blocks || []).map((block) =>
          TemplateRenderer.renderBlock(block, previewData),
        )}
      </div>
      {showFoot &&
        TemplateRenderer.renderFooter(
          templateData.footer ||
            templateData.shared_footer ||
            DEFAULT_FOOTER_CONFIG,
          previewData,
        )}
    </div>
  );
}
