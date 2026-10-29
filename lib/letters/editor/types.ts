/**
 * Kontrak editor kanvas template surat. Logika murni (tanpa React) ada di `ops.ts`,
 * status + riwayat undo/redo di `useDocumentEditor.ts`; komponen kanvas, panel, dan
 * halaman editor hanya memakai antarmuka `EditorApi` ini.
 */
import type {
  Block,
  CustomField,
  Group,
  LetterDocument,
  PersonRole,
} from "../document/schema";
import type { FieldType } from "../registry";

/** Tujuan penyisipan/pemindahan. Bila kosong: akhir isi surat. Blok dialamatkan lewat `id` (unik di seluruh dokumen). */
export type InsertTarget =
  | { before: string }
  | { after: string }
  | { container: string; column?: number; index?: number };

/** Jenis bagian yang bisa ditambahkan operator, dengan bahasa awam. */
export type PresetId =
  | "paragraf" | "judul" | "judul_surat" | "kepala_surat" | "data_orang" | "daftar_berulang"
  | "tabel" | "daftar_butir" | "menimbang" | "mengingat" | "menetapkan" | "diktum"
  | "tanda_tangan_kades" | "tanda_tangan_an_sekdes" | "tanda_tangan_mengetahui" | "tanda_tangan_pemohon_saksi"
  | "dua_kolom" | "bersyarat" | "garis" | "spasi" | "halaman_baru" | "gambar" | "kode_qr" | "tembusan";

export type PresetCategory = "teks" | "data" | "tanda_tangan" | "tata_letak" | "lainnya";

export type BlockPreset = {
  id: PresetId;
  label: string;
  description: string;
  category: PresetCategory;
  /** Nama ikon lucide-react (PascalCase), mis. "Type". */
  icon: string;
};

/** Hasil operasi yang bisa gagal/ditolak (mis. menghapus orang yang masih dipakai). */
export type OpResult = { ok: true } | { ok: false; error: string };

/** Pemakaian suatu peran/isian/daftar di kertas, untuk peringatan sebelum menghapus. */
export type Usage = { count: number; blockIds: string[] };

export type EditorIssue = { path: string; message: string; blockId?: string };

export interface EditorApi {
  doc: LetterDocument;
  selectedId: string | null;
  select(id: string | null): void;

  // ---- riwayat
  canUndo: boolean;
  canRedo: boolean;
  undo(): void;
  redo(): void;
  /** true bila isi berbeda dari titik `markSaved()` terakhir. */
  dirty: boolean;
  markSaved(): void;
  /** Naik tiap kali dokumen berubah; dipakai autosave. */
  revision: number;

  // ---- bagian (blok)
  /** Buat dari preset (membuat peran/isian/daftar yang dibutuhkan bila belum ada) dan pilih. Mengembalikan id baru. */
  addBlock(preset: PresetId, at?: InsertTarget): string;
  insertBlock(block: Block, at?: InsertTarget): void;
  updateBlock(id: string, patch: Partial<Block> | ((b: Block) => Block)): void;
  moveBlock(id: string, to: InsertTarget): OpResult;
  /** Pengganti drag untuk keyboard/tombol: naik/turun satu posisi dalam wadahnya. */
  moveBlockBy(id: string, delta: -1 | 1): OpResult;
  duplicateBlock(id: string): string | null;
  removeBlock(id: string): void;

  // ---- halaman, penomoran, meta
  setPage(patch: Partial<LetterDocument["page"]>): void;
  setNumbering(patch: Partial<LetterDocument["numbering"]>): void;
  setMeta(patch: Partial<Pick<LetterDocument, "kind" | "audience" | "letterhead">>): void;

  // ---- orang berperan, isian tambahan, daftar berulang
  addPerson(label: string, opts?: Partial<Omit<PersonRole, "id" | "label">>): string;
  updatePerson(id: string, patch: Partial<Omit<PersonRole, "id">>): void;
  personUsage(id: string): Usage;
  removePerson(id: string): OpResult;

  addField(label: string, type?: FieldType, opts?: Partial<Omit<CustomField, "id" | "label" | "type">>): string;
  updateField(id: string, patch: Partial<Omit<CustomField, "id">>): void;
  fieldUsage(id: string): Usage;
  removeField(id: string): OpResult;

  addGroup(label: string, opts?: Partial<Omit<Group, "id" | "label" | "fields">> & { fields?: CustomField[] }): string;
  updateGroup(id: string, patch: Partial<Omit<Group, "id">>): void;
  groupUsage(id: string): Usage;
  removeGroup(id: string): OpResult;

  /** Ganti seluruh dokumen (mis. memilih contoh); masuk riwayat sehingga bisa di-undo. */
  replaceDocument(doc: LetterDocument): void;

  /** Hasil validasi + saran terbaru. `issues` = kesalahan yang menghalangi simpan; `hints` = saran ramah. */
  issues: EditorIssue[];
  hints: Array<{ code: string; message: string; blockId?: string }>;
}
