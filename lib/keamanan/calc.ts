/** Logika murni Keamanan & ketertiban: tanggal, usia anggota, rotasi ronda yang adil, tukar giliran, temuan, dan penjaga privasi. Aman untuk klien. */
import { AGE, SENSITIVE_EXACT, SENSITIVE_PHRASES, SENSITIVE_SQUASH_STEMS, SENSITIVE_STEMS } from "./catalog";

// ---------------------------------------------------------------------------------------------------------------------
// Tanggal ("YYYY-MM-DD"; tanpa zona, dihitung di kalender UTC supaya tidak bergeser)
// ---------------------------------------------------------------------------------------------------------------------
const DAY = 86_400_000;
const ms = (iso: string): number => Date.parse(`${iso}T00:00:00.000Z`);
export const isoOf = (t: number): string => new Date(t).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => isoOf(ms(iso) + n * DAY);
export const daysBetween = (a: string, b: string): number => Math.round((ms(b) - ms(a)) / DAY);

/** Batas atas panjang rentang yang pernah dibangun sebagai larik (pengaman memori: rentang tak wajar dianggap kosong, bukan dibangun). */
export const MAX_RANGE_DAYS = 800;

/** Rentang tanggal inklusif. Kosong bila akhir < awal atau rentang lebih dari MAX_RANGE_DAYS (jangan membangun jutaan elemen). */
export function dateRange(from: string, to: string): string[] {
  const n = daysBetween(from, to);
  return Number.isNaN(n) || n < 0 || n >= MAX_RANGE_DAYS ? [] : Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

/** Tanggal hari ini di Asia/Jakarta (zona operasional desa, aplikasi tidak menyimpan zona per desa). Server bisa berzona UTC, jadi tidak memakai jam lokal server. */
export function todayJakarta(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts; // en-CA = YYYY-MM-DD
}

/** Jam sekarang di Asia/Jakarta, "HH:MM". */
export function timeJakarta(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(/^24:/, "00:");
}

/** Usia penuh (tahun) pada tanggal tertentu. */
export function ageOn(birth: string, on: string): number {
  const [by, bm, bd] = birth.split("-").map(Number) as [number, number, number];
  const [oy, om, od] = on.split("-").map(Number) as [number, number, number];
  return oy - by - (om < bm || (om === bm && od < bd) ? 1 : 0);
}

/** "01", "1", "001" satu RT/RW. */
export const normArea = (v: string | null | undefined): string => {
  const t = (v ?? "").trim().toLowerCase();
  return /^\d+$/.test(t) ? String(Number(t)) : t;
};

// ---------------------------------------------------------------------------------------------------------------------
// Anggota Satlinmas
// ---------------------------------------------------------------------------------------------------------------------
export interface Finding {
  level: "WARN" | "INFO";
  code: string;
  message: string;
}

export interface MemberFacts {
  status: "ACTIVE" | "ENDED";
  birthDate: string | null;
  decreeNumber: string | null;
  inauguratedOn: string | null;
  extensionDecree: string | null;
  residentMissing?: boolean;
}

/**
 * Temuan per anggota aktif (rujukan pasal: Permendagri 26/2020 [V]):
 *  - usia < 18 tahun (Pasal 15 huruf e; "dan/atau sudah menikah" tidak diperiksa di sini, jadi hanya peringatan);
 *  - usia >= 60 tanpa keputusan perpanjangan: keanggotaan berakhir sampai usia 60 (Pasal 25 ayat 1, 3-4);
 *  - usia > 65: tidak ada dasar perpanjangan (Pasal 25 ayat 3);
 *  - belum ada nomor SK pengangkatan Kepala Desa (Pasal 16 ayat 2) dan belum tercatat pengukuhan (Pasal 17).
 */
export function memberFindings(f: MemberFacts, today: string): Finding[] {
  if (f.status !== "ACTIVE") return [];
  const out: Finding[] = [];
  if (f.residentMissing) out.push({ level: "WARN", code: "RESIDENT_MISSING", message: "Data warga untuk anggota ini sudah tidak ada. Periksa Kependudukan." });
  if (f.birthDate) {
    const a = ageOn(f.birthDate, today);
    if (a < AGE.min) out.push({ level: "WARN", code: "UNDER_AGE", message: `Usia ${a} tahun, di bawah ${AGE.min} tahun (syarat umur paling rendah ${AGE.min} tahun dan/atau sudah menikah, Pasal 15 huruf e). Periksa status pernikahan.` });
    if (a > AGE.extendedEnd) out.push({ level: "WARN", code: "OVER_EXTENDED_AGE", message: `Usia ${a} tahun, melewati batas perpanjangan ${AGE.extendedEnd} tahun (Pasal 25 ayat 3). Keanggotaan perlu diakhiri.` });
    else if (a >= AGE.end && !f.extensionDecree) out.push({ level: "WARN", code: "AGE_LIMIT", message: `Usia ${a} tahun: keanggotaan berakhir sampai usia ${AGE.end} tahun kecuali diperpanjang sampai ${AGE.extendedEnd} tahun dengan keputusan Kepala Desa (Pasal 25 ayat 1, 3, 4). Catat nomor keputusan perpanjangan atau akhiri keanggotaan.` });
  }
  if (!f.decreeNumber) out.push({ level: "INFO", code: "NO_DECREE", message: "Belum ada nomor SK pengangkatan oleh Kepala Desa (Pasal 16 ayat 2)." });
  else if (!f.inauguratedOn) out.push({ level: "INFO", code: "NOT_INAUGURATED", message: "Belum tercatat pengukuhan oleh bupati/wali kota (Pasal 17)." });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Rotasi ronda yang adil
// ---------------------------------------------------------------------------------------------------------------------
export interface RotationPerson {
  id: number;
  /** Jumlah giliran sebelumnya dalam jendela riwayat (dihitung pemanggil) */
  priorCount?: number;
  /** Tanggal giliran terakhir sebelum periode ("YYYY-MM-DD") */
  priorLast?: string | null;
  /** Tanggal yang tidak bisa (cuti, sakit, dsb.) */
  unavailable?: string[];
}
export interface RotationInput {
  people: RotationPerson[];
  dates: string[];
  perShift: number;
}
export interface RotationNight {
  date: string;
  residentIds: number[];
  /** Kurang dari perShift karena peserta tersedia tidak cukup */
  short: number;
}
export interface RotationResult {
  nights: RotationNight[];
  /** Jumlah giliran BARU per peserta pada periode ini */
  counts: Record<number, number>;
  /** Jumlah giliran total (riwayat + baru) per peserta */
  totals: Record<number, number>;
  /** Selisih total terbesar-terkecil di antara peserta */
  spread: number;
  /** Pasangan malam berurutan yang dijalani orang yang sama (termasuk malam sebelum periode) */
  consecutive: number;
  warnings: string[];
}

/**
 * Pembuat jadwal ronda yang adil dan deterministik (tanpa acak):
 * tiap malam memilih `perShift` orang tersedia dengan urutan prioritas
 *   1. total giliran (riwayat + baru) paling sedikit  -> menjamin selisih total <= 1 bila semua tersedia dan riwayat setara,
 *   2. tidak bertugas semalam sebelumnya               -> menghindari malam berurutan bila ada pilihan setara,
 *   3. giliran terakhir paling lama,
 *   4. id terkecil (penentu akhir, supaya hasil sama untuk masukan sama).
 * Tidak ada orang yang bertugas dua kali pada malam yang sama. Peserta yang tidak tersedia pada suatu malam dilewati.
 */
export function generateRotation(input: RotationInput): RotationResult {
  const perShift = Math.max(1, Math.floor(input.perShift));
  const people = [...new Map(input.people.map((p) => [p.id, p])).values()].sort((a, b) => a.id - b.id);
  const total = new Map<number, number>(people.map((p) => [p.id, p.priorCount ?? 0]));
  const fresh = new Map<number, number>(people.map((p) => [p.id, 0]));
  const last = new Map<number, string | null>(people.map((p) => [p.id, p.priorLast ?? null]));
  const off = new Map<number, Set<string>>(people.map((p) => [p.id, new Set(p.unavailable ?? [])]));
  const warnings: string[] = [];
  const nights: RotationNight[] = [];
  let consecutive = 0;
  const dates = [...new Set(input.dates)].sort();

  for (const date of dates) {
    const prev = addDays(date, -1);
    const pool = people.filter((p) => !off.get(p.id)!.has(date));
    const ranked = [...pool].sort((a, b) => {
      const ta = total.get(a.id)!;
      const tb = total.get(b.id)!;
      if (ta !== tb) return ta - tb;
      const ya = last.get(a.id) === prev ? 1 : 0;
      const yb = last.get(b.id) === prev ? 1 : 0;
      if (ya !== yb) return ya - yb;
      const la = last.get(a.id) ?? null;
      const lb = last.get(b.id) ?? null;
      if (la !== lb) return la === null ? -1 : lb === null ? 1 : la < lb ? -1 : 1;
      return a.id - b.id;
    });
    const pick = ranked.slice(0, perShift);
    for (const p of pick) {
      if (last.get(p.id) === prev) consecutive++;
      total.set(p.id, total.get(p.id)! + 1);
      fresh.set(p.id, fresh.get(p.id)! + 1);
      last.set(p.id, date);
    }
    const short = perShift - pick.length;
    if (short > 0) warnings.push(`${date}: hanya ${pick.length} dari ${perShift} petugas yang tersedia.`);
    nights.push({ date, residentIds: pick.map((p) => p.id), short });
  }
  const totals = Object.fromEntries(total) as Record<number, number>;
  const vals = Object.values(totals);
  const counts = Object.fromEntries(fresh) as Record<number, number>;
  return { nights, counts, totals, spread: vals.length ? Math.max(...vals) - Math.min(...vals) : 0, consecutive, warnings };
}

// ---------------------------------------------------------------------------------------------------------------------
// Tukar / ganti giliran
// ---------------------------------------------------------------------------------------------------------------------
export interface ShiftFact {
  id: number;
  groupId: number;
  date: string;
  residentId: number;
  attendance: string;
}
export interface SwapMove {
  shiftId: number;
  fromResidentId: number;
  toResidentId: number;
}
export type SwapPlan = { ok: true; moves: SwapMove[] } | { ok: false; error: string };

/**
 * Menyusun perpindahan untuk satu permintaan tukar/ganti. Murni: pemanggil memberi fakta yang dibaca di dalam kunci.
 *  - Mode ganti (tanpa `counterpartShift`): pihak kedua menggantikan pemohon pada malam itu.
 *  - Mode tukar (dengan `counterpartShift`): pemohon dan pihak kedua saling mengambil giliran lainnya.
 * Aturan: keduanya peserta aktif regu yang sama; giliran belum lewat dan belum dicatat kehadirannya; tidak ada orang yang
 * jadi bertugas dua kali pada malam yang sama; pihak kedua sudah tercatat setuju.
 */
export function planSwap(a: {
  today: string;
  groupId: number;
  requesterShift: ShiftFact;
  counterpartResidentId: number;
  counterpartShift: ShiftFact | null;
  counterpartAgreed: boolean;
  counterpartActive: boolean;
  /** malam -> id warga yang bertugas, untuk regu ini (cukup untuk dua malam yang terlibat) */
  assigned: Record<string, number[]>;
}): SwapPlan {
  const r = a.requesterShift;
  const cp = a.counterpartShift;
  if (r.groupId !== a.groupId) return { ok: false, error: "Giliran pemohon bukan milik regu ini." };
  if (a.counterpartResidentId === r.residentId) return { ok: false, error: "Pihak kedua tidak boleh orang yang sama dengan pemohon." };
  if (!a.counterpartAgreed) return { ok: false, error: "Pihak kedua belum tercatat setuju." };
  if (!a.counterpartActive) return { ok: false, error: "Pihak kedua bukan peserta aktif regu ini." };
  if (r.date < a.today) return { ok: false, error: "Giliran pemohon sudah lewat; tukar giliran hanya untuk malam hari ini atau yang akan datang." };
  if (r.attendance !== "PENDING") return { ok: false, error: "Kehadiran giliran pemohon sudah dicatat." };
  const on = (date: string) => new Set(a.assigned[date] ?? []);
  if (!cp) {
    if (on(r.date).has(a.counterpartResidentId)) return { ok: false, error: "Pihak kedua sudah bertugas pada malam itu." };
    return { ok: true, moves: [{ shiftId: r.id, fromResidentId: r.residentId, toResidentId: a.counterpartResidentId }] };
  }
  if (cp.groupId !== a.groupId) return { ok: false, error: "Giliran pihak kedua bukan milik regu ini." };
  if (cp.residentId !== a.counterpartResidentId) return { ok: false, error: "Giliran yang ditukar bukan milik pihak kedua." };
  if (cp.date < a.today) return { ok: false, error: "Giliran pihak kedua sudah lewat." };
  if (cp.attendance !== "PENDING") return { ok: false, error: "Kehadiran giliran pihak kedua sudah dicatat." };
  if (cp.date === r.date) return { ok: false, error: "Kedua giliran jatuh pada malam yang sama; tidak perlu ditukar." };
  if (cp.id === r.id) return { ok: false, error: "Giliran yang ditukar sama dengan giliran pemohon." };
  if (on(cp.date).has(r.residentId)) return { ok: false, error: "Pemohon sudah bertugas pada malam giliran pihak kedua." };
  if (on(r.date).has(cp.residentId)) return { ok: false, error: "Pihak kedua sudah bertugas pada malam giliran pemohon." };
  return {
    ok: true,
    moves: [
      { shiftId: r.id, fromResidentId: r.residentId, toResidentId: cp.residentId },
      { shiftId: cp.id, fromResidentId: cp.residentId, toResidentId: r.residentId },
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Temuan ronda
// ---------------------------------------------------------------------------------------------------------------------
export interface GroupFacts {
  name: string;
  active: boolean;
  perShift: number;
  activePeople: number;
  /** Malam dalam 7 hari ke depan (termasuk hari ini) yang belum terisi penuh */
  underStaffedNights: number;
  /** Malam ke depan yang punya jadwal */
  scheduledAhead: number;
  /** Ketidakhadiran (ABSENT) 30 hari terakhir */
  absentLast30: number;
}
export function groupFindings(g: GroupFacts): Finding[] {
  if (!g.active) return [];
  const out: Finding[] = [];
  if (g.activePeople < g.perShift) out.push({ level: "WARN", code: "TOO_FEW_PEOPLE", message: `${g.name}: peserta aktif (${g.activePeople}) kurang dari petugas per malam (${g.perShift}).` });
  else if (g.activePeople < g.perShift * 2) out.push({ level: "INFO", code: "THIN_ROTATION", message: `${g.name}: peserta aktif (${g.activePeople}) kurang dari dua kali petugas per malam; rotasi akan sering berurutan.` });
  if (g.scheduledAhead === 0) out.push({ level: "INFO", code: "NO_SCHEDULE", message: `${g.name}: belum ada jadwal 7 hari ke depan.` });
  else if (g.underStaffedNights > 0) out.push({ level: "WARN", code: "UNDERSTAFFED", message: `${g.name}: ${g.underStaffedNights} malam dalam 7 hari ke depan belum terisi penuh.` });
  if (g.absentLast30 >= 3) out.push({ level: "INFO", code: "ABSENCES", message: `${g.name}: ${g.absentLast30} ketidakhadiran dalam 30 hari terakhir.` });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Mediasi
// ---------------------------------------------------------------------------------------------------------------------
export interface PartyFact {
  side: string;
  attended: boolean;
  agrees: boolean | null;
  isMinor: boolean;
}

/**
 * Gerbang menyelesaikan berita acara mediasi (kebijakan aplikasi, bukan angka hukum). Mengembalikan pesan galat atau null.
 *  - minimal satu pihak tercatat;
 *  - hasil Sepakat / Sepakat sebagian / Tidak sepakat: minimal satu Pihak pertama dan satu Pihak kedua tercatat hadir (bila salah satu tidak hadir, pilih Ditunda);
 *  - Sepakat: semua pihak pertama/kedua yang hadir tercatat menyetujui;
 *  - ada pihak anak (< 18 tahun) yang hadir: wajib ada pendamping/wali yang hadir (untuk hasil selain Ditunda/Dirujuk).
 */
export function mediationGate(outcome: string, parties: PartyFact[]): string | null {
  if (parties.length < 1) return "Catat para pihak yang hadir sebelum menyelesaikan berita acara.";
  const main = parties.filter((p) => (p.side === "PIHAK_A" || p.side === "PIHAK_B") && p.attended);
  const held = outcome === "SEPAKAT" || outcome === "SEPAKAT_SEBAGIAN" || outcome === "TIDAK_SEPAKAT";
  if (held) {
    if (!main.some((p) => p.side === "PIHAK_A") || !main.some((p) => p.side === "PIHAK_B")) return "Hasil ini mensyaratkan minimal satu pihak pertama dan satu pihak kedua tercatat hadir. Bila salah satu pihak tidak hadir, pilih hasil Ditunda.";
    if (parties.some((p) => p.isMinor && p.attended) && !parties.some((p) => p.side === "PENDAMPING" && p.attended)) return "Ada pihak berusia di bawah 18 tahun yang hadir: catat orang tua/wali sebagai pendamping yang hadir.";
  }
  if (outcome === "SEPAKAT" && main.some((p) => p.agrees !== true)) return "Hasil Sepakat mensyaratkan semua pihak pertama/kedua yang hadir tercatat menyetujui. Pilih Sepakat sebagian bila ada yang belum setuju.";
  return null;
}

/** Tampilan nama pihak: tersamar tanpa izin baca rinci. */
export const partyDisplayName = (name: string, detail: boolean): string => (detail ? name : maskName(name));

// ---------------------------------------------------------------------------------------------------------------------
// Privasi
// ---------------------------------------------------------------------------------------------------------------------
/** "Sutarno Hadi" -> "S****** H***". Menyisakan huruf pertama tiap kata. */
export const maskName = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 1 ? w : `${[...w][0]}${"*".repeat(Math.min(6, [...w].length - 1))}`))
    .join(" ");

const HOMOGLYPH: Record<string, string> = {
  // Cyrillic
  а: "a", в: "b", е: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", ԁ: "d", ӏ: "l", ё: "e",
  // Greek
  α: "a", β: "b", ε: "e", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x", ϲ: "c",
  // lain
  ı: "i", ɡ: "g", ǀ: "l",
};
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i" };
const VICTIM = "istri|anak|ibu|perempuan|wanita|siswi|gadis|bocah|balita|bayi|putri|pacar";
const VIOLENT_VERBS = new Set(["memukul", "dipukul", "memukuli", "dipukuli", "menampar", "ditampar", "menendang", "ditendang", "menganiaya", "dianiaya", "menyiksa", "disiksa", "menghajar", "dihajar", "mencekik", "dicekik", "menjambak", "dijambak", "melukai", "dilukai", "membanting", "dibanting", "melecehkan", "dilecehkan"]);
const VICTIM_SET = new Set(VICTIM.split("|"));
const PATTERNS: [RegExp, string][] = [
  // "kekerasan (fisik) terhadap istri", "penganiayaan terhadap anak", "penelantaran anak", ...
  [new RegExp(`\\b(kekerasan|penganiayaan|pemukulan|penyiksaan|penelantaran|pelecehan|penindasan)( (fisik|verbal|psikis|psikologis|ekonomi|seksual))?( (terhadap|pada|kepada|atas))?( (seorang|para))? (${VICTIM})\\b`), "kekerasan terhadap perempuan/anak"],
];

/** Teks dilipat agar tak bisa disamarkan: NFKD, buang tanda gabung dan karakter tak terlihat (zero-width, soft hyphen), huruf kecil, homoglif. */
function fold(text: string): string {
  const t = text.normalize("NFKD").replace(/[\p{M}\p{Cf}]/gu, "").toLowerCase();
  return [...t].map((c) => HOMOGLYPH[c] ?? c).join("");
}

/** Pecah jadi kata; deretan >= 3 huruf tunggal ("p e m e r k o s a a n", "k-d-r-t") disatukan menjadi satu kata. */
function tokenize(folded: string): string[] {
  const raw = folded.replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 3) out.push(run.join(""));
    else out.push(...run);
    run = [];
  };
  for (const w of raw) {
    if ([...w].length === 1 && /\p{L}/u.test(w)) run.push(w);
    else {
      flush();
      out.push(w);
    }
  }
  flush();
  return out;
}

function scan(tokens: string[]): string | null {
  const spaced = ` ${tokens.join(" ")} `;
  const squashed = tokens.join("");
  for (const t of tokens) {
    if ((SENSITIVE_EXACT as readonly string[]).includes(t)) return t;
    for (const stem of SENSITIVE_STEMS) if (t.includes(stem)) return stem;
  }
  for (const ph of SENSITIVE_PHRASES) if (spaced.includes(` ${ph} `) || squashed.includes(ph.replace(/ /g, ""))) return ph;
  for (const stem of SENSITIVE_SQUASH_STEMS) if (squashed.includes(stem)) return stem;
  for (const [re, label] of PATTERNS) if (re.test(spaced.trim())) return label;
  // kata kerja kekerasan fisik berdekatan dengan korban rentan (istri/anak/perempuan/...), kecuali "saling" (perkelahian dua pihak)
  for (let i = 0; i < tokens.length; i++) {
    if (!VIOLENT_VERBS.has(tokens[i]!)) continue;
    const win = tokens.slice(Math.max(0, i - 4), i + 5);
    if (win.includes("saling")) continue;
    if (win.some((w) => VICTIM_SET.has(w))) return "kekerasan terhadap perempuan/anak";
  }
  return null;
}

/**
 * Pagar kebijakan: modul ini BUKAN basis data kasus kekerasan terhadap perempuan/anak. Mengembalikan istilah yang terdeteksi pada teks, atau null.
 * Teks dilipat dulu (NFKD, buang karakter tak terlihat/tanda gabung, homoglif Cyrillic/Yunani, huruf besar-kecil), lalu dicocokkan sebagai
 * akar kata (termasuk imbuhan), frasa (juga tanpa spasi/tanda baca, huruf tunggal berderet disatukan), pola "kekerasan ... terhadap istri/anak",
 * dan kata kerja kekerasan fisik berdekatan dengan korban rentan; varian "leetspeak" (s3ksual, p3rk0s4) dicek juga.
 * BUKAN JAMINAN: ejaan yang diubah-ubah, istilah daerah, atau kalimat tanpa kata kunci tetap lolos, dan kalimat sah yang memuat kata itu dapat
 * ditolak. Pesan galat mengarahkan ke layanan rujukan.
 */
export function sensitiveViolenceTerm(text: string | null | undefined): string | null {
  if (!text) return null;
  const folded = fold(text);
  const direct = scan(tokenize(folded));
  if (direct) return direct;
  if (!/[0-9@$!]/.test(folded)) return null;
  const leet = [...folded].map((c) => LEET[c] ?? c).join("");
  return scan(tokenize(leet));
}

export const SENSITIVE_MESSAGE =
  "Catatan ini tampak berisi kekerasan terhadap perempuan/anak atau kekerasan seksual. Aplikasi ini tidak menyimpan kasus semacam itu. Jangan tulis identitas atau kronologi korban di sini: arahkan korban ke layanan rujukan (UPTD PPA/P2TP2A, SAPA 129, atau kepolisian) pada tab Rujukan.";

/** Periksa beberapa isian teks sekaligus; mengembalikan nama kolom pertama yang bermasalah, atau null. */
export function firstSensitiveField(fields: Record<string, unknown>): string | null {
  for (const [k, v] of Object.entries(fields)) if (typeof v === "string" && sensitiveViolenceTerm(v)) return k;
  return null;
}
