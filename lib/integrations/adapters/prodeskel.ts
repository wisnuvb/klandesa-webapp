import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "../csv";
import type { IntegrationExportFormat, IntegrationExportResult } from "../types";

export async function exportProdeskel(
  villageId: number,
  format: IntegrationExportFormat,
): Promise<IntegrationExportResult> {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    select: {
      code: true,
      name: true,
      district: true,
      regency: true,
      province: true,
      address: true,
      phone: true,
      email: true,
    },
  });
  if (!village) throw new Error("Desa tidak ditemukan");

  const [residentCount, householdCount, latestPotential, officialCount] =
    await Promise.all([
      prisma.resident.count({ where: { villageId } }),
      prisma.resident.groupBy({
        by: ["kk"],
        where: { villageId, kk: { not: null } },
      }),
      prisma.villagePotential.findFirst({
        where: { villageId },
        orderBy: { year: "desc" },
      }),
      prisma.official.count({ where: { villageId } }),
    ]);

  const profile = {
    kode_desa: village.code,
    nama_desa: village.name,
    kecamatan: village.district,
    kabupaten: village.regency,
    provinsi: village.province,
    alamat: village.address,
    telepon: village.phone,
    email: village.email,
    jumlah_penduduk: residentCount,
    jumlah_kk: householdCount.length,
    jumlah_perangkat: officialCount,
    tahun_potensi: latestPotential?.year ?? null,
    luas_wilayah_ha: latestPotential?.area ?? null,
    lahan_pertanian_ha: latestPotential?.agricultureLand ?? null,
    lahan_perkebunan_ha: latestPotential?.plantationLand ?? null,
    hutan_ha: latestPotential?.forestArea ?? null,
    fasilitas_pendidikan: latestPotential?.educationFacilities ?? null,
    fasilitas_kesehatan: latestPotential?.healthFacilities ?? null,
    objek_wisata: latestPotential?.tourismSpots ?? null,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `prodeskel_${village.code}_${stamp}.${format}`;

  if (format === "json") {
    return {
      adapterId: "prodeskel",
      format,
      recordCount: 1,
      filename,
      mimeType: "application/json",
      body: {
        schema: "prodeskel_v1",
        exportedAt: new Date().toISOString(),
        profile,
      },
      meta: { residentCount },
    };
  }

  const headers = Object.keys(profile);
  const row = Object.fromEntries(
    headers.map((h) => [h, profile[h as keyof typeof profile]]),
  ) as Record<string, string | number | null>;

  return {
    adapterId: "prodeskel",
    format,
    recordCount: 1,
    filename,
    mimeType: "text/csv; charset=utf-8",
    body: rowsToCsv(headers, [row]),
    meta: { residentCount },
  };
}
