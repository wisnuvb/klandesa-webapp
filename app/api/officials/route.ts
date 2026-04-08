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

  const firstVillage = await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });
  if (firstVillage) return firstVillage;

  return null;
}

function normalizeStatus(status?: string) {
  if (!status) return undefined;
  const value = status.toLowerCase();
  if (value === "active") return "active";
  if (value === "inactive") return "inactive";
  if (value === "retired") return "retired";
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.max(
      1,
      Number(url.searchParams.get("pageSize") ?? 50)
    );
    const search = url.searchParams.get("search") ?? undefined;
    const status = normalizeStatus(url.searchParams.get("status") ?? undefined);
    const positionId = url.searchParams.get("positionId");
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const village = await resolveVillage(req, villageCode, session);
    if (!village) {
      return NextResponse.json(
        {
          error:
            "Tidak ada desa yang tersedia. Login terlebih dahulu atau atur DEFAULT_VILLAGE_CODE di env.",
        },
        { status: 404 }
      );
    }

    const where: any = { villageId: village.id };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nik: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (positionId) {
      where.positionId = Number(positionId);
    }

    const [rows, total, activeCount, positions] = await Promise.all([
      prisma.official.findMany({
        where,
        include: { position: true },
        orderBy: [{ position: { level: "asc" } }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.official.count({ where }),
      prisma.official.count({ where: { ...where, status: "active" } }),
      prisma.position.findMany({
        where: { villageId: village.id },
        orderBy: [{ level: "asc" }, { name: "asc" }],
      }),
    ]);

    const mapped = rows.map((o) => ({
      id: o.id,
      name: o.name,
      nik: o.nik,
      supervisorId: o.supervisorId,
      photoUrl: o.photoUrl,
      email: o.email,
      phone: o.phone,
      gender: o.gender === "F" ? "F" : "M",
      birthplace: o.birthplace,
      birthDate: o.birthDate?.toISOString() ?? null,
      address: o.address,
      status: o.status,
      education: o.education,
      position: o.position
        ? { id: o.position.id, name: o.position.name, level: o.position.level }
        : null,
    }));

    return NextResponse.json({
      rows: mapped,
      total,
      activeCount,
      positions,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("GET /api/officials error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Session is optional - allow both authenticated and unauthenticated requests
    // This is useful for testing and development. In production, add proper API key/token auth if needed.
    const session = await getServerSession(authOptions);

    const village = await resolveVillage(req, undefined, session);
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      id_number,
      nik,
      supervisor_id,
      supervisorId,
      email,
      phone_number,
      gender,
      birthplace,
      date_of_birth,
      address,
      village_staff_position_id,
      education_id,
      sk_number,
      sk_date,
      start_date,
      status,
    } = body;

    // Handle both id_number and nik
    const nikValue = id_number || nik;
    const supervisorInput =
      supervisor_id !== undefined ? supervisor_id : supervisorId;
    const parsedSupervisorId =
      supervisorInput === null ||
      supervisorInput === undefined ||
      supervisorInput === ""
        ? null
        : Number(supervisorInput);

    // Validation
    if (
      !name ||
      !nikValue ||
      !birthplace ||
      !date_of_birth ||
      !address ||
      !village_staff_position_id ||
      !start_date
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Handle position_id: can be numeric ID or position name
    let positionId: number;
    if (typeof village_staff_position_id === "string") {
      const isNumeric = !isNaN(Number(village_staff_position_id));
      if (isNumeric) {
        positionId = Number(village_staff_position_id);
      } else {
        // Look up position by name
        const positionByName = await prisma.position.findFirst({
          where: {
            villageId: village.id,
            name: village_staff_position_id,
          },
        });
        if (!positionByName) {
          return NextResponse.json(
            { error: `Position "${village_staff_position_id}" not found` },
            { status: 404 }
          );
        }
        positionId = positionByName.id;
      }
    } else {
      positionId = Number(village_staff_position_id);
    }

    // Verify position exists and belongs to village
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position || position.villageId !== village.id) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    if (parsedSupervisorId !== null && Number.isNaN(parsedSupervisorId)) {
      return NextResponse.json(
        { error: "Supervisor tidak valid" },
        { status: 400 }
      );
    }

    if (parsedSupervisorId !== null) {
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

    // Create official
    const official = await prisma.official.create({
      data: {
        villageId: village.id,
        positionId: positionId,
        supervisorId: parsedSupervisorId,
        nik: nikValue,
        name,
        birthplace,
        birthDate: new Date(date_of_birth),
        gender: gender || "M",
        phone: phone_number || null,
        email: email || null,
        address,
        startDate: new Date(start_date),
        education: education_id ? String(education_id) : null,
        certification:
          sk_number && sk_date ? `SK: ${sk_number}, Tanggal: ${sk_date}` : null,
        status: (status || "active").toLowerCase(),
      },
      include: { position: true },
    });

    const mapped = {
      id: official.id,
      name: official.name,
      nik: official.nik,
      supervisorId: official.supervisorId,
      photoUrl: official.photoUrl,
      email: official.email,
      phone: official.phone,
      gender: official.gender === "F" ? "F" : "M",
      birthplace: official.birthplace,
      birthDate: official.birthDate?.toISOString() ?? null,
      address: official.address,
      status: official.status,
      education: official.education,
      position: official.position
        ? {
            id: official.position.id,
            name: official.position.name,
            level: official.position.level,
          }
        : null,
    };

    return NextResponse.json(mapped, { status: 201 });
  } catch (err) {
    console.error("POST /api/officials error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
