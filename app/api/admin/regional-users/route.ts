import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { normalizeLocationKey, REGIONAL_ROLES } from "@/lib/regional-policy";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { actorOf, auditBefore } from "@/lib/platform/legacy-audit";
import { readRisky } from "@/lib/platform/legacy-risky";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

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

  // Membuat akun pemda dengan sandi pilihan = mengeluarkan akses: wajib konfirmasi sandi admin + alasan.
  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;
  const body = risky.body;

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
  if (email.length > 255 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return NextResponse.json(
      { error: `Password harus ${MIN_PASSWORD}–${MAX_PASSWORD} karakter` },
      { status: 400 },
    );
  }
  if (
    name.length > 255 ||
    (scopeProvince?.length ?? 0) > 255 ||
    scopeRegency.length > 255 ||
    (scopeDistrict?.length ?? 0) > 255 ||
    (scopeKodeProvinsi?.length ?? 0) > 10 ||
    (scopeKodeKabKota?.length ?? 0) > 10
  ) {
    return NextResponse.json({ error: "Salah satu isian wilayah/nama terlalu panjang" }, { status: 400 });
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

  // Lingkup harus cukup untuk peran itu; tanpa ini akun jadi tak bisa dipakai (sesi ditolak) atau berlingkup tak jelas.
  if (role === "regional_kabupaten" && !scopeRegency && !scopeKodeKabKota) {
    return NextResponse.json({ error: "Kabupaten/kota wajib untuk role kabupaten" }, { status: 400 });
  }
  if (role === "regional_provinsi" && !scopeProvince && !scopeKodeProvinsi) {
    return NextResponse.json({ error: "Provinsi wajib untuk role provinsi" }, { status: 400 });
  }

  const existing = await prisma.regionalUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }

  // Membuat akun dengan sandi = mengeluarkan akses: jejak (ketat) SEBELUM efek. Sandi tidak pernah masuk jejak.
  const scopeLabel = scopeDistrict || scopeRegency || scopeProvince || "—";
  const blocked = await auditBefore(req, actorOf(auth), {
    action: "regional_user.create",
    targetType: "system",
    targetId: `regional_user:${email}`,
    summary: `Membuat akun pemda "${name}" (${email}) peran ${role}, wilayah ${scopeLabel}`,
    metadata: { reason: risky.reason, email, name, role, scopeProvince, scopeRegency, scopeDistrict, scopeKodeProvinsi, scopeKodeKabKota },
  });
  if (blocked) return blocked;

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
