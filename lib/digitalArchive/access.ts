/**
 * Aturan akses arsip digital per desa (selaras route GET/DELETE berkas).
 */

const FOLDER_MANAGER_ROLES = new Set([
  "admin",
  "staff",
  "secretary",
  "village_head",
]);

export function isVillageAdminRole(role: string | undefined | null): boolean {
  return role === "admin";
}

/** Hapus folder DB kosong: peran operasional desa. */
export function canManageArchiveFolders(role: string | undefined | null): boolean {
  if (!role) return false;
  return FOLDER_MANAGER_ROLES.has(role);
}

/** Stream/pratinjau/unduh biner: publik, pengunggah, atau admin desa. */
export function canAccessArchiveBinary(opts: {
  role: string | undefined | null;
  userId: number;
  isPublic: boolean;
  uploadedByUserId: number;
}): boolean {
  if (opts.isPublic) return true;
  if (isVillageAdminRole(opts.role)) return true;
  return opts.uploadedByUserId === opts.userId;
}

/** Hapus catatan arsip: admin desa atau pengunggah. */
export function canDeleteArchiveRecord(opts: {
  role: string | undefined | null;
  userId: number;
  uploadedByUserId: number;
}): boolean {
  if (isVillageAdminRole(opts.role)) return true;
  return opts.uploadedByUserId === opts.userId;
}
