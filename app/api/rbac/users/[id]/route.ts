import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { ACCOUNT_SELECT, serializeAccount, updateAccount } from "@/lib/rbac/accounts";

/** Ubah peran, izin per akun, status aktif, atau reset kata sandi. Khusus admin (resource `rbac`). */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const targetUserId = /^\d{1,10}$/.test(id) ? Number(id) : NaN;
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });

    const r = await updateAccount(prisma, {
      villageId: village.id,
      actorUserId: userId,
      targetUserId,
      role: body.role,
      permissionOverrides: body.permissionOverrides,
      isActive: body.isActive,
      resetPassword: body.resetPassword,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

    const row = await prisma.user.findFirst({ where: { id: targetUserId, villageId: village.id }, select: ACCOUNT_SELECT });
    if (!row) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
    const account = serializeAccount(row, userId);

    await auditWeb(req, loaded.ctx, "update", "users", targetUserId, {
      roleFrom: r.data.before.role,
      roleTo: account.role,
      activeFrom: r.data.before.isActive,
      activeTo: account.isActive,
      overridesFrom: r.data.before.overrides,
      overridesTo: account.overrides,
      passwordReset: r.data.tempPassword ? true : undefined,
    });

    return NextResponse.json(
      { account, ...(r.data.tempPassword ? { tempPassword: r.data.tempPassword } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("PATCH /api/rbac/users/[id] error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
