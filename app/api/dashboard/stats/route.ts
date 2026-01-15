/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { calculateAge } from "@/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const village = await resolveVillage({
      req,
      queryVillageCode: villageCode,
      session,
    });
    if (!village) {
      return NextResponse.json(
        {
          error:
            "Tidak ada desa yang tersedia. Login terlebih dahulu atau atur DEFAULT_VILLAGE_CODE di env.",
        },
        { status: 404 }
      );
    }

    const [residents, totalOfficials, totalMailServices, budgets] =
      await Promise.all([
        prisma.resident.findMany({
          where: { villageId: village.id },
          select: { gender: true, birthDate: true, education: true, kk: true },
        }),
        prisma.official.count({ where: { villageId: village.id } }),
        prisma.mailService.count({ where: { villageId: village.id } }),
        prisma.budget.findMany({
          where: { villageId: village.id, status: "active" },
          select: { remainingAmount: true },
        }),
      ]);

    const totalResidents = residents.length;
    const uniqueHouseholds = new Set(
      residents.map((r) => r.kk).filter((kk): kk is string => Boolean(kk))
    ).size;

    const genderCount = residents.reduce(
      (acc, r) => {
        if (r.gender === "Laki-laki") acc.male += 1;
        else if (r.gender === "Perempuan") acc.female += 1;
        return acc;
      },
      { male: 0, female: 0 }
    );

    const ageBuckets = [
      { name: "0-17", min: 0, max: 17 },
      { name: "18-30", min: 18, max: 30 },
      { name: "31-45", min: 31, max: 45 },
      { name: "46-60", min: 46, max: 60 },
      { name: "60+", min: 61, max: 200 },
    ];
    const ageData = ageBuckets.map((bucket) => ({ ...bucket, value: 0 }));

    const educationMap = new Map<string, number>();

    for (const resident of residents) {
      if (resident.birthDate) {
        const age = calculateAge(new Date(resident.birthDate));
        const bucket = ageData.find((b) => age >= b.min && age <= b.max);
        if (bucket) bucket.value += 1;
      }

      const eduKey = resident.education?.trim() || "Tidak diketahui";
      educationMap.set(eduKey, (educationMap.get(eduKey) ?? 0) + 1);
    }

    const educationData = Array.from(educationMap.entries()).map(
      ([name, value]) => ({
        name,
        value,
      })
    );

    const budgetAvailable = budgets.reduce(
      (sum, b) => sum + Number(b.remainingAmount ?? 0),
      0
    );

    return NextResponse.json({
      totals: {
        residents: totalResidents,
        households: uniqueHouseholds,
        officials: totalOfficials,
        mailServices: totalMailServices,
        budgetAvailable,
      },
      charts: {
        gender: [
          { name: "Laki-laki", value: genderCount.male, color: "#0f766e" },
          { name: "Perempuan", value: genderCount.female, color: "#14b8a6" },
        ],
        age: ageData.map(({ name, value }) => ({ name, value })),
        education: educationData,
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
