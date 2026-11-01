/** Hitungan murni (tanpa DB) untuk perjanjian pemanfaatan aset: jangka waktu, jadwal tagihan, tumpang tindih, syarat berlaku, peringatan. */
import { AGREEMENT_KINDS, NEEDS_APPRAISAL, REGISTERED_RIGHTS, WARN, isLandCategory, type AgreementKind, type PeriodUnit } from "./land-catalog";

const DAY = 86_400_000;
export const iso = (d: Date): string => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m, d));
const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Tambah bulan dari tanggal awal; hari dipotong ke akhir bulan (31 Jan + 1 bulan = 28/29 Feb). Selalu dihitung dari awal, bukan berantai. */
export function addMonthsUtc(d: Date, months: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const y = Math.floor(total / 12);
  const m = total % 12;
  return utc(y, m, Math.min(d.getUTCDate(), daysInMonth(y, m)));
}
export const addDaysUtc = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY);
export const diffDays = (a: Date, b: Date): number => Math.round((a.getTime() - b.getTime()) / DAY);

/**
 * Jumlah periode utuh antara awal dan akhir. Akhir dihitung inklusif (31 Des 2026 untuk mulai 1 Jan 2026 = 12 bulan) dan
 * tanggal ulang tahun yang sama (1 Jan 2027) diterima juga. Null = jangka waktu bukan kelipatan utuh periode.
 */
export function wholePeriods(startOn: Date, endOn: Date, unit: PeriodUnit): number | null {
  if (unit === "SEKALI") return 1;
  const step = unit === "TAHUN" ? 12 : 1;
  const maxN = 12 * 25;
  for (let n = 1; n <= maxN; n++) {
    const boundary = addMonthsUtc(startOn, n * step);
    if (endOn.getTime() === boundary.getTime() || endOn.getTime() === boundary.getTime() - DAY) return n;
    if (boundary.getTime() > endOn.getTime() + DAY) return null;
  }
  return null;
}

/** Akhir jangka waktu paling jauh yang diizinkan untuk jenis perjanjian (tanggal ulang tahun ke-N, inklusif). */
export const maxEnd = (startOn: Date, kind: AgreementKind): Date => addMonthsUtc(startOn, AGREEMENT_KINDS[kind].maxYears * 12);

export interface ChargePlan {
  seq: number;
  dueOn: Date;
  amountCents: bigint;
}

/** Jadwal tagihan: jatuh tempo di awal setiap periode (bayar di muka). SEKALI = satu tagihan sebesar jumlah. */
export function buildChargePlan(startOn: Date, endOn: Date, unit: PeriodUnit, amountCents: bigint): ChargePlan[] | null {
  const n = wholePeriods(startOn, endOn, unit);
  if (n === null) return null;
  if (unit === "SEKALI") return [{ seq: 1, dueOn: startOn, amountCents }];
  const step = unit === "TAHUN" ? 12 : 1;
  return Array.from({ length: n }, (_, i) => ({ seq: i + 1, dueOn: addMonthsUtc(startOn, i * step), amountCents }));
}

/** Total yang akan ditagih sepanjang perjanjian, sen. */
export const totalCents = (plan: ChargePlan[]): bigint => plan.reduce((t, c) => t + c.amountCents, 0n);

export interface Span {
  id: number;
  startOn: Date;
  endOn: Date;
  /** null = seluruh objek */
  areaSqm: number | null;
}

/**
 * Perjanjian aktif yang tumpang tindih waktu dengan perjanjian baru pada objek yang sama, dan apakah luasnya melebihi objek.
 * Luas kosong dianggap seluruh objek (tak bisa dibagi dua perjanjian yang berjalan bersamaan).
 * Mengembalikan pesan galat atau null bila aman. Luas diperiksa pada setiap titik awal perjanjian (jumlah yang berjalan bersamaan).
 */
export function overlapProblem(candidate: Span, others: Span[], parcelAreaSqm: number | null): string | null {
  const overlapping = others.filter((o) => o.id !== candidate.id && o.startOn.getTime() <= candidate.endOn.getTime() && candidate.startOn.getTime() <= o.endOn.getTime());
  if (!overlapping.length) return null;
  const whole = (s: Span) => s.areaSqm === null || parcelAreaSqm === null;
  if (parcelAreaSqm === null && overlapping.length) {
    return "Objek ini sudah punya perjanjian berlaku pada rentang waktu yang sama dan luas objek belum tercatat, sehingga tumpang tindih tidak dapat dihitung. Lengkapi data tanah atau sesuaikan tanggal.";
  }
  if ([candidate, ...overlapping].some(whole)) {
    return "Objek ini sudah punya perjanjian berlaku pada rentang waktu yang sama. Perjanjian tanpa luas khusus dianggap meliputi seluruh objek; tentukan luas yang disewakan atau sesuaikan tanggal.";
  }
  const all = [candidate, ...overlapping];
  for (const point of all.map((s) => s.startOn.getTime())) {
    const live = all.filter((s) => s.startOn.getTime() <= point && point <= s.endOn.getTime());
    const sum = live.reduce((t, s) => t + (s.areaSqm ?? 0), 0);
    if (sum > (parcelAreaSqm ?? 0) + 0.005) {
      return `Luas yang disewakan pada waktu bersamaan (${sum.toLocaleString("id-ID")} m2) melebihi luas objek (${(parcelAreaSqm ?? 0).toLocaleString("id-ID")} m2).`;
    }
  }
  return null;
}

export interface AgreementFacts {
  kind: AgreementKind;
  agreementNo: string | null;
  signedOn: Date | null;
  perdesNo: string | null;
  perdesDate: Date | null;
  regencyPermitNo: string | null;
  regencyPermitDate: Date | null;
  forceMajeureIncluded: boolean;
  tenantDuties: string;
  appraisalRef: string | null;
}

/** Syarat WAJIB sebelum perjanjian berlaku dan tagihannya dibuat. Pesan ditujukan ke operator desa. */
export function activationBlockers(a: AgreementFacts): string[] {
  const out: string[] = [];
  if (!a.agreementNo) out.push("Isi nomor surat perjanjian.");
  if (!a.signedOn) out.push("Isi tanggal penandatanganan perjanjian.");
  if (!a.perdesNo || !a.perdesDate) out.push("Isi nomor dan tanggal Peraturan Desa yang menetapkan pemanfaatan ini (Permendagri 1/2016 Pasal 11 ayat 3).");
  if (!a.tenantDuties.trim()) out.push("Isi tanggung jawab pihak lain atas biaya operasional dan pemeliharaan (Pasal 12 ayat 3 huruf d).");
  if (!a.forceMajeureIncluded) out.push("Perjanjian harus memuat ketentuan keadaan di luar kemampuan para pihak/force majeure (Pasal 12 ayat 3 huruf f; Pasal 14 ayat 4 huruf f). Centang bila sudah dimuat.");
  if (AGREEMENT_KINDS[a.kind].needsRegencyPermit && (!a.regencyPermitNo || !a.regencyPermitDate)) {
    out.push("Isi nomor dan tanggal izin tertulis Bupati/Wali Kota (Pasal 17): wajib untuk kerja sama pemanfaatan dan bangun guna serah / serah guna.");
  }
  return out;
}

export type Severity = "bahaya" | "peringatan" | "info";
export interface Finding {
  code: string;
  severity: Severity;
  message: string;
  agreementId?: number;
  chargeId?: number;
  itemId?: number;
}

export interface FindingInput {
  today: string; // YYYY-MM-DD
  agreements: { id: number; kind: AgreementKind; status: string; endOn: string; itemId: number; itemName: string; category: string; strategic: boolean; lesseeName: string; regencyPermitNo: string | null; appraisalRef: string | null; perdesNo: string | null }[];
  charges: { id: number; agreementId: number; seq: number; dueOn: string; status: string; amountCents: bigint; entryMissing: boolean; entryAmountMismatch: boolean }[];
  parcels: { itemId: number; itemName: string; rightKind: string; areaSqm: number }[];
  /** Barang golongan tanah aktif yang belum diberi atribut tanah. */
  landItemsWithoutParcel: { itemId: number; name: string }[];
}

const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;

/** Peringatan untuk layar dan ringkasan: jatuh tempo, perjanjian berakhir, kelengkapan dokumen, kesesuaian dengan Buku Kas Umum. */
export function landFindings(i: FindingInput): Finding[] {
  const out: Finding[] = [];
  const today = new Date(`${i.today}T00:00:00Z`);
  const byId = new Map(i.agreements.map((a) => [a.id, a]));
  const label = (a: { itemName: string; lesseeName: string }) => `${a.itemName} (${a.lesseeName})`;

  for (const c of i.charges) {
    const a = byId.get(c.agreementId);
    if (!a || (a.status !== "AKTIF" && a.status !== "SELESAI")) continue;
    if (c.status === "DITERIMA") {
      if (c.entryMissing) out.push({ code: "BKU_HILANG", severity: "bahaya", agreementId: a.id, chargeId: c.id, message: `Penerimaan ${label(a)} tagihan ke-${c.seq} tercatat diterima, tetapi catatannya tidak ada lagi di Buku Kas Umum. Batalkan penerimaan lalu catat ulang.` });
      else if (c.entryAmountMismatch) out.push({ code: "BKU_BEDA", severity: "peringatan", agreementId: a.id, chargeId: c.id, message: `Jumlah di Buku Kas Umum untuk ${label(a)} tagihan ke-${c.seq} berbeda dari jumlah tagihan (${rp(c.amountCents)}). Periksa catatan buku kas.` });
      continue;
    }
    if (c.status !== "BELUM") continue;
    const late = diffDays(today, new Date(`${c.dueOn}T00:00:00Z`));
    if (late > 0) out.push({ code: "TERLAMBAT", severity: "bahaya", agreementId: a.id, chargeId: c.id, message: `${label(a)}: tagihan ke-${c.seq} ${rp(c.amountCents)} terlambat ${late} hari (jatuh tempo ${c.dueOn}).` });
    else if (-late <= WARN.chargeSoonDays) out.push({ code: "SEGERA_JATUH_TEMPO", severity: "peringatan", agreementId: a.id, chargeId: c.id, message: `${label(a)}: tagihan ke-${c.seq} ${rp(c.amountCents)} jatuh tempo ${late === 0 ? "hari ini" : `${-late} hari lagi`} (${c.dueOn}).` });
  }

  for (const a of i.agreements) {
    if (a.status !== "AKTIF") continue;
    const left = diffDays(new Date(`${a.endOn}T00:00:00Z`), today);
    if (left < 0) out.push({ code: "PERJANJIAN_BERAKHIR", severity: "bahaya", agreementId: a.id, itemId: a.itemId, message: `Perjanjian ${label(a)} sudah berakhir pada ${a.endOn} tetapi masih berstatus berlaku. Tutup perjanjian atau buat perjanjian perpanjangan.` });
    else if (left <= WARN.endingSoonDays) out.push({ code: "PERJANJIAN_SEGERA_BERAKHIR", severity: "peringatan", agreementId: a.id, itemId: a.itemId, message: `Perjanjian ${label(a)} berakhir ${left === 0 ? "hari ini" : `${left} hari lagi`} (${a.endOn}). Perpanjangan memerlukan perjanjian baru.` });
    if (a.strategic && !AGREEMENT_KINDS[a.kind].needsRegencyPermit && !a.regencyPermitNo) {
      out.push({ code: "STRATEGIS_TANPA_IZIN", severity: "info", agreementId: a.id, itemId: a.itemId, message: `${label(a)} adalah aset strategis. Pasal 17 tidak mensyaratkan izin Bupati/Wali Kota untuk sewa, tetapi periksa Peraturan Bupati/Wali Kota setempat; catat nomor izin bila ada.` });
    }
    if ((NEEDS_APPRAISAL as readonly string[]).includes(a.category) && !a.appraisalRef) {
      out.push({ code: "TANPA_PENILAIAN", severity: "info", agreementId: a.id, itemId: a.itemId, message: `${label(a)}: penilaian oleh Penilai Pemerintah/Publik untuk pemanfaatan tanah/bangunan (Pasal 30) belum dicatat.` });
    }
  }

  for (const p of i.parcels) {
    if (!(REGISTERED_RIGHTS as readonly string[]).includes(p.rightKind)) {
      out.push({ code: p.rightKind === "BELUM_ADA" ? "TANPA_BUKTI_HAK" : "BUKTI_HAK_BELUM_SERTIPIKAT", severity: "info", itemId: p.itemId, message: p.rightKind === "BELUM_ADA" ? `${p.itemName}: belum ada bukti hak. Pengamanan hukum aset mencakup melengkapi bukti status kepemilikan (Pasal 19 ayat 2 huruf e).` : `${p.itemName}: bukti hak belum berupa sertipikat. Pertimbangkan pendaftaran ke Kantor Pertanahan (Pasal 19 ayat 2 huruf e).` });
    }
  }
  for (const l of i.landItemsWithoutParcel) {
    out.push({ code: "TANAH_BELUM_LENGKAP", severity: "info", itemId: l.itemId, message: `${l.name}: data tanah (luas, batas, bukti hak) belum dilengkapi.` });
  }
  const order: Record<Severity, number> = { bahaya: 0, peringatan: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

export const isLand = isLandCategory;
