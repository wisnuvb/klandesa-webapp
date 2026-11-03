import type { Village } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseMailSettings } from "@/lib/mail/letterFormSnapshot";

export type CompletenessItem = {
  key: string;
  label: string;
  done: boolean;
  impact: string;
  href: string;
  cta: string;
};

function readIdmVillageCode(settings: unknown): string {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return "";
  const integrations = (settings as Record<string, unknown>).integrations;
  if (!integrations || typeof integrations !== "object" || Array.isArray(integrations)) return "";
  const v = (integrations as Record<string, unknown>).idmVillageCode;
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Checklist kelengkapan data dasar agar fitur inti (surat, statistik, status IDM) tidak
 * tampil cacat/kosong. Dipakai untuk alert dashboard, bukan gate blocking seperti /onboarding.
 */
export async function getDataCompleteness(village: Village): Promise<CompletenessItem[]> {
  const [residentCount, positionCount, officialCount, kepalaDesaOfficialCount] = await Promise.all([
    prisma.resident.count({ where: { villageId: village.id } }),
    prisma.position.count({ where: { villageId: village.id, isActive: true } }),
    prisma.official.count({ where: { villageId: village.id, status: "active" } }),
    prisma.official.count({
      where: { villageId: village.id, status: "active", position: { name: { contains: "kepala desa" } } },
    }),
  ]);

  const mail = parseMailSettings(village.settings);
  const wilayahSet = Boolean(
    village.settings &&
      typeof village.settings === "object" &&
      !Array.isArray(village.settings) &&
      (village.settings as Record<string, unknown>).wilayah,
  );

  return [
    {
      key: "profile",
      label: "Profil desa",
      done: Boolean(village.name?.trim() && village.district?.trim() && village.address?.trim() && wilayahSet),
      impact: "Nama, kecamatan, dan alamat desa tampil di kop surat serta identitas sistem.",
      href: "/pengaturan-desa",
      cta: "Lengkapi profil desa",
    },
    {
      key: "logo",
      label: "Logo desa",
      done: Boolean(village.logoUrl),
      impact: "Logo tampil di kop surat dan halaman login warga.",
      href: "/pengaturan-desa",
      cta: "Unggah logo",
    },
    {
      key: "position",
      label: "Data jabatan",
      done: positionCount > 0,
      impact: "Layanan surat butuh struktur jabatan untuk menentukan siapa yang berhak menandatangani.",
      href: "/data-jabatan",
      cta: "Lengkapi data jabatan",
    },
    {
      key: "official",
      label: "Data perangkat desa",
      done: officialCount > 0,
      impact: "Tanpa perangkat desa aktif, surat tidak punya penanda tangan dan proses layanan surat terhambat.",
      href: "/data-perangkat",
      cta: "Lengkapi data perangkat",
    },
    {
      key: "kepalaDesa",
      label: "Data Kepala Desa",
      done: kepalaDesaOfficialCount > 0 || Boolean(mail.kepalaDesaNama),
      impact: "Tanpa ini, kolom tanda tangan di surat yang diterbitkan akan kosong.",
      href: "/data-perangkat",
      cta: "Lengkapi data perangkat",
    },
    {
      key: "resident",
      label: "Data warga",
      done: residentCount > 0,
      impact: "Statistik kependudukan dan fitur berbasis data warga masih kosong tanpa ini.",
      href: "/data-warga",
      cta: "Tambah data warga",
    },
    {
      key: "idm",
      label: "Kode IDM/SDGs",
      done: Boolean(readIdmVillageCode(village.settings)),
      impact: "Kartu Status IDM di dashboard menampilkan \"belum dikonfigurasi\" tanpa kode ini.",
      href: "/pengaturan-desa",
      cta: "Isi kode desa",
    },
  ];
}
