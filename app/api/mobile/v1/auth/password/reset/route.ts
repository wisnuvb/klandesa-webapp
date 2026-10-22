import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import {
  hashActivationCode, isValidNik, namesMatch, normalizeActivationCode, normalizeNik, parseYmd, sameCalendarDay, validatePassword,
} from "@/lib/mobile/citizen";
import { setCitizenPassword } from "@/lib/mobile/citizen-login";
import { checkRateLimitDb, clientIp, limiterKey } from "@/lib/mobile/rate-limit";

const GENERIC = "Data tidak cocok. Periksa kembali, atau minta kode reset ke kantor desa.";

/**
 * Lupa password tanpa OTP: (mode "code") kode reset dari perangkat desa + NIK,
 * atau (mode "identity") NIK + tanggal lahir + nama ibu kandung.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const nik = normalizeNik(body.nik);
  if (!isValidNik(nik)) return mobileError("INVALID_REQUEST", "Isi NIK 16 digit.", 400);
  const villageIdRaw = Number(body.villageId);

  const ip = await checkRateLimitDb(limiterKey("pw-ip", clientIp(req)), { max: 15, windowMs: 10 * 60_000 });
  const perNik = await checkRateLimitDb(limiterKey("pw-nik", nik), { max: 5, windowMs: 60 * 60_000 });
  const blocked = !ip.ok ? ip : !perNik.ok ? perNik : null;
  if (blocked) return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.", 429, { retryAfterSec: blocked.retryAfterSec });

  const pw = validatePassword(body.newPassword, { nik });
  if (!pw.ok) return mobileError("INVALID_REQUEST", pw.message, 400, { field: "newPassword" });

  if (body.mode === "code") {
    const code = normalizeActivationCode(body.code);
    const row = code.length === 8 ? await prisma.activationCode.findUnique({ where: { codeHash: hashActivationCode(code) } }) : null;
    if (!row || row.purpose !== "RESET" || row.expiresAt.getTime() <= Date.now() || row.usedCount >= row.maxUses || !row.residentId) {
      return mobileError("INVALID_REQUEST", "Kode tidak valid atau sudah kedaluwarsa. Minta kode baru ke kantor desa.", 422);
    }
    const account = await prisma.citizenAccount.findFirst({
      where: { residentId: row.residentId, villageId: row.villageId, resident: { nik } },
    });
    if (!account || account.deletedAt) return mobileError("INVALID_REQUEST", GENERIC, 422);
    const claimed = await prisma.$executeRaw`UPDATE activation_codes SET usedCount = usedCount + 1 WHERE id = ${row.id} AND usedCount < maxUses`;
    if (claimed !== 1) return mobileError("INVALID_REQUEST", "Kode sudah dipakai. Minta kode baru ke kantor desa.", 422);
    await setCitizenPassword(account.id, pw.value);
    return new NextResponse(null, { status: 204 });
  }

  if (body.mode === "identity") {
    const ymd = parseYmd(body.birthDate);
    if (!ymd || !Number.isInteger(villageIdRaw)) return mobileError("INVALID_REQUEST", "Pilih desa dan isi tanggal lahir.", 400);
    const resident = await prisma.resident.findUnique({
      where: { villageId_nik: { villageId: villageIdRaw, nik } },
      include: { citizenAccount: true },
    });
    const account = resident?.citizenAccount;
    if (!resident || !account || account.deletedAt || !sameCalendarDay(resident.birthDate, ymd) || !namesMatch(resident.motherName, body.motherName)) {
      return mobileError("INVALID_REQUEST", GENERIC, 422);
    }
    await setCitizenPassword(account.id, pw.value);
    return new NextResponse(null, { status: 204 });
  }

  return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
}
