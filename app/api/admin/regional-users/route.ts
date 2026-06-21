import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { normalizeLocationKey, REGIONAL_ROLES } from "@/lib/regional-policy";
import { requirePlatformSession } from "@/app/api/admin/_auth";

export const dynamic = "force-dynamic";

function serializeUser(u: {
  id: number;
  email: string;
  name: string;
  role: string;
  scopeProvince: string | null;
  scopeRegency: string;
  scopeDistrict: string | null;
  scopeKodeProvinsi: string | null;
  scopeKodeKabKota: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    scopeProvince: u.scopeProvince,
    scopeRegency: u.scopeRegency,
    scopeDistrict: u.scopeDistrict,
    scopeKodeProvinsi: u.scopeKodeProvinsi,
    scopeKodeKabKota: u.scopeKodeKabKota,
    isActive: u.isActive,
    lastLogin: u.lastLogin?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const query = req.nextUrl.searchParams.get("query")?.trim() ?? "";
  const users = await prisma.regionalUser.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query } },
            { name: { contains: query } },
            { scopeRegency: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ users: users.map(serializeUser) });
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "").trim();
  const scopeProvince = body.scopeProvince
    ? normalizeLocationKey(String(body.scopeProvince))
    : null;
  const scopeRegency = normalizeLocationKey(String(body.scopeRegency ?? ""));
  const scopeDistrict = body.scopeDistrict
    ? normalizeLocationKey(String(body.scopeDistrict))
    : null;
  const scopeKodeProvinsi = body.scopeKodeProvinsi
    ? String(body.scopeKodeProvinsi).trim()
    : null;
  const scopeKodeKabKota = body.scopeKodeKabKota
    ? String(body.scopeKodeKabKota).trim()
    : null;

  if (!email || !password || !name || !role) {
    return NextResponse.json(
      { error: "Email, password, nama, dan role wajib diisi" },
      { status: 400 },
    );
  }
  if (!(REGIONAL_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  }
  if (role === "regional_kecamatan" && !scopeDistrict) {
    return NextResponse.json(
      { error: "Kecamatan wajib untuk role kecamatan" },
      { status: 400 },
    );
  }

  const existing = await prisma.regionalUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }

  const user = await prisma.regionalUser.create({
    data: {
      email,
      password: await hashPassword(password),
      name,
      role,
      scopeProvince,
      scopeRegency: scopeRegency || scopeProvince || "—",
      scopeDistrict,
      scopeKodeProvinsi,
      scopeKodeKabKota,
    },
  });

  return NextResponse.json({ user: serializeUser(user) }, { status: 201 });
}
