/** Kategori pekerjaan untuk statistik — harus sama dengan agregasi di `/api/statistics`. */
export function normalizeOccupation(occupation: string | null): string {
  if (!occupation) return "Tidak Bekerja";
  const occ = occupation.toLowerCase();

  if (occ.includes("petani") || occ.includes("bertani")) return "Petani";
  if (occ.includes("dagang") || occ.includes("pedagang")) return "Pedagang";
  if (occ.includes("pns") || occ.includes("pegawai negeri")) return "PNS";
  if (occ.includes("wiraswasta") || occ.includes("wirausaha"))
    return "Wiraswasta";
  if (occ.includes("buruh")) return "Buruh";
  if (
    occ.includes("pelajar") ||
    occ.includes("mahasiswa") ||
    occ.includes("siswa")
  )
    return "Pelajar/Mahasiswa";
  if (occ.includes("ibu rumah tangga") || occ.includes("irt"))
    return "Ibu Rumah Tangga";
  if (occ.includes("tidak bekerja") || occ.includes("belum bekerja"))
    return "Tidak Bekerja";

  return occupation;
}
