/**
 * Foto profil warga (Resident.photo & Resident.photoThumb). Logika murni tanpa DB/Spaces agar mudah diuji.
 *
 * Berkas disimpan di `villages/<kode desa>/mobile-profile/<id warga>/<uuid>.<ext>`. Awalan `mobile-` sengaja
 * dipakai supaya ikut terhitung di kuota foto desa (lihat media-quota.ts). Id warga ada di path agar URL yang
 * dikirim klien bisa dicek kepemilikannya: satu warga tidak bisa menunjuk, apalagi menghapus, foto warga lain.
 */
export const RESIDENT_PHOTO_FOLDER = "mobile-profile";

function trimSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

export function residentPhotoPrefix(villageCode: string, residentId: number): string {
  return `villages/${villageCode}/${RESIDENT_PHOTO_FOLDER}/${residentId}/`;
}

export function residentPhotoKey(villageCode: string, residentId: number, uuid: string, ext: string): string {
  return `${residentPhotoPrefix(villageCode, residentId)}${uuid}.${ext}`;
}

/** True bila `url` adalah berkas foto milik warga ini di CDN kita (bukan URL luar, bukan milik warga lain). */
export function isOwnResidentPhotoUrl(url: unknown, cdnBaseUrl: string, villageCode: string, residentId: number): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  const base = trimSlashes(cdnBaseUrl) + "/";
  if (!url.startsWith(base)) return false;
  const key = url.slice(base.length);
  if (key.includes("..") || key.includes("?") || key.includes("#")) return false;
  const rest = key.startsWith(residentPhotoPrefix(villageCode, residentId)) ? key.slice(residentPhotoPrefix(villageCode, residentId).length) : null;
  return rest != null && /^[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(rest);
}

export type PhotoPairResult =
  | { ok: true; photo: string | null; photoThumb: string | null }
  | { ok: false; message: string };

/**
 * Validasi isi permintaan "atur foto". `photo` & `photoThumb` keduanya null = hapus foto.
 * Menyetel foto wajib menyertakan keduanya (tampilan daftar memakai thumb, detail memakai foto penuh).
 */
export function parsePhotoPair(body: unknown, cdnBaseUrl: string, villageCode: string, residentId: number): PhotoPairResult {
  const b = (body && typeof body === "object" ? body : {}) as { photo?: unknown; photoThumb?: unknown };
  if (b.photo == null && b.photoThumb == null) return { ok: true, photo: null, photoThumb: null };
  if (!isOwnResidentPhotoUrl(b.photo, cdnBaseUrl, villageCode, residentId) || !isOwnResidentPhotoUrl(b.photoThumb, cdnBaseUrl, villageCode, residentId)) {
    return { ok: false, message: "Foto tidak valid. Unggah ulang fotonya." };
  }
  return { ok: true, photo: b.photo, photoThumb: b.photoThumb };
}
