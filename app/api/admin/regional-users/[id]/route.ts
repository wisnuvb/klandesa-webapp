import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { normalizeLocationKey, REGIONAL_ROLES } from "@/lib/regional-policy";
import { buildRegionalScopeFromUser } from "@/lib/regional-scope-user";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf, auditBefore, parsePositiveInt } from "@/lib/platform/legacy-audit";
import { readJsonObject, requireRisky } from "@/lib/platform/legacy-risky";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

const SCOPE_FIELDS = ["scopeProvince", "scopeRegency", "scopeDistrict", "scopeKodeProvinsi", "scopeKodeKabKota"] as const;

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id: idStr } = await ctx.params;
  const id = parsePositiveInt(idStr);
  if (id == null) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await readJsonObject(req);
  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  // Berisiko (butuh konfirmasi sandi admin + alasan): reset sandi, ubah peran/lingkup, aktifkan ulang.
  // Tetap tanpa step-up: ubah nama saja, dan NONAKTIFKAN (tindakan protektif saat insiden tidak boleh terhambat).
  const risky =
    (body.password != null && body.password !== "") ||
    body.role != null ||
    SCOPE_FIELDS.some((f) => body[f] != null) ||
    body.isActive === true;
  let reason: string | null = null;
  if (risky) {
    const step = await requireRisky(auth.admin, body, req);
    if (!step.ok) return step.response;
    reason = step.reason;
  }

  const before = await prisma.regionalUser.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true, isActive: true,
      scopeProvince: true, scopeRegency: true, scopeDistrict: true, scopeKodeProvinsi: true, scopeKodeKabKota: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.name != null) {
    const name = String(body.name).trim();
    if (!name || name.length > 255) {
      return NextResponse.json({ error: "Nama wajib diisi (maks 255 karakter)" }, { status: 400 });
    }
    data.name = name;
  }
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
  for (const f of SCOPE_FIELDS) {
    const v = data[f];
    if (typeof v === "string" && v.length > (f.startsWith("scopeKode") ? 10 : 255)) {
      return NextResponse.json({ error: "Salah satu isian wilayah terlalu panjang" }, { status: 400 });
    }
  }
  if (body.isActive != null) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive harus true/false" }, { status: 400 });
    }
    data.isActive = body.isActive;
  }

  let passwordReset = false;
  if (body.password != null && body.password !== "") {
    const pw = String(body.password);
    if (pw.length < MIN_PASSWORD || pw.length > MAX_PASSWORD) {
      return NextResponse.json(
        { error: `Password harus ${MIN_PASSWORD}–${MAX_PASSWORD} karakter` },
        { status: 400 },
      );
    }
    data.password = await hashPassword(pw);
    // Sandi direset admin -> sesi web lama pengguna regional ini berakhir.
    data.sessionVersion = { increment: 1 };
    passwordReset = true;
  }

  // Peran/lingkup yang diubah harus tetap menghasilkan lingkup yang utuh (jika tidak, sesi akun ditolak diam-diam).
  const scopeTouched = "role" in data || SCOPE_FIELDS.some((f) => f in data);
  if (scopeTouched) {
    const merged = { ...before, ...data } as typeof before;
    if (!buildRegionalScopeFromUser(merged)) {
      return NextResponse.json({ error: "Lingkup wilayah tidak lengkap untuk role ini" }, { status: 400 });
    }
  }

  // Jejak: satu baris per jenis perubahan. Reset sandi / peran / lingkup / aktifkan = akses -> ketat sebelum efek.
  // Nonaktifkan (tindakan protektif, mis. saat insiden) memakai jejak biasa agar tidak pernah terhambat.
  const actor = actorOf(auth);
  const who = `"${before.name}" (${before.email})`;
  const changedFields = Object.keys(data).filter((k) => k !== "password" && k !== "sessionVersion");
  const accessChanged = scopeTouched || data.isActive === true;
  const deactivating = data.isActive === false && before.isActive;
  const entries: { entry: Parameters<typeof auditBefore>[2]; strict: boolean }[] = [];
  const target = { targetType: "system" as const, targetId: `regional_user:${id}` };
  if (passwordReset) {
    entries.push({
      strict: true,
      entry: { ...target, action: "regional_user.reset_password", summary: `Mereset kata sandi akun pemda ${who}; sesi lama dicabut`, metadata: { regionalUserId: id, email: before.email, reason } },
    });
  }
  if (accessChanged) {
    entries.push({
      strict: true,
      entry: {
        ...target,
        action: data.isActive === true && !scopeTouched ? "regional_user.activate" : "regional_user.update",
        summary: `Mengubah akun pemda ${who}: ${changedFields.join(", ")}`,
        metadata: {
          regionalUserId: id,
          reason,
          changedFields,
          before: { role: before.role, isActive: before.isActive, scopeProvince: before.scopeProvince, scopeRegency: before.scopeRegency, scopeDistrict: before.scopeDistrict, scopeKodeProvinsi: before.scopeKodeProvinsi, scopeKodeKabKota: before.scopeKodeKabKota },
          after: Object.fromEntries(changedFields.map((k) => [k, data[k]])),
        },
      },
    });
  }
  if (deactivating) {
    entries.push({
      strict: false,
      entry: { ...target, action: "regional_user.deactivate", summary: `Menonaktifkan akun pemda ${who}`, metadata: { regionalUserId: id, email: before.email } },
    });
  }
  if (!passwordReset && !accessChanged && !deactivating && changedFields.length > 0) {
    entries.push({
      strict: false,
      entry: { ...target, action: "regional_user.update", summary: `Mengubah akun pemda ${who}: ${changedFields.join(", ")}`, metadata: { regionalUserId: id, changedFields } },
    });
  }

  for (const e of entries.filter((x) => x.strict)) {
    const blocked = await auditBefore(req, actor, e.entry);
    if (blocked) return blocked;
  }

  try {
    const user = await prisma.regionalUser.update({
      where: { id },
      data,
    });
    for (const e of entries.filter((x) => !x.strict)) await auditPlatform(req, actor, e.entry);
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

/**
 * DELETE (konfirmasi sandi + alasan wajib). Bawaan TIDAK menghapus permanen: akun dinonaktifkan dan sesinya dicabut
 * (bisa diaktifkan ulang; log akses dan email tetap utuh). Hapus permanen hanya bila body memuat `permanent: true`.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id: idStr } = await ctx.params;
  const id = parsePositiveInt(idStr);
  if (id == null) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const body = await readJsonObject(req);
  if (!body) {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const step = await requireRisky(auth.admin, body, req);
  if (!step.ok) return step.response;
  const permanent = body.permanent === true;

  const before = await prisma.regionalUser.findUnique({ where: { id }, select: { email: true, name: true, role: true, scopeRegency: true, isActive: true } });
  if (!before) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const target = { targetType: "system" as const, targetId: `regional_user:${id}` };
  if (!permanent) {
    // Penghapusan lunak = nonaktifkan + cabut sesi (protektif): jejak biasa, tidak boleh terhambat.
    try {
      await prisma.regionalUser.update({ where: { id }, data: { isActive: false, sessionVersion: { increment: 1 } } });
    } catch {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    await auditPlatform(req, actorOf(auth), {
      ...target,
      action: "regional_user.deactivate",
      summary: `Menghapus (menonaktifkan) akun pemda "${before.name}" (${before.email}); sesi dicabut`,
      metadata: { regionalUserId: id, email: before.email, role: before.role, via: "delete", reason: step.reason },
    });
    return NextResponse.json({ ok: true, permanent: false, deactivated: true });
  }

  // Hapus permanen (log akses regional ikut terhapus lewat cascade): jejak ketat SEBELUM efek.
  const blocked = await auditBefore(req, actorOf(auth), {
    ...target,
    action: "regional_user.delete",
    summary: `Menghapus permanen akun pemda "${before.name}" (${before.email}) peran ${before.role}, wilayah ${before.scopeRegency}`,
    metadata: { regionalUserId: id, email: before.email, role: before.role, reason: step.reason },
  });
  if (blocked) return blocked;

  try {
    await prisma.regionalUser.delete({ where: { id } });
    return NextResponse.json({ ok: true, permanent: true });
  } catch {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }
}
