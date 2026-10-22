import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { roleCan, normalizeVillageRole } from "@/lib/permissions";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { generateActivationCode, hashActivationCode, isValidNik, normalizeActivationCode, normalizeNik } from "@/lib/mobile/citizen";

const ACTIVATE_TTL_MS = 30 * 24 * 3600 * 1000;
const RESET_TTL_MS = 24 * 3600 * 1000;

/**
 * Perangkat desa membuat kode: ACTIVATE untuk satu KK (anggota KK mendaftar dengan NIK masing-masing),
 * atau RESET untuk warga yang lupa password. Kode hanya ditampilkan sekali di respons ini.
 */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  if (!roleCan("residents", "update", normalizeVillageRole(ctx.role))) {
    return mobileError("FORBIDDEN", "Anda tidak punya akses membuat kode.", 403);
  }

  const rl = await checkRateLimitDb(limiterKey("act-codes", ctx.accountId), { max: 60, windowMs: 60 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak kode dibuat dalam satu jam.", 429, { retryAfterSec: rl.retryAfterSec });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const purpose = body?.purpose === "RESET" ? "RESET" : body?.purpose === "ACTIVATE" ? "ACTIVATE" : null;
  if (!purpose) return mobileError("INVALID_REQUEST", "Jenis kode tidak valid.", 400);

  let kk: string | null = null;
  let residentId: number | null = null;
  let maxUses = 1;

  if (purpose === "ACTIVATE") {
    kk = typeof body?.kk === "string" ? body.kk.replace(/\s+/g, "") : "";
    if (!kk && Number.isInteger(body?.residentId)) {
      const r = await prisma.resident.findFirst({ where: { id: body!.residentId as number, villageId: ctx.villageId }, select: { kk: true } });
      kk = r?.kk ?? "";
    }
    if (!/^[0-9]{16}$/.test(kk)) return mobileError("INVALID_REQUEST", "Nomor KK harus 16 digit.", 400);
    const members = await prisma.resident.count({ where: { villageId: ctx.villageId, kk, isAlive: true } });
    if (members === 0) return mobileError("INVALID_REQUEST", "KK tidak ditemukan di data desa ini.", 404);
    maxUses = Math.min(members, 20);
  } else {
    const account = Number.isInteger(body?.residentId)
      ? await prisma.citizenAccount.findFirst({ where: { villageId: ctx.villageId, residentId: body!.residentId as number } })
      : await (async () => {
          const nik = normalizeNik(body?.nik);
          return isValidNik(nik) ? prisma.citizenAccount.findFirst({ where: { villageId: ctx.villageId, resident: { nik } } }) : null;
        })();
    if (!account) return mobileError("INVALID_REQUEST", "Warga ini belum punya akun (atau NIK tidak valid).", 404);
    residentId = account.residentId;
  }

  for (let i = 0; i < 5; i += 1) {
    const code = generateActivationCode();
    try {
      const row = await prisma.activationCode.create({
        data: {
          villageId: ctx.villageId, purpose, kk, residentId, maxUses, createdById: ctx.accountId,
          codeHash: hashActivationCode(normalizeActivationCode(code)),
          expiresAt: new Date(Date.now() + (purpose === "ACTIVATE" ? ACTIVATE_TTL_MS : RESET_TTL_MS)),
        },
      });
      return NextResponse.json({ code, purpose, maxUses, expiresAt: row.expiresAt }, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e; // bentrok hash: coba kode lain
    }
  }
  return mobileError("INVALID_REQUEST", "Gagal membuat kode. Coba lagi.", 500);
}
