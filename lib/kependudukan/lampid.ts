/**
 * Laporan bulanan LAMPID (Lahir, Mati, Pindah, Datang) — murni, tanpa database.
 *
 * Kejadian diambil dari dua sumber lalu digabung tanpa hitung ganda:
 *   1. Buku Mutasi (mutasi APPLIED) — sumber utama bila desa memakainya;
 *   2. kolom data warga (tanggal lahir, tanggal datang, tanggal meninggal, tanggal pindah) — mengisi yang belum
 *      tercatat sebagai mutasi, sehingga laporan tetap berguna di desa yang belum mengaktifkan Buku Mutasi.
 * Jumlah awal/akhir bulan dihitung MUNDUR dari penduduk aktif saat ini: akhir = sekarang − (masuk − keluar) sesudah bulan itu.
 * Pindah antar-RT/dusun (ganti KK) tidak memengaruhi jumlah desa, jadi tidak dihitung.
 */
import { normalizeGender } from "../residents/gender";

export type LampidKind = "LAHIR" | "MATI" | "PINDAH" | "DATANG";
export const LAMPID_KINDS: readonly LampidKind[] = ["LAHIR", "MATI", "PINDAH", "DATANG"];

export const LAMPID_LABEL: Record<LampidKind, string> = {
  LAHIR: "Lahir",
  MATI: "Mati",
  PINDAH: "Pindah",
  DATANG: "Datang",
};

/** Lahir/Datang menambah jumlah penduduk; Mati/Pindah menguranginya. */
export const LAMPID_SIGN: Record<LampidKind, 1 | -1> = { LAHIR: 1, DATANG: 1, MATI: -1, PINDAH: -1 };

export type LampidGroup = "dusun" | "rtrw";

/** Tempat untuk wilayah yang belum diisi di data warga. */
export const UNSET_REGION = "(Belum diisi)";

// ---------- Hitungan ----------

export type TallyKey = "wniL" | "wniP" | "wniX" | "wnaL" | "wnaP" | "wnaX";
/** Cacah per kewarganegaraan (WNI/WNA) × jenis kelamin (L/P/X = belum diketahui). */
export type Tally = Record<TallyKey, number>;

export const TALLY_KEYS: readonly TallyKey[] = ["wniL", "wniP", "wniX", "wnaL", "wnaP", "wnaX"];

export const emptyTally = (): Tally => ({ wniL: 0, wniP: 0, wniX: 0, wnaL: 0, wnaP: 0, wnaX: 0 });
export const tallyTotal = (t: Tally): number => t.wniL + t.wniP + t.wniX + t.wnaL + t.wnaP + t.wnaX;

/** Tambahkan `b` (dikali `sign`) ke `a`, hasilnya `a` sendiri. */
export function addTally(a: Tally, b: Tally, sign: 1 | -1 = 1): Tally {
  for (const k of TALLY_KEYS) a[k] += sign * b[k];
  return a;
}

export const isForeign = (nationality: string | null | undefined): boolean => {
  const n = (nationality ?? "").trim().toLowerCase();
  return n !== "" && n !== "indonesia" && n !== "wni" && n !== "id";
};

export function tallyKeyOf(gender: string | null | undefined, nationality: string | null | undefined): TallyKey {
  const g = normalizeGender(gender);
  const letter = g === "Laki-laki" ? "L" : g === "Perempuan" ? "P" : "X";
  return `${isForeign(nationality) ? "wna" : "wni"}${letter}` as TallyKey;
}

// ---------- Kejadian ----------

export interface LampidEvent {
  kind: LampidKind;
  /** yyyy-mm-dd */
  date: string;
  residentId: number | null;
  name: string;
  nikLast4: string;
  gender: string | null;
  nationality: string | null;
  hamlet: string | null;
  rt: string | null;
  rw: string | null;
  /** Keterangan singkat: tujuan pindah, asal datang, sebab meninggal, atau orang tua bayi. */
  note: string;
  source: "mutasi" | "data";
}

export interface LampidResidentRow {
  id: number;
  name: string;
  nik: string;
  gender: string;
  nationality: string;
  hamlet: string | null;
  rt: string | null;
  rw: string | null;
  birthDate: Date;
  arrivalDate: Date | null;
  originAddress: string | null;
  motherName: string | null;
  fatherName: string | null;
  isAlive: boolean;
  deathDate: Date | null;
  moveDate: Date | null;
}

export interface LampidMutationRow {
  type: string;
  effectiveDate: Date;
  residentId: number | null;
  residentName: string | null;
  residentNikLast4: string | null;
  rt: string | null;
  rw: string | null;
  details: unknown;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

const MUTATION_KIND: Record<string, LampidKind | undefined> = { BIRTH: "LAHIR", DEATH: "MATI", MOVE_OUT: "PINDAH", MOVE_IN: "DATANG" };

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Keterangan dari isi mutasi (tanpa NIK lengkap; lihat MutationDetails). */
function noteOfMutation(kind: LampidKind, details: unknown): string {
  const d = (details && typeof details === "object" ? details : {}) as Record<string, unknown>;
  const nr = (d.newResident && typeof d.newResident === "object" ? d.newResident : {}) as Record<string, unknown>;
  switch (kind) {
    case "MATI":
      return str(d.cause);
    case "PINDAH":
      return str(d.destination);
    case "DATANG":
      return str(d.origin);
    case "LAHIR": {
      const mother = str(nr.motherName);
      return mother ? `Ibu: ${mother}` : "";
    }
  }
}

/**
 * Kejadian dari kolom data warga. Pembacaan:
 *  - Lahir  = tanggal lahir, kecuali warga punya tanggal datang (berarti dia pendatang, bukan lahir di desa);
 *  - Datang = tanggal datang;
 *  - Mati   = tidak hidup + tanggal meninggal;
 *  - Pindah = hidup + tanggal pindah.
 * Hanya kejadian pada/sesudah `fromIso` yang dikembalikan (cukup untuk laporan dan hitung mundur).
 */
export function eventsFromResidents(rows: readonly LampidResidentRow[], fromIso: string): LampidEvent[] {
  const out: LampidEvent[] = [];
  const base = (r: LampidResidentRow, kind: LampidKind, date: Date, note: string): LampidEvent => ({
    kind,
    date: iso(date),
    residentId: r.id,
    name: r.name,
    nikLast4: r.nik.slice(-4),
    gender: r.gender,
    nationality: r.nationality,
    hamlet: r.hamlet,
    rt: r.rt,
    rw: r.rw,
    note,
    source: "data",
  });
  for (const r of rows) {
    if (r.arrivalDate) {
      if (iso(r.arrivalDate) >= fromIso) out.push(base(r, "DATANG", r.arrivalDate, r.originAddress?.trim() ?? ""));
    } else if (iso(r.birthDate) >= fromIso) {
      const parent = r.motherName?.trim() || r.fatherName?.trim();
      out.push(base(r, "LAHIR", r.birthDate, parent ? `${r.motherName?.trim() ? "Ibu" : "Ayah"}: ${parent}` : ""));
    }
    if (!r.isAlive) {
      if (r.deathDate && iso(r.deathDate) >= fromIso) out.push(base(r, "MATI", r.deathDate, ""));
    } else if (r.moveDate && iso(r.moveDate) >= fromIso) {
      out.push(base(r, "PINDAH", r.moveDate, ""));
    }
  }
  return out;
}

/**
 * Kejadian dari Buku Mutasi (hanya yang sudah diterapkan; KK_CHANGE diabaikan). `residents` memberi jenis kelamin,
 * kewarganegaraan, dan wilayah terkini; bila warganya sudah dihapus dipakai cuplikan pada baris mutasi.
 */
export function eventsFromMutations(rows: readonly LampidMutationRow[], residents: ReadonlyMap<number, LampidResidentRow>): LampidEvent[] {
  const out: LampidEvent[] = [];
  for (const m of rows) {
    const kind = MUTATION_KIND[m.type];
    if (!kind) continue;
    const r = m.residentId != null ? residents.get(m.residentId) : undefined;
    const d = (m.details && typeof m.details === "object" ? m.details : {}) as Record<string, unknown>;
    const nr = (d.newResident && typeof d.newResident === "object" ? d.newResident : {}) as Record<string, unknown>;
    const note = noteOfMutation(kind, m.details) || (kind === "DATANG" ? (r?.originAddress?.trim() ?? "") : "");
    out.push({
      kind,
      date: iso(m.effectiveDate),
      residentId: m.residentId,
      name: r?.name ?? m.residentName ?? "(tanpa nama)",
      nikLast4: r ? r.nik.slice(-4) : (m.residentNikLast4 ?? ""),
      gender: r?.gender ?? (str(nr.gender) || null),
      nationality: r?.nationality ?? null,
      hamlet: r?.hamlet ?? null,
      rt: r?.rt ?? m.rt,
      rw: r?.rw ?? m.rw,
      note,
      source: "mutasi",
    });
  }
  return out;
}

/**
 * Gabung: Buku Mutasi menang untuk pasangan (warga, jenis) yang sudah tercatat di sana, karena itulah catatan resmi
 * (dan satu warga bisa pindah-datang berulang kali). Kolom data hanya mengisi yang belum ada di Buku Mutasi.
 */
export function mergeEvents(fromMutations: readonly LampidEvent[], fromColumns: readonly LampidEvent[]): LampidEvent[] {
  const logged = new Set<string>();
  for (const e of fromMutations) if (e.residentId != null) logged.add(`${e.residentId}:${e.kind}`);
  const rest = fromColumns.filter((e) => e.residentId == null || !logged.has(`${e.residentId}:${e.kind}`));
  return [...fromMutations, ...rest];
}

// ---------- Laporan ----------

export interface LampidActiveGroup {
  gender: string | null;
  nationality: string | null;
  hamlet: string | null;
  rt: string | null;
  rw: string | null;
  count: number;
}

export interface LampidLine {
  /** Nama wilayah (dusun atau "RW x / RT y"). */
  region: string;
  awal: number;
  lahir: number;
  mati: number;
  pindah: number;
  datang: number;
  akhir: number;
}

export interface LampidTotals {
  awal: Tally;
  lahir: Tally;
  mati: Tally;
  pindah: Tally;
  datang: Tally;
  akhir: Tally;
}

export interface LampidListItem {
  kind: LampidKind;
  date: string;
  name: string;
  nikLast4: string;
  gender: string;
  foreign: boolean;
  region: string;
  note: string;
  source: "mutasi" | "data";
}

export interface LampidReport {
  /** yyyy-mm */
  month: string;
  from: string;
  to: string;
  group: LampidGroup;
  totals: LampidTotals;
  lines: LampidLine[];
  list: Record<LampidKind, LampidListItem[]>;
  /** Catatan yang perlu dibaca operator sebelum laporan dikirim. */
  warnings: string[];
  sources: { mutasi: number; data: number };
}

export const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const isMonthKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export function monthLabel(month: string): string {
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** Awal dan akhir (inklusif) bulan "yyyy-mm" sebagai yyyy-mm-dd. */
export function monthRange(month: string): { from: string; to: string } {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return { from: `${month}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
}

/** Bulan "yyyy-mm" sebelum/sesudah `month` sebanyak `delta`. */
export function shiftMonth(month: string, delta: number): string {
  const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const currentMonthKey = (now: Date): string => `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

export function regionLabel(group: LampidGroup, p: { hamlet: string | null; rt: string | null; rw: string | null }): string {
  if (group === "dusun") return p.hamlet?.trim() || UNSET_REGION;
  const rw = p.rw?.trim();
  const rt = p.rt?.trim();
  return rw || rt ? `RW ${rw || "-"} / RT ${rt || "-"}` : UNSET_REGION;
}

const compareRegion = (a: string, b: string) => {
  if (a === UNSET_REGION) return 1;
  if (b === UNSET_REGION) return -1;
  return a.localeCompare(b, "id", { numeric: true });
};

const GENDER_LABEL: Record<string, string> = { "Laki-laki": "L", Perempuan: "P" };

/**
 * Susun laporan satu bulan.
 * @param active penduduk aktif SEKARANG (hidup dan belum pindah), sudah dikelompokkan
 * @param events kejadian bergabung dengan tanggal ≥ awal bulan (boleh lebih; yang sesudah bulan ini dipakai hitung mundur)
 * @param unplacedDeaths jumlah warga tercatat meninggal tanpa tanggal (tidak bisa ditempatkan di bulan mana pun)
 */
export function buildLampid(input: { month: string; group: LampidGroup; active: readonly LampidActiveGroup[]; events: readonly LampidEvent[]; unplacedDeaths?: number }): LampidReport {
  const { month, group } = input;
  const { from, to } = monthRange(month);

  interface Bucket {
    stock: Tally;
    after: Tally;
    inMonth: Record<LampidKind, Tally>;
  }
  const mk = (): Bucket => ({ stock: emptyTally(), after: emptyTally(), inMonth: { LAHIR: emptyTally(), MATI: emptyTally(), PINDAH: emptyTally(), DATANG: emptyTally() } });
  const buckets = new Map<string, Bucket>();
  const total = mk();
  const at = (region: string) => {
    let b = buckets.get(region);
    if (!b) buckets.set(region, (b = mk()));
    return b;
  };

  for (const g of input.active) {
    const t = emptyTally();
    t[tallyKeyOf(g.gender, g.nationality)] = g.count;
    addTally(at(regionLabel(group, g)).stock, t);
    addTally(total.stock, t);
  }

  const list: Record<LampidKind, LampidListItem[]> = { LAHIR: [], MATI: [], PINDAH: [], DATANG: [] };
  const sources = { mutasi: 0, data: 0 };

  for (const e of input.events) {
    if (e.date < from) continue;
    const region = regionLabel(group, e);
    const t = emptyTally();
    t[tallyKeyOf(e.gender, e.nationality)] = 1;
    const b = at(region);
    if (e.date > to) {
      // Masuk bernilai +1, keluar −1: dikurangkan dari stok sekarang untuk mendapat posisi akhir bulan.
      addTally(b.after, t, LAMPID_SIGN[e.kind]);
      addTally(total.after, t, LAMPID_SIGN[e.kind]);
      continue;
    }
    addTally(b.inMonth[e.kind], t);
    addTally(total.inMonth[e.kind], t);
    sources[e.source] += 1;
    list[e.kind].push({
      kind: e.kind,
      date: e.date,
      name: e.name,
      nikLast4: e.nikLast4,
      gender: GENDER_LABEL[normalizeGender(e.gender) ?? ""] ?? "-",
      foreign: isForeign(e.nationality),
      region,
      note: e.note,
      source: e.source,
    });
  }
  for (const k of LAMPID_KINDS) list[k].sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name, "id") : a.date < b.date ? -1 : 1));

  const closing = (b: Bucket): Tally => {
    const t = emptyTally();
    addTally(t, b.stock);
    addTally(t, b.after, -1);
    return t;
  };
  const opening = (b: Bucket, akhir: Tally): Tally => {
    const t = emptyTally();
    addTally(t, akhir);
    for (const k of LAMPID_KINDS) addTally(t, b.inMonth[k], LAMPID_SIGN[k] === 1 ? -1 : 1);
    return t;
  };
  const totalsOf = (b: Bucket): LampidTotals => {
    const akhir = closing(b);
    return { awal: opening(b, akhir), lahir: b.inMonth.LAHIR, mati: b.inMonth.MATI, pindah: b.inMonth.PINDAH, datang: b.inMonth.DATANG, akhir };
  };

  const totals = totalsOf(total);
  const lines: LampidLine[] = [...buckets.entries()]
    .sort(([a], [b]) => compareRegion(a, b))
    .map(([region, b]) => {
      const t = totalsOf(b);
      return { region, awal: tallyTotal(t.awal), lahir: tallyTotal(t.lahir), mati: tallyTotal(t.mati), pindah: tallyTotal(t.pindah), datang: tallyTotal(t.datang), akhir: tallyTotal(t.akhir) };
    })
    .filter((l) => l.awal !== 0 || l.lahir || l.mati || l.pindah || l.datang || l.akhir !== 0);

  const warnings: string[] = [];
  const negative = lines.filter((l) => l.awal < 0 || l.akhir < 0);
  if (negative.length) {
    warnings.push(
      `Jumlah awal atau akhir bernilai negatif di ${negative.map((l) => l.region).join(", ")}. Biasanya karena warga dipindah wilayahnya atau dihapus setelah kejadian; periksa data warga di wilayah itu.`,
    );
  }
  if (input.unplacedDeaths && input.unplacedDeaths > 0) {
    warnings.push(`${input.unplacedDeaths} warga berstatus meninggal tetapi tanggal meninggalnya kosong, sehingga tidak masuk bulan mana pun. Lengkapi tanggalnya di Data Warga.`);
  }
  if (sources.data > 0) {
    warnings.push(
      `${sources.data} dari ${sources.data + sources.mutasi} kejadian bulan ini dihitung dari tanggal pada data warga (lahir, datang, meninggal, pindah), bukan dari Buku Mutasi. Pastikan tanggal itu terisi benar.`,
    );
  }

  return { month, from, to, group, totals, lines, list, warnings, sources };
}

/** Bentuk jawaban GET /api/kependudukan/lampid (dipakai halaman layar, cetak, dan ekspor). */
export interface LampidResponse {
  report: LampidReport;
  village: { name: string; district: string; regency: string; province: string; address: string; logoUrl: string | null };
  signers: { kades: string; sekdes: string };
  generatedAt: string;
}
