import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { ACCOUNT_SELECT, createOfficialAccount, pendingInviteIds, serializeAccount } from "@/lib/rbac/accounts";
import { deliverAccessLink } from "@/lib/rbac/access-links";

/** Daftar akun desa (kecuali akun warga) + perangkat aktif yang belum punya akun. Khusus admin (resource `rbac`). */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;

    const [users, officials] = await Promise.all([
      prisma.user.findMany({
        where: { villageId: village.id, NOT: { role: "citizen" } },
        select: ACCOUNT_SELECT,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        take: 500,
      }),
      prisma.official.findMany({
        where: { villageId: village.id, userId: null, status: "active" },
        select: { id: true, name: true, email: true, phone: true, position: { select: { name: true } } },
        orderBy: [{ position: { level: "asc" } }, { name: "asc" }],
        take: 500,
      }),
    ]);

    const pending = await pendingInviteIds(prisma, users.map((u) => u.id));
    return NextResponse.json(
      {
        users: users.map((u) => serializeAccount(u, userId, pending.has(u.id))),
        officialsWithoutAccount: officials.map((o) => ({
          id: o.id,
          name: o.name,
          email: o.email,
          phone: o.phone,
          positionName: o.position?.name ?? null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("GET /api/rbac/users error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/** Buat akun login untuk perangkat desa yang sudah ada. Kata sandi sementara hanya ditampilkan di respons ini. */
export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const officialId = Number(body?.officialId);
    if (!Number.isInteger(officialId) || officialId <= 0) {
      return NextResponse.json({ error: "Perangkat desa tidak valid." }, { status: 400 });
    }

    const r = await createOfficialAccount(prisma, {
      villageId: village.id,
      officialId,
      email: body?.email,
      role: body?.role,
      overrides: body?.permissionOverrides,
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

    await auditWeb(req, loaded.ctx, "create", "users", r.data.userId, {
      officialId,
      email: r.data.email,
      role: r.data.role,
      hasCustomPermissions: Boolean(body?.permissionOverrides),
    });

    // Undangan: tautan sekali pakai untuk membuat kata sandi sendiri. Bila email gagal, tautan dikembalikan untuk disampaikan manual.
    const delivery = await deliverAccessLink(prisma, {
      userId: r.data.userId,
      purpose: "INVITE",
      byAdmin: true,
      invitedBy: loaded.ctx.session.user.name ?? null,
      createdByUserId: loaded.ctx.userId,
    });
    await auditWeb(req, loaded.ctx, "update", "users", r.data.userId, { invite: delivery?.sent ? "sent" : `manual:${delivery?.reason ?? "none"}` });

    return NextResponse.json(
      { userId: r.data.userId, email: r.data.email, role: r.data.role, delivery },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("POST /api/rbac/users error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
