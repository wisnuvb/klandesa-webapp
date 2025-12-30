/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";
import { authOptions } from "@/auth";
import {
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  RELIGION_OPTIONS,
} from "@/utils/constants/user";

async function resolveVillage(
  req: NextRequest,
  queryVillageCode?: string,
  session?: any
) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }
  if (queryVillageCode) {
    const village = await prisma.village.findUnique({
      where: { code: queryVillageCode },
    });
    if (village) return village;
  }
  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const village = await prisma.village.findUnique({ where: { code: sub } });
    if (village) return village;
  }
  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const village = await prisma.village.findUnique({
      where: { code: defaultCode },
    });
    if (village) return village;
  }
  const firstVillage = await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });
  if (firstVillage) return firstVillage;
  return null;
}

function findKeyByValue<T extends Record<string | number, string>>(
  obj: T,
  value: string
): number {
  const entry = Object.entries(obj).find(([, v]) => v === value);
  return entry ? Number(entry[0]) : 0;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ kk: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;
    const { kk } = await ctx.params;

    const village = await resolveVillage(req, villageCode, session);
    if (!village) {
      return NextResponse.json({ error: "Tidak ada desa." }, { status: 404 });
    }

    const members = await prisma.resident.findMany({
      where: { villageId: village.id, kk },
      orderBy: [{ familyRole: "asc" }, { name: "asc" }],
    });

    if (members.length === 0) {
      return NextResponse.json(
        { error: "KK tidak ditemukan" },
        { status: 404 }
      );
    }

    const head =
      members.find((m) => m.familyRole === "Kepala Keluarga") ?? members[0];
    const mappedMembers = members.map((m) => ({
      id: m.id,
      name: m.name,
      id_number: m.nik,
      gender: m.gender === "M" ? "M" : "F",
      birthplace: m.birthplace,
      date_of_birth: m.birthDate.toISOString(),
      religion_id: findKeyByValue(RELIGION_OPTIONS, m.religion),
      education_id: findKeyByValue(EDUCATION_OPTIONS, m.education ?? ""),
      job_id: findKeyByValue(JOB_OPTIONS, m.occupation ?? ""),
      marital_status: m.maritalStatus.startsWith("Belum")
        ? "TM"
        : m.maritalStatus.startsWith("Kawin")
        ? "M"
        : m.maritalStatus.startsWith("Cerai Hidup")
        ? "CH"
        : m.maritalStatus.startsWith("Cerai Mati")
        ? "CM"
        : m.maritalStatus,
      status_family: m.familyRole,
      is_live: m.isAlive ? "Y" : "N",
      role: "CITIZEN",
    }));

    const summary = {
      id: kk,
      family_card_number: kk,
      kepalaKeluarga: head.name,
      alamat: head.address,
      rt: head.rt ?? "-",
      rw: head.rw ?? "-",
      hamlet: head.hamlet ?? "-",
      jumlahAnggota: members.length,
      anggotaKeluarga: mappedMembers,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/kk/[kk] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
