import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { mobileError } from "./context";
import { deviceFromRequest } from "./citizen-register";
import { lockoutMs, MAX_FAILED_LOGINS } from "./citizen";
import { createMobileSession } from "./sessions";

// Hash bcrypt valid sungguhan agar waktu respons username tak dikenal ≈ username dikenal (anti-enumerasi).
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("klandesa-dummy-password"));

const BAD_CREDS = "Username atau password salah.";

export async function loginCitizen(req: Request, username: string, password: string) {
  const account = await prisma.citizenAccount.findUnique({
    where: { username },
    include: { resident: { select: { name: true } }, village: true },
  });
  if (!account || account.deletedAt) {
    await verifyPassword(password, await getDummyHash()).catch(() => false);
    return mobileError("UNAUTHENTICATED", BAD_CREDS, 401);
  }

  const now = Date.now();
  if (account.lockedUntil && account.lockedUntil.getTime() > now) {
    const mins = Math.max(1, Math.ceil((account.lockedUntil.getTime() - now) / 60_000));
    return mobileError(
      "RATE_LIMITED",
      `Terlalu banyak percobaan salah. Coba lagi ${mins} menit lagi, atau minta kode reset ke kantor desa.`,
      429,
      { retryAfterSec: mins * 60 },
    );
  }

  if (!(await verifyPassword(password, account.passwordHash))) {
    const failed = account.failedAttempts + 1;
    const lock = lockoutMs(failed);
    await prisma.citizenAccount.update({
      where: { id: account.id },
      data: { failedAttempts: failed, lockedUntil: lock ? new Date(now + lock) : null },
    });
    return mobileError("UNAUTHENTICATED", BAD_CREDS, 401, {
      attemptsLeft: Math.max(0, MAX_FAILED_LOGINS - failed),
    });
  }

  if (account.status === "PENDING_VERIFY") {
    return mobileError("ACCOUNT_DISABLED", "Pendaftaran Anda masih menunggu persetujuan perangkat desa.", 403, { reason: "PENDING_VERIFY" });
  }
  if (account.status !== "ACTIVE") {
    return mobileError("ACCOUNT_DISABLED", "Akun Anda dibekukan. Hubungi kantor desa.", 403, { reason: account.status });
  }
  if (!account.village.isActive) {
    return mobileError("VILLAGE_INACTIVE", "Layanan digital desa sedang tidak aktif. Silakan hubungi kantor desa.", 403);
  }

  await prisma.citizenAccount.update({
    where: { id: account.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  const tokens = await createMobileSession(
    { t: "citizen", id: account.id, villageId: account.villageId, role: "citizen" },
    deviceFromRequest(req),
  );
  return Response.json({
    ...tokens,
    account: { type: "citizen", id: account.id, name: account.resident.name, username: account.username, role: "citizen" },
    village: { id: account.village.id, code: account.village.code, name: account.village.name, logoUrl: account.village.logoUrl },
  });
}

/** Ganti password + cabut semua sesi perangkat akun ini. */
export async function setCitizenPassword(accountId: number, newPassword: string) {
  await prisma.citizenAccount.update({
    where: { id: accountId },
    data: { passwordHash: await hashPassword(newPassword), failedAttempts: 0, lockedUntil: null },
  });
  await prisma.mobileSession.updateMany({
    where: { accountType: "citizen", accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
