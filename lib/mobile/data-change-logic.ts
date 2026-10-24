/**
 * Koreksi data warga dari app. Warga mengajukan, perangkat desa memeriksa.
 * Kolom "aman" (alamat, telepon, pekerjaan, dst) diterapkan otomatis saat disetujui; kolom identitas
 * (nama, tanggal lahir, NIK, KK, orang tua) hanya ditandai disetujui dan diubah staf manual setelah memeriksa dokumen.
 */

export type ChangeField =
  | "address" | "phone" | "occupation" | "education" | "religion" | "maritalStatus"
  | "name" | "birthplace" | "birthDate" | "gender" | "motherName" | "fatherName" | "nik" | "kk";

type FieldSpec = { label: string; auto: boolean; max: number };

export const CHANGE_FIELDS: Record<ChangeField, FieldSpec> = {
  address: { label: "Alamat", auto: true, max: 500 },
  phone: { label: "Nomor telepon", auto: true, max: 20 },
  occupation: { label: "Pekerjaan", auto: true, max: 255 },
  education: { label: "Pendidikan", auto: true, max: 100 },
  religion: { label: "Agama", auto: true, max: 50 },
  maritalStatus: { label: "Status perkawinan", auto: true, max: 50 },
  name: { label: "Nama", auto: false, max: 255 },
  birthplace: { label: "Tempat lahir", auto: false, max: 255 },
  birthDate: { label: "Tanggal lahir", auto: false, max: 10 },
  gender: { label: "Jenis kelamin", auto: false, max: 20 },
  motherName: { label: "Nama ibu kandung", auto: false, max: 255 },
  fatherName: { label: "Nama ayah", auto: false, max: 255 },
  nik: { label: "NIK", auto: false, max: 16 },
  kk: { label: "Nomor KK", auto: false, max: 16 },
};

export function isChangeField(v: unknown): v is ChangeField {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(CHANGE_FIELDS, v);
}

export function canApplyAutomatically(field: ChangeField): boolean {
  return CHANGE_FIELDS[field].auto;
}

const GENDERS = ["Laki-laki", "Perempuan"];

function ymdValid(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y >= 1900 && dt.getTime() <= Date.now();
}

/** Membersihkan dan memvalidasi nilai baru. `current` (nilai sekarang, teks) dipakai untuk menolak "perubahan" yang sama. */
export function validateChange(
  field: ChangeField,
  raw: unknown,
  current: string | null | undefined,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== "string") return { ok: false, message: "Isi data yang benar." };
  const spec = CHANGE_FIELDS[field];
  let value = raw.trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, message: "Isi data yang benar." };
  if (value.length > spec.max) return { ok: false, message: `Terlalu panjang (maksimal ${spec.max} huruf).` };

  if (field === "phone") {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return { ok: false, message: "Nomor telepon tidak valid." };
    value = (value.startsWith("+") ? "+" : "") + digits;
  } else if (field === "nik" || field === "kk") {
    if (!/^\d{16}$/.test(value)) return { ok: false, message: `${spec.label} harus 16 angka.` };
  } else if (field === "birthDate") {
    if (!ymdValid(value)) return { ok: false, message: "Tanggal lahir tidak valid (format TTTT-BB-HH)." };
  } else if (field === "gender") {
    const hit = GENDERS.find((g) => g.toLowerCase() === value.toLowerCase());
    if (!hit) return { ok: false, message: "Pilih Laki-laki atau Perempuan." };
    value = hit;
  }
  if (value.toLowerCase() === (current ?? "").trim().toLowerCase()) return { ok: false, message: "Data yang Anda isi sama dengan data desa saat ini." };
  return { ok: true, value };
}

/** Ke bentuk teks untuk dibandingkan/ditampilkan (tanggal → TTTT-BB-HH). */
export function residentValueText(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export const CHANGE_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu pemeriksaan desa",
  approved: "Disetujui",
  rejected: "Ditolak",
};

/** Kepala keluarga boleh mengoreksi anggota KK yang sama (kk tidak kosong); selain itu hanya diri sendiri. */
export function canCorrect(opts: {
  requesterId: number; requesterKk: string | null; requesterIsHead: boolean;
  targetId: number; targetKk: string | null; targetVillageId: number; requesterVillageId: number;
}): boolean {
  if (opts.targetVillageId !== opts.requesterVillageId) return false;
  if (opts.targetId === opts.requesterId) return true;
  return opts.requesterIsHead && !!opts.requesterKk && opts.requesterKk === opts.targetKk;
}
