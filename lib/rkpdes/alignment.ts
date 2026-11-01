/**
 * Keselarasan RKP Desa dan APB Desa. Murni (tanpa Prisma), aman untuk klien.
 * Dasar: APB Desa disusun berdasarkan RKP Desa (Permendagri 114/2014 Pasal 37; Permendagri 20/2018 Pasal 32).
 * Perbandingan per kode kegiatan; uang dalam sen (BigInt) sampai batas tampilan.
 */
import { accountKind, kegiatanName } from "@/lib/apbdes/catalog";

export interface RkpActivityLite {
  id: number;
  title: string;
  activityCode: string | null;
  fundSource: string | null;
  budgetCents: bigint;
  cancelled: boolean;
}
export interface ApbLineLite {
  activityCode: string | null;
  accountCode: string;
  amountCents: bigint;
  fundSource: string | null;
}

/**
 * SELARAS: jumlah sama. KURANG/LEBIH: APB Desa lebih kecil/besar dari RKP Desa.
 * BELUM_DIANGGARKAN: ada di RKP Desa, tak ada belanja di APB Desa. TIDAK_DI_RKP: ada di APB Desa, tak ada di RKP Desa.
 */
export type AlignState = "SELARAS" | "KURANG" | "LEBIH" | "BELUM_DIANGGARKAN" | "TIDAK_DI_RKP";

export interface AlignRow {
  activityCode: string;
  name: string;
  rkpCents: bigint;
  apbCents: bigint;
  diffCents: bigint;
  state: AlignState;
  /** Judul kegiatan RKP Desa yang memakai kode ini (untuk penelusuran) */
  titles: string[];
}
export interface SourceRow {
  fundSource: string | null;
  rkpCents: bigint;
  apbCents: bigint;
  diffCents: bigint;
}
export interface Alignment {
  rows: AlignRow[];
  sources: SourceRow[];
  /** Kegiatan RKP Desa yang belum berkode kegiatan sehingga tak bisa dibandingkan */
  uncoded: { count: number; cents: bigint };
  totals: { rkpCents: bigint; apbCents: bigint; diffCents: bigint };
  counts: Record<AlignState, number>;
}

const STATES: AlignState[] = ["SELARAS", "KURANG", "LEBIH", "BELUM_DIANGGARKAN", "TIDAK_DI_RKP"];

/** Hanya kegiatan RKP Desa yang tidak dibatalkan; hanya baris belanja (berkode kegiatan) pada APB Desa. */
export function compareRkpToApbdes(activities: RkpActivityLite[], lines: ApbLineLite[]): Alignment {
  const rkp = new Map<string, { cents: bigint; titles: string[] }>();
  const rkpSrc = new Map<string | null, bigint>();
  let uncodedCount = 0;
  let uncodedCents = 0n;
  for (const a of activities) {
    if (a.cancelled) continue;
    rkpSrc.set(a.fundSource, (rkpSrc.get(a.fundSource) ?? 0n) + a.budgetCents);
    if (!a.activityCode) {
      uncodedCount += 1;
      uncodedCents += a.budgetCents;
      continue;
    }
    const cur = rkp.get(a.activityCode) ?? { cents: 0n, titles: [] };
    cur.cents += a.budgetCents;
    cur.titles.push(a.title);
    rkp.set(a.activityCode, cur);
  }

  const apb = new Map<string, bigint>();
  const apbSrc = new Map<string | null, bigint>();
  for (const l of lines) {
    if (!l.activityCode || accountKind(l.accountCode) !== "BELANJA") continue;
    apb.set(l.activityCode, (apb.get(l.activityCode) ?? 0n) + l.amountCents);
    apbSrc.set(l.fundSource, (apbSrc.get(l.fundSource) ?? 0n) + l.amountCents);
  }

  const rows: AlignRow[] = [...new Set([...rkp.keys(), ...apb.keys()])].sort().map((code) => {
    const r = rkp.get(code);
    const rkpCents = r?.cents ?? 0n;
    const apbCents = apb.get(code) ?? 0n;
    const diffCents = apbCents - rkpCents;
    const state: AlignState = !r ? "TIDAK_DI_RKP" : !apb.has(code) ? "BELUM_DIANGGARKAN" : diffCents === 0n ? "SELARAS" : diffCents < 0n ? "KURANG" : "LEBIH";
    return { activityCode: code, name: kegiatanName(code) ?? code, rkpCents, apbCents, diffCents, state, titles: r?.titles ?? [] };
  });

  const sources: SourceRow[] = [...new Set([...rkpSrc.keys(), ...apbSrc.keys()])]
    .map((fundSource) => {
      const rkpCents = rkpSrc.get(fundSource) ?? 0n;
      const apbCents = apbSrc.get(fundSource) ?? 0n;
      return { fundSource, rkpCents, apbCents, diffCents: apbCents - rkpCents };
    })
    .sort((a, b) => String(a.fundSource ?? "~").localeCompare(String(b.fundSource ?? "~")));

  const rkpTotal = rows.reduce((s, r) => s + r.rkpCents, 0n) + uncodedCents;
  const apbTotal = rows.reduce((s, r) => s + r.apbCents, 0n);
  const counts = Object.fromEntries(STATES.map((s) => [s, rows.filter((r) => r.state === s).length])) as Record<AlignState, number>;
  return { rows, sources, uncoded: { count: uncodedCount, cents: uncodedCents }, totals: { rkpCents: rkpTotal, apbCents: apbTotal, diffCents: apbTotal - rkpTotal }, counts };
}

/** Kalimat peringatan untuk operator; kosong bila semuanya selaras. */
export function alignmentWarnings(a: Alignment): string[] {
  const out: string[] = [];
  if (a.uncoded.count > 0) out.push(`${a.uncoded.count} kegiatan RKP Desa belum diberi kode kegiatan, sehingga tidak dapat dicocokkan dengan APB Desa.`);
  if (a.counts.BELUM_DIANGGARKAN > 0) out.push(`${a.counts.BELUM_DIANGGARKAN} kegiatan RKP Desa belum ada belanjanya di APB Desa.`);
  if (a.counts.KURANG + a.counts.LEBIH > 0) out.push(`${a.counts.KURANG + a.counts.LEBIH} kegiatan jumlahnya berbeda antara RKP Desa dan APB Desa.`);
  if (a.counts.TIDAK_DI_RKP > 0) out.push(`${a.counts.TIDAK_DI_RKP} kegiatan di APB Desa tidak tercantum di RKP Desa. Periksa apakah perlu RKP Desa perubahan (Pasal 49–50), atau memang belanja rutin pemerintahan.`);
  return out;
}
