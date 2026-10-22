import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { roleCan, normalizeVillageRole } from "@/lib/permissions";

/** Setujui / tolak pendaftaran warga. Tolak = hapus akun agar warga bisa mendaftar ulang dengan data benar. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await requireMobileContext(req, { allow: ["staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  if (!roleCan("residents", "update", normalizeVillageRole(ctx.role))) {
    return mobileError("FORBIDDEN", "Anda tidak punya akses.", 403);
  }
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { decision?: unknown } | null;
  if (!Number.isInteger(id) || (body?.decision !== "approve" && body?.decision !== "reject")) {
    return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const account = await prisma.citizenAccount.findFirst({ where: { id, villageId: ctx.villageId, status: "PENDING_VERIFY" } });
  if (!account) return mobileError("INVALID_REQUEST", "Pendaftaran tidak ditemukan.", 404);

  if (body.decision === "approve") {
    await prisma.citizenAccount.update({ where: { id }, data: { status: "ACTIVE" } });
  } else {
    await prisma.citizenAccount.delete({ where: { id } });
  }
  return new NextResponse(null, { status: 204 });
}
