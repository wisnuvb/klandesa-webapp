/**
 * Kesejahteraan & hunian warga: jenis BPJS, kepemilikan rumah, listrik, jenis bantuan.
 * Murni: dipakai bersama POST/PUT/PATCH `/api/residents` (lewat parseExtraFields) dan layar, supaya aturannya satu.
 * Semantik parsial seperti extra-fields: kunci yang tidak ada di body tidak disentuh; kosong/null mengosongkan kolom.
 * Permintaan perangkat desa 2026-11-16.
 */
import { cleanText, isRecord } from "../form-input";
import { HOUSE_OWNERSHIP_OPTIONS } from "../../utils/constants/user";

export const BPJS_TYPE_LABEL = {
  MANDIRI: "Mandiri",
  BANTUAN_PEMERINTAH: "Bantuan pemerintah (PBI)",
} as const;
export type BpjsType = keyof typeof BPJS_TYPE_LABEL;

export const ELECTRICITY_TYPE_LABEL = {
  METERAN: "Meteran PLN",
  PASANG_SENDIRI: "Pasang sendiri",
  NON_METERAN: "Non meteran",
} as const;
export type ElectricityType = keyof typeof ELECTRICITY_TYPE_LABEL;

/** Pilihan kepemilikan rumah = daftar yang sudah dipakai formulir (nilai disimpan sebagai tulisan, bukan kode). */
export const HOUSE_OWNERSHIP_VALUES: readonly string[] = Object.keys(HOUSE_OWNERSHIP_OPTIONS);

export const ELECTRICITY_POWER_MAX_VA = 99_999;
export const AID_OTHER_MAX_LENGTH = 255;

export interface WelfareData {
  isBpjsKis?: boolean;
  bpjsType?: BpjsType | null;
  houseOwnership?: string | null;
  electricityType?: ElectricityType | null;
  electricityPowerVa?: number | null;
  aidPkh?: boolean;
  aidBpnt?: boolean;
  aidOther?: string | null;
}

/** Kunci yang diurus modul ini (untuk formulir: kolom yang boleh dikosongkan walau tidak ikut payload biasa). */
export const WELFARE_FIELD_KEYS = [
  "isBpjsKis", "bpjsType", "houseOwnership", "electricityType", "electricityPowerVa", "aidPkh", "aidBpnt", "aidOther",
] as const satisfies ReadonlyArray<keyof WelfareData>;

export type WelfareResult = { ok: true; data: WelfareData } | { ok: false; error: string };

const lookup = (raw: string) => raw.toLowerCase().replace(/\s+/g, " ").trim();
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** "milik sendiri" / "Numpang" → nilai baku daftar; tidak dikenali → null. */
export function resolveHouseOwnership(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = lookup(raw);
  if (!t) return null;
  if (/^(numpang|menumpang|ikut|menumpang rumah)/.test(t)) return "Menumpang";
  return HOUSE_OWNERSHIP_VALUES.find((v) => lookup(v) === t) ?? null;
}

const flag = (v: unknown): boolean | "bad" => (typeof v === "boolean" ? v : v === null ? false : "bad");

export function parseWelfareFields(body: unknown): WelfareResult {
  if (!isRecord(body)) return { ok: true, data: {} };
  const data: WelfareData = {};
  const has = (k: string) => own(body, k) && body[k] !== undefined;

  if (has("isBpjsKis")) {
    const v = flag(body.isBpjsKis);
    if (v === "bad") return { ok: false, error: "Peserta BPJS tidak valid." };
    data.isBpjsKis = v;
  }

  if (has("bpjsType")) {
    const v = body.bpjsType;
    if (v === null || v === "") data.bpjsType = null;
    else if (typeof v === "string" && own(BPJS_TYPE_LABEL, v)) data.bpjsType = v as BpjsType;
    else return { ok: false, error: "Jenis BPJS tidak valid." };
  }

  if (has("houseOwnership")) {
    const raw = body.houseOwnership;
    if (raw === null || (typeof raw === "string" && !raw.trim())) data.houseOwnership = null;
    else {
      const v = resolveHouseOwnership(raw);
      if (!v) return { ok: false, error: "Kepemilikan rumah tidak valid." };
      data.houseOwnership = v;
    }
  }

  if (has("electricityType")) {
    const v = body.electricityType;
    if (v === null || v === "") data.electricityType = null;
    else if (typeof v === "string" && own(ELECTRICITY_TYPE_LABEL, v)) data.electricityType = v as ElectricityType;
    else return { ok: false, error: "Jenis listrik tidak valid." };
  }

  if (has("electricityPowerVa")) {
    const raw = body.electricityPowerVa;
    if (raw === null || raw === "") data.electricityPowerVa = null;
    else {
      const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,6}$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
      if (!Number.isInteger(n) || n < 1 || n > ELECTRICITY_POWER_MAX_VA) {
        return { ok: false, error: `Daya listrik harus bilangan bulat 1 sampai ${ELECTRICITY_POWER_MAX_VA} VA.` };
      }
      data.electricityPowerVa = n;
    }
  }

  for (const k of ["aidPkh", "aidBpnt"] as const) {
    if (!has(k)) continue;
    const v = flag(body[k]);
    if (v === "bad") return { ok: false, error: `${k === "aidPkh" ? "Bantuan PKH" : "Bantuan BPNT/Sembako"} tidak valid.` };
    data[k] = v;
  }

  if (has("aidOther")) {
    const t = cleanText(body.aidOther, AID_OTHER_MAX_LENGTH);
    if (t.bad) return { ok: false, error: "Bantuan lain-lain tidak valid." };
    if (t.tooLong) return { ok: false, error: `Bantuan lain-lain maksimal ${AID_OTHER_MAX_LENGTH} karakter.` };
    data.aidOther = t.value;
  }

  // Keselarasan di dalam satu permintaan.
  if (data.isBpjsKis === false) {
    if (data.bpjsType) return { ok: false, error: "Jenis BPJS tidak bisa diisi bila warga tidak memiliki BPJS." };
    data.bpjsType = null; // mencabut BPJS = jenisnya ikut dibersihkan
  } else if (data.bpjsType && data.isBpjsKis === undefined) {
    data.isBpjsKis = true; // memilih jenis berarti punya BPJS
  }

  if (data.electricityType !== undefined && data.electricityType !== "METERAN") {
    if (data.electricityPowerVa) return { ok: false, error: "Daya listrik hanya untuk jenis listrik Meteran PLN." };
    data.electricityPowerVa = null; // bukan meteran = tidak ada daya terpasang
  }

  return { ok: true, data };
}

/**
 * Keselarasan terhadap data yang sudah tersimpan (PUT/PATCH): daya listrik tidak boleh diisi bila jenis listrik
 * (baru atau yang sudah tersimpan) bukan Meteran PLN. Pesan galat dikembalikan, bukan dibuang diam-diam.
 */
export function reconcileWelfare(data: WelfareData, existing: { electricityType?: string | null } | null): WelfareResult {
  if (data.electricityPowerVa != null && data.electricityType === undefined && existing?.electricityType !== "METERAN") {
    return { ok: false, error: "Pilih jenis listrik Meteran PLN terlebih dahulu sebelum mengisi daya listrik." };
  }
  return { ok: true, data };
}

/** "Meteran PLN, 900 VA" / "Pasang sendiri" / "-" (tampilan detail). */
export function describeElectricity(type: string | null | undefined, powerVa: number | null | undefined): string {
  if (!type) return powerVa ? `${powerVa} VA` : "-";
  const label = ELECTRICITY_TYPE_LABEL[type as ElectricityType] ?? type;
  return type === "METERAN" && powerVa ? `${label}, ${powerVa} VA` : label;
}

/** Daftar jenis bantuan yang diterima, urut tetap: PKH, BPNT/Sembako, lalu lain-lain (dengan isinya). */
export function describeAid(r: { aidPkh?: boolean | null; aidBpnt?: boolean | null; aidOther?: string | null }): string[] {
  const out: string[] = [];
  if (r.aidPkh) out.push("PKH");
  if (r.aidBpnt) out.push("BPNT/Sembako");
  const other = r.aidOther?.trim();
  if (other) out.push(`Lain-lain: ${other}`);
  return out;
}
