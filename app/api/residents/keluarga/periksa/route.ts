import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { checkFamily } from "@/lib/kependudukan/family-service";

/**
 * Periksa satu keluarga sebelum disimpan (tanpa menulis): aturan keluarga, KK yang sudah ada, NIK yang sudah dipakai.
 * Memakai izin buat warga (POST /api/residents → create), jadi peran baca-saja tidak bisa memakainya.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { village } = guard.ctx;
    const check = await checkFamily(prisma, village.id, await req.json().catch(() => null));
    if (!check) return NextResponse.json({ error: "Data keluarga tidak valid." }, { status: 400 });
    return NextResponse.json({
      ok: !check.blocking,
      issues: check.issues,
      existing: check.existing,
      parentsFilled: check.parentsFilled,
      members: check.input.members.map((m) => ({ fatherName: m.fatherName, fatherNik: m.fatherNik ? `••••${m.fatherNik.slice(-4)}` : "", motherName: m.motherName, motherNik: m.motherNik ? `••••${m.motherNik.slice(-4)}` : "" })),
    });
  } catch (e) {
    console.error("POST /api/residents/keluarga/periksa error:", e);
    return NextResponse.json({ error: "Gagal memeriksa data keluarga" }, { status: 500 });
  }
}
