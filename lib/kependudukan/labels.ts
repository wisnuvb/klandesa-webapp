/**
 * Teks dan aturan tampilan untuk halaman "Perbaikan Data KK" (murni, aman dipakai di klien).
 * Bahasa awam untuk operator desa: tanpa istilah teknis, setiap temuan menjelaskan apa yang salah dan apa yang bisa dilakukan.
 */
import type { Confidence, WorkKind } from "./worklist";

export interface PersonView {
  id: number;
  name: string;
  gender: string;
  familyRole: string;
  kk: string | null;
  birthDate: string;
  rt: string | null;
  rw: string | null;
  status: "aktif" | "meninggal" | "pindah";
}

export interface TargetKkView {
  last4: string;
  memberCount: number;
  headName: string | null;
  memberNames: string[];
}

export type SuggestionView = (
  | { type: "SET_KK"; kk: string }
  | { type: "SET_HEAD" }
  | { type: "KEEP_HEAD" }
  | { type: "SET_ROLE"; role: string }
) & {
  residentId: number;
  reason: string;
  confidence: Confidence;
  person: PersonView;
  targetKk?: TargetKkView;
};

export interface WorkItemView {
  id: string;
  kind: WorkKind;
  kk: string | null;
  residents: PersonView[];
  members?: PersonView[];
  suggestions: SuggestionView[];
}

export interface KualitasResponse {
  counts: Record<WorkKind, number>;
  total: number;
  page: number;
  limit: number;
  items: WorkItemView[];
}

export const KIND_ORDER: readonly WorkKind[] = ["INVALID_KK", "MISSING_KK", "UNKNOWN_ROLE", "NO_HEAD", "MULTIPLE_HEADS", "HEAD_NOT_ACTIVE", "SPLIT_ACROSS_RT"];

export const KIND_META: Record<WorkKind, { title: string; short: string; help: string }> = {
  INVALID_KK: {
    title: "Nomor KK tidak lengkap",
    short: "KK tidak lengkap",
    help: "Nomor KK harus 16 angka. Biasanya kurang satu angka karena salah ketik. Cocokkan dengan kartu keluarga asli.",
  },
  MISSING_KK: {
    title: "Belum ada nomor KK",
    short: "Belum ada KK",
    help: "Warga ini belum masuk ke keluarga mana pun. Pilih KK yang tepat, atau isi nomor KK lewat Data Warga.",
  },
  UNKNOWN_ROLE: {
    title: "Hubungan keluarga tidak baku",
    short: "Hubungan tidak baku",
    help: 'Isian hubungan dalam keluarga tidak dikenal sistem (misalnya "KKKK" atau kosong). Pilih yang sesuai, seperti Kepala Keluarga, Istri, atau Anak.',
  },
  NO_HEAD: {
    title: "KK belum punya Kepala Keluarga",
    short: "Tanpa kepala",
    help: "Sering terjadi karena anggota keluarga lain tercatat dengan nomor KK yang salah. Bereskan dulu temuan 'Nomor KK' dan 'Belum ada nomor KK', lalu lihat lagi di sini.",
  },
  MULTIPLE_HEADS: {
    title: "Ada lebih dari satu Kepala Keluarga",
    short: "Kepala ganda",
    help: "Satu KK hanya boleh punya satu Kepala Keluarga. Tentukan siapa kepalanya, lalu ubah hubungan keluarga yang lain lewat Data Warga.",
  },
  HEAD_NOT_ACTIVE: {
    title: "Kepala Keluarga sudah meninggal atau pindah",
    short: "Kepala tidak aktif",
    help: "Anggota keluarga lain masih tinggal di desa. Tunjuk Kepala Keluarga yang baru.",
  },
  SPLIT_ACROSS_RT: {
    title: "Anggota satu KK tinggal di RT/RW berbeda",
    short: "Beda RT/RW",
    help: "Periksa alamat tiap anggota. Bisa jadi ada yang sudah pindah rumah, atau salah isi RT/RW.",
  },
};

export const CONFIDENCE_META: Record<Confidence, { label: string; hint: string }> = {
  TINGGI: { label: "Yakin", hint: "Data pendukungnya jelas dan tidak menimbulkan masalah baru." },
  SEDANG: { label: "Perlu dicek", hint: "Masuk akal, tetapi periksa dulu sebelum diterapkan." },
  RENDAH: { label: "Kurang yakin", hint: "Hanya perkiraan. Pastikan dengan dokumen asli." },
};

export const roleLabel = (r: string): string => (r.trim() ? r : "(kosong)");

/** Saran yang bisa diterapkan dengan satu klik (KEEP_HEAD hanya penjelasan). */
export function isApplicable(s: SuggestionView): boolean {
  return s.type === "SET_KK" || s.type === "SET_HEAD" || s.type === "SET_ROLE";
}

export function suggestionTitle(s: SuggestionView): string {
  switch (s.type) {
    case "SET_KK":
      return `Masukkan ke KK berakhiran ${s.targetKk?.last4 ?? s.kk.slice(-4)}`;
    case "SET_HEAD":
      return `Jadikan ${s.person.name} Kepala Keluarga`;
    case "SET_ROLE":
      return `Ubah hubungan keluarga menjadi "${s.role}"`;
    case "KEEP_HEAD":
      return `Pertahankan ${s.person.name} sebagai Kepala Keluarga`;
  }
}

/** Ringkasan KK tujuan: "Kepala: Budi, 4 anggota". */
export function targetSummary(t: TargetKkView | undefined): string | null {
  if (!t) return null;
  const head = t.headName ? `Kepala: ${t.headName}` : "Belum ada kepala";
  return `${head} · ${t.memberCount} anggota`;
}

/** Perubahan yang dikirim ke PATCH /api/residents/[id] dan kebalikannya untuk "Urungkan". Null = tidak bisa diterapkan. */
export function suggestionPatch(s: SuggestionView): { apply: Record<string, string>; undo: Record<string, string> } | null {
  switch (s.type) {
    case "SET_KK":
      return { apply: { kk: s.kk }, undo: { kk: s.person.kk ?? "" } };
    case "SET_HEAD":
      return { apply: { familyRole: "Kepala Keluarga" }, undo: { familyRole: s.person.familyRole } };
    case "SET_ROLE":
      return { apply: { familyRole: s.role }, undo: { familyRole: s.person.familyRole } };
    case "KEEP_HEAD":
      return null;
  }
}

/** Layak diterapkan massal: saran terbaik yakin dan bisa diterapkan. */
export function isBulkSafe(item: WorkItemView): boolean {
  const top = item.suggestions[0];
  return Boolean(top && top.confidence === "TINGGI" && isApplicable(top));
}

/** Kalimat hasil setelah penerapan massal, untuk pengumuman pembaca layar dan toast. */
export function bulkResultMessage(done: number, failed: number): string {
  if (failed === 0) return `${done} perbaikan diterapkan.`;
  if (done === 0) return `Tidak ada perbaikan yang berhasil (${failed} gagal). Coba lagi atau perbaiki lewat Data Warga.`;
  return `${done} perbaikan diterapkan, ${failed} gagal. Yang gagal masih ada di daftar.`;
}
