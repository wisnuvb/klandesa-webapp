/** Normalisasi tingkat pendidikan — sama dengan agregasi di `/api/statistics`. */
export function normalizeEducation(education: string | null): string {
  if (!education) return "Tidak Diketahui";
  const edu = education.toLowerCase();

  if (edu.includes("tidak") && edu.includes("sekolah")) return "Tidak Sekolah";
  if (edu.includes("sd") || edu.includes("sekolah dasar")) return "SD";
  if (edu.includes("smp") || edu.includes("sltp")) return "SMP";
  if (edu.includes("sma") || edu.includes("smk") || edu.includes("slta"))
    return "SMA/SMK";
  if (edu.includes("d3") || edu.includes("diploma")) return "D3";
  if (edu.includes("s1") || edu.includes("sarjana")) return "S1";
  if (edu.includes("s2") || edu.includes("magister") || edu.includes("master"))
    return "S2";
  if (edu.includes("s3") || edu.includes("doktor")) return "S3";

  return education;
}
