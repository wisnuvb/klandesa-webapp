import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { normalizeLocationKey, REGIONAL_ROLES } from "@/lib/regional-policy";
import { requirePlatformSession } from "@/app/api/admin/_auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.role != null) {
    const role = String(body.role).trim();
    if (!(REGIONAL_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }
    data.role = role;
  }
  if (body.scopeProvince != null) {
    data.scopeProvince = body.scopeProvince
      ? normalizeLocationKey(String(body.scopeProvince))
      : null;
  }
  if (body.scopeRegency != null) {
    data.scopeRegency = normalizeLocationKey(String(body.scopeRegency));
  }
  if (body.scopeDistrict != null) {
    data.scopeDistrict = body.scopeDistrict
      ? normalizeLocationKey(String(body.scopeDistrict))
      : null;
  }
  if (body.scopeKodeProvinsi != null) {
    data.scopeKodeProvinsi = body.scopeKodeProvinsi
      ? String(body.scopeKodeProvinsi).trim()
      : null;
  }
  if (body.scopeKodeKabKota != null) {
    data.scopeKodeKabKota = body.scopeKodeKabKota
      ? String(body.scopeKodeKabKota).trim()
      : null;
  }
  if (body.isActive != null) data.isActive = Boolean(body.isActive);
  if (body.password && String(body.password).length >= 6) {
    data.password = await hashPassword(String(body.password));
  }

  try {
    const user = await prisma.regionalUser.update({
      where: { id },
      data,
    });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    await prisma.regionalUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }
}
