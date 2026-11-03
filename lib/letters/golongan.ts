/**
 * Pangkat/golongan penanda tangan surat (Camat, Sekretaris Desa, dan pejabat PNS/PPPK lain). Murni — aman di klien dan server.
 * Daftar hanya saran baku supaya penulisan seragam; nilai di luar daftar tetap sah (operator boleh menulis sendiri).
 *
 * Bentuk tulisan mengikuti kebiasaan surat dinas: "Penata Tk. I (III/d)".
 */

export const GOLONGAN_MAX_LENGTH = 80;

/** PNS: golongan ruang I/a–IV/e (PP 11/2017 dan peraturan kepegawaian turunannya), urut dari yang tertinggi. */
const PNS: ReadonlyArray<readonly [ruang: string, pangkat: string]> = [
  ["IV/e", "Pembina Utama"],
  ["IV/d", "Pembina Utama Madya"],
  ["IV/c", "Pembina Utama Muda"],
  ["IV/b", "Pembina Tk. I"],
  ["IV/a", "Pembina"],
  ["III/d", "Penata Tk. I"],
  ["III/c", "Penata"],
  ["III/b", "Penata Muda Tk. I"],
  ["III/a", "Penata Muda"],
  ["II/d", "Pengatur Tk. I"],
  ["II/c", "Pengatur"],
  ["II/b", "Pengatur Muda Tk. I"],
  ["II/a", "Pengatur Muda"],
  ["I/d", "Juru Tk. I"],
  ["I/c", "Juru"],
  ["I/b", "Juru Muda Tk. I"],
  ["I/a", "Juru Muda"],
];

/** PPPK: golongan I–XVII (Perpres 98/2020). */
const PPPK_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII"] as const;

export type GolonganOption = { value: string; label: string; group: "PNS" | "PPPK"; keywords: string };

export const GOLONGAN_OPTIONS: readonly GolonganOption[] = [
  ...PNS.map(([ruang, pangkat]): GolonganOption => ({
    value: `${pangkat} (${ruang})`,
    label: `${pangkat} (${ruang})`,
    group: "PNS",
    // "IIId", "iii d", "3d" — orang mengetik golongan tanpa garis miring.
    keywords: `pns ${ruang.replace("/", "")} ${ruang.replace("/", " ")}`,
  })),
  ...[...PPPK_ROMAN].reverse().map((r): GolonganOption => ({
    value: `PPPK Golongan ${r}`,
    label: `PPPK Golongan ${r}`,
    group: "PPPK",
    keywords: `pppk gol ${r}`,
  })),
];

const KNOWN = new Set(GOLONGAN_OPTIONS.map((o) => o.value));

/** Apakah nilai persis salah satu pilihan baku. */
export const isKnownGolongan = (v: string): boolean => KNOWN.has(v);
