import { mirror } from "@/lib/pangan/service";
import { isWilayahCode, type KabKotaRow } from "@/lib/pangan/region-master";

/**
 * Daftar kab/kota dari cermin DB (diisi cron sync-pangan, fallback ambil langsung dari sumber).
 * Khusus server: region-master tetap murni karena diimpor komponen klien.
 * Mengembalikan [] bila kode tak valid atau cermin & sumber sama-sama tak tersedia — pemanggil
 * yang perlu membedakan "kosong" dari "gagal" memakai `mirror.getKabKota` langsung.
 */
export async function fetchKabKotaList(kodeProvinsi: string): Promise<KabKotaRow[]> {
  const kode = kodeProvinsi.trim();
  if (!isWilayahCode(kode, "provinsi")) return [];
  try {
    const { rows } = await mirror.getKabKota(kode);
    return rows;
  } catch (e) {
    console.error("[pangan] fetchKabKotaList gagal", kode, e instanceof Error ? e.message : e);
    return [];
  }
}
