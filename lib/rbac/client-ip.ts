import type { NextRequest } from "next/server";
import { clientIp } from "@/lib/mobile/rate-limit";

/**
 * IP klien untuk pembatasan laju dan audit. Memakai X-Real-IP (diisi nginx dari $remote_addr), lalu entri TERAKHIR
 * X-Forwarded-For. JANGAN entri pertama: klien bebas memalsukannya sehingga batas per-IP bisa dilewati dengan header acak.
 */
export const clientIpOf = (req: NextRequest): string => clientIp(req);
