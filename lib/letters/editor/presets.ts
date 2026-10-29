/**
 * Daftar "Tambah bagian" untuk operator dan pembuatnya. `createFromPreset` menyiapkan juga
 * dependensi (peran, isian, daftar) yang dibutuhkan bagian itu bila belum ada, sehingga dokumen
 * hasilnya selalu lolos `validateDocument`.
 */
import type { Block, CustomField, Inline, LetterDocument } from "../document/schema";
import { allBlockIds, addCustomField, addGroupDef, addPersonRole, insertBlockAt } from "./ops";
import { newBlockId, type Rng } from "./ids";
import type { BlockPreset, InsertTarget, PresetId } from "./types";

export const BLOCK_PRESETS: BlockPreset[] = [
  { id: "paragraf", label: "Paragraf", description: "Teks biasa; isian data bisa disisipkan di dalamnya.", category: "teks", icon: "Type" },
  { id: "judul", label: "Judul bagian", description: "Judul tebal untuk satu bagian surat.", category: "teks", icon: "Heading" },
  { id: "judul_surat", label: "Judul & nomor surat", description: "Judul surat berikut nomor suratnya.", category: "teks", icon: "FileText" },
  { id: "kepala_surat", label: "Kepala surat (Nomor, Sifat, Perihal)", description: "Untuk surat biasa dan undangan: nomor, lampiran, perihal, dan tujuan.", category: "teks", icon: "Mail" },
  { id: "daftar_butir", label: "Daftar butir", description: "Butir bernomor, huruf, atau titik.", category: "teks", icon: "List" },
  { id: "tabel", label: "Tabel", description: "Tabel biasa dengan isi yang Anda ketik.", category: "teks", icon: "Table" },
  { id: "tembusan", label: "Tembusan", description: "Daftar pihak yang mendapat tembusan surat.", category: "teks", icon: "ListChecks" },
  { id: "menimbang", label: "Menimbang", description: "Dasar pertimbangan pada keputusan.", category: "teks", icon: "Scale" },
  { id: "mengingat", label: "Mengingat", description: "Dasar hukum pada keputusan.", category: "teks", icon: "BookOpen" },
  { id: "menetapkan", label: "Menetapkan", description: "Pernyataan penetapan pada keputusan.", category: "teks", icon: "Gavel" },
  { id: "diktum", label: "Diktum (KESATU, KEDUA, …)", description: "Butir-butir isi keputusan.", category: "teks", icon: "ListOrdered" },

  { id: "data_orang", label: "Data orang", description: "Nama, NIK, tempat/tanggal lahir, pekerjaan, alamat dari data warga.", category: "data", icon: "UserRound" },
  { id: "daftar_berulang", label: "Daftar yang bisa ditambah baris", description: "Untuk ahli waris, anggota keluarga, peserta, dan sejenisnya.", category: "data", icon: "Users" },
  { id: "bersyarat", label: "Bagian bersyarat", description: "Tampil hanya bila sebuah pilihan dijawab tertentu.", category: "data", icon: "GitBranch" },

  { id: "tanda_tangan_kades", label: "Tanda tangan Kepala Desa", description: "Satu kolom tanda tangan Kepala Desa dengan stempel.", category: "tanda_tangan", icon: "PenLine" },
  { id: "tanda_tangan_an_sekdes", label: "Tanda tangan a.n. Kepala Desa", description: "Sekretaris Desa menandatangani atas nama Kepala Desa.", category: "tanda_tangan", icon: "PenLine" },
  { id: "tanda_tangan_mengetahui", label: "Tanda tangan + Mengetahui Camat", description: "Kepala Desa dan Camat berdampingan.", category: "tanda_tangan", icon: "Signature" },
  { id: "tanda_tangan_pemohon_saksi", label: "Pemohon bermaterai + dua saksi", description: "Untuk surat pernyataan: pemohon di atas materai dan dua saksi.", category: "tanda_tangan", icon: "Stamp" },

  { id: "dua_kolom", label: "Dua kolom", description: "Letakkan bagian berdampingan.", category: "tata_letak", icon: "Columns2" },
  { id: "garis", label: "Garis pemisah", description: "Garis tipis atau ganda.", category: "tata_letak", icon: "Minus" },
  { id: "spasi", label: "Jarak kosong", description: "Sisipkan ruang kosong.", category: "tata_letak", icon: "MoveVertical" },
  { id: "halaman_baru", label: "Halaman baru", description: "Mulai halaman berikutnya (untuk lampiran).", category: "tata_letak", icon: "FilePlus" },

  { id: "gambar", label: "Gambar", description: "Logo atau gambar dari penyimpanan situs.", category: "lainnya", icon: "Image" },
  { id: "kode_qr", label: "Kode QR verifikasi", description: "Kode QR untuk memeriksa keaslian surat.", category: "lainnya", icon: "QrCode" },
];

// ------------------------------------------------------------------ pembantu

const t = (text: string, marks?: Array<"b" | "i" | "u">): Inline => (marks ? { type: "text", text, marks } : { type: "text", text });
const f = (ref: string, format?: Extract<Inline, { type: "field" }>["format"]): Inline =>
  format ? { type: "field", ref, format } : { type: "field", ref };

const dateline = (): Inline[] => [f("desa.nama"), t(", "), f("surat.tanggal", "tanggal")];

const personField = (id: string, label: string): CustomField => ({ id, label, type: "text", required: true, sensitive: false });

/** Peran orang untuk "Data orang": pemohon bila ada, kalau tidak peran pertama, kalau kosong buat Pemohon. */
function ensurePerson(doc: LetterDocument): { doc: LetterDocument; role: string } {
  const existing = doc.people.find((p) => p.id === "pemohon") ?? doc.people[0];
  if (existing) return { doc, role: existing.id };
  const r = addPersonRole(doc, "Pemohon");
  return { doc: r.doc, role: r.id };
}

/** Pakai isian dengan id ini bila ada; kalau tidak, buat dengan id itu (bukan slug dari label). */
function ensureField(doc: LetterDocument, label: string, id: string): { doc: LetterDocument; id: string } {
  if (doc.fields.some((x) => x.id === id)) return { doc, id };
  const field: CustomField = { id, label, type: "text", required: true, sensitive: false };
  return { doc: { ...doc, fields: [...doc.fields, field] }, id };
}

/** Sebuah isian pilihan dengan minimal 2 opsi untuk bagian bersyarat. */
function ensureChoice(doc: LetterDocument): { doc: LetterDocument; id: string; value: string } {
  const existing = doc.fields.find((x) => x.type === "choice" && (x.options?.length ?? 0) >= 2);
  if (existing) return { doc, id: existing.id, value: existing.options![0] };
  const r = addCustomField(doc, "Pilihan Ya/Tidak", "choice", { options: ["Ya", "Tidak"] });
  return { doc: r.doc, id: r.id, value: "Ya" };
}

/** Daftar saksi bila belum ada. */
function ensureSaksi(doc: LetterDocument): { doc: LetterDocument; id: string } {
  if (doc.groups.some((g) => g.id === "saksi")) return { doc, id: "saksi" };
  const r = addGroupDef(doc, "Saksi", {
    min: 2,
    max: 2,
    personRows: true,
    fields: [personField("nama", "Nama"), personField("nik", "NIK")],
  });
  return { doc: r.doc, id: r.id };
}

type Built = { doc: LetterDocument; block: Block };

function build(doc: LetterDocument, preset: PresetId, id: string): Built {
  switch (preset) {
    case "paragraf":
      return { doc, block: { id, type: "paragraph", align: "justify", indentFirst: false, spaceAfterMm: 3, content: [] } };
    case "judul":
      return { doc, block: { id, type: "heading", level: 2, align: "center", underline: false, content: [t("JUDUL BAGIAN", ["b"])] } };
    case "judul_surat":
      return {
        doc,
        block: { id, type: "title", title: [t("JUDUL SURAT", ["b", "u"])], showNumber: doc.numbering.mode !== "none", numberPrefix: "Nomor : ", align: "center" },
      };
    case "kepala_surat": {
      const perihal = ensureField(doc, "Perihal", "perihal");
      const tujuan = ensureField(perihal.doc, "Ditujukan kepada", "tujuan");
      return {
        doc: tujuan.doc,
        block: {
          id,
          type: "memo",
          rows: [
            { label: "Nomor", value: [f("surat.nomor")] },
            { label: "Sifat", value: [t("Biasa")] },
            { label: "Lampiran", value: [t("-")] },
            { label: "Perihal", value: [f(`isian.${perihal.id}`)] },
          ],
          dateline: dateline(),
          addressee: [t("Yth. "), f(`isian.${tujuan.id}`), t(" di tempat")],
        },
      };
    }
    case "daftar_butir":
      return { doc, block: { id, type: "list", style: "number", items: [[], []] } };
    case "tabel":
      return {
        doc,
        block: {
          id, type: "table", bordered: true,
          columns: [{ label: "Keterangan" }, { label: "Isi" }],
          rows: [[[], []], [[], []]],
        },
      };
    case "tembusan":
      return { doc, block: { id, type: "cc", label: "Tembusan :", items: [[]] } };
    case "menimbang":
    case "mengingat":
    case "menetapkan":
    case "diktum":
      return { doc, block: { id, type: "dictum", kind: preset, items: [[]] } };

    case "data_orang": {
      const p = ensurePerson(doc);
      return {
        doc: p.doc,
        block: { id, type: "personData", role: p.role, fields: ["nama", "nik", "ttl", "pekerjaan", "alamat_lengkap"], labelWidthMm: 45, separator: ":" },
      };
    }
    case "daftar_berulang": {
      const g = addGroupDef(doc, "Daftar", { min: 1, max: 10, personRows: true, fields: [personField("nama", "Nama"), personField("nik", "NIK")] });
      return {
        doc: g.doc,
        block: {
          id, type: "repeatTable", group: g.id, showIndex: true,
          columns: [{ label: "Nama", field: "nama" }, { label: "NIK", field: "nik" }],
        },
      };
    }
    case "bersyarat": {
      const c = ensureChoice(doc);
      return { doc: c.doc, block: { id, type: "conditional", when: { ref: `isian.${c.id}`, op: "eq", value: c.value }, children: [] } };
    }

    case "tanda_tangan_kades":
      return {
        doc,
        block: {
          id, type: "signature", layout: "row", dateline: dateline(),
          slots: [{ id: "kades", who: { kind: "pejabat", official: "kades" }, prefix: "none", showName: true, showNip: false, stamp: true, materai: false, align: "center", gapMm: 25 }],
        },
      };
    case "tanda_tangan_an_sekdes":
      return {
        doc,
        block: {
          id, type: "signature", layout: "row", dateline: dateline(),
          slots: [{ id: "sekdes", who: { kind: "pejabat", official: "sekdes" }, prefix: "an", caption: [t("Kepala Desa")], showName: true, showNip: false, stamp: true, materai: false, align: "center", gapMm: 25 }],
        },
      };
    case "tanda_tangan_mengetahui":
      return {
        doc,
        block: {
          id, type: "signature", layout: "row", dateline: dateline(),
          slots: [
            { id: "camat", who: { kind: "pejabat", official: "camat" }, prefix: "none", caption: [t("Mengetahui, Camat")], showName: true, showNip: false, stamp: true, materai: false, align: "center", gapMm: 25 },
            { id: "kades", who: { kind: "pejabat", official: "kades" }, prefix: "none", showName: true, showNip: false, stamp: true, materai: false, align: "center", gapMm: 25 },
          ],
        },
      };
    case "tanda_tangan_pemohon_saksi": {
      const hasPemohon = doc.people.some((p) => p.id === "pemohon");
      const withPemohon = hasPemohon ? doc : addPersonRole(doc, "Pemohon").doc;
      const role = hasPemohon ? "pemohon" : withPemohon.people[withPemohon.people.length - 1].id;
      const saksi = ensureSaksi(withPemohon);
      return {
        doc: saksi.doc,
        block: {
          id, type: "signature", layout: "row", dateline: dateline(),
          slots: [
            { id: "pemohon", who: { kind: "peran", role }, prefix: "none", caption: [t("Yang menyatakan,")], showName: true, showNip: false, stamp: false, materai: true, align: "center", gapMm: 25 },
            { id: "saksi", who: { kind: "grup", group: saksi.id }, prefix: "none", caption: [t("Saksi,")], showName: true, showNip: false, stamp: false, materai: false, align: "center", gapMm: 25 },
          ],
        },
      };
    }

    case "dua_kolom":
      return { doc, block: { id, type: "columns", ratios: [1, 1], children: [[], []] } };
    case "garis":
      return { doc, block: { id, type: "divider", style: "single" } };
    case "spasi":
      return { doc, block: { id, type: "spacer", heightMm: 5 } };
    case "halaman_baru":
      return { doc, block: { id, type: "pageBreak" } };
    case "gambar":
      // Alamat gambar tidak boleh kosong menurut skema; ini penanda yang harus diganti operator.
      return { doc, block: { id, type: "image", src: "/placeholder-gambar.png", alt: "Ganti gambar ini", widthMm: 40, align: "center" } };
    case "kode_qr":
      return { doc, block: { id, type: "qr", sizeMm: 22, align: "right" } };
  }
}

/**
 * Buat bagian dari preset (plus dependensinya) dan sisipkan. Mengembalikan dokumen baru dan id bagian.
 * Bila `at` tidak bisa dipakai (mis. kolom di dalam kolom), bagian ditaruh di akhir isi surat.
 */
export function createFromPreset(
  doc: LetterDocument,
  preset: PresetId,
  at?: InsertTarget,
  rng?: Rng,
): { doc: LetterDocument; blockId: string } {
  const blockId = newBlockId(allBlockIds(doc), rng);
  const built = build(doc, preset, blockId);
  const placed = insertBlockAt(built.doc, built.block, at);
  if (placed.ok) return { doc: placed.doc, blockId };
  const end = insertBlockAt(built.doc, built.block);
  if (!end.ok) throw new Error(end.error);
  return { doc: end.doc, blockId };
}
