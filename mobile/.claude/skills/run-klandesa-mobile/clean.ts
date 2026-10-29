/** Hapus semua data uji emulator. Hanya menyentuh baris yang dibuat emu-seed.ts (penulis 900001+, akun ujiemulator, uji.emulator@klandesa.test). */
import { prisma } from "@/lib/prisma";

async function main() {
  const acc = await prisma.citizenAccount.findUnique({ where: { username: "ujiemulator" }, select: { id: true } });
  const user = await prisma.user.findUnique({ where: { email: "uji.emulator@klandesa.test" }, select: { id: true } });
  const out: Record<string, number> = {};
  out.posts = (await prisma.socialPost.deleteMany({ where: { authorType: "citizen", authorId: { gte: 900001 } } })).count; // media, sinyal, like, komentar ikut terhapus (cascade)
  for (const [type, id] of [["citizen", acc?.id], ["staff", user?.id]] as const) {
    if (!id) continue;
    out[`interests-${type}`] = (await prisma.socialInterest.deleteMany({ where: { accountType: type, accountId: id } })).count;
    out[`signals-${type}`] = (await prisma.socialPostSignal.deleteMany({ where: { accountType: type, accountId: id } })).count;
    out[`likes-${type}`] = (await prisma.socialLike.deleteMany({ where: { accountType: type, accountId: id } })).count;
    out[`bookmarks-${type}`] = (await prisma.socialBookmark.deleteMany({ where: { accountType: type, accountId: id } })).count;
    out[`sessions-${type}`] = (await prisma.mobileSession.deleteMany({ where: { accountType: type, accountId: id } })).count;
    out[`devices-${type}`] = (await prisma.deviceToken.deleteMany({ where: { accountType: type, accountId: id } })).count;
    out[`notif-${type}`] = (await prisma.userNotification.deleteMany({ where: { accountType: type, accountId: id } })).count;
  }
  if (acc) out.citizen = (await prisma.citizenAccount.deleteMany({ where: { id: acc.id } })).count;
  if (user) out.staff = (await prisma.user.deleteMany({ where: { id: user.id } })).count;
  console.log("dihapus:", JSON.stringify(out));
  console.log("sisa uji:", JSON.stringify({
    posts: await prisma.socialPost.count({ where: { authorId: { gte: 900001 }, authorType: "citizen" } }),
    acc: await prisma.citizenAccount.count({ where: { username: "ujiemulator" } }),
    user: await prisma.user.count({ where: { email: "uji.emulator@klandesa.test" } }),
    signals: await prisma.socialPostSignal.count(), interests: await prisma.socialInterest.count(),
  }));
}
main().catch((e) => { console.error("CLEAN GAGAL:", e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
