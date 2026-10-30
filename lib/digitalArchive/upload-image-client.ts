import { normalizeMime, validateImageFile } from "./media";

export type ImageAssetItem = {
  id: number;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
};

type ArchiveRow = {
  id: number;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
};

function toItem(r: ArchiveRow): ImageAssetItem {
  return { id: r.id, name: r.title || r.fileName, url: r.filePath, size: r.fileSize, uploadedAt: r.uploadedAt };
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (body?.error === "Storage limit exceeded") {
    return "Kapasitas penyimpanan arsip desa sudah penuh. Hapus berkas lama atau tambah kapasitas.";
  }
  return body?.error || fallback;
}

/** Daftar gambar publik milik desa (sisi server memfilter per desa dari sesi). */
export async function listImageAssets(
  opts: { search?: string; skip?: number; take?: number; signal?: AbortSignal } = {},
): Promise<{ items: ImageAssetItem[]; total: number }> {
  const params = new URLSearchParams({
    type: "image",
    public: "1",
    take: String(opts.take ?? 24),
    skip: String(opts.skip ?? 0),
  });
  if (opts.search?.trim()) params.set("search", opts.search.trim());
  const res = await fetch(`/api/digital-archives?${params}`, { signal: opts.signal });
  if (!res.ok) throw new Error(await readError(res, "Gagal memuat aset gambar."));
  const data = (await res.json()) as { rows: ArchiveRow[]; total: number };
  return { items: data.rows.map(toItem), total: data.total };
}

/** Unggah satu gambar: presign → PUT langsung ke storage → catat ke arsip desa (diverifikasi server). */
export async function uploadImageAsset(file: File): Promise<ImageAssetItem> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);
  const contentType = normalizeMime(file.type);

  const presignRes = await fetch("/api/digital-archives/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "image", fileName: file.name, contentType, fileSize: file.size }),
  });
  if (!presignRes.ok) throw new Error(await readError(presignRes, "Gagal menyiapkan unggahan."));
  const presigned = (await presignRes.json()) as {
    uploadUrl: string;
    fileUrl: string;
    key: string;
    uploadHeaders?: Record<string, string>;
  };

  const putRes = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType, ...(presigned.uploadHeaders || {}) },
    body: file,
  }).catch(() => null);
  if (!putRes?.ok) throw new Error("Gagal mengunggah berkas ke penyimpanan. Periksa koneksi lalu coba lagi.");

  const createRes = await fetch("/api/digital-archives", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "image",
      fileName: file.name,
      filePath: presigned.fileUrl,
      storageKey: presigned.key,
      contentType,
      fileSize: file.size,
      title: file.name.replace(/\.[^.]+$/, "") || file.name,
    }),
  });
  if (!createRes.ok) throw new Error(await readError(createRes, "Gagal menyimpan aset gambar."));
  return toItem((await createRes.json()) as ArchiveRow);
}
