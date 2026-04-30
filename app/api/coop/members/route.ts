import { NextRequest, NextResponse } from "next/server";
import type { CoopAppRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import {
  loadCoopApiContextWithCooperative,
  requireManage,
} from "@/lib/coop/api-context";

const COOP_ROLES: CoopAppRole[] = ["none", "board", "manager"];

function parseCoopRole(v: unknown): CoopAppRole | null {
  if (typeof v !== "string") return null;
  return COOP_ROLES.includes(v as CoopAppRole) ? (v as CoopAppRole) : null;
}

export async function GET(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;

  const { cooperative } = loaded.ctx;

  const members = await prisma.cooperativeMember.findMany({
    where: { cooperativeId: cooperative.id },
    orderBy: { joinedAt: "desc" },
    include: {
      linkedUser: { select: { id: true, name: true, email: true } },
      resident: { select: { id: true, name: true, nik: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(members),
  });
}

export async function POST(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;

  const { cooperative, village } = loaded.ctx;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  let name = typeof body.name === "string" ? body.name.trim() : "";
  const residentIdParsed =
    body.residentId != null ? parseInt(String(body.residentId), 10) : NaN;
  if (body.residentId != null && !Number.isFinite(residentIdParsed)) {
    return NextResponse.json({ error: "residentId tidak valid" }, { status: 400 });
  }
  const residentId = Number.isFinite(residentIdParsed)
    ? residentIdParsed
    : undefined;

  if (residentId !== undefined) {
    const resident = await prisma.resident.findFirst({
      where: { id: residentId, villageId: village.id },
    });
    if (!resident) {
      return NextResponse.json(
        { error: "Warga tidak ditemukan di desa ini" },
        { status: 400 },
      );
    }
    if (!name) name = resident.name;
  }

  if (!name) {
    return NextResponse.json({ error: "Nama anggota wajib diisi" }, { status: 400 });
  }

  const nik =
    typeof body.nik === "string" ? body.nik.trim().slice(0, 16) || null : null;
  const membershipNumber =
    typeof body.membershipNumber === "string"
      ? body.membershipNumber.trim().slice(0, 50) || null
      : null;

  let joinedAt = new Date();
  if (typeof body.joinedAt === "string" && body.joinedAt) {
    const d = new Date(body.joinedAt);
    if (!Number.isNaN(d.getTime())) joinedAt = d;
  }

  const status =
    typeof body.status === "string" ? body.status.slice(0, 50) : "active";

  const linkedParsed =
    body.linkedUserId != null ? parseInt(String(body.linkedUserId), 10) : NaN;
  if (body.linkedUserId != null && !Number.isFinite(linkedParsed)) {
    return NextResponse.json(
      { error: "linkedUserId tidak valid" },
      { status: 400 },
    );
  }
  const linkedUserId = Number.isFinite(linkedParsed) ? linkedParsed : undefined;

  if (linkedUserId !== undefined) {
    const linked = await prisma.user.findFirst({
      where: { id: linkedUserId, villageId: village.id },
    });
    if (!linked) {
      return NextResponse.json(
        { error: "Akun pengguna tidak ditemukan di desa ini" },
        { status: 400 },
      );
    }
  }

  const coopAppRole =
    parseCoopRole(body.coopAppRole) ?? ("none" as CoopAppRole);

  if (linkedUserId == null && coopAppRole !== "none") {
    return NextResponse.json(
      {
        error:
          "Pengurus/manager aplikasi harus taut ke akun dashboard (linkedUserId)",
      },
      { status: 400 },
    );
  }
  const boardTitle =
    typeof body.boardTitle === "string"
      ? body.boardTitle.trim().slice(0, 120) || null
      : null;
  const notes =
    typeof body.notes === "string" ? body.notes.trim() || null : null;

  try {
    const member = await prisma.cooperativeMember.create({
      data: {
        cooperativeId: cooperative.id,
        residentId: residentId ?? null,
        name: name.slice(0, 255),
        nik,
        membershipNumber,
        joinedAt,
        status,
        linkedUserId: linkedUserId ?? null,
        coopAppRole,
        boardTitle,
        notes,
      },
      include: {
        linkedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: toJSONSafe(member),
      message: "Anggota ditambahkan",
    });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (msg === "P2002") {
      return NextResponse.json(
        { error: "Akun ini sudah terhubung ke anggota lain di koperasi" },
        { status: 409 },
      );
    }
    throw e;
  }
}
