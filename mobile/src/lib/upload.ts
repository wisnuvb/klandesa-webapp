import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';

import { ApiError, post } from './api';

export const MAX_PHOTO_WIDTH = 1280;

/** Kecilkan & kompres foto di HP (hemat kuota, target ≤ ±300 KB) lalu unggah lewat presigned URL. Mengembalikan URL publik foto. */
export async function uploadReportPhoto(uri: string, kind: 'report' | 'social' = 'report'): Promise<string> {
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
