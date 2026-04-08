/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";

async function resolveVillage(
  req: NextRequest,
  queryVillageCode?: string,
  session?: any
) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }

  if (queryVillageCode) {
    const village = await prisma.village.findUnique({
      where: { code: queryVillageCode },
    });
    if (village) return village;
  }

  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const village = await prisma.village.findUnique({ where: { code: sub } });
    if (village) return village;
  }

  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const village = await prisma.village.findUnique({
      where: { code: defaultCode },
    });
    if (village) return village;
  }

  return prisma.village.findFirst({ orderBy: { id: "asc" } });
}

function normalizeStatus(status?: string) {
  if (!status) return undefined;
  const value = status.toLowerCase();
  if (value === "active") return "active";
  if (value === "inactive") return "inactive";
  if (value === "retired") return "retired";
  return undefined;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const officialId = Number(id);

    if (Number.isNaN(officialId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const village = await resolveVillage(req, undefined, session);
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const existing = await prisma.official.findUnique({
      where: { id: officialId },
    });

    if (!existing || existing.villageId !== village.id) {
      return NextResponse.json(
        { error: "Perangkat tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      phone_number,
      gender,
      birthplace,
      date_of_birth,
      address,
      village_staff_position_id,
      education_id,
      status,
      supervisor_id,
      supervisorId,
    } = body;

    const data: any = {};

    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email || null;
    if (phone_number !== undefined) data.phone = phone_number || null;
    if (gender !== undefined) data.gender = gender;
    if (birthplace !== undefined) data.birthplace = birthplace;
    if (date_of_birth !== undefined) data.birthDate = new Date(date_of_birth);
    if (address !== undefined) data.address = address;
    if (education_id !== undefined) data.education = education_id || null;

    if (status !== undefined) {
      const normalized = normalizeStatus(status);
      if (!normalized) {
        return NextResponse.json(
          { error: "Status tidak valid" },
          { status: 400 }
        );
      }
      data.status = normalized;
    }

    if (village_staff_position_id !== undefined) {
      const positionId = Number(village_staff_position_id);
      if (Number.isNaN(positionId)) {
        return NextResponse.json(
          { error: "Jabatan tidak valid" },
          { status: 400 }
        );
      }

      const position = await prisma.position.findUnique({
        where: { id: positionId },
      });

      if (!position || position.villageId !== village.id) {
        return NextResponse.json(
          { error: "Jabatan tidak ditemukan" },
          { status: 404 }
        );
      }

      data.positionId = positionId;
    }

    const supervisorInput =
      supervisor_id !== undefined ? supervisor_id : supervisorId;
    if (supervisorInput !== undefined) {
      const parsedSupervisorId =
        supervisorInput === null || supervisorInput === ""
          ? null
          : Number(supervisorInput);

      if (parsedSupervisorId !== null) {
        if (Number.isNaN(parsedSupervisorId) || parsedSupervisorId === officialId) {
          return NextResponse.json(
            { error: "Supervisor tidak valid" },
            { status: 400 }
          );
        }

        const supervisor = await prisma.official.findUnique({
          where: { id: parsedSupervisorId },
          select: { id: true, villageId: true },
        });

        if (!supervisor || supervisor.villageId !== village.id) {
          return NextResponse.json(
            { error: "Supervisor tidak ditemukan" },
            { status: 404 }
          );
        }
      }

      data.supervisorId = parsedSupervisorId;
    }

    const updated = await prisma.official.update({
      where: { id: officialId },
      data,
      include: { position: true },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      nik: updated.nik,
      supervisorId: updated.supervisorId,
      photoUrl: updated.photoUrl,
      email: updated.email,
      phone: updated.phone,
      gender: updated.gender === "F" ? "F" : "M",
      birthplace: updated.birthplace,
      birthDate: updated.birthDate?.toISOString() ?? null,
      address: updated.address,
      status: updated.status,
      education: updated.education,
      position: updated.position
        ? {
            id: updated.position.id,
            name: updated.position.name,
            level: updated.position.level,
          }
        : null,
    });
  } catch (err) {
    console.error("PATCH /api/officials/[id] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const officialId = Number(id);

    if (Number.isNaN(officialId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const village = await resolveVillage(req, undefined, session);
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const existing = await prisma.official.findUnique({
      where: { id: officialId },
      select: { id: true, villageId: true },
    });

    if (!existing || existing.villageId !== village.id) {
      return NextResponse.json(
        { error: "Perangkat tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.official.delete({ where: { id: officialId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/officials/[id] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
