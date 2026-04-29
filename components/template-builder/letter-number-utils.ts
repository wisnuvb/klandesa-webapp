/**
 * Utility functions untuk sistem nomor surat otomatis
 */

import { LetterNumberConfig } from "./types";

/**
 * Format nomor urut dengan padding sesuai konfigurasi
 * @param number - Nomor yang akan diformat
 * @param format - Format padding (contoh: "001", "0001", "1")
 * @returns Nomor yang sudah diformat
 */
export function formatAutoNumber(number: number, format: string): string {
  const numStr = number.toString();
  const padding = format.length;

  // Jika format adalah "1" (tanpa padding), return langsung
  if (format === "1") {
    return numStr;
  }

  // Padding dengan 0 di depan
  return numStr.padStart(padding, "0");
}

/**
 * Cek apakah counter perlu direset berdasarkan periode
 * @param lastResetDate - Tanggal terakhir reset (string ISO)
 * @param resetPeriod - Periode reset ('never', 'yearly', 'monthly')
 * @returns true jika perlu reset, false jika tidak
 */
export function shouldResetCounter(
  lastResetDate: string | undefined,
  resetPeriod: "never" | "yearly" | "monthly"
): boolean {
  if (resetPeriod === "never" || !lastResetDate) {
    return false;
  }

  const now = new Date();
  const lastReset = new Date(lastResetDate);

  if (resetPeriod === "yearly") {
    // Reset jika tahun berbeda
    return now.getFullYear() !== lastReset.getFullYear();
  }

  if (resetPeriod === "monthly") {
    // Reset jika tahun atau bulan berbeda
    return (
      now.getFullYear() !== lastReset.getFullYear() ||
      now.getMonth() !== lastReset.getMonth()
    );
  }

  return false;
}

/**
 * Dapatkan nomor urut berikutnya dengan auto-reset handling
 * @param config - Konfigurasi letter number
 * @returns Object dengan next_number dan perlu_reset flag
 */
export function getNextAutoNumber(config: LetterNumberConfig): {
  next_number: number;
  formatted: string;
  reset_occurred: boolean;
} {
  const autoConfig = config.auto_numbering;

  if (!autoConfig || !autoConfig.enabled) {
    return {
      next_number: 0,
      formatted: "0",
      reset_occurred: false,
    };
  }

  // Cek apakah perlu reset
  const needsReset = shouldResetCounter(
    autoConfig.last_reset_date,
    autoConfig.reset_period || "monthly"
  );

  let nextNumber: number;

  if (needsReset) {
    // Reset ke 1
    nextNumber = 1;
  } else {
    // Increment dari current number
    nextNumber = (autoConfig?.current_number || 0) + 1;
  }

  const formatted = formatAutoNumber(
    nextNumber,
    autoConfig.number_format || ""
  );

  return {
    next_number: nextNumber,
    formatted,
    reset_occurred: needsReset,
  };
}

/**
 * Update config setelah generate nomor surat
 * Fungsi ini akan dipanggil setiap kali surat berhasil dibuat
 * @param config - Konfigurasi letter number saat ini
 * @returns Config yang sudah diupdate dengan nomor terbaru
 */
export function updateAfterGenerate(
  config: LetterNumberConfig
): LetterNumberConfig {
  if (!config.auto_numbering?.enabled) {
    return config;
  }

  const { next_number, reset_occurred } = getNextAutoNumber(config);

  return {
    ...config,
    auto_numbering: {
      ...config.auto_numbering,
      current_number: next_number,
      last_reset_date: reset_occurred
        ? new Date().toISOString()
        : config.auto_numbering.last_reset_date,
    },
  };
}

/**
 * Dapatkan bulan romawi dari tanggal
 * @param date - Tanggal (default: hari ini)
 * @returns Bulan dalam format romawi
 */
export function getRomanMonth(date: Date = new Date()): string {
  const months = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
  ];
  return months[date.getMonth()];
}

/**
 * Replace variables dalam format nomor surat
 * @param format - Format string dengan variables (contoh: "{NOMOR_URUT}/SK-DS/{BULAN_ROMAWI}/{TAHUN}")
 * @param data - Data untuk replace variables
 * @returns String yang sudah direplace
 */
export function replaceLetterNumberVariables(
  format: string,
  data: {
    nomor_urut?: string;
    nomor_surat?: string;
    bulan_romawi?: string;
    tahun?: string;
    [key: string]: string | undefined;
  }
): string {
  let result = format;

  // Replace auto number
  if (data.nomor_urut) {
    result = result.replace(/{NOMOR_URUT}/g, data.nomor_urut);
  }

  // Replace manual number
  if (data.nomor_surat) {
    result = result.replace(/{NOMOR_SURAT}/g, data.nomor_surat);
  }

  // Replace bulan romawi
  if (data.bulan_romawi) {
    result = result.replace(/{BULAN_ROMAWI}/g, data.bulan_romawi);
  }

  // Replace tahun
  if (data.tahun) {
    result = result.replace(/{TAHUN}/g, data.tahun);
  }

  // Replace other variables
  Object.entries(data).forEach(([key, value]) => {
    if (
      value &&
      !["nomor_urut", "nomor_surat", "bulan_romawi", "tahun"].includes(key)
    ) {
      result = result.replace(new RegExp(`{${key.toUpperCase()}}`, "g"), value);
    }
  });

  return result;
}

/**
 * Nilai dummy untuk preview format nomor di tab builder (mengikuti tanggal hari ini &
 * pengaturan nomor urut otomatis bila aktif).
 */
export function buildLetterNumberPreviewVariableData(
  config: LetterNumberConfig,
): Record<string, string> {
  const now = new Date();
  const roman = getRomanMonth(now);
  const tahun = String(now.getFullYear());

  let nomorUrut: string;
  if (config.auto_numbering?.enabled) {
    nomorUrut = getNextAutoNumber(config).formatted;
  } else {
    const nf = config.auto_numbering?.number_format ?? "001";
    nomorUrut = formatAutoNumber(1, nf);
  }

  return {
    NOMOR_SURAT: "001",
    NOMOR_URUT: nomorUrut,
    BULAN_ROMAWI: roman,
    TAHUN: tahun,
  };
}
