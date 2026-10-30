import type { Village } from "@prisma/client";
import { buildLetterFormSnapshot } from "@/lib/mail/letterFormSnapshot";
import { isSafeSrc } from "../document/schema";
import { OFFICIAL_LABELS } from "../registry";
import type { LetterContext } from "./input";

/**
 * Data desa & pejabat untuk kop dan tanda tangan, dibaca dari database pada saat surat dibuat
 * (lalu dibekukan di surat). Memakai ulang pembaca snapshot yang sudah ada.
 */
export async function buildLetterContext(village: Village): Promise<LetterContext & { kodeDesa: string }> {
  const snap = await buildLetterFormSnapshot(village.id, village);
  const logo = village.logoUrl?.trim();
  return {
    kodeDesa: village.code,
    desa: {
      nama: village.name,
      kecamatan: village.district,
      kabupaten: village.regency,
      provinsi: village.province,
      alamat: village.address ?? "",
      kode_pos: village.postalCode ?? "",
      telepon: village.phone ?? "",
      email: village.email ?? "",
      kode: village.code,
    },
    pejabat: {
      kades: { nama: snap.KEPALA_DESA_NAMA ?? "", nip: snap.KEPALA_DESA_NIP ?? "", jabatan: OFFICIAL_LABELS.kades },
      sekdes: { nama: snap.SEKRETARIS_NAMA ?? "", nip: "", jabatan: OFFICIAL_LABELS.sekdes },
      camat: { nama: snap.CAMAT_NAMA ?? "", nip: "", jabatan: OFFICIAL_LABELS.camat },
    },
    logoUrl: logo && isSafeSrc(logo) ? logo : undefined,
  };
}
