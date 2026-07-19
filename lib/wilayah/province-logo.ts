import { matchProvinceCode } from "@/lib/pangan/match-region";

/** Index lambang provinsi di https://symbolsofindonesia.vercel.app (by kode BPS). */
const PROVINCE_SYMBOL_INDEX: Record<string, number> = {
  "11": 1,
  "12": 2,
  "13": 3,
  "14": 5,
  "15": 4,
  "16": 9,
  "17": 7,
  "18": 10,
  "19": 8,
  "21": 6,
  "31": 12,
  "32": 13,
  "33": 14,
  "34": 15,
  "35": 16,
  "36": 11,
  "51": 17,
  "52": 18,
  "53": 19,
  "61": 20,
  "62": 21,
  "63": 22,
  "64": 23,
  "65": 24,
  "71": 25,
  "72": 27,
  "73": 29,
  "74": 30,
  "75": 26,
  "76": 28,
  "81": 32,
  "82": 31,
  "91": 35,
  "92": 33,
  "93": 38,
  "94": 36,
  "95": 37,
  "96": 34,
};

// const SYMBOLS_BASE_URL = "https://symbolsofindonesia.vercel.app";

export function getProvinceLogoUrl(
  kodeProvinsi: string,
  // size = 48,
): string | null {
  const index = PROVINCE_SYMBOL_INDEX[kodeProvinsi.trim()];
  if (!index) return null;
  // return `${SYMBOLS_BASE_URL}/provinces/${index}/${size}`;
  return null;
}

export function getProvinceLogoUrlByName(namaProvinsi: string): string | null {
  const code = matchProvinceCode(namaProvinsi);
  if (!code) return null;
  return getProvinceLogoUrl(code);
}
