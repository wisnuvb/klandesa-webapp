import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getEducationLevel,
  getJob,
  getKKRelationshipStatus,
  getMaritalStatus,
} from "@/utils";
import bcrypt from "bcryptjs";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function mapFamilyRole(id: string) {
  switch (id) {
    case "1":
      return "Kepala Keluarga";
    case "2":
      return "Istri";
    case "3":
      return "Anak";
    default:
      return "Anggota";
  }
}

function mapReligionId(id: string) {
  const map: Record<string, string> = {
    "1": "Islam",
    "2": "Kristen",
    "3": "Katolik",
    "4": "Hindu",
    "5": "Buddha",
    "6": "Konghucu",
  };
  return map[id] ?? id;
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    const body = await req.json();
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    // Basic validation
    const required = [
      "name",
      "id_number",
      "birthplace",
      "date_of_birth",
      "gender",
      "address",
    ];
    const missing = required.filter((k) => !body[k]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Field wajib: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const nik: string = String(body.id_number);
    // Check resident conflict within village
    const existingResident = await prisma.resident.findFirst({
      where: { villageId: village.id, nik },
      select: { id: true },
    });
    if (existingResident) {
      return NextResponse.json(
        { error: "Resident dengan NIK ini sudah ada di desa" },
        { status: 409 },
      );
    }

    const residentData = {
      villageId: village.id,
      nik,
      kk: body.family_card_number || null,
      name: String(body.name),
      birthplace: String(body.birthplace),
      birthDate: new Date(body.date_of_birth),
      gender: String(body.gender),
      bloodType: body.blood_type_id || null,
      religion: mapReligionId(String(body.religion_id ?? "")),
      maritalStatus: getMaritalStatus(String(body.marital_status ?? "")),
      familyRole: getKKRelationshipStatus(body.status_family_id ?? ""),
      address: String(body.address),
      rt: body.rt || null,
      rw: body.rw || null,
      hamlet: body.hamlet || null,
      occupation: getJob(Number(body.job_id ?? 0)),
      education: getEducationLevel(Number(body.education_id ?? 0)),
      phone: body.phone_number || null,
      email: body.email || null,
      isAlive: String(body.is_live ?? "Y") === "Y",
    };

    const result = await prisma.$transaction(async (tx) => {
      const resident = await tx.resident.create({ data: residentData });

      let user: { id: number } | null = null;
      if (body.email) {
        const exists = await tx.user.findUnique({
          where: { email: body.email },
        });
        if (!exists) {
          const tempPassword =
            body.password ?? Math.random().toString(36).slice(-10) + "!A1";
          const hashed = await bcrypt.hash(tempPassword, 10);
          const created = await tx.user.create({
            data: {
              villageId: village.id,
              email: String(body.email),
              password: hashed,
              name: String(body.name),
              phone: body.phone_number || null,
              role: "citizen",
              isActive: true,
            },
            select: { id: true },
          });
          user = created;
        }
      }

      return { resident, user };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/residents error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10);
    const sortKey = url.searchParams.get("sortKey") ?? undefined;
    const sortOrder =
      (url.searchParams.get("sortOrder") as "asc" | "desc") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const gender = url.searchParams.get("gender") ?? undefined; // Laki-laki, Perempuan
    const status = url.searchParams.get("status") ?? undefined; // Belum Kawin, Kawin, Cerai Hidup, Cerai Mati

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const where: any = { villageId: village.id };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nik: { contains: search } },
        { kk: { contains: search } },
      ];
    }
    if (gender && (gender === "Laki-laki" || gender === "Perempuan")) {
      where.gender = gender;
    }
    if (
      status &&
      ["Belum Menikah", "Menikah", "Cerai Hidup", "Cerai Mati"].includes(status)
    ) {
      where.maritalStatus = status;
    }

    let orderBy: any = undefined;
    if (sortKey) {
      let key = sortKey;
      if (sortKey === "id_number") key = "nik";
      else if (sortKey === "family_card_number") key = "kk";
      else if (sortKey === "marital_status") key = "maritalStatus";
      else if (sortKey === "education_id") key = "education";
      else if (sortKey === "job_id") key = "occupation";
      else if (sortKey === "age" || sortKey === "birthDate") key = "birthDate";

      if (key === "birthDate") {
        orderBy = { birthDate: sortOrder === "asc" ? "desc" : "asc" };
      } else {
        orderBy = { [key]: sortOrder ?? "asc" };
      }
    }

    const [rows, total] = await Promise.all([
      prisma.resident.findMany({
        where,
        orderBy: orderBy ?? { createdAt: "desc" },
        skip: Math.max(0, (page - 1) * pageSize),
        take: Math.max(1, pageSize),
      }),
      prisma.resident.count({ where }),
    ]);

    // Return as-is; frontend maps fields
    return NextResponse.json({ rows, total });
  } catch (err) {
    console.error("GET /api/residents error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
