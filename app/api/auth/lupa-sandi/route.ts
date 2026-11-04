import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTurnstile } from "@/lib/turnstile";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { normalizeAccountEmail } from "@/lib/rbac/accounts";
import { deliverAccessLink } from "@/lib/rbac/access-links";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { claimOnce } from "@/lib/rbac/claim-once";

/** Jendela tanpa penerbitan ulang: menekan tombol berulang tidak mengirim email lagi dan tidak menghabiskan kuota. */
const REISSUE_GUARD_MS = 2 * 60_000;
const PER_EMAIL_PER_HOUR = 5;
const PER_IP_PER_HOUR = 10;

const GENERIC = {
  ok: true,
  message: "Jika email itu terdaftar, kami telah mengirim tautan untuk mengatur ulang kata sandi. Periksa kotak masuk dan folder spam.",
};

/** Seluruh pekerjaan yang waktunya bergantung pada keberadaan akun (DB tulis, panggilan Brevo) dijalankan di sini, SETELAH jawaban dikirim. */
async function processRequest(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true, role: true } });
  // Akun warga (role citizen) dan akun nonaktif tidak mendapat email.
  if (!user || !user.isActive || user.role === "citizen") return;

  // Penjaga "satu penerbitan per 2 menit per akun" harus ATOMIK: permintaan diproses di latar, jadi dua permintaan nyaris
  // bersamaan sama-sama melihat "belum ada token" bila memakai cek-lalu-tulis, lalu keduanya mengirim email. Klaim lewat upsert DB.
  // (Klaim kunci unik, bukan pembatas laju: pembatas bisa menolak SEMUA penelepon bersamaan.)
  if (!(await claimOnce("pw-forgot", user.id, REISSUE_GUARD_MS))) return;

  // Batas per-email hanya terpakai oleh permintaan yang benar-benar akan mengirim, dan melewatinya tidak memberi sinyal apa pun
  // ke pemanggil. Dengan begitu penyerang tidak bisa memakainya untuk (a) menebak email terdaftar atau (b) mengunci korban dari
  // pemulihan: tautan yang sudah terkirim ke korban tetap sah (permintaan publik tidak mencabut tautan lama).
  const em = await checkRateLimitDb(limiterKey("pw-forgot-email", email), { max: PER_EMAIL_PER_HOUR, windowMs: 60 * 60_000 });
  if (!em.ok) return;

  const d = await deliverAccessLink(prisma, { userId: user.id, purpose: "RESET", byAdmin: false, dedupeMs: REISSUE_GUARD_MS });
  if (d && !d.sent) console.error(`[lupa-sandi] email tidak terkirim (${d.reason}${d.error ? `: ${d.error}` : ""})`);
}

/**
 * Lupa kata sandi (publik). Jawaban SAMA dan secepat sama untuk email terdaftar, tidak terdaftar, warga, maupun nonaktif:
 * pencarian akun dan pengiriman email berjalan di latar setelah respons. Hemat kuota: Turnstile, batas per IP,
 * batas per email, dan satu penerbitan per 2 menit per akun.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: unknown; turnstileToken?: string } | null;
    const turnstile = await requireTurnstile(req, body?.turnstileToken);
    if (!turnstile.ok) return turnstile.response;

    const email = normalizeAccountEmail(body?.email);
    if (!email) return NextResponse.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });

    // Pengendali utama: per IP (IP asli dari nginx; tidak bisa dipalsukan lewat X-Forwarded-For). 429 di sini tidak bergantung pada email.
    const ip = await checkRateLimitDb(limiterKey("pw-forgot-ip", clientIpOf(req)), { max: PER_IP_PER_HOUR, windowMs: 60 * 60_000 });
    if (!ip.ok) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": String(ip.retryAfterSec) } });
    }

    void processRequest(email).catch((err) => console.error("[lupa-sandi] gagal memproses:", err));
    return NextResponse.json(GENERIC);
  } catch (err) {
    console.error("POST /api/auth/lupa-sandi error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
