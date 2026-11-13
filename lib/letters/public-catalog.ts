/**
 * Katalog surat untuk halaman publik "Contoh Surat" (SEO). Bahan utamanya katalog bawaan aplikasi,
 * jadi contoh yang tampil identik dengan surat yang dihasilkan Klandesa.
 *
 * PAGAR INDEKS: sebuah halaman contoh surat hanya diindeks Google (dan masuk sitemap) bila
 * `catalogKey`-nya ada di `REVIEWED_LETTER_KEYS` DAN punya naskah di `LETTER_GUIDES`. Tanpa itu halaman
 * tetap bisa dibuka tetapi `noindex`. Tambahkan kunci HANYA setelah format dan naskahnya diperiksa
 * orang yang paham administrasi desa; persyaratan surat berbeda antar desa/kabupaten.
 */
import { getCatalogV2, type CatalogCategory, type CatalogEntry } from "./catalog";
import { deriveFormSpec } from "./document/form-spec";
import type { LetterDocument } from "./document/schema";
import { validateDocument } from "./document/validate";
import { PERSON_FIELDS } from "./registry";
import { sampleLetterValues, type LetterValues } from "./values";

export type LetterGuide = {
  /** 1–2 kalimat pembuka: fungsi surat. Jadi deskripsi halaman. */
  intro: string;
  /** Situasi umum surat ini dipakai. */
  kapanDipakai: string[];
  /** Hal yang perlu diperhatikan saat mengisi. */
  tips: string[];
};

/** Naskah per surat. Kunci = catalogKey. Belum tentu sudah ditinjau: lihat REVIEWED_LETTER_KEYS. */
export const LETTER_GUIDES: Record<string, LetterGuide> = {
  cat_sk_domisili: {
    intro:
      "Surat Keterangan Domisili menerangkan bahwa seseorang benar bertempat tinggal di wilayah desa berdasarkan data dan catatan desa.",
    kapanDipakai: [
      "Melengkapi persyaratan administrasi di instansi lain yang meminta bukti tempat tinggal",
      "Pendaftaran sekolah, melamar pekerjaan, atau pengurusan layanan yang mensyaratkan domisili",
    ],
    tips: [
      "Samakan alamat dengan data di Kartu Keluarga dan data kependudukan desa",
      "Tulis keperluan dengan jelas agar surat tidak dipakai di luar tujuannya",
    ],
  },
  cat_sk_sktm: {
    intro:
      "Surat Keterangan Tidak Mampu (SKTM) adalah keterangan dari pemerintah desa tentang kondisi ekonomi warga, biasanya untuk pengajuan bantuan sosial atau keringanan biaya sekolah.",
    kapanDipakai: [
      "Pengajuan bantuan sosial atau keringanan biaya pendidikan",
      "Keperluan administrasi lain yang meminta bukti kondisi ekonomi keluarga",
    ],
    tips: [
      "Pastikan kondisi ekonomi sudah diverifikasi oleh perangkat desa sebelum surat diterbitkan",
      "Ketentuan penerimaan SKTM berbeda per instansi dan daerah; ikuti aturan yang berlaku",
    ],
  },
  cat_sk_penghasilan: {
    intro:
      "Surat Keterangan Penghasilan menerangkan perkiraan penghasilan warga yang tidak memiliki slip gaji resmi, misalnya petani, pedagang kecil, atau pekerja lepas.",
    kapanDipakai: [
      "Pengajuan beasiswa atau keringanan biaya pendidikan",
      "Persyaratan pembiayaan atau layanan yang meminta keterangan penghasilan",
    ],
    tips: [
      "Cantumkan angka penghasilan yang wajar dan dapat dipertanggungjawabkan",
      "Sebutkan sumber penghasilan agar keterangan lebih jelas",
    ],
  },
  cat_sk_usaha: {
    intro:
      "Surat Keterangan Usaha menerangkan bahwa warga menjalankan usaha tertentu di wilayah desa, sebagai dokumen pendukung administrasi usaha kecil.",
    kapanDipakai: [
      "Pengajuan pembiayaan atau bantuan untuk usaha kecil",
      "Pelengkap dokumen perizinan atau pendaftaran usaha mikro",
    ],
    tips: [
      "Tulis jenis usaha, alamat usaha, dan lama usaha dengan benar",
      "Pastikan usaha benar-benar berjalan sebelum surat diterbitkan",
    ],
  },
  cat_sk_berkelakuan_baik: {
    intro:
      "Surat Keterangan Kelakuan Baik menerangkan bahwa warga dikenal berkelakuan baik di lingkungan desa menurut pengetahuan pemerintah desa.",
    kapanDipakai: [
      "Pelengkap persyaratan melamar pekerjaan atau pendaftaran tertentu",
      "Pengantar pengurusan dokumen lanjutan di instansi lain",
    ],
    tips: [
      "Surat ini berbeda dengan SKCK dari kepolisian; jangan menggantikannya",
      "Pastikan perangkat desa mengenal pemohon sebelum menandatangani",
    ],
  },
  cat_sk_belum_bekerja: {
    intro:
      "Surat Keterangan Belum atau Tidak Bekerja menerangkan bahwa warga saat ini belum atau tidak memiliki pekerjaan tetap.",
    kapanDipakai: [
      "Pendaftaran program atau bantuan yang mensyaratkan status pekerjaan",
      "Pelengkap administrasi pendidikan atau pelatihan",
    ],
    tips: [
      "Cocokkan status pekerjaan dengan data kependudukan desa",
      "Tulis keperluan penggunaan surat dengan jelas",
    ],
  },
  cat_sk_kehilangan: {
    intro:
      "Surat Keterangan Kehilangan dibuat desa sebagai pengantar saat warga kehilangan dokumen atau barang dan hendak melapor ke instansi berwenang.",
    kapanDipakai: [
      "Pengantar pelaporan kehilangan ke kepolisian",
      "Pelengkap pengurusan penggantian dokumen yang hilang",
    ],
    tips: [
      "Catat waktu dan lokasi kehilangan sejelas mungkin",
      "Sebutkan nomor atau ciri dokumen bila diketahui",
    ],
  },
};

/**
 * Kunci surat yang SUDAH ditinjau pemilik/ahli administrasi desa dan boleh diindeks.
 * Kosong secara bawaan: semua halaman contoh surat `noindex` sampai ada peninjauan.
 */
export const REVIEWED_LETTER_KEYS: ReadonlySet<string> = new Set<string>([]);

export type LetterFieldSummary = {
  /** Data warga yang diisi, per peran (mis. Pemohon). */
  people: Array<{ role: string; fields: string[] }>;
  /** Isian tambahan yang ditanyakan. */
  isian: string[];
  /** Daftar berulang (mis. saksi). */
  groups: string[];
};

export type PublicLetter = {
  catalogKey: string;
  slug: string;
  name: string;
  description: string;
  category: CatalogCategory;
  doc: LetterDocument;
  summary: LetterFieldSummary;
  guide: LetterGuide | null;
  /** Boleh diindeks dan masuk sitemap. */
  indexable: boolean;
};

/** Slug dari nama: teks dalam kurung dibuang, huruf kecil, tanda hubung. */
export function letterSlug(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const PERSON_LABEL = new Map<string, string>(PERSON_FIELDS.map((f) => [f.key, f.label]));

function summarize(doc: LetterDocument): LetterFieldSummary {
  const spec = deriveFormSpec(doc);
  return {
    people: spec.people
      .filter((p) => p.fields.length > 0)
      .map((p) => ({ role: p.label, fields: p.fields.map((k) => PERSON_LABEL.get(k) ?? k) })),
    isian: spec.fields.map((f) => f.label),
    groups: spec.groups.map((g) => g.label),
  };
}

let cache: PublicLetter[] | null = null;

/** Semua surat katalog, urutan sama dengan galeri aplikasi. Dokumen yang tidak valid dilewati. */
export function listPublicLetters(): PublicLetter[] {
  if (cache) return cache;
  const out: PublicLetter[] = [];
  for (const e of getCatalogV2() as CatalogEntry[]) {
    const v = validateDocument(e.document);
    if (!v.ok) continue;
    const guide = LETTER_GUIDES[e.catalogKey] ?? null;
    out.push({
      catalogKey: e.catalogKey,
      slug: letterSlug(e.name),
      name: e.name,
      description: e.description,
      category: e.category,
      doc: v.doc,
      summary: summarize(v.doc),
      guide,
      indexable: guide !== null && REVIEWED_LETTER_KEYS.has(e.catalogKey),
    });
  }
  cache = out;
  return out;
}

export function getPublicLetter(slug: string): PublicLetter | null {
  return listPublicLetters().find((l) => l.slug === slug) ?? null;
}

/** Hub /contoh-surat diindeks hanya bila minimal satu surat sudah boleh diindeks. */
export function isLetterHubIndexable(): boolean {
  return listPublicLetters().some((l) => l.indexable);
}

/** Path untuk sitemap: hub + surat yang boleh diindeks. */
export function listIndexableLetterPaths(): string[] {
  const letters = listPublicLetters().filter((l) => l.indexable);
  if (letters.length === 0) return [];
  return ["/contoh-surat", ...letters.map((l) => `/contoh-surat/${l.slug}`)];
}

/**
 * Isian contoh untuk halaman publik. Nama desa/wilayah diganti "Contoh" agar kop tidak
 * menampilkan desa sungguhan; data warga memakai contoh fiktif bawaan registri.
 */
export function publicSampleValues(doc: LetterDocument): LetterValues {
  const v = sampleLetterValues(doc);
  v.desa = {
    ...v.desa,
    nama: "Contoh",
    kecamatan: "Contoh",
    kabupaten: "Contoh",
    provinsi: "Contoh",
    alamat: "Jl. Contoh No. 1",
    kode_pos: "12345",
    telepon: "(000) 000000",
  };
  v.surat = { ...v.surat, tempat: "Contoh" };
  return v;
}
