/**
 * Laporan uji coba (dry-run) backfill kependudukan v2 untuk satu desa. Murni dan baca-saja.
 * Tidak memuat nama, NIK, atau alamat: KK disamarkan (4 digit terakhir) dan warga hanya direferensikan lewat id.
 */
import { planHouseholdBackfill, type HouseholdAnomalyCode, type ResidentLite } from "./household";
import { planWilayahBackfill } from "./wilayah";

export const ANOMALY_LABEL: Record<HouseholdAnomalyCode, string> = {
  NO_HEAD: "KK tanpa Kepala Keluarga",
  MULTIPLE_HEADS: "KK dengan lebih dari satu Kepala Keluarga",
  HEAD_NOT_ACTIVE: "Kepala Keluarga sudah meninggal/pindah, anggota lain masih aktif",
  SPLIT_ACROSS_RT: "Anggota satu KK tersebar di beberapa RT/RW",
  INVALID_KK: "Nomor KK bukan 16 digit",
  MISSING_KK: "Warga tanpa nomor KK",
};

export function maskKk(kk: string | null): string | null {
  if (!kk) return null;
  return `${"*".repeat(Math.max(0, kk.length - 4))}${kk.slice(-4)}`;
}

export interface AnomalySample {
  kk: string | null;
  residentIds: number[];
}

export interface DryRunReport {
  totals: { residents: number; active: number; leftVillage: number; withoutValidKk: number };
  households: { total: number; withHead: number; withAnomaly: number; cleanPercent: number };
  anomalies: Array<{ code: HouseholdAnomalyCode; label: string; count: number; samples: AnomalySample[] }>;
  wilayah: { dusun: number; rw: number; rt: number; unassigned: number; mergedVariants: Array<{ label: string; variants: string[] }> };
  /** Rincian KK yang bukan 16 digit: hampir selalu salah ketik atau terpotong Excel (15 digit presisi). */
  invalidKk: { tooShort: number; tooLong: number; suspectedExcelTruncation: number };
  /** Ringkas untuk kades/operator: kapan aman menyalakan fitur. KOSONG = belum ada warga yang diperiksa. */
  verdict: "SIAP" | "PERLU_PERBAIKAN" | "KOSONG";
}

const SAMPLE_LIMIT = 5;
const VARIANT_LIMIT = 10;

export function buildDryRunReport(residents: readonly ResidentLite[]): DryRunReport {
  const hh = planHouseholdBackfill(residents);
  const wl = planWilayahBackfill(residents);

  const active = residents.filter((r) => r.isAlive && r.moveDate == null).length;

  const byCode = new Map<HouseholdAnomalyCode, { count: number; samples: AnomalySample[] }>();
  const householdsWithAnomaly = new Set<string>();
  for (const a of hh.anomalies) {
    const cur = byCode.get(a.code) ?? { count: 0, samples: [] };
    // MISSING_KK/INVALID_KK dihitung per warga; lainnya per KK.
    cur.count += a.kk == null ? a.residentIds.length : 1;
    if (cur.samples.length < SAMPLE_LIMIT) cur.samples.push({ kk: maskKk(a.kk), residentIds: a.residentIds.slice(0, 10) });
    byCode.set(a.code, cur);
    if (a.kk != null) householdsWithAnomaly.add(a.kk);
  }

  const order = Object.keys(ANOMALY_LABEL) as HouseholdAnomalyCode[];
  const anomalies = order
    .filter((c) => byCode.has(c))
    .map((code) => ({ code, label: ANOMALY_LABEL[code], count: byCode.get(code)!.count, samples: byCode.get(code)!.samples }));

  const total = hh.households.length;
  const withAnomaly = householdsWithAnomaly.size;
  const cleanPercent = total === 0 ? 100 : Math.round(((total - withAnomaly) / total) * 1000) / 10;

  const invalidKk = { tooShort: 0, tooLong: 0, suspectedExcelTruncation: 0 };
  for (const r of residents) {
    const raw = r.kk?.trim();
    if (!raw) continue;
    const d = raw.replace(/\D/g, "");
    if (d.length === 16) continue;
    if (d.length > 16) invalidKk.tooLong += 1;
    else {
      invalidKk.tooShort += 1;
      // Pola yang sama dengan impor Excel: 15 digit berakhiran 0 hampir pasti dipotong presisi 15 digit.
      if (d.length === 15 && d.endsWith("0")) invalidKk.suspectedExcelTruncation += 1;
    }
  }

  const units = wl.units;
  return {
    totals: {
      residents: residents.length,
      active,
      leftVillage: residents.length - active,
      withoutValidKk: hh.unassignedIds.length,
    },
    households: { total, withHead: hh.households.filter((h) => h.headId != null).length, withAnomaly, cleanPercent },
    anomalies,
    wilayah: {
      dusun: units.filter((u) => u.type === "dusun").length,
      rw: units.filter((u) => u.type === "rw").length,
      rt: units.filter((u) => u.type === "rt").length,
      unassigned: wl.unassignedIds.length,
      mergedVariants: units
        .filter((u) => u.variants.length > 0)
        .slice(0, VARIANT_LIMIT)
        .map((u) => ({ label: u.label, variants: u.variants })),
    },
    invalidKk,
    // Aman dinyalakan bila tak ada warga tanpa KK sah dan KK bermasalah <= 5%. Selebihnya perlu dibenahi dulu.
    verdict: residents.length === 0 ? "KOSONG" : hh.unassignedIds.length === 0 && cleanPercent >= 95 ? "SIAP" : "PERLU_PERBAIKAN",
  };
}
