import {
  CATEGORIES,
  CONDITIONS,
  DISPOSAL_REASONS,
  isCategory,
  LIMITS,
  ORIGINS,
  type CategoryKey,
  type Condition,
  type DisposalReason,
  type Origin,
} from "./catalog";

export interface ItemInput {
  name: string;
  category: CategoryKey;
  itemCode: string | null;
  identity: string | null;
  quantity: number;
  origin: Origin;
  acquiredYear: number;
  acquiredAt: Date | null;
  /** Rupiah utuh sebagai string desimal untuk Prisma (hindari float). */
  acquisitionValue: string | null;
  condition: Condition;
  location: string | null;
  notes: string | null;
  mapAssetId: number | null;
}

export interface DisposalInput {
  disposedAt: Date;
  reason: DisposalReason;
  decree: string;
  note: string | null;
  /** Aset strategis: wajib menyatakan sudah ada persetujuan Bupati/Wali Kota (Pasal 22). */
  regencyApproved: boolean;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[]; fieldErrors: Record<string, string> };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function text(raw: unknown, max: number): { value: string | null; tooLong: boolean; bad: boolean } {
  if (raw === undefined || raw === null) return { value: null, tooLong: false, bad: false };
  if (typeof raw !== "string") return { value: null, tooLong: false, bad: true };
  const v = raw.replace(/\s+/g, " ").trim();
  if (!v) return { value: null, tooLong: false, bad: false };
  return { value: v, tooLong: v.length > max, bad: false };
}

/** Tanggal "YYYY-MM-DD" yang benar-benar ada di kalender, disimpan sebagai tengah malam UTC (kolom DATE). */
export function parseIsoDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? null : d;
}

function money(raw: unknown): { value: string | null; bad: boolean } {
  if (raw === undefined || raw === null || raw === "") return { value: null, bad: false };
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,15}(\.\d{1,2})?$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > LIMITS.maxValue) return { value: null, bad: true };
  return { value: n.toFixed(2), bad: false };
}

export function parseItemInput(body: unknown, now: Date = new Date()): Parsed<ItemInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };

  const name = text(body.name, 200);
  if (name.bad || !name.value) fe.name = "Isi jenis atau nama barang.";
  else if (name.tooLong) fe.name = "Nama barang maksimal 200 karakter.";

  const category = isCategory(body.category) ? body.category : null;
  if (!category) fe.category = "Pilih golongan barang.";

  const origin = typeof body.origin === "string" && (ORIGINS as string[]).includes(body.origin) ? (body.origin as Origin) : null;
  if (!origin) fe.origin = "Pilih asal usul barang.";

  const condition = body.condition === undefined || body.condition === null || body.condition === "" ? "BAIK" : body.condition;
  if (typeof condition !== "string" || !(CONDITIONS as string[]).includes(condition)) fe.condition = "Pilih kondisi barang.";

  const quantityRaw = body.quantity === undefined || body.quantity === null || body.quantity === "" ? 1 : Number(body.quantity);
  if (!Number.isInteger(quantityRaw) || quantityRaw < 1 || quantityRaw > LIMITS.maxQuantity) fe.quantity = "Jumlah harus bilangan bulat, minimal 1.";

  const thisYear = now.getUTCFullYear();
  const yearRaw = Number(body.acquiredYear);
  if (!Number.isInteger(yearRaw) || yearRaw < 1900 || yearRaw > thisYear) fe.acquiredYear = `Tahun perolehan antara 1900 dan ${thisYear}.`;

  let acquiredAt: Date | null = null;
  if (body.acquiredAt !== undefined && body.acquiredAt !== null && body.acquiredAt !== "") {
    acquiredAt = parseIsoDate(body.acquiredAt);
    if (!acquiredAt) fe.acquiredAt = "Tanggal tidak valid.";
    else if (acquiredAt.getTime() > now.getTime() + 86_400_000) fe.acquiredAt = "Tanggal perolehan tidak boleh di masa depan.";
    else if (!fe.acquiredYear && acquiredAt.getUTCFullYear() !== yearRaw) fe.acquiredAt = "Tanggal tidak sesuai dengan tahun perolehan.";
  }

  const value = money(body.acquisitionValue);
  if (value.bad) fe.acquisitionValue = "Nilai harus berupa angka rupiah, tidak negatif.";

  const itemCode = text(body.itemCode, 60);
  if (itemCode.bad || itemCode.tooLong) fe.itemCode = "Kode barang maksimal 60 karakter.";
  const identity = text(body.identity, 255);
  if (identity.bad || identity.tooLong) fe.identity = "Merk/tipe/ukuran maksimal 255 karakter.";
  const location = text(body.location, 255);
  if (location.bad || location.tooLong) fe.location = "Lokasi maksimal 255 karakter.";
  const notes = text(body.notes, 1000);
  if (notes.bad || notes.tooLong) fe.notes = "Keterangan maksimal 1000 karakter.";

  let mapAssetId: number | null = null;
  if (body.mapAssetId !== undefined && body.mapAssetId !== null && body.mapAssetId !== "") {
    const n = Number(body.mapAssetId);
    if (!Number.isInteger(n) || n < 1) fe.mapAssetId = "Titik peta tidak valid.";
    else mapAssetId = n;
  }

  // Kekayaan asli desa harus berasal dari "ASLI_DESA", dan sebaliknya (kolom 7 buku inventaris).
  if (category && origin) {
    const asli = isAsli(category);
    if (asli && origin !== "ASLI_DESA") fe.origin = "Barang golongan kekayaan asli desa berasal dari \"Kekayaan asli desa\".";
    if (!asli && origin === "ASLI_DESA") fe.origin = "Asal \"Kekayaan asli desa\" hanya untuk golongan kekayaan asli desa.";
  }

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return {
    ok: true,
    value: {
      name: name.value as string,
      category: category as CategoryKey,
      itemCode: itemCode.value,
      identity: identity.value,
      quantity: quantityRaw,
      origin: origin as Origin,
      acquiredYear: yearRaw,
      acquiredAt,
      acquisitionValue: value.value,
      condition: condition as Condition,
      location: location.value,
      notes: notes.value,
      mapAssetId,
    },
  };
}

function isAsli(category: CategoryKey): boolean {
  return CATEGORIES[category].group === "ASLI";
}

export function parseDisposalInput(body: unknown, category: string, now: Date = new Date()): Parsed<DisposalInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };

  const reason = typeof body.reason === "string" && (DISPOSAL_REASONS as string[]).includes(body.reason) ? (body.reason as DisposalReason) : null;
  if (!reason) fe.reason = "Pilih alasan penghapusan.";

  const disposedAt = parseIsoDate(body.disposedAt);
  if (!disposedAt) fe.disposedAt = "Isi tanggal keputusan penghapusan.";
  else if (disposedAt.getTime() > now.getTime() + 86_400_000) fe.disposedAt = "Tanggal tidak boleh di masa depan.";

  const decree = text(body.decree, 100);
  if (decree.bad || !decree.value) fe.decree = "Isi nomor Keputusan Kepala Desa tentang penghapusan (Pasal 23).";
  else if (decree.tooLong) fe.decree = "Nomor keputusan maksimal 100 karakter.";

  const note = text(body.note, 500);
  if (note.bad || note.tooLong) fe.note = "Keterangan maksimal 500 karakter.";

  const regencyApproved = body.regencyApproved === true;
  if (isCategory(category) && CATEGORIES[category].strategic && !regencyApproved) {
    fe.regencyApproved = "Aset strategis hanya dapat dihapus setelah ada persetujuan Bupati/Wali Kota (Pasal 22).";
  }

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return {
    ok: true,
    value: { disposedAt: disposedAt as Date, reason: reason as DisposalReason, decree: decree.value as string, note: note.value, regencyApproved },
  };
}
