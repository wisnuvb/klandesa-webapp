/**
 * Contoh pertanyaan untuk Laras di layar sambutan. Setiap tampilan mengacak beberapa butir dari
 * kategori yang berbeda, sehingga pengguna melihat ragam kemampuan Laras (bukan itu-itu saja).
 */

export const SUGGESTION_CATEGORIES = {
  layanan: "Layanan warga",
  sdgs: "SDGs",
  perencanaan: "Perencanaan",
  program: "Program desa",
  kependudukan: "Kependudukan",
  prioritas: "Prioritas harian",
  keuangan: "Keuangan & aset",
  lingkungan: "Kesehatan & lingkungan",
  ekonomi: "Ekonomi desa",
} as const;

export type SuggestionCategory = keyof typeof SUGGESTION_CATEGORIES;

export type Suggestion = { category: SuggestionCategory; text: string };

/** Setiap kategori minimal 2 butir agar "contoh lain" selalu bisa menawarkan pertanyaan berbeda. */
export const SUGGESTION_POOL: readonly Suggestion[] = [
  { category: "layanan", text: "Bagaimana cara mengajukan surat keterangan domisili?" },
  { category: "layanan", text: "Siapa yang berhak mendaftar program bansos desa?" },
  { category: "layanan", text: "Apa saja syarat membuat surat keterangan tidak mampu (SKTM)?" },
  { category: "layanan", text: "Bagaimana alur warga menyampaikan pengaduan ke desa?" },

  { category: "sdgs", text: "Goal SDGs mana yang paling perlu intervensi di desa kami?" },
  { category: "sdgs", text: "Ringkas kondisi SDGs desa dan 3 prioritas tindakan." },
  { category: "sdgs", text: "Goal SDGs mana yang skornya paling rendah dan apa penyebab utamanya?" },

  { category: "perencanaan", text: "Buat draf visi-misi RPJMDes 5 tahun selaras SDGs." },
  { category: "perencanaan", text: "Tuliskan program prioritas infrastruktur untuk RPJMDes." },
  { category: "perencanaan", text: "Bagaimana status usulan Musdes yang belum ditinjau?" },

  { category: "program", text: "Rekomendasikan program PKK untuk menurunkan stunting." },
  { category: "program", text: "Program BUMDes apa yang cocok untuk goal SDGs 8?" },
  { category: "program", text: "Program apa yang bisa meningkatkan pendapatan petani di desa kami?" },

  { category: "kependudukan", text: "Berapa jumlah penduduk per kelompok usia di desa kami?" },
  { category: "kependudukan", text: "Bagaimana kualitas data Kartu Keluarga di desa kami?" },
  { category: "kependudukan", text: "Bagaimana gambaran mutasi penduduk (lahir, meninggal, pindah) bulan ini?" },

  { category: "prioritas", text: "Apa yang perlu diprioritaskan di desa minggu ini?" },
  { category: "prioritas", text: "Berapa permohonan surat yang masih menunggu diproses?" },
  { category: "prioritas", text: "Pengaduan warga apa saja yang belum ditindaklanjuti?" },
  { category: "prioritas", text: "Bantu susun pengumuman kerja bakti untuk warga." },

  { category: "keuangan", text: "Bagaimana realisasi anggaran desa saat ini?" },
  { category: "keuangan", text: "Proyek infrastruktur mana yang sudah lewat target waktu?" },
  { category: "keuangan", text: "Bagaimana kondisi iuran warga yang masih menunggak?" },

  { category: "lingkungan", text: "Titik rawan bencana mana yang perlu diprioritaskan?" },
  { category: "lingkungan", text: "Bagaimana kondisi layanan Posyandu bulan ini?" },

  { category: "ekonomi", text: "Bagaimana kondisi lahan dan siklus tanam di desa kami?" },
  { category: "ekonomi", text: "Bagaimana kinerja BUMDes dan koperasi desa?" },
];

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pilih `count` contoh dari kategori yang berbeda. `exclude` (teks yang baru tampil) dihindari bila
 * kategorinya masih punya pilihan lain, supaya "contoh lain" benar-benar berganti.
 */
export function pickSuggestions(
  opts: { count?: number; rng?: () => number; exclude?: readonly string[] } = {},
): Suggestion[] {
  const { count = 4, rng = Math.random, exclude = [] } = opts;
  const categories = Object.keys(SUGGESTION_CATEGORIES) as SuggestionCategory[];
  const out: Suggestion[] = [];
  for (const category of shuffled(categories, rng)) {
    if (out.length >= count) break;
    const inCategory = SUGGESTION_POOL.filter((s) => s.category === category);
    if (inCategory.length === 0) continue;
    const fresh = inCategory.filter((s) => !exclude.includes(s.text));
    const candidates = fresh.length > 0 ? fresh : inCategory;
    out.push(candidates[Math.floor(rng() * candidates.length)]);
  }
  return out;
}
