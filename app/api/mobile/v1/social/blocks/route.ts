import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireSocial } from "@/lib/mobile/social";

export async function GET(req: NextRequest) {
  const g = await requireSocial(req, { allowWithoutTerms: true });
  if (!g.ok) return g.response;
  const rows = await prisma.socialBlock.findMany({ where: { blockerType: g.s.me.type, blockerId: g.s.account.id }, orderBy: { createdAt: "desc" }, take: 200 });
  const accounts = await prisma.citizenAccount.findMany({
    where: { id: { in: rows.filter((r) => r.blockedType === "citizen").map((r) => r.blockedId) } },
    select: { id: true, resident: { select: { name: true } } },
  });
  const names = new Map(accounts.map((a) => [a.id, a.resident.name]));
  return NextResponse.json({ items: rows.map((r) => ({ accountType: r.blockedType, accountId: r.blockedId, name: names.get(r.blockedId)?.split(/\s+/).slice(0, 2).join(" ") ?? "Warga" })) });
}

/** Blokir/buka blokir akun warga: `{ accountId, blocked }`. Konten kedua pihak saling tersembunyi. */
export async function POST(req: NextRequest) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  if (s.me.type === "staff") return mobileError("FORBIDDEN", "Perangkat desa tidak memblokir akun. Gunakan Moderasi Warga.", 403);
  const body = (await req.json().catch(() => null)) as { accountId?: unknown; blocked?: unknown; accountType?: unknown } | null;
  if (body?.accountType === "staff") return mobileError("INVALID_REQUEST", "Akun resmi perangkat desa tidak dapat diblokir.", 400);
  const target = Number(body?.accountId);
  if (!Number.isInteger(target) || typeof body?.blocked !== "boolean") return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  if (target === s.account.id) return mobileError("INVALID_REQUEST", "Tidak bisa memblokir diri sendiri.", 400);
  const exists = await prisma.citizenAccount.findFirst({ where: { id: target, villageId: s.ctx.villageId }, select: { id: true } });
  if (!exists) return mobileError("INVALID_REQUEST", "Akun tidak ditemukan.", 404);

  const key = { blockerType_blockerId_blockedType_blockedId: { blockerType: "citizen", blockerId: s.account.id, blockedType: "citizen", blockedId: target } };
  if (body.blocked) {
    await prisma.socialBlock.upsert({ where: key, create: { blockerType: "citizen", blockerId: s.account.id, blockedType: "citizen", blockedId: target }, update: {} });
  } else {
    await prisma.socialBlock.deleteMany({ where: { blockerType: "citizen", blockerId: s.account.id, blockedType: "citizen", blockedId: target } });
  }
  return new NextResponse(null, { status: 204 });
}
