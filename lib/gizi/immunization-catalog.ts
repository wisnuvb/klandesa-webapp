/**
 * Jadwal imunisasi rutin anak (program nasional), usia anjuran dalam bulan. Sumber: Kementerian Kesehatan, "Pekan Imunisasi Dunia 2025"
 * (kemkes.go.id): HB0 <24 jam; BCG dan OPV1 <1 bulan; DPT-HB-Hib1/OPV2/PCV1/RV1 2 bln; DPT-HB-Hib2/OPV3/PCV2/RV2 3 bln;
 * DPT-HB-Hib3/OPV4/IPV1/RV3 4 bln; Campak-Rubella1/IPV2 9 bln; PCV3 12 bln; Campak-Rubella2/DPT-HB-Hib lanjutan 18 bln.
 * Jadwal dapat berubah dan berbeda antardaerah (mis. JE hanya daerah endemis, tidak dimasukkan). Murni, aman dipakai di klien.
 * Alat bantu pencatatan kader; rujukan tindak lanjut tetap tenaga kesehatan dan buku KIA.
 */
export interface Vaccine {
  code: string;
  label: string;
  /** Usia anjuran (bulan) paling awal dosis ini diberikan. */
  dueMonths: number;
}

export const SCHEDULE: readonly Vaccine[] = [
  { code: "HB0", label: "Hepatitis B 0 (HB-0)", dueMonths: 0 },
  { code: "BCG", label: "BCG", dueMonths: 0 },
  { code: "OPV1", label: "Polio tetes 1 (OPV1)", dueMonths: 0 },
  { code: "DPT1", label: "DPT-HB-Hib 1", dueMonths: 2 },
  { code: "OPV2", label: "Polio tetes 2 (OPV2)", dueMonths: 2 },
  { code: "PCV1", label: "PCV 1", dueMonths: 2 },
  { code: "RV1", label: "Rotavirus 1", dueMonths: 2 },
  { code: "DPT2", label: "DPT-HB-Hib 2", dueMonths: 3 },
  { code: "OPV3", label: "Polio tetes 3 (OPV3)", dueMonths: 3 },
  { code: "PCV2", label: "PCV 2", dueMonths: 3 },
  { code: "RV2", label: "Rotavirus 2", dueMonths: 3 },
  { code: "DPT3", label: "DPT-HB-Hib 3", dueMonths: 4 },
  { code: "OPV4", label: "Polio tetes 4 (OPV4)", dueMonths: 4 },
  { code: "IPV1", label: "Polio suntik (IPV) 1", dueMonths: 4 },
  { code: "RV3", label: "Rotavirus 3", dueMonths: 4 },
  { code: "MR1", label: "Campak-Rubella 1", dueMonths: 9 },
  { code: "IPV2", label: "Polio suntik (IPV) 2", dueMonths: 9 },
  { code: "PCV3", label: "PCV 3", dueMonths: 12 },
  { code: "MR2", label: "Campak-Rubella 2", dueMonths: 18 },
  { code: "DPT4", label: "DPT-HB-Hib lanjutan", dueMonths: 18 },
] as const;

export const VACCINE_CODES: ReadonlySet<string> = new Set(SCHEDULE.map((v) => v.code));
export const vaccineByCode = (code: string): Vaccine | undefined => SCHEDULE.find((v) => v.code === code);

/** Anak yang dipantau: sampai usia ini (bulan) tuntas jadwal rutin di atas. */
export const TRACK_UNTIL_MONTHS = 24;

export type DoseState = "DIBERIKAN" | "WAKTUNYA" | "BELUM_WAKTUNYA";
