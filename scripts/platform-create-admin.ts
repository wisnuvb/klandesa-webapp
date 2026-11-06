/**
 * Buat akun admin platform (owner) lewat CLI, mis. untuk admin pertama di server baru.
 * Kata sandi TIDAK pernah ditulis di berkas/argumen: dibaca dari env PLATFORM_ADMIN_PASSWORD (atau diminta lewat stdin bila kosong),
 * di-hash dengan bcrypt (sama dengan lib/auth.ts), lalu dimasukkan ke `platform_users`.
 *
 * Pakai:  PLATFORM_ADMIN_PASSWORD='...' npx tsx scripts/platform-create-admin.ts <email> "<Nama>"           # pratinjau
 *         PLATFORM_ADMIN_PASSWORD='...' npx tsx scripts/platform-create-admin.ts <email> "<Nama>" --yes     # jalankan
 *
 * Bila email sudah ada, skrip BERHENTI (tidak menimpa sandi/akun). Untuk mengganti sandi admin yang ada pakai tautan atur ulang
 * di /admin/keamanan. Peran: platform_admin. Setelah masuk, aktifkan 2FA di menu "Keamanan & Admin".
 */
import "@/env";
import { createInterface } from "node:readline/promises";
import { userInfo } from "node:os";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

async function readPassword(): Promise<string> {
  const fromEnv = process.env.PLATFORM_ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question("Kata sandi admin (min. 12 karakter; terlihat saat diketik): ")).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const confirmed = process.argv.includes("--yes");
  const email = args[0]?.trim().toLowerCase();
  const name = args[1]?.trim();
  if (!email || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Pakai: PLATFORM_ADMIN_PASSWORD=... npx tsx scripts/platform-create-admin.ts <email> "<Nama>" [--yes]');
    process.exit(2);
  }
  const existing = await prisma.platformUser.findUnique({ where: { email }, select: { id: true, isActive: true } });
  if (existing) {
    console.error(`Sudah ada admin platform ${email} (#${existing.id}, ${existing.isActive ? "aktif" : "NONAKTIF"}). Tidak ada yang diubah.`);
    process.exit(1);
  }
  const password = await readPassword();
  if (password.length < 12) {
    console.error("Kata sandi minimal 12 karakter.");
    process.exit(2);
  }
  console.log(`Akan membuat admin platform: ${name} <${email}> (role platform_admin).`);
  if (!confirmed) {
    console.log("Pratinjau saja. Tambahkan --yes untuk benar-benar membuat akun.");
    return;
  }
  const created = await prisma.platformUser.create({
    data: { email, name, password: await hashPassword(password), role: "platform_admin", isActive: true },
    select: { id: true },
  });
  await prisma.platformAuditLog.create({
    data: {
      actorId: null,
      actorEmail: `cli:${userInfo().username}`,
      action: "admin.create_cli",
      targetType: "platform_user",
      targetId: String(created.id),
      summary: `Admin platform ${email} dibuat lewat CLI`,
    },
  });
  console.log(`Selesai: admin #${created.id} ${email} dibuat. Masuk lewat /auth/signin (tab admin platform), lalu aktifkan 2FA.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
