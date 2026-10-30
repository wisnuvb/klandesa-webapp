import type { Village } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DesaSettings } from "@/app/(app)/layanan-surat/types";
import { desaSettings as fallbackDesaSettings } from "@/app/(app)/layanan-surat/constants";

/** Field surat di `Village.settings.mail` (atau flat, legacy). */
export type VillageMailSettingsFields = {
  kepalaDesaNama: string;
  kepalaDesaNip: string;
  sekretarisNama: string;
  camatNama: string;
};

export function parseMailSettings(settings: unknown): VillageMailSettingsFields {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {
      kepalaDesaNama: "",
      kepalaDesaNip: "",
      sekretarisNama: "",
      camatNama: "",
    };
  }
  const o = settings as Record<string, unknown>;
  const mail =
    o.mail && typeof o.mail === "object" && !Array.isArray(o.mail)
      ? (o.mail as Record<string, unknown>)
      : null;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  return {
    kepalaDesaNama: str(o.kepalaDesaNama) || str(mail?.kepalaDesaNama),
    kepalaDesaNip: str(o.kepalaDesaNip) || str(mail?.kepalaDesaNip),
    sekretarisNama: str(o.sekretarisNama) || str(mail?.sekretarisNama),
    camatNama: str(o.camatNama) || str(mail?.camatNama),
  };
}

/**
 * Snapshot field untuk form surat — disimpan di MailService.formData agar
 * nilai tetap sama di riwayat meskipun data desa/perangkat berubah.
 */
/** Kolom desa yang dipakai snapshot. */
type SnapshotVillage = Pick<Village, "settings" | "regency" | "district" | "name" | "address" | "postalCode">;

const SNAPSHOT_VILLAGE_SELECT = {
  settings: true,
  regency: true,
  district: true,
  name: true,
  address: true,
  postalCode: true,
} as const;

/**
 * @param knownVillage baris desa yang sudah dimiliki pemanggil (mis. `ctx.village` dari konteks API);
 *   bila diberikan, desa tidak dibaca ulang. Tanpa itu, desa dibaca dengan `select` kolom yang perlu saja.
 */
export async function buildLetterFormSnapshot(
  villageId: number,
  knownVillage?: SnapshotVillage | null,
): Promise<Record<string, string>> {
  const [village, positions] = await Promise.all([
    knownVillage ?? prisma.village.findUnique({ where: { id: villageId }, select: SNAPSHOT_VILLAGE_SELECT }),
    prisma.position.findMany({
      where: { villageId, isActive: true },
      orderBy: [{ level: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!village) return {};

  const parsed = parseMailSettings(village.settings);

  const headPosition =
    positions.find((p) => /^kepala\s+desa$/i.test(p.name.trim())) ??
    positions.find((p) => /\bkepala\s+desa\b/i.test(p.name.trim())) ??
    positions[0];
  const sekPosition = positions.find((p) => /sekretaris desa/i.test(p.name.trim()));

  const activeOfficial = (positionId: number) =>
    prisma.official
      .findMany({
        where: { villageId, positionId },
        orderBy: { startDate: "desc" },
        select: { name: true, status: true, certification: true },
      })
      .then((rows) => rows.find((o) => o.status.toLowerCase() === "active") ?? null);

  // Dua pencarian pejabat saling bebas: jalankan bersamaan.
  const [headOfficial, sek] = await Promise.all([
    headPosition ? activeOfficial(headPosition.id) : Promise.resolve(null),
    sekPosition && !parsed.sekretarisNama ? activeOfficial(sekPosition.id) : Promise.resolve(null),
  ]);

  let kepalaNama = parsed.kepalaDesaNama;
  let kepalaNip = parsed.kepalaDesaNip;
  if (headOfficial) {
    if (!kepalaNama) kepalaNama = headOfficial.name;
    if (!kepalaNip && headOfficial.certification?.trim()) {
      kepalaNip = headOfficial.certification.trim();
    }
  }

  let sekretarisNama = parsed.sekretarisNama;
  if (sek && !sekretarisNama) sekretarisNama = sek.name;

  const out: Record<string, string> = {
    KABUPATEN: village.regency,
    KECAMATAN: village.district,
    DESA: village.name,
    NAMA_DESA: village.name,
    NAMA_KABUPATEN: village.regency,
    NAMA_KECAMATAN: village.district,
    ALAMAT_DESA: village.address,
    KODE_POS: village.postalCode ?? "",
    KEPALA_DESA_NAMA: kepalaNama,
    KEPALA_DESA_NIP: kepalaNip,
    /** Alias untuk template lama / variabel {{nama_kades}} */
    nama_kades: kepalaNama,
    NAMA_KADES: kepalaNama,
    nip_kades: kepalaNip,
    NIP_KEPALA_DESA: kepalaNip,
    PENANDA_TANGAN: `Kepala Desa ${village.name}`,
  };

  if (sekretarisNama) out.SEKRETARIS_NAMA = sekretarisNama;
  if (parsed.camatNama) out.CAMAT_NAMA = parsed.camatNama;

  return out;
}

/**
 * Simpan bagian `mail` di `Village.settings` tanpa menghapus key settings lain.
 */
export function mergeMailSectionIntoVillageSettings(
  existing: unknown,
  mail: Partial<VillageMailSettingsFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prev = parseMailSettings(existing);
  const next: VillageMailSettingsFields = {
    kepalaDesaNama: mail.kepalaDesaNama ?? prev.kepalaDesaNama,
    kepalaDesaNip: mail.kepalaDesaNip ?? prev.kepalaDesaNip,
    sekretarisNama: mail.sekretarisNama ?? prev.sekretarisNama,
    camatNama: mail.camatNama ?? prev.camatNama,
  };
  return {
    ...base,
    mail: {
      kepalaDesaNama: next.kepalaDesaNama,
      kepalaDesaNip: next.kepalaDesaNip,
      sekretarisNama: next.sekretarisNama,
      camatNama: next.camatNama,
    },
  };
}

/**
 * Gabungkan snapshot server + input client. Client menang untuk key yang sama
 * (user sengaja mengubah di form).
 */
export function mergeMailFormDataForPersistence(
  serverSnapshot: Record<string, string>,
  clientForm: Record<string, string>,
  finalLetterNumber: string,
): Record<string, string> {
  return {
    ...serverSnapshot,
    ...clientForm,
    NOMOR_SURAT: finalLetterNumber,
  };
}

/**
 * Response GET desa-settings — objek untuk UI (template builder, preview, dll.)
 */
export function snapshotToDesaSettings(
  village: Pick<
    Village,
    | "logoUrl"
    | "regency"
    | "district"
    | "name"
    | "address"
    | "email"
    | "postalCode"
  >,
  snapshot: Record<string, string>,
): DesaSettings {
  const fb = fallbackDesaSettings;
  return {
    logo_url: village.logoUrl || fb.logo_url,
    kabupaten: snapshot.KABUPATEN || village.regency || fb.kabupaten,
    kecamatan: snapshot.KECAMATAN || village.district || fb.kecamatan,
    nama_desa: snapshot.NAMA_DESA || village.name || fb.nama_desa,
    alamat_desa: snapshot.ALAMAT_DESA || village.address || fb.alamat_desa,
    email_desa: village.email || fb.email_desa,
    kode_pos: snapshot.KODE_POS || village.postalCode || fb.kode_pos,
    kepala_desa_nama: snapshot.KEPALA_DESA_NAMA || fb.kepala_desa_nama,
    kepala_desa_nip: snapshot.KEPALA_DESA_NIP || fb.kepala_desa_nip || "",
    kepala_desa_jabatan: fb.kepala_desa_jabatan,
    sekretaris_nama: snapshot.SEKRETARIS_NAMA || fb.sekretaris_nama,
    sekretaris_jabatan: fb.sekretaris_jabatan,
    camat_nama: snapshot.CAMAT_NAMA || fb.camat_nama,
    camat_jabatan: fb.camat_jabatan,
  };
}
