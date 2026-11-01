import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';

import { ApiError, api, post } from './api';

export const MAX_PHOTO_WIDTH = 1280;

async function putJpeg(uri: string, width: number, compress: number): Promise<string> {
  const ctx = ImageManipulator.ImageManipulator.manipulate(uri).resize({ width });
  const out = await (await ctx.renderAsync()).saveAsync({ compress, format: SaveFormat.JPEG });
  const blob = await (await fetch(out.uri)).blob();
  const presign = await post<{ uploadUrl: string; fileUrl: string; uploadHeaders: Record<string, string> }>('/uploads/presign', {
    contentType: 'image/jpeg',
    fileSize: blob.size,
    kind: 'profile',
  });
  let res: Response;
  try {
    res = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.uploadHeaders, body: blob });
  } catch {
    throw new ApiError('NETWORK', 'Foto belum terunggah karena sinyal. Coba lagi.', 0);
  }
  if (!res.ok) throw new ApiError('SERVER', 'Foto gagal diunggah. Coba lagi.', res.status);
  return presign.fileUrl;
}

/**
 * Foto profil: `uri` sudah dipotong persegi oleh pemilih foto. Unggah versi penuh (800 px) dan thumbnail (160 px),
 * lalu simpan ke data warga. Mengembalikan URL foto yang dipakai untuk tampilan.
 */
export async function uploadProfilePhoto(uri: string): Promise<string | null> {
  const [photoUrl, thumbUrl] = await Promise.all([putJpeg(uri, 800, 0.8), putJpeg(uri, 160, 0.75)]);
  return (await api<{ photoUrl: string | null }>('/me/photo', { method: 'PUT', body: JSON.stringify({ photoUrl, thumbUrl }) })).photoUrl;
}

export async function removeProfilePhoto(): Promise<void> {
  await api<unknown>('/me/photo', { method: 'DELETE' });
}

/** Kecilkan & kompres foto di HP (hemat kuota, target ≤ ±300 KB) lalu unggah lewat presigned URL. Mengembalikan URL publik foto. */
export async function uploadReportPhoto(uri: string, kind: 'report' | 'social' | 'fee' | 'ukm' = 'report'): Promise<string> {
  const ctx = ImageManipulator.ImageManipulator.manipulate(uri).resize({ width: MAX_PHOTO_WIDTH });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });

  const blob = await (await fetch(out.uri)).blob();
  const presign = await post<{ uploadUrl: string; fileUrl: string; uploadHeaders: Record<string, string> }>('/uploads/presign', {
    contentType: 'image/jpeg',
    fileSize: blob.size,
    kind,
  });

  let res: Response;
  try {
    res = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.uploadHeaders, body: blob });
  } catch {
    throw new ApiError('NETWORK', 'Foto belum terunggah karena sinyal. Coba lagi.', 0);
  }
  if (!res.ok) throw new ApiError('SERVER', 'Foto gagal diunggah. Coba lagi.', res.status);
  return presign.fileUrl;
}
