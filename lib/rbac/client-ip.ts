import { clientIp } from "@/lib/mobile/rate-limit";

/**
 * IP klien untuk pembatasan laju dan audit. Memakai X-Real-IP (diisi nginx dari $remote_addr), lalu entri TERAKHIR
 * X-Forwarded-For. JANGAN entri pertama: klien bebas memalsukannya sehingga batas per-IP bisa dilewati dengan header acak.
 */
export const clientIpOf = (req: Request): string => clientIp(req);

/** Untuk kolom audit/log: null bila IP tidak diketahui. Dipotong 50 karakter (lebar kolom). */
export const clientIpOrNull = (req: Request): string | null => {
  const ip = clientIp(req);
  return ip === "unknown" ? null : ip.slice(0, 50);
};
