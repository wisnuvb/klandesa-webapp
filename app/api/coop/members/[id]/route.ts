import { NextRequest, NextResponse } from "next/server";
import type { CoopAppRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import {
  loadCoopApiContextWithCooperative,
  requireManage,
} from "@/lib/coop/api-context";

const COOP_ROLES: CoopAppRole[] = ["none", "board", "manager"];

function parseCoopRole(v: unknown): CoopAppRole | undefined {
  if (typeof v !== "string") return undefined;
  return COOP_ROLES.includes(v as CoopAppRole) ? (v as CoopAppRole) : undefined;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const { cooperative, village } = loaded.ctx;
  const existing = await prisma.cooperativeMember.findFirst({
    where: { id, cooperativeId: cooperative.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  let linkedUserId: number | null | undefined = undefined;
  if ("linkedUserId" in body) {
    if (body.linkedUserId == null || body.linkedUserId === "") {
      linkedUserId = null;
    } else {
      linkedUserId = parseInt(String(body.linkedUserId), 10);
      if (!Number.isFinite(linkedUserId)) {
        return NextResponse.json(
          { error: "linkedUserId tidak valid" },
          { status: 400 },
        );
      }
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
  }

  let residentId: number | null | undefined = undefined;
  if ("residentId" in body) {
    if (body.residentId == null || body.residentId === "") {
      residentId = null;
    } else {
      const rid = parseInt(String(body.residentId), 10);
      if (!Number.isFinite(rid)) {
        return NextResponse.json(
          { error: "residentId tidak valid" },
          { status: 400 },
        );
      }
      const resident = await prisma.resident.findFirst({
        where: { id: rid, villageId: village.id },
      });
      if (!resident) {
        return NextResponse.json(
          { error: "Warga tidak ditemukan di desa ini" },
          { status: 400 },
        );
      }
      residentId = rid;
    }
  }

  const coopAppRole =
    parseCoopRole(body.coopAppRole) !== undefined
      ? parseCoopRole(body.coopAppRole)!
      : undefined;

  const resolvedLinked =
    linkedUserId !== undefined ? linkedUserId : existing.linkedUserId;

  if (
    coopAppRole &&
    coopAppRole !== "none" &&
    resolvedLinked == null
  ) {
    return NextResponse.json(
      {
        error:
          "Akses pengurus/manager memerlukan tautan akun (linkedUserId)",
      },
      { status: 400 },
    );
  }

  const patchName =
    typeof body.name === "string" ? body.name.trim().slice(0, 255) : undefined;
  const patchNik =
    typeof body.nik === "string" ? body.nik.trim().slice(0, 16) || null : undefined;
  const patchNum =
    typeof body.membershipNumber === "string"
      ? body.membershipNumber.trim().slice(0, 50) || null
      : undefined;
  const patchStatus =
    typeof body.status === "string"
      ? body.status.trim().slice(0, 50)
      : undefined;
  const patchBoardTitle =
    typeof body.boardTitle === "string"
      ? body.boardTitle.trim().slice(0, 120) || null
      : undefined;
  const patchNotes =
    typeof body.notes === "string" ? body.notes.trim() || null : undefined;

  let joinedAt: Date | undefined;
  if (typeof body.joinedAt === "string" && body.joinedAt) {
    const d = new Date(body.joinedAt);
    if (!Number.isNaN(d.getTime())) joinedAt = d;
  }

  try {
    const updated = await prisma.cooperativeMember.update({
      where: { id },
      data: {
        ...(patchName !== undefined && { name: patchName }),
        ...(patchNik !== undefined && { nik: patchNik }),
        ...(patchNum !== undefined && { membershipNumber: patchNum }),
        ...(linkedUserId !== undefined && { linkedUserId }),
        ...(residentId !== undefined && { residentId }),
        ...(coopAppRole !== undefined && { coopAppRole }),
        ...(patchStatus !== undefined && { status: patchStatus }),
        ...(patchBoardTitle !== undefined && { boardTitle: patchBoardTitle }),
        ...(patchNotes !== undefined && { notes: patchNotes }),
        ...(joinedAt !== undefined && { joinedAt }),
      },
      include: {
        linkedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: toJSONSafe(updated),
      message: "Anggota diperbarui",
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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;

  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const { cooperative } = loaded.ctx;
  const deleted = await prisma.cooperativeMember.deleteMany({
    where: { id, cooperativeId: cooperative.id },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Anggota dihapus",
  });
}
