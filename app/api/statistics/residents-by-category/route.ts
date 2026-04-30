import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/utils";
import { normalizeOccupation } from "@/lib/statistics/occupation";
import { normalizeEducation } from "@/lib/statistics/education";
import { getAgeRange } from "@/lib/statistics/age-range";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";

const DIMENSIONS = new Set([
  "occupation",
  "marital_status",
  "religion",
  "education",
  "blood_type",
  "gender",
  "hamlet",
  "age_range",
  "health",
]);

type ResidentDb = {
  id: number;
  name: string;
  nik: string;
  kk: string | null;
  gender: string;
  birthDate: Date;
  occupation: string | null;
  maritalStatus: string | null;
  religion: string | null;
  education: string | null;
  bloodType: string | null;
  hamlet: string | null;
  rt: string | null;
  rw: string | null;
  isDisability: boolean | null;
  isBpjsKis: boolean | null;
  isPregnant: boolean | null;
  isBreastfeeding: boolean | null;
  isStunting: boolean | null;
};

export type StatisticResidentRow = {
  id: number;
  name: string;
  nik: string;
  kk: string | null;
  gender: string;
  birthDate: string;
  occupation: string | null;
  maritalStatus: string | null;
  religion: string | null;
  education: string | null;
  bloodType: string | null;
  hamlet: string | null;
  rt: string | null;
  rw: string | null;
};

function matchesHealthCategory(
  r: Pick<
    ResidentDb,
    | "isDisability"
    | "isBpjsKis"
    | "isPregnant"
    | "isBreastfeeding"
    | "isStunting"
  >,
  category: string,
): boolean {
  switch (category) {
    case "Penyandang Disabilitas":
      return !!r.isDisability;
    case "Peserta BPJS/KIS":
      return !!r.isBpjsKis;
    case "Ibu Hamil":
      return !!r.isPregnant;
    case "Ibu Menyusui":
      return !!r.isBreastfeeding;
    case "Balita Stunting":
      return !!r.isStunting;
    default:
      return false;
  }
}

function matchesDimension(
  r: ResidentDb,
  dimension: string,
  category: string,
): boolean {
  switch (dimension) {
    case "occupation":
      return normalizeOccupation(r.occupation) === category;
    case "marital_status":
      return (r.maritalStatus || "Tidak Diketahui") === category;
    case "religion":
      return (r.religion || "Tidak Diketahui") === category;
    case "education":
      return normalizeEducation(r.education) === category;
    case "blood_type":
      return (r.bloodType || "Tidak Diketahui") === category;
    case "gender":
      return r.gender === category;
    case "hamlet":
      return (r.hamlet || "Tidak Diketahui") === category;
    case "age_range": {
      const age = calculateAge(new Date(r.birthDate));
      return getAgeRange(age) === category;
    }
    case "health":
      return matchesHealthCategory(r, category);
    default:
      return false;
  }
}

function compareResidents(
  a: ResidentDb,
  b: ResidentDb,
  sortKey: string | undefined,
  sortOrder: string | undefined,
): number {
  const dir = sortOrder === "desc" ? -1 : 1;
  const key = sortKey ?? "name";
  if (key === "name") return a.name.localeCompare(b.name, "id") * dir;
  if (key === "nik") return a.nik.localeCompare(b.nik) * dir;
  if (key === "gender") return a.gender.localeCompare(b.gender) * dir;
  if (key === "birthDate") {
    return (
      (a.birthDate.getTime() - b.birthDate.getTime()) * dir
    );
  }
  if (key === "hamlet") {
    return (a.hamlet ?? "").localeCompare(b.hamlet ?? "", "id") * dir;
  }
  if (key === "occupation") {
    return (a.occupation ?? "").localeCompare(b.occupation ?? "", "id") * dir;
  }
  if (key === "maritalStatus") {
    return (a.maritalStatus ?? "").localeCompare(b.maritalStatus ?? "", "id") * dir;
  }
  if (key === "religion") {
    return (a.religion ?? "").localeCompare(b.religion ?? "", "id") * dir;
  }
  if (key === "education") {
    return (a.education ?? "").localeCompare(b.education ?? "", "id") * dir;
  }
  if (key === "bloodType") {
    return (a.bloodType ?? "").localeCompare(b.bloodType ?? "", "id") * dir;
  }
  return a.name.localeCompare(b.name, "id") * dir;
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { searchParams } = new URL(req.url);
    const dimension = searchParams.get("dimension")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";

    if (!dimension || !DIMENSIONS.has(dimension)) {
      return NextResponse.json(
        { error: "Parameter dimension tidak valid" },
        { status: 400 },
      );
    }
    if (!category) {
      return NextResponse.json(
        { error: "Parameter category wajib" },
        { status: 400 },
      );
    }

    const search = searchParams.get("search")?.trim() ?? "";
    const genderFilter = searchParams.get("gender") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const rawPageSize = Number(searchParams.get("pageSize") ?? 10);
    const pageSize = Math.min(100, Math.max(1, rawPageSize || 10));
    const sortKey = searchParams.get("sortKey") ?? undefined;
    const sortOrder = searchParams.get("sortOrder") ?? undefined;

    const residents = await prisma.resident.findMany({
      where: {
        villageId: village.id,
        isAlive: true,
      },
      select: {
        id: true,
        name: true,
        nik: true,
        kk: true,
        gender: true,
        birthDate: true,
        occupation: true,
        maritalStatus: true,
        religion: true,
        education: true,
        bloodType: true,
        hamlet: true,
        rt: true,
        rw: true,
        isDisability: true,
        isBpjsKis: true,
        isPregnant: true,
        isBreastfeeding: true,
        isStunting: true,
      },
    });

    let filtered: ResidentDb[] = residents.filter((r) =>
      matchesDimension(r as ResidentDb, dimension, category),
    );

    if (genderFilter === "Laki-laki" || genderFilter === "Perempuan") {
      filtered = filtered.filter((r) => r.gender === genderFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.nik.includes(search.replace(/\s/g, "")),
      );
    }

    filtered.sort((a, b) => compareResidents(a, b, sortKey, sortOrder));

    const total = filtered.length;
    const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

    const rows: StatisticResidentRow[] = slice.map((r) => ({
      id: r.id,
      name: r.name,
      nik: r.nik,
      kk: r.kk,
      gender: r.gender,
      birthDate: r.birthDate.toISOString(),
      occupation: r.occupation,
      maritalStatus: r.maritalStatus,
      religion: r.religion,
      education: r.education,
      bloodType: r.bloodType,
      hamlet: r.hamlet,
      rt: r.rt,
      rw: r.rw,
    }));

    return NextResponse.json({ rows, total });
  } catch (error) {
    console.error("GET /api/statistics/residents-by-category:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data penduduk" },
      { status: 500 },
    );
  }
}
