/* eslint-disable @typescript-eslint/no-explicit-any */
import Image from "next/image";
import { replaceVariables } from "@/utils/templateRenderer";
import { TemplateData, TableRow, ListItem } from "./types";

interface TemplatePreviewProps {
  template: TemplateData;
  desaSettings: any;
}

export function TemplatePreview({
  template,
  desaSettings,
}: TemplatePreviewProps) {
  const getFontSizeClass = (size: string) => {
    switch (size) {
      case "small":
        return "text-sm";
      case "large":
        return "text-lg";
      default:
        return "text-base";
    }
  };

  const getAlignClass = (align: string) => {
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
  };

  const getSpacingClass = (spacing: string) => {
    switch (spacing) {
      case "compact":
        return "space-y-0.5";
      case "relaxed":
        return "space-y-2";
      default:
        return "space-y-1";
    }
  };

  const getLogoSize = (size: string) => {
    switch (size) {
      case "small":
        return "h-12 w-12";
      case "large":
        return "h-20 w-20";
      default:
        return "h-16 w-16";
    }
  };

  const getBorderStyle = (style: string) => {
    switch (style) {
      case "single":
        return "border-b border-black";
      case "double":
        return "border-b-4 border-double border-black";
      default:
        return "";
    }
  };

  const previewVariableData = (): Record<string, string> => {
    const now = new Date();
    const romanMonths = [
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
      "XII",
    ];
    return {
      NAMA_DESA: desaSettings.nama_desa || "",
      DESA: desaSettings.nama_desa || "",
      KECAMATAN: desaSettings.kecamatan || "",
      KABUPATEN: desaSettings.kabupaten || "",
      ALAMAT_DESA: desaSettings.alamat_desa || "",
      KODE_POS: desaSettings.kode_pos || "",
      KEPALA_DESA_NAMA: desaSettings.kepala_desa_nama || "",
      KEPALA_DESA_NIP: desaSettings.kepala_desa_nip || "",
      SEKRETARIS_NAMA: desaSettings.sekretaris_nama || "",
      CAMAT_NAMA: desaSettings.camat_nama || "",
      NOMOR_SURAT: "001",
      BULAN_ROMAWI: romanMonths[now.getMonth()] ?? "I",
      TAHUN: String(now.getFullYear()),
      TANGGAL_SURAT: now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  };

  const applyTemplateVars = (text: string) =>
    replaceVariables(text, previewVariableData());

  /** Tampilkan baris NIP hanya jika nilai setelah variabel terisi (bukan placeholder kosong). */
  const resolvedNipLine = (nip?: string | null) =>
    nip ? applyTemplateVars(nip).trim() : "";

  return (
    <div className="bg-white text-black p-8 min-h-[297mm] shadow-lg font-['Literata']">
      {/* Header */}
      <div
        className={`pb-4 mb-6 ${getBorderStyle(
          template.header?.border_style || "none"
        )}`}
        style={{
          fontFamily: template.header.font_family,
          color: template.header.text_color,
        }}
      >
        {template.header.layout === "logo_top" ? (
          <div
            className={`${getSpacingClass(
              template.header.spacing || "default"
            )} ${getAlignClass(template.header?.alignment || "center")}`}
          >
            <div
              className={`mx-auto ${getLogoSize(
                template.header.logo_size || "default"
              )} mb-3`}
            >
              <Image
                src={desaSettings.logo_url}
                alt="Logo"
                className="w-full h-full object-contain"
                width={64}
                height={64}
              />
            </div>
            <div
              style={{
                fontSize: `${template.header.font_size?.government_label}px`,
              }}
            >
              PEMERINTAH KABUPATEN {desaSettings.kabupaten}
            </div>
            <div
              style={{
                fontSize: `${template.header.font_size?.government_label}px`,
              }}
            >
              KECAMATAN {desaSettings.kecamatan}
            </div>
            <div
              style={{
                fontSize: `${template.header.font_size?.village_name}px`,
              }}
              className="font-bold"
            >
              DESA {desaSettings.nama_desa}
            </div>
            <div
              style={{ fontSize: `${template.header.font_size?.address}px` }}
            >
              {desaSettings.alamat_desa} Kode Pos {desaSettings.kode_pos}
            </div>
            <div
              style={{ fontSize: `${template.header.font_size?.address}px` }}
            >
              Email: {desaSettings.email_desa}
            </div>
          </div>
        ) : (
          <div className="flex gap-4 items-center relative">
            <div
              className={`${getLogoSize(
                template.header?.logo_size || "default"
              )} absolute left-0`}
            >
              <Image
                src={desaSettings.logo_url}
                alt="Logo"
                width={250}
                height={250}
                className="w-full h-full object-contain"
              />
            </div>
            <div
              className={`flex-1 ${getSpacingClass(
                template.header.spacing || "default"
              )} text-center`}
            >
              <div
                style={{
                  fontSize: `${template.header.font_size?.government_label}px`,
                }}
              >
                PEMERINTAH KABUPATEN {desaSettings.kabupaten}
              </div>
              <div
                style={{
                  fontSize: `${template.header.font_size?.government_label}px`,
                }}
              >
                KECAMATAN {desaSettings.kecamatan}
              </div>
              <div
                style={{
                  fontSize: `${template.header.font_size?.village_name}px`,
                }}
                className="font-bold"
              >
                DESA {desaSettings.nama_desa}
              </div>
              <div
                style={{ fontSize: `${template.header.font_size?.address}px` }}
              >
                {desaSettings.alamat_desa} Kode Pos {desaSettings.kode_pos}
              </div>
              <div
                style={{ fontSize: `${template.header.font_size?.address}px` }}
              >
                Email: {desaSettings.email_desa}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Letter Number Section */}
      {template.letterNumber?.enabled && (
        <div className="mb-6 space-y-0">
          {/* Heading */}
          {template.letterNumber.heading?.text && (
            <div
              className={`${getAlignClass(
                template.letterNumber.heading.align
              )} ${template.letterNumber.heading.bold ? "font-bold" : ""} ${
                template.letterNumber.heading.underline ? "underline" : ""
              }`}
              style={{
                fontFamily: template.letterNumber.heading.font,
                fontSize: `${template.letterNumber.heading.size}px`,
              }}
            >
              {applyTemplateVars(template.letterNumber.heading.text)}
            </div>
          )}

          {/* Number */}
          <div
            className={`${getAlignClass(
              template.letterNumber.number?.align || "center"
            )} ${template.letterNumber.number?.bold ? "font-bold" : ""} ${
              template.letterNumber.number?.underline ? "underline" : ""
            }`}
            style={{
              fontFamily: template.letterNumber.number?.font,
              fontSize: `${template.letterNumber.number?.size}px`,
            }}
          >
            {template.letterNumber.number?.prefix}
            {applyTemplateVars(template.letterNumber.number?.format || "")}
          </div>
        </div>
      )}

      {/* Content Blocks */}
      <div className="space-y-4 mb-8">
        {template.blocks.map((block) => {
          switch (block.type) {
            case "heading":
              return (
                <div
                  key={block.id}
                  className={`${getFontSizeClass(
                    block.style?.size || "medium"
                  )} ${getAlignClass(block.style?.align || "left")} ${
                    block.style?.bold ? "font-bold" : ""
                  } ${block.style?.underline ? "underline" : ""}`}
                  style={
                    block.style?.font
                      ? { fontFamily: block.style.font }
                      : undefined
                  }
                >
                  {applyTemplateVars(block.content as string)}
                </div>
              );

            case "text":
              return (
                <div
                  key={block.id}
                  className={`${getFontSizeClass(
                    block.style?.size || "medium"
                  )} ${getAlignClass(block.style?.align || "left")} ${
                    block.style?.bold ? "font-bold" : ""
                  } ${
                    block.style?.underline ? "underline" : ""
                  } whitespace-pre-wrap leading-relaxed`}
                  style={
                    block.style?.font
                      ? { fontFamily: block.style.font }
                      : undefined
                  }
                >
                  {applyTemplateVars(block.content as string)}
                </div>
              );

            case "table":
              return (
                <table
                  key={block.id}
                  className={`w-full my-4 ${
                    block.style?.border !== false ? "border-collapse" : ""
                  }`}
                  style={
                    block.style?.font
                      ? { fontFamily: block.style.font }
                      : undefined
                  }
                >
                  <tbody>
                    {Array.isArray(block.content) &&
                      (block.content as TableRow[]).map((row, idx) => (
                        <tr
                          key={idx}
                          className={
                            block.style?.border !== false
                              ? "border-b border-gray-300"
                              : ""
                          }
                        >
                          <td
                            className={`py-2 pr-4 align-top w-1/3 ${getFontSizeClass(
                              block.style?.size || "medium"
                            )} ${getAlignClass(block.style?.align || "left")} ${
                              block.style?.bold ? "font-bold" : ""
                            }`}
                          >
                            {applyTemplateVars(row.label)}
                          </td>
                          <td
                            className={`py-2 px-2 align-top w-8 ${getFontSizeClass(
                              block.style?.size || "medium"
                            )} ${block.style?.bold ? "font-bold" : ""}`}
                          >
                            :
                          </td>
                          <td
                            className={`py-2 pl-2 align-top ${getFontSizeClass(
                              block.style?.size || "medium"
                            )} ${getAlignClass(block.style?.align || "left")} ${
                              block.style?.bold ? "font-bold" : ""
                            }`}
                          >
                            {applyTemplateVars(row.value)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              );

            case "list":
              return (
                <ul key={block.id} className="list-disc list-inside space-y-1">
                  {Array.isArray(block.content) &&
                    (block.content as ListItem[]).map((item, idx) => (
                      <li key={idx}>{applyTemplateVars(item.text)}</li>
                    ))}
                </ul>
              );

            case "separator":
              const thickness =
                block.style?.size === "small"
                  ? "border-t"
                  : block.style?.size === "large"
                  ? "border-t-2"
                  : "border-t";
              return (
                <hr
                  key={block.id}
                  className={`my-4 ${thickness} border-gray-400`}
                />
              );

            case "spacer":
              const height =
                block.style?.size === "small"
                  ? "h-4"
                  : block.style?.size === "large"
                  ? "h-12"
                  : "h-8";
              return <div key={block.id} className={height}></div>;

            default:
              return null;
          }
        })}
      </div>

      {/* Footer */}
      {template.footer?.footer_type !== "no_signature" ? (
        <div className="mt-12">
          {/* Multiple Signers Layout */}
          {(template.footer?.signers || []).length > 1 ? (
            <div className="grid grid-cols-2 gap-8">
              {(template.footer?.signers || []).map((signer, idx) => {
                const nip = resolvedNipLine(signer.nip);
                return (
                  <div
                    key={idx}
                    className={`${
                      signer.position === "left"
                        ? "text-left"
                        : signer.position === "center"
                        ? "text-center"
                        : "text-right"
                    }`}
                  >
                    {signer.prefix_text && (
                      <div className="mb-1">{signer.prefix_text}</div>
                    )}
                    {signer.on_behalf_of && (
                      <div className="mb-1">a.n {signer.on_behalf_of}</div>
                    )}
                    <div className="mb-1">{signer.role}</div>
                    {signer.show_stamp && (
                      <div className="my-12 text-muted-foreground text-sm italic">
                        (TTD & Stempel)
                      </div>
                    )}
                    {!signer.show_stamp && (
                      <div className="my-12 text-muted-foreground text-sm italic">
                        (TTD)
                      </div>
                    )}
                    <div className="font-bold underline">
                      {applyTemplateVars(signer?.name || "")}
                    </div>
                    {nip ? (
                      <div className="text-sm">NIP: {nip}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (template.footer?.signers || []).length === 1 ? (
            <div
              className={`${
                (template.footer?.signers || [])[0].position === "left"
                  ? "text-left"
                  : (template.footer?.signers || [])[0].position === "center"
                  ? "text-center"
                  : "text-right"
              }`}
            >
              <div className="mb-2">
                {applyTemplateVars(template.footer?.location || "")},{" "}
                {template.footer?.date_format === "auto"
                  ? "[TANGGAL_SURAT]"
                  : "[TANGGAL_CUSTOM]"}
              </div>
              {(template.footer?.signers || [])[0].prefix_text && (
                <div className="mb-1">
                  {(template.footer?.signers || [])[0].prefix_text}
                </div>
              )}
              {(template.footer?.signers || [])[0].on_behalf_of && (
                <div className="mb-1">
                  a.n {(template.footer?.signers || [])[0].on_behalf_of}
                </div>
              )}
              <div className="mb-1">
                {(template.footer?.signers || [])[0].role}
              </div>
              {(template.footer?.signers || [])[0].show_stamp && (
                <div className="my-12 text-muted-foreground text-sm italic">
                  (TTD & Stempel)
                </div>
              )}
              {!(template.footer?.signers || [])[0].show_stamp && (
                <div className="my-12 text-muted-foreground text-sm italic">
                  (TTD)
                </div>
              )}
              <div className="font-bold underline">
                {applyTemplateVars(
                  (template.footer?.signers || [])[0]?.name || ""
                )}
              </div>
              {(() => {
                const nip = resolvedNipLine(
                  (template.footer?.signers || [])[0]?.nip,
                );
                return nip ? (
                  <div className="text-sm">NIP: {nip}</div>
                ) : null;
              })()}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-12 text-center text-muted-foreground">
          {template.footer?.custom_note ||
            "Dokumen ini diterbitkan oleh Pemerintah Desa"}
        </div>
      )}
    </div>
  );
}
