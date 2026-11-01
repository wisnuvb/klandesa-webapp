/**
 * Istilah BLT Desa. Murni (tanpa Prisma), aman untuk klien.
 * Sumber [V]: Permendesa PDT 16/2025 Pasal 3 dan Lampiran II.A. Batas nilai per tahun ada di lib/dana-desa/rules.ts.
 */

/** Kriteria cadangan bila Desa tidak memiliki data keluarga miskin dari Pemerintah (Lampiran II.A.1.c). */
export const CRITERIA = {
  1: "Kehilangan mata pencaharian",
  2: "Mempunyai anggota keluarga yang rentan sakit menahun, sakit kronis, dan/atau penyandang disabilitas",
  3: "Tidak menerima bantuan sosial Program Keluarga Harapan",
  4: "Rumah tangga dengan anggota tunggal lanjut usia",
  5: "Perempuan kepala keluarga dari keluarga miskin",
} as const;
export type CriterionNo = keyof typeof CRITERIA;
export const CRITERION_NOS = [1, 2, 3, 4, 5] as const;

export const SOURCES = {
  PEMERINTAH: "Data Pemerintah sebagai acuan",
  DESA: "Kriteria cadangan yang ditetapkan Kepala Desa",
} as const;
export type Source = keyof typeof SOURCES;
export const isSource = (v: unknown): v is Source => typeof v === "string" && v in SOURCES;

export const PROGRAM_STATUS = { DRAFT: "Draf", DITETAPKAN: "Ditetapkan (SK Kepala Desa terbit)", SELESAI: "Selesai" } as const;
export type ProgramStatus = keyof typeof PROGRAM_STATUS;

export const BENEFICIARY_STATUS = { AKTIF: "Aktif", DIGANTI: "Diganti", BERAKHIR: "Berakhir tanpa pengganti" } as const;
export type BeneficiaryStatus = keyof typeof BENEFICIARY_STATUS;

export const METHODS = { TUNAI: "Tunai", NONTUNAI: "Nontunai (transfer)" } as const;
export type Method = keyof typeof METHODS;
export const isMethod = (v: unknown): v is Method => typeof v === "string" && v in METHODS;

export const LIMITS = { beneficiariesPerProgram: 3000, paymentsPerBeneficiary: 12, residentSearch: 20 } as const;

/** "1,3" → [1,3]; nilai di luar 1-5 dibuang. */
export function parseCriteria(raw: string | null | undefined): CriterionNo[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((x) => Number(x.trim())))].filter((n): n is CriterionNo => n >= 1 && n <= 5 && Number.isInteger(n)).sort();
}
