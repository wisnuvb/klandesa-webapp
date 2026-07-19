import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  RELIGION_OPTIONS,
} from "@/utils/constants/user";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

function findKeyByValue<T extends Record<string | number, string>>(
  obj: T,
  value: string,
): number {
  const entry = Object.entries(obj).find(([, v]) => v === value);
  return entry ? Number(entry[0]) : 0;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ kk: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const { kk } = await ctx.params;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const members = await prisma.resident.findMany({
      where: { villageId: village.id, kk },
      orderBy: [{ familyRole: "asc" }, { name: "asc" }],
    });

    if (members.length === 0) {
      return NextResponse.json(
        { error: "KK tidak ditemukan" },
        { status: 404 },
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
      { status: 500 },
    );
  }
}
