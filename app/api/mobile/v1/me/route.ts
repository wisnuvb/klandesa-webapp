import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { checkMobileRateLimit } from "@/lib/mobile/rate-limit";

export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req);
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  let name = "";
  if (ctx.accountType === "staff") {
    const u = await prisma.user.findUnique({ where: { id: ctx.accountId }, select: { name: true } });
    name = u?.name ?? "";
  }
  let username: string | undefined;
  if (ctx.accountType === "citizen") {
    const a = await prisma.citizenAccount.findUnique({
      where: { id: ctx.accountId },
      select: { username: true, resident: { select: { name: true } } },
    });
    name = a?.resident.name ?? "";
    username = a?.username;
  }
  return NextResponse.json({
    account: { type: ctx.accountType, id: ctx.accountId, name, username, role: ctx.role },
    village: { id: ctx.village.id, code: ctx.village.code, name: ctx.village.name, logoUrl: ctx.village.logoUrl },
  });
}

/**
 * Hapus akun warga (syarat Google Play). Wajib konfirmasi password.
 * Dihapus: akun, sesi, token push, notifikasi, kode reset. Laporan & permohonan surat tetap sebagai
 * arsip administrasi desa tetapi diputus dari akun; laporan dianonimkan (nama & NIK pelapor dikosongkan).
 */
export async function DELETE(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"], skipSubscription: true });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  const rl = checkMobileRateLimit(`delete-account:${ctx.accountId}`, { max: 5, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.", 429, { retryAfterSec: rl.retryAfterSec });

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const acc = await prisma.citizenAccount.findUnique({ where: { id: ctx.accountId }, select: { id: true, residentId: true, passwordHash: true } });
  if (!acc) return mobileError("ACCOUNT_DISABLED", "Akun tidak ditemukan.", 404);
  if (!password || !(await verifyPassword(password, acc.passwordHash))) {
    return mobileError("INVALID_REQUEST", "Password salah. Masukkan password akun Anda untuk menghapus.", 403, { field: "password" });
  }

  await prisma.$transaction([
    prisma.citizenReport.updateMany({
      where: { residentId: acc.residentId },
      data: { residentId: null, reporterName: "Warga (akun dihapus)", reporterNik: null },
    }),
    prisma.mailRequest.updateMany({ where: { residentId: acc.residentId }, data: { residentId: null } }),
    prisma.mailRequest.updateMany({ where: { onBehalfResidentId: acc.residentId }, data: { onBehalfResidentId: null } }),
    prisma.activationCode.deleteMany({ where: { residentId: acc.residentId } }),
    prisma.userNotification.deleteMany({ where: { accountType: "citizen", accountId: acc.id } }),
    prisma.deviceToken.deleteMany({ where: { accountType: "citizen", accountId: acc.id } }),
    prisma.mobileSession.deleteMany({ where: { accountType: "citizen", accountId: acc.id } }),
    prisma.citizenAccount.delete({ where: { id: acc.id } }),
  ]);
  return new NextResponse(null, { status: 204 });
}
