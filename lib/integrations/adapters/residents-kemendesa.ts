import { prisma } from "@/lib/prisma";
import { rowsToCsv } from "../csv";
import type { IntegrationExportFormat, IntegrationExportResult } from "../types";

const HEADERS = [
  "kode_desa",
  "nik",
  "nama",
  "jenis_kelamin",
  "tempat_lahir",
  "tanggal_lahir",
  "agama",
  "status_kawin",
  "pekerjaan",
  "pendidikan",
  "rt",
  "rw",
  "dusun",
  "alamat",
];

export async function exportResidentsKemendesa(
  villageId: number,
  format: IntegrationExportFormat,
): Promise<IntegrationExportResult> {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    select: { code: true, name: true },
  });
  if (!village) throw new Error("Desa tidak ditemukan");

  const residents = await prisma.resident.findMany({
    where: { villageId },
    orderBy: [{ name: "asc" }],
    select: {
      nik: true,
      name: true,
      gender: true,
      birthplace: true,
      birthDate: true,
      religion: true,
      maritalStatus: true,
      occupation: true,
      education: true,
      rt: true,
      rw: true,
      hamlet: true,
      address: true,
    },
  });

  const rows = residents.map((r) => ({
    kode_desa: village.code,
    nik: r.nik,
    nama: r.name,
    jenis_kelamin: r.gender,
    tempat_lahir: r.birthplace,
    tanggal_lahir: r.birthDate.toISOString().slice(0, 10),
    agama: r.religion,
    status_kawin: r.maritalStatus,
    pekerjaan: r.occupation,
    pendidikan: r.education,
    rt: r.rt,
    rw: r.rw,
    dusun: r.hamlet,
    alamat: r.address,
  }));

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `penduduk_${village.code}_${stamp}.${format}`;

  if (format === "json") {
    return {
      adapterId: "residents_kemendesa",
      format,
      recordCount: rows.length,
      filename,
      mimeType: "application/json",
      body: {
        schema: "penduduk_v1",
        exportedAt: new Date().toISOString(),
        village: { code: village.code, name: village.name },
        records: rows,
      },
      meta: { villageCode: village.code },
    };
  }

  return {
    adapterId: "residents_kemendesa",
    format,
    recordCount: rows.length,
    filename,
    mimeType: "text/csv; charset=utf-8",
    body: rowsToCsv(HEADERS, rows),
    meta: { villageCode: village.code },
  };
}
