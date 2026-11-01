import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/utils";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { normalizeOccupation } from "@/lib/statistics/occupation";
import { normalizeEducation } from "@/lib/statistics/education";
import { getAgeRange } from "@/lib/statistics/age-range";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { isKependudukanV2 } from "@/lib/kependudukan/sync";
import type { MutationType } from "@/lib/kependudukan/mutation";
import { buildPopulationChange, mutationRange } from "@/lib/statistics/population-change";
import type { StatisticsData } from "@/lib/statistics/types";

// Cache untuk data statistik (5 menit)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = new Map<
  string,
  { data: StatisticsData; timestamp: number }
>();

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    // Statistik selalu potret data penduduk saat ini; tidak ada data historis per tahun.
    const cacheKey = `stats-${village.id}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    // Fetch semua residents yang masih hidup dengan select fields yang minimal
    const residents = await prisma.resident.findMany({
      where: {
        villageId: village.id,
        isAlive: true,
      },
      select: {
        gender: true,
        birthDate: true,
        education: true,
        occupation: true,
        maritalStatus: true,
        religion: true,
        bloodType: true,
        hamlet: true,
        rt: true,
        rw: true,
        isDisability: true,
        isBpjsKis: true,
        isPregnant: true,
        isStunting: true,
        isBreastfeeding: true,
      },
    });

    // Total penduduk
    const totalPenduduk = residents.length;

    // 1. Statistik Jenis Kelamin
    const genderStats = residents.reduce((acc, r) => {
      const gender = r.gender;
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataJenisKelamin = [
      {
        name: "Laki-laki",
        value: genderStats["Laki-laki"] || 0,
        percentage: parseFloat(
          (((genderStats["Laki-laki"] || 0) / totalPenduduk) * 100).toFixed(1)
        ),
      },
      {
        name: "Perempuan",
        value: genderStats["Perempuan"] || 0,
        percentage: parseFloat(
          (((genderStats["Perempuan"] || 0) / totalPenduduk) * 100).toFixed(1)
        ),
      },
    ];

    // 2. Statistik Usia (dengan breakdown gender)
    const ageRanges = [
      "0-4",
      "5-9",
      "10-14",
      "15-19",
      "20-24",
      "25-29",
      "30-34",
      "35-39",
      "40-44",
      "45-49",
      "50-54",
      "55-59",
      "60+",
    ];

    const ageStats = residents.reduce((acc, r) => {
      const age = calculateAge(new Date(r.birthDate));
      const range = getAgeRange(age);
      const gender = r.gender.toUpperCase() === "M" ? "lakilaki" : "perempuan";

      if (!acc[range]) {
        acc[range] = { lakilaki: 0, perempuan: 0 };
      }
      acc[range][gender]++;

      return acc;
    }, {} as Record<string, { lakilaki: number; perempuan: number }>);

    const dataUsia = ageRanges.map((range) => ({
      range,
      lakilaki: ageStats[range]?.lakilaki || 0,
      perempuan: ageStats[range]?.perempuan || 0,
      total:
        (ageStats[range]?.lakilaki || 0) + (ageStats[range]?.perempuan || 0),
    }));

    // 3. Statistik Pendidikan
    const educationStats = residents.reduce((acc, r) => {
      const edu = normalizeEducation(r.education);
      acc[edu] = (acc[edu] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataPendidikan = Object.entries(educationStats)
      .map(([tingkat, jumlah]) => ({ tingkat, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    // 4. Statistik Pekerjaan
    const occupationStats = residents.reduce((acc, r) => {
      const occ = normalizeOccupation(r.occupation);
      acc[occ] = (acc[occ] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataPekerjaan = Object.entries(occupationStats)
      .map(([pekerjaan, jumlah]) => ({ pekerjaan, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    // 5. Statistik Status Perkawinan
    const maritalStats = residents.reduce((acc, r) => {
      const status = r.maritalStatus || "Tidak Diketahui";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataPerkawinan = Object.entries(maritalStats)
      .map(([status, jumlah]) => ({ status, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    // 6. Statistik Agama
    const religionStats = residents.reduce((acc, r) => {
      const agama = r.religion || "Tidak Diketahui";
      acc[agama] = (acc[agama] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataAgama = Object.entries(religionStats)
      .map(([agama, jumlah]) => ({ agama, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    // 7. Statistik Golongan Darah
    const bloodTypeStats = residents.reduce((acc, r) => {
      const type = r.bloodType || "Tidak Diketahui";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataGolonganDarah = Object.entries(bloodTypeStats)
      .map(([golongan, jumlah]) => ({ golongan, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    // 8. Statistik Wilayah (Dusun)
    const hamletStats = residents.reduce((acc, r) => {
      const dusun = r.hamlet || "Tidak Diketahui";
      acc[dusun] = (acc[dusun] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataWilayah = Object.entries(hamletStats)
      .map(([wilayah, jumlah]) => ({ wilayah, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    // 9. Statistik Kesehatan
    const healthStats = {
      disabilitas: residents.filter((r) => r.isDisability).length,
      bpjs: residents.filter((r) => r.isBpjsKis).length,
      ibuHamil: residents.filter((r) => r.isPregnant).length,
      ibuMenyusui: residents.filter((r) => r.isBreastfeeding).length,
      balitaStunting: residents.filter((r) => r.isStunting).length,
    };

    const dataKesehatan = [
      { kategori: "Penyandang Disabilitas", jumlah: healthStats.disabilitas },
      { kategori: "Peserta BPJS/KIS", jumlah: healthStats.bpjs },
      { kategori: "Ibu Hamil", jumlah: healthStats.ibuHamil },
      { kategori: "Ibu Menyusui", jumlah: healthStats.ibuMenyusui },
      { kategori: "Balita Stunting", jumlah: healthStats.balitaStunting },
    ];

    // 10. Perubahan penduduk 6 bulan terakhir dari mutasi yang sudah diterapkan.
    // Hanya desa Kependudukan v2 yang mencatat mutasi; selain itu tidak ada data asli untuk ditampilkan.
    const now = new Date();
    let perubahanPenduduk: StatisticsData["perubahanPenduduk"] = null;
    if (isKependudukanV2(village.settings)) {
      const { from, to } = mutationRange(now);
      const mutations = await prisma.residentMutation.findMany({
        where: {
          villageId: village.id,
          status: "APPLIED",
          effectiveDate: {
            gte: new Date(`${from}T00:00:00.000Z`),
            lte: new Date(`${to}T00:00:00.000Z`),
          },
        },
        select: { type: true, effectiveDate: true, rw: true, rt: true },
      });
      perubahanPenduduk = buildPopulationChange(
        mutations.map((m) => ({
          type: m.type as MutationType,
          effectiveDate: m.effectiveDate.toISOString().slice(0, 10),
          rw: m.rw,
          rt: m.rt,
        })),
        totalPenduduk,
        now,
      );
    }

    // Prepare response data
    const responseData: StatisticsData = {
      summary: {
        totalPenduduk,
        lakiLaki: genderStats["Laki-laki"] || 0,
        perempuan: genderStats["Perempuan"] || 0,
      },
      jenisKelamin: dataJenisKelamin,
      usia: dataUsia,
      pendidikan: dataPendidikan,
      pekerjaan: dataPekerjaan,
      perkawinan: dataPerkawinan,
      agama: dataAgama,
      golonganDarah: dataGolonganDarah,
      wilayah: dataWilayah,
      kesehatan: dataKesehatan,
      perubahanPenduduk,
      dihitungPada: now.toISOString(),
    };

    // Store in cache
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    // Response
    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data statistik" },
      { status: 500 }
    );
  }
}

// Optional: endpoint untuk clear cache
export async function DELETE(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  cache.delete(`stats-${loaded.ctx.village.id}`);
  return NextResponse.json({ success: true, message: "Cache cleared" });
}
