import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import {
  mergeMailSectionIntoVillageSettings,
  parseMailSettings,
} from "@/lib/mail/letterFormSnapshot";

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    const village = await resolveVillage({ req, session });

    if (!village) {
      return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
    }

    const mail = parseMailSettings(village.settings);

    return NextResponse.json({
      id: village.id,
      code: village.code,
      name: village.name,
      district: village.district,
      regency: village.regency,
      province: village.province,
      address: village.address,
      postalCode: village.postalCode ?? "",
      phone: village.phone ?? "",
      email: village.email ?? "",
      website: village.website ?? "",
      logoUrl: village.logoUrl ?? "",
      mail,
    });
  } catch (err) {
    console.error("GET /api/village/profile error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      district,
      regency,
      province,
      address,
      postalCode,
      phone,
      email,
      website,
      logoUrl,
      mail,
    } = body ?? {};

    const n = typeof name === "string" ? name.trim() : "";
    const d = typeof district === "string" ? district.trim() : "";
    const r = typeof regency === "string" ? regency.trim() : "";
    const p = typeof province === "string" ? province.trim() : "";
    const a = typeof address === "string" ? address.trim() : "";

    if (!n || !d || !r || !p || !a) {
      return NextResponse.json(
        {
          error:
            "Nama desa, kecamatan, kabupaten, provinsi, dan alamat wajib diisi",
        },
        { status: 400 },
      );
    }

    if (!mail || typeof mail !== "object" || Array.isArray(mail)) {
      return NextResponse.json(
        { error: "Data pengaturan surat tidak valid" },
        { status: 400 },
      );
    }

    const newSettings = mergeMailSectionIntoVillageSettings(village.settings, {
      kepalaDesaNama: String(mail.kepalaDesaNama ?? "").trim(),
      kepalaDesaNip: String(mail.kepalaDesaNip ?? "").trim(),
      sekretarisNama: String(mail.sekretarisNama ?? "").trim(),
      camatNama: String(mail.camatNama ?? "").trim(),
    });

    await prisma.village.update({
      where: { id: village.id },
      data: {
        name: n,
        district: d,
        regency: r,
        province: p,
        address: a,
        postalCode:
          typeof postalCode === "string" && postalCode.trim()
            ? postalCode.trim()
            : null,
        phone:
          typeof phone === "string" && phone.trim() ? phone.trim() : null,
        email:
          typeof email === "string" && email.trim() ? email.trim() : null,
        website:
          typeof website === "string" && website.trim()
            ? website.trim()
            : null,
        logoUrl:
          typeof logoUrl === "string" && logoUrl.trim()
            ? logoUrl.trim()
            : null,
        settings: newSettings as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/village/profile error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
