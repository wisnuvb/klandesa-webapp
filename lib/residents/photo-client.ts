import type { CropRect } from "@/lib/digitalArchive/image-edit";

/** Sisi foto penuh dan thumbnail (persegi). 800 px JPEG ±150 KB, jauh di bawah batas server 2,5 MB. */
export const PHOTO_SIZE = 800;
export const THUMB_SIZE = 160;

/** Format yang bisa dibaca peramban dan diterima server. GIF tidak dipakai (hanya satu frame yang tersimpan). */
export const PICKABLE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Batas berkas asli sebelum dipotong (hasil akhirnya jauh lebih kecil). */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export function validatePickedFile(file: { type: string; size: number }): string | null {
  if (!PICKABLE_TYPES.includes(file.type)) return "Format foto harus JPG, PNG, atau WebP.";
  if (file.size <= 0) return "Berkas kosong.";
  if (file.size > MAX_SOURCE_BYTES) return "Ukuran foto terlalu besar. Maksimal 15 MB.";
  return null;
}

/** Gambar area potong `rect` ke persegi `size` px dan simpan sebagai JPEG. */
export function renderSquareJpeg(img: HTMLImageElement, rect: CropRect, size: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Peramban tidak mendukung pemrosesan gambar."));
  ctx.fillStyle = "#fff"; // PNG transparan jangan jadi hitam di JPEG
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat foto."))), "image/jpeg", quality);
  });
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

async function putBlob(residentId: number, blob: Blob): Promise<string> {
  const presignRes = await fetch("/api/residents/photo-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ residentId, contentType: "image/jpeg", fileSize: blob.size }),
  });
  if (!presignRes.ok) throw new Error(await readError(presignRes, "Gagal menyiapkan unggahan."));
  const p = (await presignRes.json()) as { uploadUrl: string; fileUrl: string; uploadHeaders?: Record<string, string> };
  const put = await fetch(p.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg", ...(p.uploadHeaders ?? {}) }, body: blob }).catch(() => null);
  if (!put?.ok) throw new Error("Foto gagal diunggah. Periksa koneksi lalu coba lagi.");
  return p.fileUrl;
}

type Photo = { photo: string | null; photoThumb: string | null };

async function commit(residentId: number, body: Photo): Promise<Photo> {
  const res = await fetch(`/api/residents/${residentId}/photo`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res, "Gagal menyimpan foto."));
  return ((await res.json()) as { data: Photo }).data;
}

/** Unggah foto penuh + thumbnail lalu simpan ke data warga. */
export async function uploadResidentPhoto(residentId: number, photo: Blob, thumb: Blob): Promise<Photo> {
  const [photoUrl, thumbUrl] = await Promise.all([putBlob(residentId, photo), putBlob(residentId, thumb)]);
  return commit(residentId, { photo: photoUrl, photoThumb: thumbUrl });
}

export const removeResidentPhoto = (residentId: number) => commit(residentId, { photo: null, photoThumb: null });
