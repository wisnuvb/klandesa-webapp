import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ageBucketRanges } from "./age-buckets";

type ResidentAggregate = Record<string, bigint | number | string | null>;

const num = (v: bigint | number | string | null | undefined) => Number(v ?? 0);

/**
 * Ringkasan warga dihitung di database (satu pemindaian indeks villageId), bukan dengan memuat
 * semua baris warga ke memori aplikasi. Data IDM sengaja tidak ada di sini: lihat /api/dashboard/idm.
 */
export async function aggregateResidents(villageId: number) {
  const ranges = ageBucketRanges();
  const ageColumns = ranges.map(
    (r, i) =>
      Prisma.sql`COALESCE(SUM(birthDate <= ${r.bornOnOrBefore} AND birthDate > ${r.bornAfter}), 0) AS ${Prisma.raw(`age${i}`)}`,
  );
  const [row] = await prisma.$queryRaw<ResidentAggregate[]>(Prisma.sql`
    SELECT
      COUNT(*) AS total,
      COUNT(DISTINCT NULLIF(kk, '')) AS households,
      COALESCE(SUM(gender = 'Laki-laki'), 0) AS male,
      COALESCE(SUM(gender = 'Perempuan'), 0) AS female,
      ${Prisma.join(ageColumns)}
    FROM residents
    WHERE villageId = ${villageId}
  `);

  const education = await prisma.resident.groupBy({
    by: ["education"],
    where: { villageId },
    _count: { _all: true },
  });
  // Gabungkan nilai kosong/spasi ke satu kelompok, sama seperti sebelumnya.
  const educationMap = new Map<string, number>();
  for (const e of education) {
    const key = e.education?.trim() || "Tidak diketahui";
    educationMap.set(key, (educationMap.get(key) ?? 0) + e._count._all);
  }

  return {
    total: num(row?.total),
    households: num(row?.households),
    male: num(row?.male),
    female: num(row?.female),
    age: ranges.map((r, i) => ({ name: r.name, value: num(row?.[`age${i}`]) })),
    education: Array.from(educationMap.entries()).map(([name, value]) => ({ name, value })),
  };
}
