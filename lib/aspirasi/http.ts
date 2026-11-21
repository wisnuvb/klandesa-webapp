import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { Result } from "@/lib/form-input";
import { isCrossSiteMutation } from "@/app/api/admin/_auth";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { getResolvedAuthSecret } from "@/lib/auth-secret";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";

/** Hash IP + rahasia server: cukup untuk pembatas laju/deteksi penyalahgunaan tanpa menyimpan IP mentah. */
export function ipHashOf(req: Request): string {
  return createHash("sha256").update(`${ipGroup(clientIpOf(req))}|aspirasi|${getResolvedAuthSecret()}`).digest("hex");
}

/**
 * Kelompok jaringan untuk pembatas laju: IPv4 apa adanya, IPv6 dipangkas ke awalan /64 (satu pelanggan lazimnya
 * menguasai seluruh /64, jadi berganti alamat di dalamnya tidak boleh meloloskan batas).
 */
export function ipGroup(ip: string): string {
  const v = ip.trim().toLowerCase();
  if (!v.includes(":")) return v;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(v);
  if (mapped) return mapped[1]!;
  const [head, tail = ""] = v.split("::");
  const a = head ? head.split(":") : [];
  const b = tail ? tail.split(":") : [];
  const full = v.includes("::") ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b] : a;
  return full.slice(0, 4).map((h) => h.padStart(4, "0")).join(":") + "::/64";
}

export function failJson(r: Extract<Result<unknown>, { ok: false }>) {
  return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
}

/** Terapkan batas laju bersama (tabel mobile_rate_limits). Mengembalikan respons 429 bila terlampaui, selain itu null. */
export async function limitOrNull(bucket: string, part: string, opts: { max: number; windowMs: number }, message = "Terlalu banyak permintaan. Coba lagi nanti."): Promise<NextResponse | null> {
  const rl = await checkRateLimitDb(limiterKey(bucket, part), opts);
  if (rl.ok) return null;
  return NextResponse.json({ error: message }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
}

export function parseBigId(raw: string): bigint | null {
  return /^\d{1,18}$/.test(raw) && BigInt(raw) > BigInt(0) ? BigInt(raw) : null;
}

export function pageParam(v: string | null): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
}

/** Tolak permintaan tulis lintas situs (Sec-Fetch-Site/Origin) untuk rute dasbor desa; null bila aman. */
export function crossSiteOrNull(req: Request & { method: string; headers: Headers }): NextResponse | null {
  return isCrossSiteMutation(req as never) ? NextResponse.json({ error: "Permintaan lintas situs ditolak." }, { status: 403 }) : null;
}
