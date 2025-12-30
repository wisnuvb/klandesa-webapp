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
 * Replace template variables with actual data
 */
export const replaceVariables = (
  text: string,
  data: Record<string, string>
): string => {
  let result = text;
  Object.entries(data).forEach(([key, value]) => {
    result = result?.replaceAll(`{${key}}`, value);
  });
  return result;
};

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
 * Render individual content block based on type
 */
export const renderBlock = (block: any, data: Record<string, string>) => {
  const style = block.style || {};
  const className = `${style.bold ? "font-bold" : ""} ${
    style.italic ? "italic" : ""
  } ${style.underline ? "underline" : ""}`;

  switch (block.type) {
    case "heading":
      return (
        <h2
          key={block.id}
          className={`font-bold text-lg mb-2 ${className}`}
          style={{
            textAlign: style.align || "left",
            fontFamily: style.font || "Literata",
          }}
        >
          {replaceVariables(block.content as string, data)}
        </h2>
      );

    case "text":
      return (
        <p
          key={block.id}
          className={`mb-3 ${className}`}
          style={{
            textAlign: style.align || "justify",
            fontFamily: style.font || "Literata",
            lineHeight: "1.8",
          }}
        >
          {replaceVariables(block.content as string, data)}
        </p>
      );

    case "table":
      const tableContent = block.content as TableRow[];
      return (
        <table
          key={block.id}
          className={`w-full mb-4 ${style.border ? "border border-black" : ""}`}
        >
          <tbody>
            {tableContent.map((row, idx) => (
              <tr
                key={idx}
                className={style.border ? "border-b border-black" : ""}
              >
                <td className="py-1 px-2 w-1/3 font-medium">
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
      const listContent = block.content as ListItem[];
      return (
        <ol key={block.id} className="mb-3 list-decimal ml-6">
          {listContent.map((item, idx) => (
            <li
              key={idx}
              className="mb-1"
              style={{ fontFamily: style.font || "Literata" }}
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

  return (
    <div className="mt-8 pt-4">
      <div className="text-right mb-8">
        <p>
          {location}, {date}
        </p>
        {footer.signers?.length > 0 && (
          <p className="font-semibold">{footer.signers[0].role}</p>
        )}
      </div>

      <div className="mt-20 text-right">
        {footer.signers?.length > 0 && (
          <>
            <p className="font-semibold underline">
              {replaceVariables(footer.signers[0].name, data)}
            </p>
            {footer.signers[0].nip && (
              <p className="text-sm">
                NIP: {replaceVariables(footer.signers[0].nip, data)}
              </p>
            )}
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
