/**
 * Kesiapan warga hasil impor untuk mendaftar sendiri di aplikasi mobile.
 * Mengikuti syarat di lib/mobile/citizen-register.ts:
 *  - Identitas: NIK 16 digit + tanggal lahir persis + nama ibu kandung cocok (namesMatch), warga masih hidup & belum pindah.
 *  - Kode aktivasi: NIK terdaftar di KK yang sama dengan kode (KK 16 digit).
 * Impor TIDAK membuat akun; warga membuatnya sendiri dengan password pilihannya.
 */
import { namesMatch, normalizePersonName } from "../mobile/person-name";
import type { Values } from "./fields";

export type MobileReadiness = "identity" | "code" | "blocked";

export interface ReadinessResult {
  level: MobileReadiness;
  /** Alasan singkat (Bahasa Indonesia) bila bukan "identity". */
  reason?: string;
}

export function mobileReadiness(v: Values): ReadinessResult {
  if (v.is_alive === "N") return { level: "blocked", reason: "Berstatus meninggal; tidak bisa mendaftar" };
  if (v.move_date) return { level: "blocked", reason: "Berstatus pindah; tidak bisa mendaftar" };
  const nikOk = /^\d{16}$/.test(v.id_number ?? "");
  const dobOk = !!v.date_of_birth;
  const mother = v.mother_name ?? "";
  // namesMatch(x, x) true ⇔ nama ibu cukup untuk dicocokkan (≥2 huruf setelah normalisasi)
  const motherOk = namesMatch(mother, mother);
  if (nikOk && dobOk && motherOk) return { level: "identity" };

  const kkOk = /^\d{16}$/.test(v.family_card_number ?? "");
  const why = !motherOk
    ? normalizePersonName(mother) === "" && mother.trim() === ""
      ? "Nama ibu kandung kosong"
      : "Nama ibu kandung tidak terbaca (hanya angka/simbol)"
    : !nikOk
      ? "NIK tidak valid"
      : "Tanggal lahir kosong";
  if (kkOk && nikOk) return { level: "code", reason: `${why}; hanya bisa mendaftar dengan kode aktivasi KK` };
  return { level: "blocked", reason: `${why} dan No. KK kosong; belum bisa mendaftar` };
}

export interface ReadinessSummary {
  identity: number;
  code: number;
  blocked: number;
}

export function summarizeReadiness(rows: Iterable<{ values: Values }>): ReadinessSummary {
  const s: ReadinessSummary = { identity: 0, code: 0, blocked: 0 };
  for (const r of rows) s[mobileReadiness(r.values).level]++;
  return s;
}
