"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
import { TableRow, ListItem } from "../components/template-builder/types";
// Static placeholder logo; replace with actual logo path from settings if available
const exampleImage = "/vercel.svg";

/**
 * Utility functions for rendering letter templates consistently across the app.
 * This ensures all template previews use the same rendering logic.
 */

/**
 * Samakan variabel template yang beda penamaan (legacy / bahasa) ke satu nilai.
 * Contoh: `nama_kades`, `NAMA_KADES` ↔ `KEPALA_DESA_NAMA`
 */
export function expandTemplateVariableData(
  data: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...data };

  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = out[k];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return "";
  };

  const setIfEmpty = (key: string, val: string) => {
    if (!val) return;
    if (out[key] == null || String(out[key]).trim() === "") out[key] = val;
  };

  const kepala = pick("KEPALA_DESA_NAMA", "nama_kades", "NAMA_KADES");
  const nip = pick("KEPALA_DESA_NIP", "nip_kades", "NIP_KADES", "NIP_KEPALA_DESA");

  setIfEmpty("KEPALA_DESA_NAMA", kepala);
  setIfEmpty("nama_kades", kepala);
  setIfEmpty("NAMA_KADES", kepala);
  setIfEmpty("KEPALA_DESA_NIP", nip);
  setIfEmpty("nip_kades", nip);
  setIfEmpty("NIP_KEPALA_DESA", nip);

  const kab = pick("KABUPATEN", "kabupaten");
  setIfEmpty("KABUPATEN", kab);
  setIfEmpty("kabupaten", kab);

  const kec = pick("KECAMATAN", "kecamatan");
  setIfEmpty("KECAMATAN", kec);
  setIfEmpty("kecamatan", kec);

  const desa = pick("NAMA_DESA", "DESA", "nama_desa");
  setIfEmpty("NAMA_DESA", desa);
  setIfEmpty("DESA", desa);
  setIfEmpty("nama_desa", desa);

  /**
   * Tanpa key ini, `Object.keys(expanded)` tidak memuat mis. `KEPALA_DESA_NAMA`
   * dan `replaceVariables` tidak pernah mengganti `{KEPALA_DESA_NAMA}` (tampil mentah).
   * Terjadi pada `form_data` surat lama / parsial yang tidak menyimpan snapshot lengkap.
   */
  const mustExistForReplace = [
    "KEPALA_DESA_NAMA",
    "KEPALA_DESA_NIP",
    "NAMA_DESA",
    "DESA",
    "KABUPATEN",
    "KECAMATAN",
    "ALAMAT_DESA",
    "KODE_POS",
    "TANGGAL_SURAT",
    "NOMOR_SURAT",
    "PENANDA_TANGAN",
    "SEKRETARIS_NAMA",
    "CAMAT_NAMA",
    "BULAN_ROMAWI",
    "TAHUN",
    "nama_kades",
    "NAMA_KADES",
    "nip_kades",
    "NIP_KEPALA_DESA",
  ];
  for (const k of mustExistForReplace) {
    if (!(k in out)) out[k] = "";
  }

  return out;
}

/**
 * Ganti placeholder di teks: `{KEY}`, `{{KEY}}`, `{{ KEY }}` (spasi diabaikan).
 */
export const replaceVariables = (
  text: string,
  data: Record<string, string>,
): string => {
  if (text == null || text === "") return "";
  const expanded = expandTemplateVariableData(data);
  let result = text;

  const keys = Object.keys(expanded).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const value = expanded[key] ?? "";
    result = result.split(`{${key}}`).join(value);
    result = result.split(`{{${key}}}`).join(value);
    result = result.split(`{{ ${key} }}`).join(value);
  }

  result = result.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (full, inner: string) => {
    const k = inner.trim();
    if (expanded[k] !== undefined) return expanded[k]!;
    return full;
  });

  return result;
};

/**
 * Teks setelah semua variabel diganti; dipakai untuk menyembunyikan baris NIP
 * bila template berisi `{KEPALA_DESA_NIP}` tetapi data kosong (bukan menyisakan label "NIP:").
 */
export function resolveTemplateText(
  template: string | null | undefined,
  data: Record<string, string>,
): string {
  if (template == null || String(template).trim() === "") return "";
  return replaceVariables(String(template), data).trim();
}

/**
 * Render header/letterhead of the letter
 */
export const renderHeader = (
  headerConfig: any,
  data: Record<string, string>,
  pageHeader?: any
) => {
  const showLetterhead = pageHeader?.show_letterhead ?? true;
  if (!showLetterhead) return null;

  const header = headerConfig;
  const spacingClass =
    header.spacing === "compact"
      ? "space-y-0.5"
      : header.spacing === "relaxed"
      ? "space-y-2"
      : "space-y-1";

  return (
    <div
      className={`${spacingClass} pb-3 mb-4 border-b-4 border-double border-black`}
    >
      <div className="flex gap-4 items-center justify-center">
        <Image
          src={exampleImage}
          alt="Logo"
          className="h-16 w-16"
          width={64}
          height={64}
        />
        <div className="text-center">
          <div
            className="font-bold uppercase"
            style={{ fontSize: `${header.font_size.government_label}px` }}
          >
            PEMERINTAH {data.KABUPATEN || ""}
          </div>
          <div
            className="font-bold uppercase"
            style={{ fontSize: `${header.font_size.government_label}px` }}
          >
            KECAMATAN {data.KECAMATAN || ""}
          </div>
          <div
            className="font-bold uppercase"
            style={{ fontSize: `${header.font_size.village_name}px` }}
          >
            KANTOR DESA {data.NAMA_DESA || ""}
          </div>
          <div style={{ fontSize: `${header.font_size.address}px` }}>
            {data.ALAMAT_DESA || ""}
          </div>
          <div style={{ fontSize: `${header.font_size.address}px` }}>
            Kode Pos: {data.KODE_POS || ""}
          </div>
        </div>
      </div>
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
    <div className="text-center mb-6 space-y-2">
      {showTitle && (
        <h1
          className={`${config.heading.bold ? "font-bold" : ""} ${
            config.heading.underline ? "underline" : ""
          }`}
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
          className={`${config.number.bold ? "font-bold" : ""} ${
            config.number.underline ? "underline" : ""
          }`}
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

/**
 * Render individual content block based on type
 */
export const renderBlock = (block: any, data: Record<string, string>) => {
  const style = block.style || {};
  const fontSize = getFontSize(style.size);
  const fontFamily = style.font || "Literata";

  const baseStyles = {
    fontFamily,
    fontSize,
    textAlign: (style.align || "left") as any,
    fontWeight: style.bold ? "bold" : "normal",
    fontStyle: style.italic ? "italic" : "normal",
    textDecoration: style.underline ? "underline" : "none",
    lineHeight: "1.8",
  };

  switch (block.type) {
    case "heading":
      return (
        <h2
          key={block.id}
          className="mb-2"
          style={{
            ...baseStyles,
            fontSize: style.size === "large" ? "24px" : style.size === "small" ? "16px" : "20px",
            fontWeight: "bold", // Heading is always bold by default but respects style.bold if provided
            textAlign: style.align || "left",
          }}
        >
          {replaceVariables(block.content as string, data)}
        </h2>
      );

    case "text":
      return (
        <p
          key={block.id}
          className="mb-3 whitespace-pre-wrap"
          style={{
            ...baseStyles,
            textAlign: style.align || "justify",
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
                    textAlign: style.align || "left",
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
  const location = data.NAMA_DESA || "";
  const date = data.TANGGAL_SURAT || "";
  const firstSigner = footer.signers?.[0];
  const nipLine = firstSigner
    ? resolveTemplateText(firstSigner.nip, data)
    : "";

  return (
    <div className="mt-8 pt-4">
      <div className="text-right mb-8">
        <p>
          {location}, {date}
        </p>
        {firstSigner && <p className="font-semibold">{firstSigner.role}</p>}
      </div>

      <div className="mt-20 text-right">
        {firstSigner && (
          <>
            <p className="font-semibold underline">
              {replaceVariables(firstSigner.name, data)}
            </p>
            {nipLine ? (
              <p className="text-sm">NIP: {nipLine}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
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
