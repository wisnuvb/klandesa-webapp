/** Data uji emulator (DB lokal, desa 1). Semua baris bisa dihapus lewat emu-clean.ts. */
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const PASSWORD = "UjiEmulator#2026";
const IMG = "http://localhost:8099";
const AUTHORS = [
  ["Siti A.", "05"], ["Joko S.", "05"], ["Rina P.", "17"], ["Hasan M.", "09"], ["Wati L.", "15"], ["Dimas R.", "04"], ["Yanti K.", "17"], ["Agus T.", "09"],
];
const H = 3_600_000;

async function main() {
  if (await prisma.socialPost.count({ where: { authorId: { gte: 900001 }, authorType: "citizen" } })) throw new Error("Data uji sudah ada; jalankan emu-clean.ts dulu.");

  // akun warga: belum menyetujui syarat komunitas, supaya layar syarat ikut teruji
  const resident = await prisma.resident.findFirst({ where: { villageId: 1, citizenAccount: null }, orderBy: { id: "asc" } });
  if (!resident) throw new Error("Tidak ada residen tanpa akun");
  const acc = await prisma.citizenAccount.create({
    data: { villageId: 1, residentId: resident.id, username: "ujiemulator", passwordHash: await hashPassword(PASSWORD), status: "ACTIVE", signupMethod: "code" },
  });
  const staff = await prisma.user.create({ data: { villageId: 1, email: "uji.emulator@klandesa.test", password: await hashPassword(PASSWORD), name: "Budi Uji", role: "admin" } });

  const texts: { c: string; cat: string; photos: number; link?: "youtube" | "tiktok"; long?: boolean }[] = [
    { c: "Kerja bakti membersihkan saluran air Minggu pagi. Terima kasih semua yang hadir, desa kita makin bersih! #gotongroyong", cat: "kegiatan", photos: 3 },
    { c: "Keripik pisang buatan rumah, stok baru siap kirim. Pesan lewat WhatsApp ya. #umkm", cat: "usaha", photos: 1 },
    { c: "Besok posyandu balita jam 08.00 di balai RT 05. Jangan lupa bawa buku KIA.", cat: "info", photos: 0 },
    { c: "Lomba 17-an tahun ini seru sekali! Anak-anak RT 09 semangat ikut balap karung.", cat: "kegiatan", photos: 2 },
    { c: "Ada yang kehilangan kucing oren di sekitar lapangan? Sekarang ada di rumah saya.", cat: "lainnya", photos: 0 },
    { c: "Panen cabai kali ini lumayan. Alhamdulillah. Bagi yang mau beli bisa langsung ke rumah.", cat: "usaha", photos: 1 },
    { c: "Cuplikan acara tadi malam di balai desa", cat: "kegiatan", photos: 0, link: "youtube" },
    { c: "Resep tempe mendoan renyah ala ibu-ibu PKK", cat: "usaha", photos: 0, link: "tiktok" },
    { c: "Pengumuman: jadwal ronda minggu ini sudah ditempel di pos kamling. Mohon dicek ya, supaya tidak ada yang lupa giliran. Bagi yang berhalangan hadir bisa menukar giliran dengan tetangga, kabari ketua RT paling lambat sore hari. Terima kasih atas kerja samanya, semoga lingkungan kita tetap aman dan nyaman.", cat: "info", photos: 0, long: true },
    { c: "Senam pagi bersama di lapangan, yuk bergabung setiap Jumat jam 06.00. #sehat", cat: "kegiatan", photos: 1 },
  ];
  const rows = Array.from({ length: 45 }, (_, i) => {
    const a = AUTHORS[i % 8]!;
    const t = texts[i % texts.length]!;
    return { i, t, data: {
      villageId: 1, authorType: "citizen", authorId: 900001 + (i % 8), authorName: a[0], authorRt: a[1], content: i < texts.length ? t.c : `${t.c} (${i})`.replace(/ \(\d+\)$/, i % 3 === 0 ? "" : ` #${["warga", "desa", "kita"][i % 3]}`),
      category: t.cat, status: "PUBLISHED", likesCount: (i * 7) % 31, commentsCount: i % 4 === 0 ? 0 : (i * 3) % 9,
      createdAt: new Date(Date.now() - (i === 0 ? 0.3 : i * 2.6 + 0.5) * H),
      ...(t.link === "youtube" ? { linkProvider: "youtube", linkUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", linkTitle: "Cuplikan acara balai desa", youtubeId: "dQw4w9WgXcQ" } : {}),
      ...(t.link === "tiktok" ? { linkProvider: "tiktok", linkUrl: "https://www.tiktok.com/@pkk.desa/video/7301234567890123456", linkTitle: "Tempe mendoan renyah" } : {}),
    } };
  });
  for (const r of rows) {
    const p = await prisma.socialPost.create({ data: r.data });
    for (let k = 0; k < r.t.photos; k++) await prisma.socialPostMedia.create({ data: { postId: p.id, url: `${IMG}/foto${((r.i + k) % 4) + 1}.png`, sortOrder: k } });
  }
  console.log(JSON.stringify({ citizen: { username: "ujiemulator", password: PASSWORD, name: resident.name, accountId: acc.id }, staff: { email: "uji.emulator@klandesa.test", password: PASSWORD, id: staff.id }, posts: rows.length }));
}
main().catch((e) => { console.error("SEED GAGAL:", e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
