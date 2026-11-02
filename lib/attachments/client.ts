/**
 * Sisi klien lampiran: unggah ke Arsip Digital (presign → PUT → catat) lalu tautkan ke rekaman.
 * Ukuran berkas dicatat server dari objek nyata di storage (bukan klaim klien) dan ikut kuota storage desa.
 */
import { validateDocumentFile } from "../digitalArchive/document";
import { ATTACHMENT_ARCHIVE_CATEGORY, ATTACHMENT_ENTITIES, type AttachmentEntityType } from "./catalog";

async function errorOf(res: Response, fallback: string): Promise<string> {
  const j = (await res.json().catch(() => null)) as { error?: string; meta?: unknown } | null;
  if (j?.error === "Storage limit exceeded") return "Kapasitas penyimpanan desa penuh. Hapus berkas lama di Arsip Digital atau tambah kapasitas.";
  return typeof j?.error === "string" ? j.error : fallback;
}

function putFile(url: string, file: File, headers: Record<string, string>, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Unggah ke penyimpanan gagal. Coba lagi.")));
    xhr.onerror = () => reject(new Error("Tidak bisa terhubung ke penyimpanan. Periksa koneksi."));
    xhr.send(file);
  });
}

/** Pesan galat bila berkas tak boleh diunggah sebagai lampiran; null bila sah. */
export const validateAttachmentFile = (file: { name: string; size: number }): string | null => validateDocumentFile(file);

/** Unggah satu berkas ke Arsip Digital (privat, kategori "Lampiran") dan kembalikan id arsipnya. */
export async function uploadToArchive(file: File, type: AttachmentEntityType, onProgress?: (pct: number) => void): Promise<number> {
  const bad = validateAttachmentFile(file);
  if (bad) throw new Error(bad);
  const sub = ATTACHMENT_ENTITIES[type].archiveSub;
  const contentType = file.type || "application/octet-stream";

  const presignRes = await fetch("/api/digital-archives/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size, category: ATTACHMENT_ARCHIVE_CATEGORY, subCategory: sub, isPublic: false, accessLevel: "admin" }),
  });
  if (!presignRes.ok) throw new Error(await errorOf(presignRes, "Gagal menyiapkan unggahan."));
  const presigned = (await presignRes.json()) as { uploadUrl: string; fileUrl: string; key?: string; uploadHeaders?: Record<string, string> };

  const headers = { ...(presigned.uploadHeaders ?? {}) };
  if (!headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = contentType;
  await putFile(presigned.uploadUrl, file, headers, onProgress);

  const createRes = await fetch("/api/digital-archives", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      filePath: presigned.fileUrl,
      storageKey: presigned.key ?? null,
      contentType,
      fileSize: file.size,
      category: ATTACHMENT_ARCHIVE_CATEGORY,
      subCategory: sub,
      title: file.name,
      isPublic: false,
      accessLevel: "admin",
    }),
  });
  if (!createRes.ok) throw new Error(await errorOf(createRes, "Gagal mencatat berkas."));
  const created = (await createRes.json()) as { id: number };
  return created.id;
}

/** Tautkan berkas arsip ke rekaman. Mengembalikan id lampiran. */
export async function linkArchive(type: AttachmentEntityType, entityId: number, archiveId: number): Promise<number> {
  const res = await fetch("/api/lampiran", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, id: entityId, archiveId }),
  });
  if (!res.ok) throw new Error(await errorOf(res, "Gagal melampirkan berkas."));
  return ((await res.json()) as { id: number }).id;
}

/**
 * Unggah lalu tautkan. Bila penautan gagal, berkas yang baru saja diunggah dibersihkan lagi supaya tidak menjadi
 * berkas yatim yang memakan kuota tanpa terlihat.
 */
export async function uploadAndAttach(file: File, type: AttachmentEntityType, entityId: number, onProgress?: (pct: number) => void): Promise<void> {
  const archiveId = await uploadToArchive(file, type, onProgress);
  try {
    await linkArchive(type, entityId, archiveId);
  } catch (e) {
    await fetch(`/api/digital-archives/${archiveId}`, { method: "DELETE" }).catch(() => undefined);
    throw e;
  }
}

export async function unlinkAttachment(attachmentId: number): Promise<void> {
  const res = await fetch(`/api/lampiran/${attachmentId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorOf(res, "Gagal melepas lampiran."));
}

export const attachmentFileUrl = (attachmentId: number, download = false) => `/api/lampiran/${attachmentId}/file${download ? "?download=1" : ""}`;
