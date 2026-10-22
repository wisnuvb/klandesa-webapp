import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { isVillageSubscriptionWritable } from "@/lib/subscription";
import { mobileError } from "./context";
import {
  hashActivationCode,
  isValidNik,
  namesMatch,
  normalizeActivationCode,
  normalizeNik,
  parseYmd,
  readCitizenSignupMode,
  sameCalendarDay,
  validatePassword,
  validateUsername,
} from "./citizen";
import { checkMobileRateLimit, clientIp } from "./rate-limit";
import { createMobileSession } from "./sessions";
import { notifyVillageStaff } from "./notify";

const GENERIC_MISMATCH =
  "Data tidak cocok atau belum bisa didaftarkan. Periksa kembali, atau minta bantuan perangkat desa.";

type Device = { deviceId: string | null; platform: string | null; appVersion: string | null };

export function deviceFromRequest(req: Request): Device {
  return {
    deviceId: req.headers.get("x-device-id"),
    platform: req.headers.get("x-app-platform"),
    appVersion: req.headers.get("x-app-version"),
  };
}

function limit(req: Request, nik: string, villageId: number) {
  const ip = checkMobileRateLimit(`reg-ip:${clientIp(req)}`, { max: 10, windowMs: 10 * 60_000 });
  if (!ip.ok) return ip;
  return checkMobileRateLimit(`reg-nik:${villageId}:${nik}`, { max: 5, windowMs: 60 * 60_000 });
}

/**
 * Buat CitizenAccount untuk Resident yang sudah terbukti (kode desa atau 3 faktor).
 * `method` "code" selalu ACTIVE; "identity" mengikuti pengaturan desa (auto/approval/closed).
 */
async function createAccount(
  req: Request,
  village: { id: number; code: string; name: string; logoUrl: string | null; settings: unknown; subscriptionStatus: string; subscriptionExpiry: Date | null },
  residentId: number,
  residentName: string,
  username: string,
  password: string,
  method: "code" | "identity",
) {
  const mode = readCitizenSignupMode(village.settings);
  if (mode === "closed") {
    return mobileError("FORBIDDEN", "Pendaftaran mandiri belum dibuka di desa ini. Silakan hubungi kantor desa.", 403);
  }
  if (!isVillageSubscriptionWritable(village)) {
    return mobileError("VILLAGE_INACTIVE", "Layanan digital desa sedang tidak aktif. Silakan hubungi kantor desa.", 403);
  }
  const status = method === "identity" && mode === "approval" ? "PENDING_VERIFY" : "ACTIVE";

  try {
    const account = await prisma.citizenAccount.create({
      data: {
        villageId: village.id,
        residentId,
        username,
        passwordHash: await hashPassword(password),
        status,
        signupMethod: method,
        lastLoginAt: status === "ACTIVE" ? new Date() : null,
      },
    });
    if (status === "PENDING_VERIFY") {
      void notifyVillageStaff(village.id, "residents", {
        type: "system", title: "Pendaftaran warga menunggu persetujuan", body: residentName, deepLink: "/staff/pendaftaran",
      });
      return Response.json(
        { status: "PENDING_VERIFY", message: "Pendaftaran terkirim. Perangkat desa akan memeriksa data Anda, kami kabari saat disetujui." },
        { status: 202 },
      );
    }
    const tokens = await createMobileSession(
      { t: "citizen", id: account.id, villageId: village.id, role: "citizen" },
      deviceFromRequest(req),
    );
    return Response.json(
      {
        status: "ACTIVE",
        ...tokens,
        account: { type: "citizen", id: account.id, name: residentName, username, role: "citizen" },
        village: { id: village.id, code: village.code, name: village.name, logoUrl: village.logoUrl },
      },
      { status: 201 },
    );
  } catch (e: unknown) {
    const err = e as { code?: string; meta?: { target?: unknown } };
    if (err.code === "P2002") {
      const target = String(err.meta?.target ?? "");
      if (target.includes("username")) return mobileError("INVALID_REQUEST", "Username sudah dipakai. Coba yang lain.", 409, { field: "username" });
      return mobileError("INVALID_REQUEST", GENERIC_MISMATCH, 409);
    }
    throw e;
  }
}

const VILLAGE_SELECT = {
  id: true, code: true, name: true, logoUrl: true, settings: true, isActive: true,
  subscriptionStatus: true, subscriptionExpiry: true,
} as const;

export async function registerWithIdentity(req: Request, body: Record<string, unknown>) {
  const villageId = Number(body.villageId);
  const nik = normalizeNik(body.nik);
  if (!Number.isInteger(villageId) || villageId <= 0 || !isValidNik(nik)) {
    return mobileError("INVALID_REQUEST", "Pilih desa dan isi NIK 16 digit.", 400);
  }
  const rl = limit(req, nik, villageId);
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.", 429, { retryAfterSec: rl.retryAfterSec });

  const ymd = parseYmd(body.birthDate);
  const u = validateUsername(body.username);
  if (!ymd || !u.ok) return mobileError("INVALID_REQUEST", u.ok ? "Tanggal lahir tidak valid." : u.message, 400, { field: u.ok ? "birthDate" : "username" });
  const p = validatePassword(body.password, { username: u.value, nik });
  if (!p.ok) return mobileError("INVALID_REQUEST", p.message, 400, { field: "password" });

  const village = await prisma.village.findUnique({ where: { id: villageId }, select: VILLAGE_SELECT });
  const resident = village?.isActive
    ? await prisma.resident.findUnique({
        where: { villageId_nik: { villageId, nik } },
        include: { citizenAccount: { select: { id: true } } },
      })
    : null;

  const ok =
    !!resident && resident.isAlive !== false && !resident.moveDate && !resident.citizenAccount &&
    sameCalendarDay(resident.birthDate, ymd) && namesMatch(resident.motherName, body.motherName);
  if (!village || !resident || !ok) return mobileError("INVALID_REQUEST", GENERIC_MISMATCH, 422);

  return createAccount(req, village, resident.id, resident.name, u.value, p.value, "identity");
}

export async function registerWithCode(req: Request, body: Record<string, unknown>) {
  const nik = normalizeNik(body.nik);
  const code = normalizeActivationCode(body.code);
  if (!isValidNik(nik) || code.length !== 8) {
    return mobileError("INVALID_REQUEST", "Isi kode dari desa dan NIK 16 digit.", 400);
  }
  const ip = checkMobileRateLimit(`reg-ip:${clientIp(req)}`, { max: 10, windowMs: 10 * 60_000 });
  if (!ip.ok) return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi nanti.", 429, { retryAfterSec: ip.retryAfterSec });

  const u = validateUsername(body.username);
  if (!u.ok) return mobileError("INVALID_REQUEST", u.message, 400, { field: "username" });
  const p = validatePassword(body.password, { username: u.value, nik });
  if (!p.ok) return mobileError("INVALID_REQUEST", p.message, 400, { field: "password" });

  const row = await prisma.activationCode.findUnique({ where: { codeHash: hashActivationCode(code) } });
  const valid = !!row && row.purpose === "ACTIVATE" && row.expiresAt.getTime() > Date.now() && row.usedCount < row.maxUses;
  if (!row || !valid) return mobileError("INVALID_REQUEST", "Kode tidak valid atau sudah kedaluwarsa. Minta kode baru ke kantor desa.", 422);

  // Anggota KK bisa mendaftar dengan NIK-nya sendiri; NIK harus tercatat di KK pada kode.
  const resident = await prisma.resident.findUnique({
    where: { villageId_nik: { villageId: row.villageId, nik } },
    include: { citizenAccount: { select: { id: true } } },
  });
  if (!resident || resident.kk !== row.kk || resident.citizenAccount) {
    return mobileError("INVALID_REQUEST", GENERIC_MISMATCH, 422);
  }
  const village = await prisma.village.findUnique({ where: { id: row.villageId }, select: VILLAGE_SELECT });
  if (!village?.isActive) return mobileError("VILLAGE_INACTIVE", "Layanan digital desa sedang tidak aktif. Silakan hubungi kantor desa.", 403);

  // Klaim satu pemakaian secara atomik sebelum membuat akun.
  const claimed = await prisma.$executeRaw`UPDATE activation_codes SET usedCount = usedCount + 1 WHERE id = ${row.id} AND usedCount < maxUses`;
  if (claimed !== 1) return mobileError("INVALID_REQUEST", "Kode sudah dipakai. Minta kode baru ke kantor desa.", 422);

  const res = await createAccount(req, village, resident.id, resident.name, u.value, p.value, "code");
  if (res.status >= 400) {
    // Kembalikan pemakaian bila akun gagal dibuat (mis. username bentrok) agar warga bisa mencoba lagi.
    await prisma.$executeRaw`UPDATE activation_codes SET usedCount = GREATEST(usedCount - 1, 0) WHERE id = ${row.id}`;
  }
  return res;
}
