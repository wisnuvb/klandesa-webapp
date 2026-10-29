/**
 * Dokumen awal untuk jenis surat baru: kosong per jenis, atau salinan contoh dari katalog.
 * Katalog dimuat dinamis supaya tidak masuk bundel awal editor.
 */
import { validateDocument } from "@/lib/letters/document/validate";
import type { LetterDocument, LetterDocumentInput } from "@/lib/letters/document/schema";

type Inl = NonNullable<Extract<LetterDocumentInput["body"][number], { type: "paragraph" }>["content"]>[number];
type BlockIn = LetterDocumentInput["body"][number];

const t = (text: string, marks?: Array<"b" | "i" | "u">): Inl => (marks ? { type: "text", text, marks } : { type: "text", text });
const f = (ref: string, format?: "tanggal" | "upper"): Inl => ({ type: "field", ref, ...(format ? { format } : {}) });
const para = (id: string, ...content: Inl[]): BlockIn => ({ id, type: "paragraph", content });
const dateline: Inl[] = [f("desa.nama"), t(", "), f("surat.tanggal", "tanggal")];

export const START_KINDS = ["keterangan", "surat_biasa", "keputusan", "berita_acara"] as const;
export type StartKind = (typeof START_KINDS)[number];

export type StarterInfo = {
  /** `kosong:<jenis>` atau `contoh:<catalogKey>` */
  id: string;
  title: string;
  description: string;
  category: string;
};

const BLANK: Record<StartKind, { title: string; description: string; category: string; name: string; doc: () => LetterDocumentInput }> = {
  keterangan: {
    title: "Surat keterangan",
    description: "Desa menerangkan sesuatu tentang seorang warga (domisili, usaha, tidak mampu, dll.).",
    category: "Keterangan",
    name: "Surat Keterangan Baru",
    doc: () => ({
      schemaVersion: 2,
      kind: "keterangan",
      audience: "warga",
      people: [{ id: "pemohon", label: "Pemohon" }],
      fields: [{ id: "keperluan", label: "Keperluan", type: "longtext", placeholder: "mis. persyaratan beasiswa" }],
      body: [
        { id: "judul", type: "title", title: [t("SURAT KETERANGAN", ["b", "u"])], showNumber: true },
        para(
          "pembuka",
          t("Yang bertanda tangan di bawah ini Kepala Desa "), f("desa.nama"),
          t(", Kecamatan "), f("desa.kecamatan"), t(", Kabupaten "), f("desa.kabupaten"),
          t(", dengan ini menerangkan dengan sebenarnya bahwa:"),
        ),
        { id: "data_pemohon", type: "personData", role: "pemohon", fields: ["nama", "nik", "ttl", "jenis_kelamin", "pekerjaan", "alamat_lengkap"] },
        para("isi", t("Surat keterangan ini dibuat untuk "), f("isian.keperluan"), t(".")),
        para("penutup", t("Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.")),
        { id: "ttd", type: "signature", dateline, slots: [{ id: "kades", who: { kind: "pejabat", official: "kades" }, stamp: true }] },
      ],
    }),
  },
  surat_biasa: {
    title: "Surat biasa / undangan",
    description: "Surat dinas dengan Nomor, Sifat, Lampiran, dan Perihal, ditujukan kepada pihak lain.",
    category: "Pengantar",
    name: "Surat Biasa Baru",
    doc: () => ({
      schemaVersion: 2,
      kind: "surat_biasa",
      audience: "internal",
      fields: [
        { id: "perihal", label: "Perihal", type: "text" },
        { id: "tujuan", label: "Ditujukan kepada", type: "text" },
      ],
      body: [
        {
          id: "kepala",
          type: "memo",
          rows: [
            { label: "Nomor", value: [f("surat.nomor")] },
            { label: "Sifat", value: [t("Biasa")] },
            { label: "Lampiran", value: [t("-")] },
            { label: "Perihal", value: [f("isian.perihal")] },
          ],
          dateline,
          addressee: [t("Yth. "), f("isian.tujuan"), t(" di tempat")],
        },
        para("isi", t("Dengan hormat,")),
        para("isi2", t("Bersama surat ini kami menyampaikan …")),
        para("penutup", t("Demikian surat ini kami sampaikan. Atas perhatian Bapak/Ibu, kami ucapkan terima kasih.")),
        { id: "ttd", type: "signature", slots: [{ id: "kades", who: { kind: "pejabat", official: "kades" }, stamp: true }] },
        { id: "tembusan", type: "cc", items: [[t("Arsip")]] },
      ],
    }),
  },
  keputusan: {
    title: "Keputusan Kepala Desa",
    description: "Keputusan resmi dengan Menimbang, Mengingat, Menetapkan, dan diktum KESATU, KEDUA, dst.",
    category: "Keterangan",
    name: "Keputusan Kepala Desa Baru",
    doc: () => ({
      schemaVersion: 2,
      kind: "keputusan",
      audience: "internal",
      letterhead: "garuda",
      numbering: { mode: "auto", pattern: "{URUT} TAHUN {TAHUN}", reset: "yearly", padding: 0, counterKey: "keputusan" },
      fields: [{ id: "tentang", label: "Tentang", type: "text" }],
      body: [
        { id: "judul", type: "title", title: [t("KEPUTUSAN KEPALA DESA ", ["b"]), f("desa.nama", "upper")], numberPrefix: "NOMOR ", showNumber: true },
        { id: "tentang_h", type: "heading", level: 3, content: [t("TENTANG "), f("isian.tentang", "upper")] },
        { id: "menimbang", type: "dictum", kind: "menimbang", items: [[t("bahwa …")]] },
        { id: "mengingat", type: "dictum", kind: "mengingat", items: [[t("Undang-Undang Nomor 6 Tahun 2014 tentang Desa;")]] },
        { id: "menetapkan", type: "dictum", kind: "menetapkan", items: [[t("KEPUTUSAN KEPALA DESA TENTANG "), f("isian.tentang", "upper")]] },
        { id: "diktum", type: "dictum", kind: "diktum", items: [[t("…")], [t("Keputusan ini mulai berlaku pada tanggal ditetapkan.")]] },
        {
          id: "ttd", type: "signature",
          dateline: [t("Ditetapkan di "), f("desa.nama"), t(", pada tanggal "), f("surat.tanggal", "tanggal")],
          slots: [{ id: "kades", who: { kind: "pejabat", official: "kades" }, stamp: true }],
        },
      ],
    }),
  },
  berita_acara: {
    title: "Berita acara + daftar hadir",
    description: "Catatan resmi rapat atau kegiatan, lengkap dengan daftar hadir peserta.",
    category: "Keterangan",
    name: "Berita Acara Baru",
    doc: () => ({
      schemaVersion: 2,
      kind: "berita_acara",
      audience: "internal",
      fields: [
        { id: "agenda", label: "Agenda", type: "text" },
        { id: "hasil", label: "Hasil / kesepakatan", type: "longtext" },
      ],
      groups: [
        {
          id: "peserta", label: "Peserta", min: 1, max: 50, personRows: true,
          fields: [{ id: "nama", label: "Nama", type: "text" }, { id: "alamat", label: "Alamat", type: "text" }],
        },
      ],
      body: [
        { id: "judul", type: "title", title: [t("BERITA ACARA", ["b", "u"])], showNumber: true },
        para("isi", t("Pada hari ini, "), f("surat.hari"), t(" tanggal "), f("surat.tanggal", "tanggal"), t(", telah dilaksanakan kegiatan dengan agenda "), f("isian.agenda"), t(".")),
        para("hasil", t("Hasil / kesepakatan: "), f("isian.hasil")),
        { id: "ttd", type: "signature", dateline, slots: [{ id: "kades", who: { kind: "pejabat", official: "kades" }, caption: [t("Kepala Desa,")], stamp: true }] },
        { id: "pb", type: "pageBreak" },
        { id: "lamp", type: "heading", level: 2, content: [t("DAFTAR HADIR")] },
        { id: "hadir", type: "repeatTable", group: "peserta", columns: [{ label: "Nama", field: "nama" }, { label: "Alamat", field: "alamat" }] },
      ],
    }),
  },
};

export type StartedTemplate = {
  doc: LetterDocument;
  name: string;
  description: string;
  category: string;
};

function validated(input: LetterDocumentInput): LetterDocument {
  const r = validateDocument(input);
  if (!r.ok) throw new Error(`Dokumen awal tidak valid: ${r.issues[0]?.path} ${r.issues[0]?.message}`);
  return r.doc;
}

export function parseStartId(id: string): { type: "kosong"; kind: StartKind } | { type: "contoh"; key: string } | null {
  const [type, rest] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
  if (type === "kosong" && (START_KINDS as readonly string[]).includes(rest)) return { type, kind: rest as StartKind };
  if (type === "contoh" && /^[a-z][a-z0-9_]{0,79}$/.test(rest)) return { type, key: rest };
  return null;
}

/** Daftar pilihan "mulai dari kosong" (sinkron, tanpa katalog). */
export function listBlankStarters(): StarterInfo[] {
  return START_KINDS.map((k) => ({ id: `kosong:${k}`, title: BLANK[k].title, description: BLANK[k].description, category: BLANK[k].category }));
}

/** Daftar pilihan kosong + contoh dari katalog (katalog dimuat dinamis). */
export async function listStarters(): Promise<{ blank: StarterInfo[]; examples: StarterInfo[] }> {
  const { getCatalogV2 } = await import("@/lib/letters/catalog");
  return {
    blank: listBlankStarters(),
    examples: getCatalogV2().map((c) => ({ id: `contoh:${c.catalogKey}`, title: c.name, description: c.description, category: c.category })),
  };
}

/** Bangun dokumen awal dari id pilihan. Mengembalikan null bila id tak dikenal. */
export async function buildStarter(id: string): Promise<StartedTemplate | null> {
  const parsed = parseStartId(id);
  if (!parsed) return null;
  if (parsed.type === "kosong") {
    const b = BLANK[parsed.kind];
    return { doc: validated(b.doc()), name: b.name, description: b.description, category: b.category };
  }
  const { getCatalogV2 } = await import("@/lib/letters/catalog");
  const entry = getCatalogV2().find((c) => c.catalogKey === parsed.key);
  if (!entry) return null;
  return {
    doc: validated(entry.document),
    name: `${entry.name} (salinan)`,
    description: entry.description,
    category: entry.category,
  };
}
