/**
 * Laporan Kepala Desa menurut Permendagri 46/2016 (Berita Negara 2016 No. 1099): LPPD akhir tahun anggaran (Pasal 3), LPPD akhir
 * masa jabatan (Pasal 5-6), dan Laporan Keterangan Penyelenggaraan Pemerintahan Desa / LKPPD (Pasal 8). Murni, aman dipakai klien.
 * Susunan bagian mengikuti pasalnya; isi naratif ditulis petugas, angka diisi otomatis dari APB Desa, Buku Kas Umum, dan data warga.
 */

export const KINDS = {
  LPPD_TAHUN: "LPPD Akhir Tahun Anggaran",
  LKPPD: "Laporan Keterangan Penyelenggaraan Pemerintahan Desa (LKPPD)",
  LPPD_JABATAN: "LPPD Akhir Masa Jabatan",
} as const;
export type ReportKind = keyof typeof KINDS;
export const isReportKind = (v: unknown): v is ReportKind => typeof v === "string" && v in KINDS;

export const KIND_INFO: Record<ReportKind, { to: string; basis: string }> = {
  LPPD_TAHUN: { to: "Bupati/Wali Kota melalui camat", basis: "Pasal 3: tertulis, paling lambat 3 bulan setelah berakhirnya tahun anggaran (31 Maret). Digunakan sebagai bahan evaluasi." },
  LKPPD: { to: "Badan Permusyawaratan Desa (BPD)", basis: "Pasal 8: tertulis, paling lambat 3 bulan setelah tahun anggaran berakhir (31 Maret). BPD dapat membuat catatan kinerja, meminta keterangan, menyatakan pendapat, dan memberi masukan untuk musyawarah desa (Pasal 9)." },
  LPPD_JABATAN: { to: "Bupati/Wali Kota melalui camat", basis: "Pasal 5-6: tertulis, paling lambat 5 bulan sebelum akhir masa jabatan; memuat laporan selama masa jabatan dan rencana kegiatan 5 bulan sisa masa jabatan, yang menjadi dasar memori serah terima jabatan." },
};

export interface SectionDef {
  id: string;
  title: string;
  group: string;
  /** Rujukan pasal dan petunjuk isi */
  hint: string;
  required: boolean;
}

const BIDANG = [
  { key: "pemerintahan", label: "Bidang Penyelenggaraan Pemerintahan" },
  { key: "pembangunan", label: "Bidang Pelaksanaan Pembangunan" },
  { key: "kemasyarakatan", label: "Bidang Pembinaan Kemasyarakatan" },
  { key: "pemberdayaan", label: "Bidang Pemberdayaan Masyarakat" },
] as const;

export const LPPD_TAHUN_SECTIONS: SectionDef[] = [
  { id: "tujuan", title: "Tujuan penyusunan laporan", group: "A. Pendahuluan", hint: "Pasal 3 ayat 3 huruf a.", required: true },
  { id: "visi_misi", title: "Visi dan misi penyelenggaraan pemerintahan desa", group: "A. Pendahuluan", hint: "Pasal 3 ayat 3 huruf b. Bila RPJMDes aktif sudah mencantumkan visi dan misi, tombol \"Isi dari RPJMDes\" menyalinnya.", required: true },
  { id: "strategi", title: "Strategi dan kebijakan", group: "A. Pendahuluan", hint: "Pasal 3 ayat 3 huruf c.", required: true },
  { id: "program_pemerintahan", title: "Program kerja penyelenggaraan pemerintahan desa", group: "B. Program kerja", hint: "Pasal 3 ayat 4: rencana dan pelaksanaan program kerja bidang pemerintahan desa, mengacu RKPDes dan RPJMDes.", required: true },
  { id: "program_pembangunan", title: "Program kerja pelaksanaan pembangunan", group: "C. Program kerja", hint: "Pasal 3 ayat 5: perencanaan dan pelaksanaan program kerja bidang pembangunan.", required: true },
  { id: "program_kemasyarakatan", title: "Program kerja pembinaan kemasyarakatan", group: "D. Program kerja", hint: "Pasal 3 ayat 6.", required: true },
  { id: "program_pemberdayaan", title: "Program kerja pemberdayaan masyarakat", group: "E. Program kerja", hint: "Pasal 3 ayat 7.", required: true },
  { id: "perdes_lpj", title: "Peraturan Desa tentang pertanggungjawaban pelaksanaan APB Desa", group: "F. Pelaksanaan APB Desa", hint: "Pasal 3 ayat 8 huruf b: nomor dan tanggal Peraturan Desa (Perdes APB Desa terisi otomatis dari data APB Desa). Rincian APB Desa dilampirkan otomatis.", required: false },
  ...BIDANG.flatMap((b) => [
    { id: `berhasil_${b.key}`, title: `${b.label}: keberhasilan yang dicapai`, group: "G. Keberhasilan, permasalahan, dan upaya", hint: "Pasal 3 ayat 9.", required: true },
    { id: `masalah_${b.key}`, title: `${b.label}: permasalahan yang dihadapi`, group: "G. Keberhasilan, permasalahan, dan upaya", hint: "Pasal 3 ayat 9.", required: true },
    { id: `upaya_${b.key}`, title: `${b.label}: upaya yang ditempuh`, group: "G. Keberhasilan, permasalahan, dan upaya", hint: "Pasal 3 ayat 9.", required: true },
  ]),
  { id: "kesimpulan", title: "Kesimpulan laporan", group: "H. Penutup", hint: "Pasal 3 ayat 10 huruf a.", required: true },
  { id: "terima_kasih", title: "Ucapan terima kasih", group: "H. Penutup", hint: "Pasal 3 ayat 10 huruf b.", required: false },
  { id: "saran", title: "Saran dan permohonan petunjuk serta arahan lebih lanjut", group: "H. Penutup", hint: "Pasal 3 ayat 10 huruf c.", required: true },
];

export const LKPPD_SECTIONS: SectionDef[] = [
  { id: "langkah_kebijakan", title: "Langkah-langkah kebijakan dalam pelaksanaan Peraturan Desa, khususnya yang berhubungan dengan pelaksanaan APB Desa", group: "Materi laporan", hint: "Pasal 8 ayat 2. Rincian pelaksanaan APB Desa dilampirkan otomatis.", required: true },
  { id: "catatan_lain", title: "Keterangan tambahan", group: "Materi laporan", hint: "Opsional.", required: false },
];

export const LPPD_JABATAN_SECTIONS: SectionDef[] = [
  { id: "laporan_masa_jabatan", title: "Laporan penyelenggaraan pemerintahan desa selama masa jabatan", group: "Materi laporan", hint: "Pasal 6 ayat 1 huruf a: uraikan lima bidang (pemerintahan, pembangunan, pembinaan kemasyarakatan, pemberdayaan, dan pelaksanaan APB Desa) sepanjang masa jabatan.", required: true },
  { id: "rencana_lima_bulan", title: "Rencana kegiatan dalam kurun 5 bulan sisa masa jabatan", group: "Materi laporan", hint: "Pasal 6 ayat 1 huruf b; dijadikan dasar penyusunan memori serah terima jabatan (ayat 2).", required: true },
];

export const SECTIONS: Record<ReportKind, SectionDef[]> = { LPPD_TAHUN: LPPD_TAHUN_SECTIONS, LKPPD: LKPPD_SECTIONS, LPPD_JABATAN: LPPD_JABATAN_SECTIONS };

/** Kunci pengaturan (bukan bagian naratif) yang disimpan bersama bagian. */
export const META_KEYS = ["masa_jabatan_berakhir"] as const;

export const LIMITS = { sectionChars: 20000, reportsPerVillage: 200 } as const;

/** Tenggat laporan: akhir tahun anggaran dan LKPPD 3 bulan setelah akhir tahun (31 Maret tahun berikutnya); akhir masa jabatan 5 bulan sebelum berakhir. */
export function deadlineOf(kind: ReportKind, year: number, termEnd: string | null): string | null {
  if (kind === "LPPD_JABATAN") {
    if (!termEnd || !/^\d{4}-\d{2}-\d{2}$/.test(termEnd)) return null;
    const [y, m, d] = termEnd.split("-").map(Number) as [number, number, number];
    const t = new Date(Date.UTC(y, m - 1 - 5, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10);
  }
  return `${year + 1}-03-31`;
}
