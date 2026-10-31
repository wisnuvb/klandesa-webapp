/**
 * Pemeriksaan kualitas NIK (murni, tanpa DB). NIK tidak punya angka cek, tetapi punya susunan: 2 digit provinsi, 2 kabupaten/kota,
 * 2 kecamatan, lalu tanggal lahir DDMMYY (perempuan: tanggal + 40), lalu 4 digit urut. Ketidaksesuaian bukan bukti salah
 * (ada NIK asli yang tanggalnya dikoreksi), jadi temuan disebut "perlu dicek", bukan "salah".
 */

/** Kode provinsi BPS yang berlaku (termasuk empat provinsi Papua hasil pemekaran 2022). */
const PROVINCE_CODES = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "31", "32", "33", "34", "35", "36", "51", "52", "53",
  "61", "62", "63", "64", "65", "71", "72", "73", "74", "75", "76", "81", "82", "91", "92", "93", "94", "95", "96",
]);

export type NikIssueKind = "NIK_FORMAT" | "NIK_PROVINCE" | "NIK_DATE" | "NIK_BIRTHDATE" | "NIK_GENDER" | "NIK_DUPLICATE_PERSON";

export const NIK_ISSUE_ORDER: readonly NikIssueKind[] = ["NIK_FORMAT", "NIK_PROVINCE", "NIK_DATE", "NIK_BIRTHDATE", "NIK_GENDER", "NIK_DUPLICATE_PERSON"];

export const NIK_ISSUE_META: Record<NikIssueKind, { title: string; help: string }> = {
  NIK_FORMAT: { title: "NIK bukan 16 angka", help: "NIK harus tepat 16 angka. Periksa salah ketik atau angka yang terpotong." },
  NIK_PROVINCE: { title: "Kode provinsi NIK tidak dikenal", help: "Dua angka pertama NIK adalah kode provinsi. Kode ini tidak ada dalam daftar provinsi." },
  NIK_DATE: { title: "Tanggal di dalam NIK tidak masuk akal", help: "Angka ke-7 sampai ke-12 NIK menyimpan tanggal lahir. Tanggal yang tertulis tidak mungkin ada." },
  NIK_BIRTHDATE: { title: "Tanggal lahir tidak sama dengan NIK", help: "Tanggal lahir di data warga berbeda dari tanggal yang tertulis di NIK. Salah satunya mungkin keliru." },
  NIK_GENDER: { title: "Jenis kelamin tidak sama dengan NIK", help: "Pada NIK perempuan, tanggal lahir ditambah 40. Jenis kelamin di data warga berbeda dari yang tertulis di NIK." },
  NIK_DUPLICATE_PERSON: { title: "Kemungkinan warga tercatat ganda", help: "Nama, tanggal lahir, dan jenis kelamin sama, tetapi NIK berbeda. Periksa apakah ini orang yang sama." },
};

export interface NikSubject {
  nik: string;
  birthDate: Date;
  gender: string;
}

function daysInMonth(month: number, year2: number): number {
  // Tahun dua digit: terima bila sah di abad mana pun (19xx atau 20xx), agar tidak salah tuduh.
  const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const feb = leap(1900 + year2) || leap(2000 + year2) ? 29 : 28;
  return [31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Masalah pada satu NIK dibandingkan data warganya. Urutan: berhenti di masalah bentuk sebelum membaca isi. */
export function checkNik(s: NikSubject): NikIssueKind[] {
  const nik = s.nik.trim();
  if (!/^\d{16}$/.test(nik)) return ["NIK_FORMAT"];
  const issues: NikIssueKind[] = [];
  if (!PROVINCE_CODES.has(nik.slice(0, 2))) issues.push("NIK_PROVINCE");

  const rawDay = Number(nik.slice(6, 8));
  const month = Number(nik.slice(8, 10));
  const year2 = Number(nik.slice(10, 12));
  const female = rawDay > 40;
  const day = female ? rawDay - 40 : rawDay;
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month, year2)) {
    issues.push("NIK_DATE");
  } else {
    const b = s.birthDate;
    if (b.getUTCDate() !== day || b.getUTCMonth() + 1 !== month || b.getUTCFullYear() % 100 !== year2) issues.push("NIK_BIRTHDATE");
    const g = s.gender.trim().toLowerCase();
    const isFemale = g.startsWith("p");
    const isMale = g.startsWith("l");
    if ((isFemale && !female) || (isMale && female)) issues.push("NIK_GENDER");
  }
  return issues;
}

export interface NikRow extends NikSubject {
  id: number;
  name: string;
  rt: string | null;
  rw: string | null;
  isAlive: boolean;
  moveDate: Date | null;
}

export interface NikFinding {
  kind: NikIssueKind;
  residentId: number;
  name: string;
  nikLast4: string;
  rt: string | null;
  rw: string | null;
  /** Hanya untuk NIK_DUPLICATE_PERSON: id warga lain yang mirip. */
  relatedIds?: number[];
}

const last4 = (nik: string) => nik.replace(/\D/g, "").slice(-4);
const dateKey = (d: Date) => d.toISOString().slice(0, 10);
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export interface NikReport {
  total: number;
  counts: Record<NikIssueKind, number>;
  /** Temuan yang dikembalikan (sudah dipotong oleh pemanggil bila perlu). */
  findings: NikFinding[];
}

/** Hanya warga aktif (hidup dan belum pindah) diperiksa: arsip lama bukan prioritas operator. */
export function buildNikReport(rows: NikRow[]): NikReport {
  const active = rows.filter((r) => r.isAlive && !r.moveDate);
  const findings: NikFinding[] = [];
  for (const r of active) {
    for (const kind of checkNik(r)) findings.push({ kind, residentId: r.id, name: r.name, nikLast4: last4(r.nik), rt: r.rt, rw: r.rw });
  }

  const groups = new Map<string, NikRow[]>();
  for (const r of active) {
    const name = normName(r.name);
    if (!name) continue;
    const key = `${name}|${dateKey(r.birthDate)}|${r.gender.trim().toLowerCase().charAt(0)}`;
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  for (const g of groups.values()) {
    if (g.length < 2 || new Set(g.map((r) => r.nik)).size < 2) continue;
    for (const r of g) {
      findings.push({ kind: "NIK_DUPLICATE_PERSON", residentId: r.id, name: r.name, nikLast4: last4(r.nik), rt: r.rt, rw: r.rw, relatedIds: g.filter((x) => x.id !== r.id).map((x) => x.id) });
    }
  }

  const counts = Object.fromEntries(NIK_ISSUE_ORDER.map((k) => [k, 0])) as Record<NikIssueKind, number>;
  for (const f of findings) counts[f.kind]++;
  return { total: active.length, counts, findings };
}
