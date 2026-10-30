/** Aturan murni: kapan akun mobile seorang warga tidak boleh aktif lagi. */

/**
 * Warga meninggal atau sudah pindah tidak boleh memakai akun mobile desa ini.
 * (Pendaftaran juga menolak keduanya: lib/mobile/citizen-register.ts.)
 */
export function residentLeavesVillage(r: { isAlive?: boolean | null; moveDate?: Date | null }): boolean {
  return r.isAlive === false || r.moveDate instanceof Date;
}
