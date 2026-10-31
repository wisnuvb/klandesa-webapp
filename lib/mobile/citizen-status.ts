import { prisma } from "@/lib/prisma";

/**
 * Nonaktifkan akun mobile warga yang kini meninggal/pindah. Middleware mobile hanya memeriksa
 * CitizenAccount.status, jadi perubahan status warga di data desa harus menurunkannya ke sini.
 * Mengembalikan jumlah akun yang benar-benar diubah. Idempoten.
 */
export async function suspendCitizenAccounts(villageId: number, residentIds: number[]): Promise<number> {
  if (residentIds.length === 0) return 0;
  const r = await prisma.citizenAccount.updateMany({
    where: { villageId, residentId: { in: residentIds }, deletedAt: null, status: { not: "SUSPENDED" } },
    data: { status: "SUSPENDED" },
  });
  return r.count;
}

/**
 * Aktifkan lagi akun mobile warga yang kembali ke desa. Hanya status SUSPENDED yang dipulihkan: nilai itu hanya
 * ditulis oleh `suspendCitizenAccounts` (warga meninggal/pindah), jadi tidak membatalkan pemblokiran lain.
 */
export async function reactivateCitizenAccounts(villageId: number, residentIds: number[]): Promise<number> {
  if (residentIds.length === 0) return 0;
  const r = await prisma.citizenAccount.updateMany({
    where: { villageId, residentId: { in: residentIds }, deletedAt: null, status: "SUSPENDED" },
    data: { status: "ACTIVE" },
  });
  return r.count;
}
