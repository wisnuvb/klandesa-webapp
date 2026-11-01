/** Perhitungan murni pengadaan: validitas TPK, pemenang, negosiasi, pagar status, dan temuan. Uang = BigInt sen. */
import { REFS, TPK_MIN, type Method, type Mode, type Role, type Status, type Element } from "./catalog";

export interface Finding {
  level: "ERROR" | "WARN" | "INFO";
  code: string;
  message: string;
  ref?: string;
}

export interface TeamFact {
  role: Role;
  element: Element;
}
export interface OfferFact {
  id: number;
  priceCents: bigint;
  negotiatedCents: bigint | null;
  passed: boolean;
  isWinner: boolean;
  /** penyedia sama dengan anggota TPK atau Kasi/Kaur pelaksana: tidak layak dipilih dan tidak ikut perhitungan harga terendah */
  conflict?: boolean;
}

/** Fakta paket yang dibutuhkan untuk menilai pagar dan temuan (semua tanggal "YYYY-MM-DD" atau null). */
export interface PackageFacts {
  mode: Mode;
  method: Method | null;
  status: Status;
  hpsCents: bigint;
  executorName: string | null;
  executorTitle: string | null;
  tpkDecreeNumber: string | null;
  tpkDecreeDate: string | null;
  planAnnouncedOn: string | null;
  resultAnnouncedOn: string | null;
  handoverToHeadOn: string | null;
  singleProviderReason: string | null;
  negotiationNumber: string | null;
  negotiationDate: string | null;
  contractNumber: string | null;
  contractDate: string | null;
  contractCents: bigint | null;
  bastNumber: string | null;
  bastDate: string | null;
  bastHandedBy: string | null;
  bastReceivedBy: string | null;
  team: TeamFact[];
  /** nama anggota TPK (untuk pemisahan tugas) */
  teamNames: string[];
  /** nama penyedia terpilih */
  winnerName: string | null;
  offers: OfferFact[];
  /** Sisa anggaran kegiatan di APB Desa yang ditetapkan (setelah dikurangi paket lain); null bila tak ada APB Desa ditetapkan. */
  availableCents: bigint | null;
  /** Apakah ada APB Desa yang sudah ditetapkan untuk tahun ini. */
  hasBudgetDoc: boolean;
}

/** Nama dinormalkan untuk perbandingan pemisahan tugas. */
export const nameKey = (v: string | null | undefined): string => (v ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export const effectivePrice = (o: Pick<OfferFact, "priceCents" | "negotiatedCents">): bigint => o.negotiatedCents ?? o.priceCents;

/** Syarat TPK: minimal 3 orang, gasal, tepat satu ketua dan satu sekretaris (Pasal 11 ayat 2-4). Unsur kurang hanya peringatan. */
export function tpkProblems(team: TeamFact[]): { blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (team.length < TPK_MIN) blockers.push(`TPK minimal ${TPK_MIN} orang (sekarang ${team.length}).`);
  else if (team.length % 2 === 0) blockers.push(`Jumlah anggota TPK harus gasal (sekarang ${team.length}).`);
  const ketua = team.filter((m) => m.role === "KETUA").length;
  const sekretaris = team.filter((m) => m.role === "SEKRETARIS").length;
  if (ketua !== 1) blockers.push(ketua === 0 ? "TPK belum punya ketua." : "TPK hanya boleh punya satu ketua.");
  if (sekretaris !== 1) blockers.push(sekretaris === 0 ? "TPK belum punya sekretaris." : "TPK hanya boleh punya satu sekretaris.");
  const missing = (["PERANGKAT", "LEMBAGA", "MASYARAKAT"] as const).filter((e) => !team.some((m) => m.element === e));
  if (team.length >= TPK_MIN && missing.length) warnings.push("Unsur TPK belum lengkap: pedoman meminta perangkat Desa, lembaga kemasyarakatan, dan masyarakat.");
  return { blockers, warnings };
}

/** Penawaran lulus yang harganya terendah (setelah negosiasi); kembar bila lebih dari satu. */
export function lowestPassed(offers: OfferFact[]): OfferFact[] {
  const passed = offers.filter((o) => o.passed && !o.conflict);
  if (!passed.length) return [];
  const min = passed.reduce((m, o) => (effectivePrice(o) < m ? effectivePrice(o) : m), effectivePrice(passed[0]));
  return passed.filter((o) => effectivePrice(o) === min);
}

/**
 * Negosiasi (BA Hasil Negosiasi) diperlukan bila hanya satu penyedia yang lulus, atau beberapa penyedia lulus dengan harga
 * penawaran sama (sebelum negosiasi). Lampiran I Bab III.B.2.
 */
export function negotiationRequired(offers: OfferFact[]): boolean {
  const passed = offers.filter((o) => o.passed && !o.conflict);
  if (passed.length === 1) return true;
  if (passed.length > 1) {
    const min = passed.reduce((m, o) => (o.priceCents < m ? o.priceCents : m), passed[0].priceCents);
    return passed.filter((o) => o.priceCents === min).length > 1;
  }
  return false;
}

export const minOffers = (method: Method | null, singleProviderReason: string | null): number =>
  method === "PERMINTAAN_PENAWARAN" ? (singleProviderReason ? 1 : 2) : 1;

/** Nilai yang dibandingkan dengan anggaran: nilai kontrak bila ada, selain itu HPS/RAB. */
export const committedValue = (f: Pick<PackageFacts, "mode" | "contractCents" | "hpsCents">): bigint => (f.mode === "PENYEDIA" && f.contractCents ? f.contractCents : f.hpsCents);

const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;

/** Alasan sebuah perpindahan status ditolak. Daftar kosong = boleh. Setiap pagar menyebut dasar tertulisnya. */
export function transitionBlockers(to: Status, f: PackageFacts): string[] {
  const out: string[] = [];
  const add = (msg: string, ref?: string) => out.push(ref ? `${msg} (${ref})` : msg);
  const from = f.status;
  if (from === "SELESAI" || from === "BATAL") return ["Paket yang sudah selesai atau dibatalkan tidak dapat diubah statusnya."];

  const allowed: Record<Status, Status[]> = {
    PERSIAPAN: f.mode === "SWAKELOLA" ? ["PELAKSANAAN", "BATAL"] : ["PEMILIHAN", "BATAL"],
    PEMILIHAN: ["PERSIAPAN", "PELAKSANAAN", "BATAL"],
    PELAKSANAAN: ["SELESAI", "BATAL"],
    SELESAI: [],
    BATAL: [],
  };
  if (!allowed[from].includes(to)) return [`Dari "${from}" paket tidak dapat langsung ke "${to}".`];
  if (to === "BATAL" || to === "PERSIAPAN") {
    if (to === "PERSIAPAN" && (f.offers.some((o) => o.isWinner) || f.contractNumber)) add("Penyedia terpilih/SPK sudah dicatat; hapus dulu sebelum kembali ke persiapan.");
    return out;
  }

  if (to === "PEMILIHAN") {
    if (f.hpsCents <= 0n) add("Isi HPS lebih dulu.", REFS.negotiation);
    if (!f.method) add("Pilih metode pengadaan (pembelian langsung, permintaan penawaran, atau lelang).");
    else if (f.method !== "PEMBELIAN_LANGSUNG") for (const p of tpkProblems(f.team).blockers) add(p, REFS.tpk);
  }

  if (to === "PELAKSANAAN") {
    if (!f.executorName) add("Isi nama Kasi/Kaur pelaksana kegiatan anggaran.", REFS.pagu);
    if (!f.executorTitle) add("Isi jabatan Kasi/Kaur pelaksana (Kaur Keuangan tidak boleh menjadi pengelola pengadaan).", REFS.kaurKeuangan);
    else if (/keuangan/i.test(f.executorTitle)) add("Kaur Keuangan tidak boleh menjadi pengelola pengadaan; tetapkan Kasi/Kaur lain.", REFS.kaurKeuangan);
    const tpkNames = new Set(f.teamNames.map(nameKey));
    if (f.executorName && tpkNames.has(nameKey(f.executorName))) add("Kasi/Kaur pelaksana tidak boleh sekaligus anggota TPK (pemisahan tugas).", REFS.tpk);
    if (f.mode === "PENYEDIA" && f.winnerName && (tpkNames.has(nameKey(f.winnerName)) || nameKey(f.winnerName) === nameKey(f.executorName))) add("Penyedia terpilih tidak boleh sama dengan anggota TPK atau Kasi/Kaur pelaksana (pertentangan kepentingan).", "Peraturan LKPP 12/2019 Pasal 3 huruf e");
    if (f.mode === "SWAKELOLA") {
      for (const p of tpkProblems(f.team).blockers) add(p, REFS.tpk);
    } else {
      const winner = f.offers.find((o) => o.isWinner);
      const need = minOffers(f.method, f.singleProviderReason);
      if (f.offers.length < need) add(f.method === "PERMINTAAN_PENAWARAN" ? `Permintaan penawaran minimal ke 2 penyedia; catat penawarannya atau isi alasan bila di desa hanya ada satu penyedia (sekarang ${f.offers.length}).` : "Catat penawaran/penyedia.", REFS.twoOffers);
      if (!winner) add("Tetapkan penyedia terpilih.");
      else {
        if (winner.conflict) add("Penyedia terpilih bentrok kepentingan (sama dengan anggota TPK atau Kasi/Kaur pelaksana); ubah nama, hapus penawarannya, atau pilih penyedia lain.", "Peraturan LKPP 12/2019 Pasal 3 huruf e");
        else if (!winner.passed) add("Penyedia terpilih harus dinyatakan lulus evaluasi.");
        else if (!lowestPassed(f.offers).some((o) => o.id === winner.id)) add("Penyedia terpilih harus yang berharga terendah di antara yang lulus.", REFS.lowest);
      }
      if (f.method && f.method !== "PEMBELIAN_LANGSUNG" && negotiationRequired(f.offers) && (!f.negotiationNumber || !f.negotiationDate)) add("Berita Acara Hasil Negosiasi wajib (nomor dan tanggal) karena hanya satu penyedia lulus atau harga terendah kembar.", REFS.negotiation);
      if (f.method && f.method !== "PEMBELIAN_LANGSUNG") for (const p of tpkProblems(f.team).blockers) add(p, REFS.tpk);
      if (!f.contractNumber || !f.contractDate) add("Isi nomor dan tanggal surat perjanjian/bukti transaksi (SPK).");
      if (!f.contractCents || f.contractCents <= 0n) add("Isi nilai kontrak.");
      if (f.contractDate && f.negotiationDate && f.contractDate < f.negotiationDate) add("Tanggal SPK tidak boleh sebelum berita acara negosiasi.");
    }
    const value = committedValue(f);
    if (f.hasBudgetDoc) {
      if (f.availableCents === null || f.availableCents <= 0n) add("Anggaran kegiatan ini belum tersedia di APB Desa yang ditetapkan, sehingga perjanjian belum boleh ditandatangani.", REFS.pagu);
      else if (value > f.availableCents) add(`Nilai ${rp(value)} melebihi sisa anggaran kegiatan ${rp(f.availableCents)}; revisi anggaran lebih dulu atau lapor Kepala Desa.`, REFS.pagu);
    }
  }

  if (to === "SELESAI") {
    if (!f.bastNumber || !f.bastDate) add("Isi nomor dan tanggal Berita Acara Serah Terima (BAST).", REFS.bast);
    if (!f.bastHandedBy) add(f.mode === "SWAKELOLA" ? "Isi nama penyerah (Ketua TPK)." : "Isi nama penyerah (penyedia).", REFS.bast);
    if (!f.bastReceivedBy) add("Isi nama penerima (Kasi/Kaur).", REFS.bast);
    if (f.bastDate && f.contractDate && f.bastDate < f.contractDate) add("Tanggal BAST tidak boleh sebelum tanggal SPK.");
  }
  return out;
}

export interface MethodLimits {
  directLimitCents: bigint | null;
  offerLimitCents: bigint | null;
}

/** Saran metode dari ambang milik desa; null bila ambang belum diisi. Hanya saran: bukan penghalang. */
export function suggestMethod(hps: bigint, limits: MethodLimits): Method | null {
  if (limits.directLimitCents === null && limits.offerLimitCents === null) return null;
  if (limits.directLimitCents !== null && hps <= limits.directLimitCents) return "PEMBELIAN_LANGSUNG";
  if (limits.offerLimitCents !== null && hps <= limits.offerLimitCents) return "PERMINTAAN_PENAWARAN";
  return limits.offerLimitCents !== null ? "LELANG" : null;
}

/** Temuan informatif dan peringatan; tidak pernah memblokir. */
export function packageFindings(f: PackageFacts, limits: MethodLimits): Finding[] {
  const out: Finding[] = [];
  const add = (level: Finding["level"], code: string, message: string, ref?: string) => out.push({ level, code, message, ref });

  if (f.mode === "PENYEDIA" && f.method) {
    if (f.method === "PEMBELIAN_LANGSUNG" && limits.directLimitCents !== null && f.hpsCents > limits.directLimitCents) add("WARN", "OVER_DIRECT", `HPS ${rp(f.hpsCents)} melebihi ambang pembelian langsung desa (${rp(limits.directLimitCents)}). Pertimbangkan permintaan penawaran.`);
    if (f.method === "PERMINTAAN_PENAWARAN" && limits.offerLimitCents !== null && f.hpsCents > limits.offerLimitCents) add("WARN", "OVER_OFFER", `HPS ${rp(f.hpsCents)} melebihi ambang permintaan penawaran desa (${rp(limits.offerLimitCents)}). Pertimbangkan lelang.`);
  }
  if (f.status !== "BATAL") {
    if (!f.tpkDecreeNumber && f.team.length > 0) add("WARN", "TPK_NO_DECREE", "Nomor Keputusan Kepala Desa penetapan TPK belum diisi.", REFS.tpkDecree);
    if (f.executorTitle && /keuangan/i.test(f.executorTitle)) add("WARN", "KAUR_KEUANGAN", "Kaur Keuangan tidak boleh menjadi pengelola pengadaan.", REFS.kaurKeuangan);
    if (!f.planAnnouncedOn && f.status !== "PERSIAPAN") add("INFO", "PLAN_NOT_ANNOUNCED", "Perencanaan pengadaan belum dicatat diumumkan oleh Kepala Desa (papan pengumuman desa).", REFS.announce);
    if (f.status === "PERSIAPAN" && f.team.length > 0) {
      const t = tpkProblems(f.team);
      for (const w of t.warnings) add("WARN", "TPK_ELEMENTS", w, REFS.tpk);
    }
    if (f.mode === "PENYEDIA") {
      const winner = f.offers.find((o) => o.isWinner);
      if (winner && f.contractCents !== null && f.contractCents !== effectivePrice(winner)) add("WARN", "CONTRACT_NE_OFFER", `Nilai kontrak ${rp(f.contractCents)} berbeda dari harga penyedia terpilih ${rp(effectivePrice(winner))}.`);
      if (f.contractCents !== null && f.contractCents > f.hpsCents) add("WARN", "CONTRACT_OVER_HPS", `Nilai kontrak ${rp(f.contractCents)} melebihi HPS ${rp(f.hpsCents)}.`);
      if (f.status === "PEMILIHAN" && f.method && f.method !== "PEMBELIAN_LANGSUNG" && negotiationRequired(f.offers) && !f.negotiationNumber) add("INFO", "NEGOTIATION_NEEDED", "Berita Acara Hasil Negosiasi diperlukan (hanya satu penyedia lulus atau harga terendah kembar).", REFS.negotiation);
    }
    if (!f.hasBudgetDoc) add("WARN", "NO_BUDGET_DOC", "Belum ada APB Desa yang ditetapkan untuk tahun ini; ketersediaan anggaran belum dapat diperiksa.", REFS.pagu);
    else if (f.availableCents === null || f.availableCents <= 0n) add("WARN", "NO_BUDGET", "Kegiatan ini tidak punya sisa anggaran belanja di APB Desa yang ditetapkan.", REFS.pagu);
    else if (committedValue(f) > f.availableCents) add("WARN", "OVER_BUDGET", `Nilai ${rp(committedValue(f))} melebihi sisa anggaran kegiatan ${rp(f.availableCents)}: pengadaan tidak dapat dilanjutkan sebelum anggaran direvisi.`, REFS.pagu);
  }
  if (f.status === "SELESAI") {
    if (!f.resultAnnouncedOn) add("INFO", "RESULT_NOT_ANNOUNCED", "Hasil pengadaan belum dicatat diumumkan di papan pengumuman desa.", REFS.announce);
    if (!f.handoverToHeadOn) add("INFO", "NO_HANDOVER_TO_HEAD", "Penyerahan hasil kepada Kepala Desa (berita acara penyerahan) belum dicatat.", REFS.bast);
  }
  return out;
}

/** Peringatan dari SPP yang terhubung (hanya informasi; tidak mengubah alur SPP). */
export interface SppFact {
  id: number;
  number: number;
  status: string;
  mode: string;
  hasReceipt: boolean;
  totalCents: bigint;
}
export function sppFindings(pkgs: { status: Status; mode: Mode; title: string }[], spp: SppFact[], packageValueCents: bigint): Finding[] {
  const out: Finding[] = [];
  const live = spp.filter((s) => s.status !== "DITOLAK");
  const pay = live.filter((s) => s.status === "DISETUJUI" || s.status === "DIBAYAR");
  if (pkgs.some((p) => p.mode === "PENYEDIA" && p.status !== "SELESAI") && pay.length) {
    out.push({ level: "WARN", code: "SPP_BEFORE_BAST", message: `SPP ${pay.map((s) => `No. ${s.number}`).join(", ")} sudah disetujui/dibayar padahal serah terima (BAST) paket belum dicatat. SPP penyedia diajukan setelah barang/jasa diterima.`, ref: REFS.spp });
  }
  const noReceipt = live.filter((s) => s.mode === "PENYEDIA" && !s.hasReceipt && (s.status === "DISETUJUI" || s.status === "DIBAYAR"));
  if (noReceipt.length) out.push({ level: "WARN", code: "SPP_NO_RECEIPT", message: `SPP penyedia No. ${noReceipt.map((s) => s.number).join(", ")} belum dilampiri bukti penerimaan barang/jasa.`, ref: REFS.spp });
  const total = live.reduce((t, s) => t + s.totalCents, 0n);
  if (packageValueCents > 0n && total > packageValueCents) out.push({ level: "INFO", code: "SPP_OVER_PACKAGE", message: `Total SPP kegiatan ini (${rp(total)}) melebihi nilai paket pengadaan (${rp(packageValueCents)}).` });
  return out;
}

export interface BudgetPackage {
  id: number;
  activityCode: string;
  status: Status;
  mode: Mode;
  contractCents: bigint | null;
  hpsCents: bigint;
}

/**
 * Sisa anggaran kegiatan: pagu belanja kegiatan di APB Desa yang ditetapkan dikurangi nilai paket lain (kegiatan yang sama)
 * yang sudah berjalan atau selesai. null bila tak ada APB Desa ditetapkan (pagu = null).
 */
export function availableFor(pagu: Map<string, bigint> | null, packages: BudgetPackage[], target: Pick<BudgetPackage, "id" | "activityCode">): bigint | null {
  if (!pagu) return null;
  const total = pagu.get(target.activityCode) ?? 0n;
  const used = packages
    .filter((p) => p.id !== target.id && p.activityCode === target.activityCode && (p.status === "PELAKSANAAN" || p.status === "SELESAI"))
    .reduce((t, p) => t + committedValue(p), 0n);
  return total > used ? total - used : 0n;
}
