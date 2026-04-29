"use client";

import type { FooterConfig, FooterSigner } from "./types";
import { inferFooterSignerIdLabelKind } from "@/app/(app)/layanan-surat/_utils/signFooterPlaceholders";
import {
  signerSlotJabatanKey,
  signerSlotOnBehalfKey,
} from "@/app/(app)/layanan-surat/_utils/signerPreset";
import {
  replaceVariables,
  resolveTemplateText,
} from "@/utils/templateVariables";

/** Variabel opsional di form Buat Surat untuk baris «a.n. …» footer. */
export const SIGNER_ON_BEHALF_KEY = "ATAS_NAMA" as const;

/**
 * Menggabungkan footer template dengan isian form aktif:
 *
 * Ini dua lapisan yang saling melengkapi (bukan duplikasi):
 * — Desain template: struktur blok (mis. kolom/pembuka), prefix statis/context, placeholder jabatan.
 * — Buat/edit surat: keputusan konkret untuk surat ini — peran, sumber data nama, serta baris a.n./override.
 *
 * Prioritas pengisian (slot utama; slot lain mengikuti teks signer di template):
 * 1a) Per slot kolom TTD — `SIGNER_SLOT_n_ATAS_NAMA` / `ATAS_NAMA` (slot 0): baris «a.n. …» kolom tersebut bila ada isi; kosong = ikuti nilai/desain footer template kolom tersebut.
 * 2a) Untuk kolom bertanda tangan lain: `{SIGNER_JABATAN_SLOT_n}` ketika Anda mengisi Override peran surat ini untuk slot tersebut;
 * kosong ⇒ teks/footer template apa adanya untuk kolom itu.
 * 3) `prefix_text` footer tetap bagian bentuk dokument template (mis. konteks blok «Pemohon» vs label jabatan pejabat).
 */

function resolvedNipLine(
  nipTemplate: string | null | undefined,
  data: Record<string, string>,
): string {
  if (!nipTemplate) return "";
  return resolveTemplateText(nipTemplate, data);
}

export function mergeFooterWithFormSignerOverrides(
  footer: FooterConfig | undefined,
  data: Record<string, string>,
): FooterConfig | undefined {
  if (!footer?.signers?.length) return footer;

  return {
    ...footer,
    signers: footer.signers.map((s, i) => {
      const jabKey = signerSlotJabatanKey(i);
      const jab = String(data[jabKey] ?? "").trim();
      const rawRole = String(s.role ?? "");
      /** Tekstual di template menjadi placeholder jika form menyediakan jabatan override untuk kolom itu. */
      let role = s.role;
      if (jab && !/\{/.test(rawRole)) {
        role = `{${jabKey}}`;
      }
      const next = { ...s, role };
      const atasSlot = String(data[signerSlotOnBehalfKey(i)] ?? "").trim();
      if (atasSlot) {
        return { ...next, on_behalf_of: atasSlot };
      }
      return next;
    }),
  };
}

export function FooterSignatureBlock({
  footer,
  data,
  className = "mt-8",
}: {
  footer?: FooterConfig | null;
  data: Record<string, string>;
  className?: string;
}) {
  if (!footer) return null;

  if (footer.footer_type === "no_signature") {
    return (
      <div className={`${className} text-center text-muted-foreground`}>
        {footer.custom_note || "Dokumen ini diterbitkan oleh Pemerintah Desa"}
      </div>
    );
  }

  const signers = footer.signers || [];
  const dateStr =
    footer.date_format === "auto"
      ? data.TANGGAL_SURAT || ""
      : data.TANGGAL_CUSTOM || data.TANGGAL_SURAT || "";

  const signerRoleParagraph = (signer?: FooterSigner) => {
    if (!signer?.role) return null;
    return (
      <div className="mb-1">
        {replaceVariables(String(signer.role), data)}
      </div>
    );
  };

  const signerNameBlock = (signer?: FooterSigner) => (
    <div className="font-bold underline">
      {replaceVariables(String(signer?.name ?? ""), data)}
    </div>
  );

  const stampBlock = (showStamp?: boolean) =>
    showStamp ? (
      <div className="my-10 text-muted-foreground text-sm italic">
        {/* (TTD & Stempel) */}
        &nbsp;
      </div>
    ) : (
      <div className="my-10 text-muted-foreground text-sm italic">
        {/* (TTD) */}
        &nbsp;
      </div>
    );

  const idNumberLine = (
    signer: FooterSigner | undefined,
    slotIdx: number,
    nipResolved: string,
  ) =>
    nipResolved.trim() === "" ? null : (
      <div className="text-sm">
        {inferFooterSignerIdLabelKind(signer?.nip, slotIdx, data) === "nip"
          ? "NIP"
          : "NIK"}
        : {nipResolved}
      </div>
    );

  const behalfBlock = (signer?: FooterSigner) => {
    if (!signer?.on_behalf_of) return null;
    return (
      <div className="mb-1">
        a.n. {replaceVariables(String(signer.on_behalf_of), data)}
      </div>
    );
  };

  if (signers.length > 1) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-2 gap-8">
          {signers.map((signer, idx) => {
            const nip = resolvedNipLine(signer.nip, data);
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
                  <div className="mb-1">
                    {replaceVariables(String(signer.prefix_text), data)}
                  </div>
                )}
                {behalfBlock(signer)}
                {signerRoleParagraph(signer)}
                {stampBlock(signer.show_stamp)}
                {signerNameBlock(signer)}
                {idNumberLine(signer, idx, nip)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (signers.length === 1) {
    const signer = signers[0];
    const nipLine = resolvedNipLine(signer.nip, data);
    const align =
      signer.position === "left"
        ? "text-left"
        : signer.position === "center"
          ? "text-center"
          : "text-right";

    const locRendered = replaceVariables(String(footer.location || ""), data);
    return (
      <div className={className}>
        <div className={align}>
          <div className="mb-2">
            {locRendered.trim()
              ? `${locRendered}${dateStr.trim() ? `, ${dateStr}` : ""}`
              : dateStr}
          </div>
          {signer.prefix_text ? (
            <div className="mb-1">
              {replaceVariables(String(signer.prefix_text), data)}
            </div>
          ) : null}
          {behalfBlock(signer)}
          {signerRoleParagraph(signer)}
          {stampBlock(signer.show_stamp)}
          {signerNameBlock(signer)}
          {idNumberLine(signer, 0, nipLine)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} text-center text-muted-foreground text-sm`}>
      {footer.custom_note ?? ""}
    </div>
  );
}
