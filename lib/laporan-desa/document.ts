/** Menyusun dokumen cetak Laporan Kepala Desa dari bagian naratif dan data otomatis. Murni. */
import { KIND_INFO, KINDS, SECTIONS, deadlineOf, type ReportKind } from "./catalog";
import type { ReportTable } from "@/lib/apbdes/tables";

export type Block = { type: "h1" | "h2" | "h3" | "p" | "note"; text: string } | { type: "table"; table: ReportTable };

export interface AutoData {
  village: { name: string; address: string | null };
  year: number;
  headName: string | null;
  plan: { title: string; vision: string | null; mission: string | null } | null;
  perdes: { number: string | null; date: string | null; label: string } | null;
  realization: ReportTable | null;
  activities: { bidang: string; items: { code: string; name: string; budget: string; realized: string }[] }[];
  population: ReportTable;
}

export interface ReportDocument {
  title: string;
  recipient: string;
  blocks: Block[];
  signer: { role: string; name: string | null };
}

const fmtRp = (cents: string): string => `Rp${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(cents))}`;

/** Menyusun dokumen: judul, penerima, bagian naratif menurut pasal, dan lampiran otomatis. */
export function buildDocument(kind: ReportKind, sections: Record<string, string>, data: AutoData): ReportDocument {
  const blocks: Block[] = [];
  const meta = KIND_INFO[kind];
  blocks.push({ type: "h1", text: KINDS[kind].toUpperCase() });
  blocks.push({ type: "p", text: `Pemerintah Desa ${data.village.name}${kind === "LPPD_JABATAN" ? "" : `, Tahun Anggaran ${data.year}`}` });
  blocks.push({ type: "note", text: `Disampaikan kepada ${meta.to}. ${meta.basis}` });

  let lastGroup = "";
  for (const s of SECTIONS[kind]) {
    if (s.group !== lastGroup) {
      blocks.push({ type: "h2", text: s.group });
      lastGroup = s.group;
    }
    blocks.push({ type: "h3", text: s.title });
    const text = (sections[s.id] ?? "").trim();
    blocks.push({ type: "p", text: text || "(belum diisi)" });
    // Bagian yang punya padanan data otomatis
    if (kind === "LPPD_TAHUN" && s.id === "program_pemerintahan") pushActivities(blocks, data, "Penyelenggaraan Pemerintahan Desa");
    if (kind === "LPPD_TAHUN" && s.id === "program_pembangunan") pushActivities(blocks, data, "Pelaksanaan Pembangunan Desa");
    if (kind === "LPPD_TAHUN" && s.id === "program_kemasyarakatan") pushActivities(blocks, data, "Pembinaan Kemasyarakatan Desa");
    if (kind === "LPPD_TAHUN" && s.id === "program_pemberdayaan") pushActivities(blocks, data, "Pemberdayaan Masyarakat Desa");
    if (kind === "LPPD_TAHUN" && s.id === "perdes_lpj") {
      blocks.push({ type: "p", text: data.perdes ? `Peraturan Desa tentang APB Desa: ${data.perdes.label}${data.perdes.number ? `, Nomor ${data.perdes.number}` : ""}${data.perdes.date ? `, tanggal ${data.perdes.date}` : ""}.` : "APB Desa tahun ini belum ditetapkan di aplikasi." });
    }
  }

  if (kind !== "LPPD_JABATAN") {
    blocks.push({ type: "h2", text: "Lampiran: Rincian pelaksanaan APB Desa" });
    if (data.realization) blocks.push({ type: "table", table: data.realization });
    else blocks.push({ type: "p", text: "Belum ada APB Desa yang ditetapkan untuk tahun ini." });
  }
  if (kind === "LPPD_TAHUN") {
    blocks.push({ type: "h2", text: "Lampiran: Rekapitulasi jumlah penduduk" });
    blocks.push({ type: "table", table: data.population });
  }
  return { title: KINDS[kind], recipient: meta.to, blocks, signer: { role: "Kepala Desa", name: data.headName } };
}

function pushActivities(blocks: Block[], data: AutoData, bidang: string) {
  const g = data.activities.find((x) => x.bidang === bidang);
  if (!g || g.items.length === 0) return;
  blocks.push({ type: "p", text: `Kegiatan ${bidang} dalam APB Desa (dari data anggaran, bukan narasi):` });
  for (const i of g.items) blocks.push({ type: "p", text: `- ${i.code} ${i.name}: anggaran ${fmtRp(i.budget)}, realisasi ${fmtRp(i.realized)}` });
}

/** Bagian wajib yang masih kosong (untuk syarat penyerahan). */
export function missingRequired(kind: ReportKind, sections: Record<string, string>): string[] {
  return SECTIONS[kind].filter((s) => s.required && !(sections[s.id] ?? "").trim()).map((s) => s.title);
}

export { deadlineOf };
