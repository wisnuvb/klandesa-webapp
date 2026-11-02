import { prisma } from "@/lib/prisma";

/**
 * Surat yang sudah diterbitkan perangkat desa (MailService selesai) untuk NIK + jenis surat ini
 * setelah permohonan dibuat. Sementara menjadi penghubung implisit; ganti dengan relasi eksplisit
 * saat alur terbit surat di web ditautkan ke MailRequest.
 */
export async function findIssuedLetter(r: { villageId: number; nik: string; templateId: number | null; mailType: string; requestDate: Date; mailServiceId?: bigint | null }) {
  // Tautan eksplisit (surat diterbitkan dari halaman Permohonan Warga) didahulukan; selain itu tebakan implisit di bawah.
  if (r.mailServiceId != null) {
    const linked = await prisma.mailService.findFirst({
      where: { id: r.mailServiceId, villageId: r.villageId, status: "completed" },
      select: { id: true, letterNumber: true, letterDate: true },
    });
    if (linked) return linked;
  }
  return prisma.mailService.findFirst({
    where: {
      villageId: r.villageId,
      applicantNik: r.nik,
      status: "completed",
      createdAt: { gte: r.requestDate },
      ...(r.templateId ? { templateId: r.templateId } : { templateName: r.mailType }),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, letterNumber: true, letterDate: true },
  });
}
