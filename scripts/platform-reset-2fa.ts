/**
 * Darurat: reset 2FA admin platform (mis. satu-satunya owner kehilangan ponsel DAN kode pemulihan, atau AUTH_SECRET berganti
 * sehingga rahasia TOTP tersimpan tidak terbaca). Dijalankan di server dengan akses DB (butuh shell server = bukti kepemilikan).
 *
 * Pakai:  npx tsx scripts/platform-reset-2fa.ts <email-admin>            # pratinjau (tidak mengubah apa pun)
 *         npx tsx scripts/platform-reset-2fa.ts <email-admin> --yes      # jalankan
 *
 * Efek: menghapus rahasia TOTP + kode pemulihan, menaikkan sessionVersion (semua sesi admin itu dicabut), dan menulis
 * baris `admin.2fa_reset` di jejak audit (aktor "cli:<pengguna OS>"). Kata sandi TIDAK diubah/ditampilkan. Setelah itu admin masuk
 * dengan sandi lalu mendaftar ulang 2FA di menu Keamanan. Bila sandi juga hilang: minta admin lain mengirim tautan atur ulang,
 * atau (satu-satunya admin) terbitkan lewat `npx tsx prisma/seed.ts` dengan PLATFORM_ADMIN_PASSWORD baru pada akun BARU.
 */
import "@/env";
import { userInfo } from "node:os";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clearAdminLocks } from "@/lib/platform/admins/login-guard";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const confirmed = process.argv.includes("--yes");
  if (!email || email.startsWith("--")) {
    console.error("Pakai: npx tsx scripts/platform-reset-2fa.ts <email-admin> [--yes]");
    process.exit(2);
  }
  const admin = await prisma.platformUser.findUnique({
    where: { email },
    select: { id: true, email: true, isActive: true, totpEnabledAt: true, totpSecretEnc: true },
  });
  if (!admin) {
    console.error(`Tidak ada admin platform dengan email ${email}.`);
    process.exit(1);
  }
  console.log(`Admin #${admin.id} ${admin.email} (${admin.isActive ? "aktif" : "NONAKTIF"}); 2FA ${admin.totpEnabledAt ? "AKTIF" : "tidak aktif"}.`);
  if (!admin.totpEnabledAt && !admin.totpSecretEnc) {
    console.log("2FA tidak aktif; tidak ada yang perlu direset.");
    return;
  }
  if (!confirmed) {
    console.log("Pratinjau saja. Tambahkan --yes untuk benar-benar mereset 2FA dan mencabut semua sesi admin ini.");
    return;
  }
  await prisma.platformUser.update({
    where: { id: admin.id },
    data: { totpSecretEnc: null, totpEnabledAt: null, recoveryCodeHashes: Prisma.DbNull, sessionVersion: { increment: 1 } },
  });
  // Sekalian buka kunci laju (kode 2FA/login/konfirmasi sandi/per-email) supaya admin sah tidak tertolak 429 setelah reset.
  await clearAdminLocks(admin.id, admin.email);
  const operator = (() => {
    try {
      return userInfo().username;
    } catch {
      return "unknown";
    }
  })();
  await prisma.platformAuditLog.create({
    data: {
      actorId: null,
      actorEmail: `cli:${operator}`.slice(0, 255),
      action: "admin.2fa_reset",
      targetType: "platform_user",
      targetId: String(admin.id),
      summary: `Reset 2FA admin ${admin.email} lewat skrip server (darurat); sesi dicabut.`,
      metadata: { via: "cli" },
    },
  });
  console.log("Selesai: 2FA direset dan semua sesi admin ini dicabut. Admin masuk dengan sandi lalu mendaftar ulang 2FA.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
