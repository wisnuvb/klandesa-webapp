import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  RELIGION_OPTIONS,
} from "@/utils/constants/user";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { auditWeb } from "@/lib/audit/web-audit";
import { canVillageUser } from "@/lib/permissions/can";
import { normalizeGender } from "@/lib/residents/gender";
import { maskDigits } from "@/lib/kependudukan/kk-list";
import { resolveKkKey } from "@/lib/kependudukan/kk-list-service";

function findKeyByValue<T extends Record<string | number, string>>(
  obj: T,
  value: string,
): number {
  const entry = Object.entries(obj).find(([, v]) => v === value);
  return entry ? Number(entry[0]) : 0;
}

/**
 * Detail satu KK. `[kk]` boleh berupa `ref` (id salah satu anggota, dipakai halaman /data-kk) atau nomor KK (rute lama).
 * NIK dan nomor KK dikirim tersamar; versi lengkap hanya untuk pemegang izin `residents.export` (admin) lewat `?full=1`
 * dan dicatat di jejak audit (tanpa nomor lengkap).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ kk: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId, session } = loaded.ctx;

    const { kk: key } = await ctx.params;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const wantFull = req.nextUrl.searchParams.get("full") === "1";
    const canFull = canVillageUser(session, "residents", "export");
    if (wantFull && !canFull) {
      return NextResponse.json({ error: "Hanya admin yang boleh melihat NIK dan nomor KK lengkap." }, { status: 403 });
    }

    const kk = await resolveKkKey(prisma, village.id, key);
    if (!kk) {
      return NextResponse.json({ error: "KK tidak ditemukan" }, { status: 404 });
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
      id_number: wantFull ? m.nik : maskDigits(m.nik),
      gender: normalizeGender(m.gender) === "Laki-laki" ? "M" : "F",
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
      /** Hidup dan belum tercatat pindah keluar (dasar anggota yang bisa dipindahkan saat Pecah KK). */
      is_active: m.isAlive && m.moveDate == null,
      role: "CITIZEN",
    }));

    if (wantFull) {
      await auditWeb(req, { userId, village }, "reveal", "kk", `kk-${kk.slice(-4)}`, { members: members.length });
    }

    const summary = {
      id: String(Math.min(...members.map((m) => m.id))),
      /** Pegangan buram untuk membuka detail dan Pecah KK tanpa nomor KK. */
      ref: Math.min(...members.map((m) => m.id)),
      family_card_number: wantFull ? kk : maskDigits(kk),
      revealed: wantFull,
      canFull,
      kepalaKeluarga: head.name,
      alamat: head.address,
      rt: head.rt ?? "-",
      rw: head.rw ?? "-",
      hamlet: head.hamlet ?? "-",
      jumlahAnggota: members.length,
      anggotaKeluarga: mappedMembers,
    };

    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/kk/[kk] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
