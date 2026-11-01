/**
 * Bantuan narasi LPPD/LKPPD untuk Laras: FUNGSI SERVIS BACA-SAJA yang mengubah data terstruktur desa menjadi fakta bertanda
 * sumber dan draf kalimat yang disusun dari templat. Tidak ada model bahasa di sini dan tidak ada angka yang dikarang: setiap
 * angka di draf berasal dari satu fakta ber-ID, dan setiap kalimat menyebut ID fakta yang dipakainya. Bagian yang butuh
 * penilaian manusia (keberhasilan, permasalahan, upaya) sengaja dibiarkan kosong untuk ditulis petugas.
 *
 * Cara memasang di Laras (berkas Laras dikerjakan sesi lain, jadi TIDAK dipasang di sini): docs/PHASE3_KALENDER.md bagian "Narasi".
 */
import type { Prisma } from "@prisma/client";
import { fail, isoDay, type Result } from "@/lib/form-input";
import { bidangName } from "@/lib/apbdes/catalog";
import { fromCents } from "@/lib/coop/loan-math";
import { buildActivityRecap, buildRealization } from "@/lib/apbdes/reports";
import { activeDocument, loadEntries, toBudgetLines } from "@/lib/apbdes/service";
import { fmt } from "@/lib/apbdes/tables";

type Db = Prisma.TransactionClient;

export interface NarrationFact {
  /** F1, F2, ... dipakai pada draf sebagai [F3] */
  id: string;
  /** Kalimat fakta, angka sudah terformat */
  text: string;
  /** Sumber data yang bisa ditelusuri petugas */
  source: string;
  /** Nilai mentah (string agar sen tidak kehilangan ketelitian) */
  value: string | null;
}

export interface NarrationSection {
  /** Id bagian pada katalog Laporan Kepala Desa (lib/laporan-desa/catalog.ts) */
  sectionId: string;
  title: string;
  /** Draf kalimat; kosong bila tidak ada data (petugas menulis sendiri) */
  draft: string;
  /** ID fakta yang dipakai draf */
  factIds: string[];
  needsHuman: boolean;
}

export interface Narration {
  village: string;
  year: number;
  facts: NarrationFact[];
  sections: NarrationSection[];
  warnings: string[];
  /** Petunjuk yang SEBAIKNYA disertakan ke model bila narasi diperhalus */
  instruction: string;
}

export const NARRATION_INSTRUCTION = [
  "Gunakan HANYA fakta pada daftar fakta. Jangan menambah angka, nama, tanggal, atau peristiwa yang tidak ada di sana.",
  "Setiap kalimat yang memuat angka harus menyebut ID fakta asalnya, misalnya [F3]. Jangan membulatkan atau menghitung ulang angka.",
  "Bagian yang ditandai needsHuman wajib dibiarkan kosong atau diberi petunjuk untuk petugas; jangan mengarang keberhasilan, masalah, atau upaya.",
  "Hasilnya adalah DRAF. Wajib dibaca dan disetujui Kepala Desa atau petugas sebelum disimpan atau diserahkan; katakan itu kepada pengguna.",
].join(" ");

const rp = (c: bigint): string => `Rp${fmt(c)}`;
const pct = (num: bigint, den: bigint): string => (den > 0n ? `${(Number((num * 10000n) / den) / 100).toLocaleString("id-ID")}%` : "belum dapat dihitung");

/** Susun fakta dan draf. Hanya membaca; villageId harus berasal dari sesi/konteks server, tidak dari masukan model. */
export async function buildNarrationFacts(db: Db, args: { villageId: number; year: number }): Promise<Result<Narration>> {
  const { villageId, year } = args;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(400, "Tahun tidak valid.");
  const village = await db.village.findUnique({ where: { id: villageId }, select: { name: true } });
  if (!village) return fail(404, "Desa tidak ditemukan.");
  const [doc, entries, plan] = await Promise.all([
    activeDocument(db, villageId, year),
    loadEntries(db, villageId, year),
    db.rpjmdesPlan.findFirst({ where: { villageId, periodStart: { lte: year }, periodEnd: { gte: year } }, orderBy: [{ updatedAt: "desc" }], select: { vision: true, mission: true, title: true } }),
  ]);
  const facts: NarrationFact[] = [];
  const warnings: string[] = [];
  const add = (text: string, source: string, value: string | null = null): string => {
    const id = `F${facts.length + 1}`;
    facts.push({ id, text, source, value });
    return id;
  };

  const sections: NarrationSection[] = [];
  const human = (sectionId: string, title: string) => sections.push({ sectionId, title, draft: "", factIds: [], needsHuman: true });

  if (!doc) {
    warnings.push(`APB Desa tahun ${year} belum ditetapkan di aplikasi, jadi tidak ada fakta anggaran. Narasi keuangan tidak disusun.`);
  } else {
    const label = doc.version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${doc.version}`;
    const src = `${label} ${year} (modul APBDes)`;
    const lines = toBudgetLines(doc.lines);
    const r = buildRealization(lines, entries);
    const fPerdes = add(`${label} ditetapkan dengan Peraturan Desa${doc.regulationNumber ? ` Nomor ${doc.regulationNumber}` : ""}${doc.regulationDate ? ` tanggal ${isoDay(doc.regulationDate)}` : ""}.`, src);
    const fInc = add(`Pendapatan dianggarkan ${rp(r.totals.incomeBudget)} dan terealisasi ${rp(r.totals.incomeRealized)} (${pct(r.totals.incomeRealized, r.totals.incomeBudget)}).`, `${src}; realisasi dari Buku Kas Umum`, fromCents(r.totals.incomeRealized));
    const fExp = add(`Belanja dianggarkan ${rp(r.totals.expenseBudget)} dan terealisasi ${rp(r.totals.expenseRealized)} (${pct(r.totals.expenseRealized, r.totals.expenseBudget)}).`, `${src}; realisasi dari Buku Kas Umum`, fromCents(r.totals.expenseRealized));
    sections.push({
      sectionId: "perdes_lpj",
      title: "Pelaksanaan APB Desa",
      draft: `${facts.find((f) => f.id === fPerdes)!.text} ${facts.find((f) => f.id === fInc)!.text} ${facts.find((f) => f.id === fExp)!.text} [${fPerdes}] [${fInc}] [${fExp}]`,
      factIds: [fPerdes, fInc, fExp],
      needsHuman: false,
    });
    if (entries.length === 0) warnings.push("Belum ada catatan Buku Kas Umum tahun ini; angka realisasi nol.");

    const recap = buildActivityRecap(lines, entries);
    const programs: [string, string, string][] = [
      ["1", "program_pemerintahan", "Program kerja penyelenggaraan pemerintahan desa"],
      ["2", "program_pembangunan", "Program kerja pelaksanaan pembangunan"],
      ["3", "program_kemasyarakatan", "Program kerja pembinaan kemasyarakatan"],
      ["4", "program_pemberdayaan", "Program kerja pemberdayaan masyarakat"],
    ];
    for (const [b, sectionId, title] of programs) {
      const items = recap.filter((a) => a.activityCode.startsWith(`${b}.`));
      const name = bidangName(b) ?? `Bidang ${b}`;
      if (!items.length) {
        sections.push({ sectionId, title, draft: "", factIds: [], needsHuman: true });
        continue;
      }
      const budget = items.reduce((s, a) => s + a.budget, 0n);
      const realized = items.reduce((s, a) => s + a.realized, 0n);
      const fB = add(`${name}: ${items.length} kegiatan dalam APB Desa, anggaran ${rp(budget)}, realisasi ${rp(realized)} (${pct(realized, budget)}).`, `${src}; rekap kegiatan bidang ${b}`, fromCents(realized));
      const names = items.slice(0, 10).map((a) => `${a.activityCode} ${a.name}`);
      const fN = add(`Kegiatan ${name} (maks. 10 pertama menurut kode): ${names.join("; ")}${items.length > 10 ? `; dan ${items.length - 10} kegiatan lain` : ""}.`, `${src}; daftar kegiatan bidang ${b}`);
      sections.push({ sectionId, title, draft: `${facts.find((f) => f.id === fB)!.text} [${fB}] ${facts.find((f) => f.id === fN)!.text} [${fN}]`, factIds: [fB, fN], needsHuman: false });
    }
  }

  if (plan && (plan.vision || plan.mission)) {
    const ids: string[] = [];
    const parts: string[] = [];
    if (plan.vision) {
      const f = add(`Visi: ${plan.vision}`, `RPJM Desa "${plan.title}" (modul RPJMDes)`);
      ids.push(f);
      parts.push(`Visi: ${plan.vision} [${f}]`);
    }
    if (plan.mission) {
      const f = add(`Misi: ${plan.mission}`, `RPJM Desa "${plan.title}" (modul RPJMDes)`);
      ids.push(f);
      parts.push(`Misi: ${plan.mission} [${f}]`);
    }
    sections.push({ sectionId: "visi_misi", title: "Visi dan misi penyelenggaraan pemerintahan desa", draft: parts.join("\n\n"), factIds: ids, needsHuman: false });
  } else {
    sections.push({ sectionId: "visi_misi", title: "Visi dan misi penyelenggaraan pemerintahan desa", draft: "", factIds: [], needsHuman: true });
    warnings.push("RPJM Desa aktif yang memuat visi dan misi belum ada.");
  }

  // Data kependudukan: hanya jumlah agregat, tanpa nama atau NIK.
  const [alive, households] = await Promise.all([db.resident.count({ where: { villageId, isAlive: true, moveDate: null } }), db.household.count({ where: { villageId } })]);
  const fPop = add(`Jumlah penduduk tercatat saat ini ${alive.toLocaleString("id-ID")} jiwa dalam ${households.toLocaleString("id-ID")} kepala keluarga.`, "Data warga saat penyusunan (bukan potret 31 Desember)", String(alive));
  sections.push({ sectionId: "lampiran_penduduk" /* bukan bagian naratif LPPD; pembuka lampiran */, title: "Lampiran: rekapitulasi jumlah penduduk (pembuka)", draft: `${facts.find((f) => f.id === fPop)!.text} [${fPop}]`, factIds: [fPop], needsHuman: false });

  for (const [id, title] of [
    ["tujuan", "Tujuan penyusunan laporan"],
    ["strategi", "Strategi dan kebijakan"],
    ["kesimpulan", "Kesimpulan laporan"],
    ["saran", "Saran dan permohonan petunjuk"],
    // LKPPD (kepada BPD): langkah kebijakan adalah penilaian kepala desa; angka pelaksanaan APB Desa ada pada bagian "perdes_lpj".
    ["langkah_kebijakan", "Langkah-langkah kebijakan pelaksanaan Peraturan Desa (LKPPD)"],
  ] as const) human(id, title);
  for (const b of ["pemerintahan", "pembangunan", "kemasyarakatan", "pemberdayaan"]) {
    human(`berhasil_${b}`, `Keberhasilan bidang ${b}`);
    human(`masalah_${b}`, `Permasalahan bidang ${b}`);
    human(`upaya_${b}`, `Upaya yang ditempuh bidang ${b}`);
  }

  return { ok: true, data: { village: village.name, year, facts, sections, warnings, instruction: NARRATION_INSTRUCTION } };
}

/** Bentuk teks datar untuk dimasukkan ke konteks model: daftar fakta, lalu bagian dan drafnya. */
export function narrationToPrompt(n: Narration): string {
  const lines = [`Desa ${n.village}, tahun anggaran ${n.year}`, "", "FAKTA (satu-satunya sumber angka):"];
  for (const f of n.facts) lines.push(`[${f.id}] ${f.text} (sumber: ${f.source})`);
  lines.push("", "BAGIAN:");
  for (const s of n.sections) lines.push(`- ${s.sectionId} | ${s.title} | ${s.needsHuman ? "ditulis petugas" : `draf dari ${s.factIds.join(", ")}`}`);
  if (n.warnings.length) lines.push("", "CATATAN:", ...n.warnings.map((w) => `- ${w}`));
  lines.push("", `ATURAN: ${n.instruction}`);
  return lines.join("\n");
}
