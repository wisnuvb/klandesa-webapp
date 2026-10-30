export const AGE_BUCKETS = [
  { name: "0-17", min: 0, max: 17 },
  { name: "18-30", min: 18, max: 30 },
  { name: "31-45", min: 31, max: 45 },
  { name: "46-60", min: 46, max: 60 },
  { name: "60+", min: 61, max: 200 },
] as const;

/** Akhir hari ini dikurangi `years` tahun. Orang berusia >= `years` lahir pada atau sebelum tanggal ini (sama dengan `calculateAge`). */
function endOfDayYearsAgo(now: Date, years: number): Date {
  return new Date(now.getFullYear() - years, now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

export type AgeBucketRange = { name: string; /** lahir <= ini (usia >= min) */ bornOnOrBefore: Date; /** lahir > ini (usia <= max) */ bornAfter: Date };

/** Rentang tanggal lahir per kelompok usia, supaya pengelompokan dilakukan di database, bukan dengan memuat semua warga. */
export function ageBucketRanges(now: Date = new Date()): AgeBucketRange[] {
  return AGE_BUCKETS.map((b) => ({
    name: b.name,
    bornOnOrBefore: endOfDayYearsAgo(now, b.min),
    bornAfter: endOfDayYearsAgo(now, b.max + 1),
  }));
}
