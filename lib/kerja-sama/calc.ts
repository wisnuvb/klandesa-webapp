/** Pagar status dan temuan kerja sama desa (murni). Uang = BigInt sen; tanggal "YYYY-MM-DD". */
import { CONTENTS, REFS, SIGN_WITHIN_WORKDAYS, type Initiative, type Kind, type Status } from "./catalog";

export interface Finding {
  level: "ERROR" | "WARN" | "INFO";
  code: string;
  message: string;
  ref?: string;
}
export interface MeetingFact {
  status: string;
  heldOn: string | null;
}
export interface AgreementFacts {
  kind: Kind;
  initiative: Initiative | null;
  status: Status;
  scope: string | null;
  procedures: string | null;
  rights: string | null;
  funding: string | null;
  amendment: string | null;
  dispute: string | null;
  termStartOn: string | null;
  termEndOn: string | null;
  prepMusdes: MeetingFact | null;
  inPlanConfirmed: boolean;
  offerSentOn: string | null;
  offerMusdes: MeetingFact | null;
  offerDecision: string | null;
  offerReplyOn: string | null;
  consultRequired: boolean;
  consultedOn: string | null;
  agreedOn: string | null;
  signedOn: string | null;
  signedNumber: string | null;
  witnessName: string | null;
  reportedOn: string | null;
  reportedToCamatOn: string | null;
  endReason: string | null;
  parties: { kind: string; name: string; representativeName: string | null }[];
  budget: { amountCents: bigint; bearerKind: string | null }[];
}

const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;
const held = (m: MeetingFact | null): boolean => m !== null && (m.status === "HELD" || m.status === "FINAL");
/** Prakarsa pihak ketiga tidak melewati tahap persiapan oleh Desa (Pasal 15). */
const byThirdParty = (f: Pick<AgreementFacts, "kind" | "initiative">): boolean => f.kind === "PIHAK_KETIGA" && f.initiative === "PIHAK_KETIGA";

export const totalCents = (f: Pick<AgreementFacts, "budget">): bigint => f.budget.reduce((t, b) => t + b.amountCents, 0n);
export const selfShareCents = (f: Pick<AgreementFacts, "budget">): bigint => f.budget.filter((b) => b.bearerKind === "SELF").reduce((t, b) => t + b.amountCents, 0n);

/** Jumlah hari kerja (Senin-Jumat; hari libur nasional tidak dihitung) dari `a` ke `b`, a < b. */
export function workdaysBetween(a: string, b: string): number {
  const d0 = new Date(`${a}T00:00:00Z`);
  const d1 = new Date(`${b}T00:00:00Z`);
  let n = 0;
  for (let d = new Date(d0.getTime() + 86_400_000); d <= d1; d = new Date(d.getTime() + 86_400_000)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Delapan muatan minimal (Pasal 6) yang belum terisi. */
export function missingContents(f: Pick<AgreementFacts, "scope" | "procedures" | "rights" | "funding" | "amendment" | "dispute" | "termStartOn" | "termEndOn">): string[] {
  const filled: Record<string, boolean> = {
    scope: Boolean(f.scope),
    field: true, // bidang selalu terisi (wajib saat dibuat)
    procedures: Boolean(f.procedures),
    term: Boolean(f.termStartOn && f.termEndOn),
    rights: Boolean(f.rights),
    funding: Boolean(f.funding),
    amendment: Boolean(f.amendment),
    dispute: Boolean(f.dispute),
  };
  return CONTENTS.filter((c) => !filled[c.key]).map((c) => c.label);
}

export function transitionBlockers(to: Status, f: AgreementFacts): string[] {
  const out: string[] = [];
  const add = (m: string, ref?: string) => out.push(ref ? `${m} (${ref})` : m);
  const from = f.status;
  if (from === "SELESAI" || from === "BATAL") return ["Kerja sama yang sudah berakhir atau dibatalkan tidak dapat diubah statusnya."];
  const allowed: Record<Status, Status[]> = {
    PERSIAPAN: ["PENAWARAN", "BATAL"],
    PENAWARAN: ["PENYUSUNAN", "BATAL"],
    PENYUSUNAN: ["DITANDATANGANI", "BATAL"],
    DITANDATANGANI: ["PELAKSANAAN", "SELESAI"],
    PELAKSANAAN: ["SELESAI"],
    SELESAI: [],
    BATAL: [],
  };
  if (!allowed[from].includes(to)) return [`Dari "${from}" kerja sama tidak dapat langsung ke "${to}".`];
  if (to === "BATAL") return out;

  if (to === "PENAWARAN") {
    if (!byThirdParty(f)) {
      if (!held(f.prepMusdes)) add("Hubungkan Musyawarah Desa yang membahas bidang/potensi yang dikerjasamakan, dan tandai terlaksana.", REFS.musdes);
      if (!f.inPlanConfirmed) add("Konfirmasi bahwa bidang/potensi ini tercantum dalam RPJM Desa dan RKP Desa (atau sudah diubah lewat musyawarah perencanaan khusus).", REFS.plan);
    }
    if (f.kind === "ANTAR_DESA") {
      const m = missingContents(f);
      if (m.length) add(`Surat penawaran antar-Desa memuat delapan butir; belum terisi: ${m.join(", ")}.`, REFS.offer);
    } else if (!f.scope) add("Isi ruang lingkup kerja sama (dasar kerangka acuan kerja).", REFS.contents);
  }

  if (to === "PENYUSUNAN") {
    if (f.parties.length < 2) add("Daftarkan para pihak (Desa ini dan paling sedikit satu pihak lain).");
    if (!held(f.offerMusdes)) add("Hubungkan Musyawarah Desa yang membahas penawaran, dan tandai terlaksana.", REFS.offer);
    if (f.offerDecision !== "SEPAKAT") add("Hasil Musyawarah Desa harus menyepakati kerja sama (bila tidak sepakat, batalkan).", REFS.offer);
    if (f.kind === "ANTAR_DESA" && !f.offerReplyOn) add("Catat tanggal jawaban tertulis Kepala Desa atas penawaran.", REFS.offer);
  }

  if (to === "DITANDATANGANI") {
    const m = missingContents(f);
    if (m.length) add(`Muatan minimal belum lengkap: ${m.join(", ")}.`, REFS.contents);
    if (f.termStartOn && f.termEndOn && f.termEndOn < f.termStartOn) add("Tanggal berakhir tidak boleh sebelum tanggal mulai.");
    if (f.parties.filter((p) => p.kind === "SELF").length !== 1) add("Harus ada tepat satu pihak 'Desa ini'.");
    if (f.parties.length < 2) add("Daftarkan paling sedikit satu pihak lain.");
    const unnamed = f.parties.filter((p) => !p.representativeName);
    if (unnamed.length) add(`Nama penandatangan belum diisi untuk: ${unnamed.map((p) => p.name).join(", ")}.`);
    if (!f.agreedOn) add("Isi tanggal kesepakatan para pihak (dasar berita acara kesepakatan dan RAB bersama).", REFS.rab);
    if ((f.consultRequired || selfShareCents(f) > 0n) && !f.consultedOn) add("Rancangan wajib dikonsultasikan kepada bupati/wali kota melalui camat karena menyangkut tata ruang/pungutan/organisasi atau pembebanan APB Desa; isi tanggal konsultasi.", REFS.consult);
    if (!f.signedOn || !f.signedNumber) add("Isi tanggal dan nomor Peraturan Bersama/Perjanjian Bersama yang ditandatangani.", REFS.sign);
    if (f.signedOn && f.agreedOn && f.signedOn < f.agreedOn) add("Tanggal penandatanganan tidak boleh sebelum tanggal kesepakatan.");
  }

  if (to === "SELESAI") {
    if (!f.endReason) add("Pilih sebab berakhirnya kerja sama.", REFS.end);
  }
  return out;
}

export function agreementFindings(f: AgreementFacts, today: string): Finding[] {
  const out: Finding[] = [];
  const add = (level: Finding["level"], code: string, message: string, ref?: string) => out.push({ level, code, message, ref });
  if (f.status === "BATAL") return out;
  const idx = ["PERSIAPAN", "PENAWARAN", "PENYUSUNAN", "DITANDATANGANI", "PELAKSANAAN", "SELESAI"].indexOf(f.status);

  if (idx >= 1 && !f.inPlanConfirmed) add("WARN", "NOT_IN_PLAN", "Bidang/potensi yang dikerjasamakan belum dikonfirmasi tercantum dalam RPJM Desa dan RKP Desa.", REFS.plan);
  const total = totalCents(f);
  const mine = selfShareCents(f);
  if (f.kind === "ANTAR_DESA" && f.budget.length === 0 && idx <= 2) add("INFO", "NO_RAB", "RAB bersama belum diisi. RAB kerja sama antar-Desa disusun dan disepakati bersama para kepala desa.", REFS.rab);
  if (total > 0n) {
    const unassigned = f.budget.filter((b) => !b.bearerKind);
    if (unassigned.length) add("WARN", "RAB_NO_BEARER", `${unassigned.length} baris RAB belum menunjuk pihak penanggung biaya.`);
    if (f.kind === "ANTAR_DESA" && mine > 0n) add("INFO", "BEBAN_APBDES", `Beban Desa ini ${rp(mine)} dari total RAB ${rp(total)}; pastikan dianggarkan di APB Desa (biaya kerja sama antar-Desa dibebankan pada APB Desa).`, REFS.funds);
  }
  if (f.signedOn && f.agreedOn && f.signedOn > f.agreedOn && workdaysBetween(f.agreedOn, f.signedOn) > SIGN_WITHIN_WORKDAYS) add("WARN", "SIGN_LATE", `Penandatanganan lebih dari ${SIGN_WITHIN_WORKDAYS} hari kerja setelah kesepakatan.`, REFS.sign);
  if (idx >= 3 && !f.witnessName) add("INFO", "NO_WITNESS", "Camat (atas nama bupati/wali kota) menyaksikan penandatanganan; isi nama saksi bila sudah.", REFS.sign);
  if (f.status === "PELAKSANAAN" && f.termEndOn && today > f.termEndOn) add("WARN", "TERM_OVER", "Jangka waktu kerja sama sudah lewat; tandai berakhir atau buat perjanjian baru.", REFS.end);
  if ((f.status === "PELAKSANAAN" || f.status === "SELESAI") && !f.reportedOn) add("INFO", "NOT_REPORTED", "Laporan hasil pelaksanaan belum dicatat (kepada Kepala Desa/BPD dengan tembusan bupati/wali kota melalui camat).", REFS.report);
  if (f.status === "SELESAI" && f.reportedOn && !f.reportedToCamatOn) add("INFO", "NOT_TO_CAMAT", "Laporan ke camat dan bupati/wali kota belum dicatat; laporan dimuat dalam Laporan Penyelenggaraan Pemerintahan Desa.", REFS.report);
  if (idx >= 3) add("INFO", "FUNDS_RULE", "Hasil kerja sama berupa uang adalah pendapatan Desa dan wajib masuk rekening kas desa; hasil berupa barang menjadi aset Desa.", REFS.funds);
  return out;
}
