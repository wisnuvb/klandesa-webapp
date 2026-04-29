"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CSSProperties } from "react";
import Image from "next/image";
import {
  FooterSignatureBlock,
  mergeFooterWithFormSignerOverrides,
} from "../components/template-builder/FooterSignatureBlock";
import {
  DEFAULT_HEADER_CONFIG,
  TableRow,
  ListItem,
} from "../components/template-builder/types";

import {
  expandTemplateVariableData,
  replaceVariables,
  resolveTemplateText,
} from "./templateVariables";

export {
  expandTemplateVariableData,
  replaceVariables,
  resolveTemplateText,
};

/** Fallback bila pengaturan desa belum punya logo */
const exampleImage = "/vercel.svg";

/**
 * Utility functions for rendering letter templates consistently across the app.
 * This ensures all template previews use the same rendering logic.
 */

/** Hindari "KECAMATAN KECAMATAN X" bila nilai field sudah berawalan kata level yang sama. */
export function normalizeKopKecamatanValue(raw: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  return t.replace(/^kecamatan\s+/i, "").trim();
}

export function normalizeKopKabupatenValue(raw: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  return t.replace(/^kabupaten\s+/i, "").trim();
}

/** Hindari "DESA DESA X" bila nama sudah berawalan "Desa ". */
export function normalizeKopNamaDesaValue(raw: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  return t.replace(/^desa\s+/i, "").trim();
}

function headerAlignClass(align: string | undefined): string {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    case "justify":
      return "text-justify";
    default:
      return "text-left";
  }
}

function headerSpacingClass(spacing: string | undefined): string {
  switch (spacing) {
    case "compact":
      return "space-y-0.5";
    case "relaxed":
      return "space-y-2";
    default:
      return "space-y-1";
  }
}

export const HEADER_LOGO_WIDTH_PX_MIN = 32;
export const HEADER_LOGO_WIDTH_PX_MAX = 160;

/** Pixel dari preset `logo_size` (fallback bila `logo_width_px` tidak diisi). */
export function headerLogoPixelSizeFromPreset(size: string | undefined): number {
  switch (size) {
    case "small":
      return 48;
    case "large":
      return 80;
    default:
      return 64;
  }
}

/**
 * Ukuran logo untuk render: `logo_width_px` atau turunan dari `logo_size`.
 */
export function resolveHeaderLogoWidthPx(header: {
  logo_width_px?: number;
  logo_size?: string;
} | null | undefined): number {
  const h = header ?? {};
  if (typeof h.logo_width_px === "number" && Number.isFinite(h.logo_width_px)) {
    return Math.min(
      HEADER_LOGO_WIDTH_PX_MAX,
      Math.max(HEADER_LOGO_WIDTH_PX_MIN, Math.round(h.logo_width_px)),
    );
  }
  return headerLogoPixelSizeFromPreset(h.logo_size);
}

function headerBorderWrapperClass(borderStyle: string | undefined): string {
  switch (borderStyle) {
    case "single":
      return "pb-4 mb-4 border-b border-black";
    case "double":
      return "pb-4 mb-4 border-b-4 border-double border-black";
    case "none":
    default:
      return "pb-4 mb-4";
  }
}

export function headerLogoTopRowFlexClass(pos: string | undefined): string {
  switch (pos) {
    case "left":
      return "justify-start";
    case "right":
      return "justify-end";
    default:
      return "justify-center";
  }
}

/**
 * Render header/letterhead of the letter (selaras TemplatePreview: layout, alignment, logo, border).
 */
export const renderHeader = (
  headerConfig: any,
  data: Record<string, string>,
  pageHeader?: any
) => {
  const showLetterhead = pageHeader?.show_letterhead ?? true;
  if (!showLetterhead) return null;

  const header = headerConfig || {};
  const defaults = DEFAULT_HEADER_CONFIG;
  const fontSize = {
    ...defaults.font_size,
    ...(header.font_size || {}),
  };
  const gov = fontSize.government_label ?? 14;
  const vill = fontSize.village_name ?? 16;
  const addr = fontSize.address ?? 12;

  const layout = header.layout ?? defaults.layout ?? "logo_top";
  const alignment = header.alignment ?? defaults.alignment ?? "center";
  const logoPos = header.logo_position ?? defaults.logo_position ?? "center";
  const spacing = header.spacing ?? defaults.spacing ?? "normal";
  const borderStyle = header.border_style ?? defaults.border_style ?? "double";

  const rawLogo = String(data.LOGO_URL || data.logo_url || "").trim();
  const logoSrc = rawLogo || exampleImage;
  const logoUnoptimized =
    /^https?:\/\//i.test(logoSrc) ||
    logoSrc.startsWith("blob:") ||
    logoSrc.startsWith("data:");
  const logoPx = resolveHeaderLogoWidthPx(header);
  const logoRowJustify = headerLogoTopRowFlexClass(logoPos);

  const kab = normalizeKopKabupatenValue(data.KABUPATEN || "");
  const kec = normalizeKopKecamatanValue(data.KECAMATAN || "");
  const namaDesa = normalizeKopNamaDesaValue(
    data.NAMA_DESA || data.DESA || "",
  );
  const emailLine = String(data.EMAIL_DESA ?? "").trim();

  const alignClass = headerAlignClass(alignment);
  const spaceClass = headerSpacingClass(spacing);
  const borderWrap = headerBorderWrapperClass(borderStyle);

  const wrapperStyle: CSSProperties = {
    fontFamily: header.font_family || defaults.font_family,
    color: header.text_color || defaults.text_color,
  };

  const kopBlock = (
    <>
      <div
        className="font-bold uppercase"
        style={{ fontSize: `${gov}px` }}
      >
        PEMERINTAH KABUPATEN {kab}
      </div>
      <div
        className="font-bold uppercase"
        style={{ fontSize: `${gov}px` }}
      >
        KECAMATAN {kec}
      </div>
      <div
        className="font-bold uppercase"
        style={{ fontSize: `${vill}px` }}
      >
        DESA {namaDesa}
      </div>
      <div style={{ fontSize: `${addr}px` }}>
        {data.ALAMAT_DESA || ""} Kode Pos {data.KODE_POS || ""}
      </div>
      {emailLine ? (
        <div style={{ fontSize: `${addr}px` }}>Email: {emailLine}</div>
      ) : null}
    </>
  );

  const logoImage = (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: logoPx, height: logoPx }}
    >
      <Image
        src={logoSrc}
        alt="Logo"
        className="max-h-full max-w-full object-contain"
        width={logoPx}
        height={logoPx}
        unoptimized={logoUnoptimized}
      />
    </div>
  );

  /** Logo kiri + teks: jika alignment tengah/kata penuh, kolom kosong kanan (lebar = logo)
   * menyamakan pusat optik teks dengan tengah halaman. */
  const logoLeftBalanceCenter =
    alignment === "center" || alignment === "justify";

  return (
    <div className={borderWrap} style={wrapperStyle}>
      {layout === "logo_top" ? (
        <div className={`${spaceClass} ${alignClass} leading-tight`}>
          <div className={`mb-3 flex w-full ${logoRowJustify}`}>
            {logoImage}
          </div>
          {kopBlock}
        </div>
      ) : logoLeftBalanceCenter ? (
        <div className="flex w-full flex-row items-center">
          <div className="flex shrink-0 justify-center">{logoImage}</div>
          <div
            className={`min-w-0 flex-1 ${spaceClass} leading-tight ${headerAlignClass(alignment)}`}
          >
            {kopBlock}
          </div>
          <div
            className="shrink-0"
            style={{ width: logoPx }}
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="flex w-full flex-row items-center gap-3">
          {logoImage}
          <div className={`min-w-0 flex-1 ${spaceClass} ${alignClass} leading-tight`}>
            {kopBlock}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Render letter number/title section
 */
export const renderLetterNumber = (
  config: any,
  data: Record<string, string>,
  pageHeader?: any
) => {
  if (!config?.enabled) return null;

  const showTitle = pageHeader?.show_title ?? true;
  const customTitle = pageHeader?.custom_title;

  return (
    <div className="mb-4 text-center">
      {showTitle && (
        <h1
          className={`m-0 leading-tight ${
            config.heading.bold ? "font-bold" : ""
          } ${config.heading.underline ? "underline" : ""}`}
          style={{
            fontSize: `${config.heading.size}px`,
            fontFamily: config.heading.font,
          }}
        >
          {customTitle || config.heading.text}
        </h1>
      )}
      {config.number && (
        <p
          className={`m-0 mt-1 ${
            config.number.bold ? "font-bold" : ""
          } ${config.number.underline ? "underline" : ""}`}
          style={{
            fontSize: `${config.number.size}px`,
            fontFamily: config.number.font,
          }}
        >
          {config.number.prefix}
          {replaceVariables(config.number.format, data)}
        </p>
      )}
    </div>
  );
};

/**
 * Helper to get font size in pixels from Size type
 */
const getFontSize = (size?: string) => {
  switch (size) {
    case "small":
      return "12px";
    case "large":
      return "18px";
    case "medium":
    default:
      return "14px";
  }
};

/** `style.align`, `block.alignment` (library import), case-insensitive. */
function resolveTextAlign(
  block: { type?: string; alignment?: string },
  style: { align?: string },
  opts: { textDefaultJustify?: boolean },
): CSSProperties["textAlign"] {
  const raw = style?.align ?? block.alignment;
  if (raw == null || raw === "") {
    if (opts.textDefaultJustify && block.type === "text") return "justify";
    return "left";
  }
  const lower = String(raw).toLowerCase();
  if (lower === "center") return "center";
  if (lower === "right") return "right";
  if (lower === "justify") return "justify";
  return "left";
}

/**
 * Render individual content block based on type
 */
export const renderBlock = (block: any, data: Record<string, string>) => {
  const style = block.style || {};
  const fontSize = getFontSize(style.size);
  const fontFamily = style.font || "Literata";

  const ta = resolveTextAlign(block, style, { textDefaultJustify: true });

  const baseStyles = {
    fontFamily,
    fontSize,
    textAlign: ta,
    fontWeight: style.bold ? "bold" : "normal",
    fontStyle: style.italic ? "italic" : "normal",
    textDecoration: style.underline ? "underline" : "none",
    lineHeight: "1.8",
    width: "100%" as const,
  };

  switch (block.type) {
    case "heading":
      return (
        <h2
          key={block.id}
          className="mb-2 block w-full"
          style={{
            ...baseStyles,
            fontSize: style.size === "large" ? "24px" : style.size === "small" ? "16px" : "20px",
            fontWeight: "bold",
            textAlign: resolveTextAlign(block, style, {}),
          }}
        >
          {replaceVariables(block.content as string, data)}
        </h2>
      );

    case "text":
      return (
        <p
          key={block.id}
          className="mb-3 block w-full whitespace-pre-wrap"
          style={{
            ...baseStyles,
            textAlign: ta,
          }}
        >
          {replaceVariables(block.content as string, data)}
        </p>
      );

    case "table":
      const tableContent = (block.content as TableRow[]) || [];
      return (
        <table
          key={block.id}
          className={`w-full mb-4 ${style.border ? "border border-black" : ""}`}
          style={{
            fontFamily,
            fontSize,
            lineHeight: "1.6",
          }}
        >
          <tbody>
            {tableContent.map((row, idx) => (
              <tr
                key={idx}
                className={style.border ? "border-b border-black last:border-b-0" : ""}
              >
                <td
                  className={`py-1 px-2 w-1/3 ${style.border ? "border-r border-black" : ""}`}
                  style={{
                    textAlign: resolveTextAlign(block, style, {}),
                    fontWeight: style.bold ? "bold" : "normal",
                    fontStyle: style.italic ? "italic" : "normal",
                    textDecoration: style.underline ? "underline" : "none",
                  }}
                >
                  {replaceVariables(row.label, data)}
                </td>
                <td className="py-1 px-2">
                  {replaceVariables(row.value, data)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "list":
      const listContent = (block.content as ListItem[]) || [];
      return (
        <ol
          key={block.id}
          className="mb-3 list-decimal ml-6"
          style={{
            ...baseStyles,
            textAlign: "left", // List is usually left-aligned
          }}
        >
          {listContent.map((item, idx) => (
            <li
              key={idx}
              className="mb-1"
              style={{
                marginLeft: `${(item.level || 0) * 20}px`,
              }}
            >
              {replaceVariables(item.text, data)}
            </li>
          ))}
        </ol>
      );

    case "separator":
      return <hr key={block.id} className="my-4 border-black" />;

    case "spacer":
      return <div key={block.id} className="my-6" />;

    default:
      return null;
  }
};

/**
 * Render footer with signatures
 */
export const renderFooter = (
  footerConfig: any,
  data: Record<string, string>,
  pageFooter?: any
) => {
  const showSignatures = pageFooter?.show_signatures ?? true;
  if (!showSignatures) return null;

  const footer = pageFooter?.footer_config || footerConfig;
  const merged = mergeFooterWithFormSignerOverrides(footer, data);

  return (
    <FooterSignatureBlock footer={merged} data={data} className="mt-8 pt-4" />
  );
};

/**
 * Render blocks array as JSX
 */
export const renderBlocks = (blocks: any[], data: Record<string, string>) => {
  return (
    <div
      className="space-y-3"
      style={{ fontFamily: "Literata", fontSize: "14px", lineHeight: "1.8" }}
    >
      {blocks.map((block) => renderBlock(block, data))}
    </div>
  );
};
