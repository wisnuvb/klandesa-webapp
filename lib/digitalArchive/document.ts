/**
 * Aturan dokumen arsip non-gambar per desa. Murni, tanpa dependensi server,
 * sehingga dipakai bersama oleh route API (presign / pencatatan) dan modal upload.
 */

/** Ekstensi dokumen yang diizinkan -> Content-Type aman untuk disimpan di storage. */
export const ALLOWED_DOCUMENT_MIME_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  csv: "text/csv",
  txt: "text/plain",
  rtf: "application/rtf",
  zip: "application/zip",
  rar: "application/vnd.rar",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
};

export const MAX_DOCUMENT_BYTES = 200 * 1024 * 1024;

/** Kategori default saat upload tidak menyertakan kategori maupun folderId. */
export const DEFAULT_CATEGORY = "Umum";

export function getDocumentExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return "";
  return name.slice(idx + 1).toLowerCase();
}

export function isAllowedDocumentExtension(ext: string): boolean {
  return ext.toLowerCase() in ALLOWED_DOCUMENT_MIME_EXT;
}

/**
 * Pesan galat (Bahasa Indonesia) bila berkas tidak boleh diunggah sebagai dokumen arsip; null bila sah.
 * Ekstensi nama berkas, bukan Content-Type yang diklaim klien, adalah sumber kebenaran tipe berkas —
 * Content-Type bisa diisi bebas oleh klien dan tidak bisa dipercaya untuk menentukan izin.
 */
export function validateDocumentFile(file: {
  name: string;
  size: number;
}): string | null {
  const ext = getDocumentExtension(file.name);
  if (!ext || !isAllowedDocumentExtension(ext)) {
    return "Tipe berkas tidak didukung. Gunakan PDF, dokumen Office/ODF, CSV/TXT/RTF, ZIP/RAR, gambar, atau audio/video umum.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "Berkas kosong.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `Ukuran berkas terlalu besar. Maksimal ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB.`;
  }
  return null;
}
