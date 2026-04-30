import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/utils";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { normalizeOccupation } from "@/lib/statistics/occupation";
import { normalizeEducation } from "@/lib/statistics/education";
import { getAgeRange } from "@/lib/statistics/age-range";
import { requireVillageApiContext } from "@/lib/api-village-context";

// Interface untuk response data
interface StatisticsResponse {
  summary: {
    totalPenduduk: number;
    lakiLaki: number;
    perempuan: number;
    pertumbuhanBulanIni: number;
    persentasePertumbuhan: number;
  };
  jenisKelamin: Array<{ name: string; value: number; percentage: number }>;
  usia: Array<{
    range: string;
    lakilaki: number;
    perempuan: number;
    total: number;
  }>;
  pendidikan: Array<{ tingkat: string; jumlah: number }>;
  pekerjaan: Array<{ pekerjaan: string; jumlah: number }>;
  perkawinan: Array<{ status: string; jumlah: number }>;
  agama: Array<{ agama: string; jumlah: number }>;
  golonganDarah: Array<{ golongan: string; jumlah: number }>;
  wilayah: Array<{ wilayah: string; jumlah: number }>;
  kesehatan: Array<{ kategori: string; jumlah: number }>;
  trend: Array<{ bulan: string; jumlah: number }>;
}

// Cache untuk data statistik (5 menit)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = new Map<
  string,
  { data: StatisticsResponse; timestamp: number }
>();

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { searchParams } = new URL(req.url);
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();

    // Check cache
    const cacheKey = `stats-${village.id}-${year}`;
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

    // 10. Trend Kependudukan (6 bulan terakhir)
    // Untuk demo, kita hitung berdasarkan createdAt
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const currentMonth = new Date().getMonth();
    const trendData: Array<{ bulan: string; jumlah: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];

      // Untuk lebih akurat, ini harus query ke database dengan filter tanggal
      // Tapi untuk sekarang kita gunakan total saat ini sebagai baseline
      trendData.push({
        bulan: monthName,
        jumlah: totalPenduduk - i * 3, // Simulasi pertumbuhan
      });
    }

    // Pertumbuhan bulan ini (simulasi)
    const pertumbuhanBulanIni = 3;
    const persentasePertumbuhan = parseFloat(
      ((pertumbuhanBulanIni / totalPenduduk) * 100).toFixed(2)
    );

    // Prepare response data
    const responseData = {
      summary: {
        totalPenduduk,
        lakiLaki: genderStats["Laki-laki"] || 0,
        perempuan: genderStats["Perempuan"] || 0,
        pertumbuhanBulanIni,
        persentasePertumbuhan,
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
      trend: trendData,
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
export async function DELETE() {
  cache.clear();
  return NextResponse.json({ success: true, message: "Cache cleared" });
}
