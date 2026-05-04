import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  mergeMailSectionIntoVillageSettings,
  parseMailSettings,
} from "@/lib/mail/letterFormSnapshot";

type VillageIntegrationSettings = {
  idmVillageCode: string;
};

function parseIntegrationSettings(
  settings: unknown,
): VillageIntegrationSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { idmVillageCode: "" };
  }
  const o = settings as Record<string, unknown>;
  const integrations =
    o.integrations &&
    typeof o.integrations === "object" &&
    !Array.isArray(o.integrations)
      ? (o.integrations as Record<string, unknown>)
      : null;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    idmVillageCode: str(integrations?.idmVillageCode),
  };
}

function mergeIntegrationSettingsIntoVillageSettings(
  existing: unknown,
  integrations: Partial<VillageIntegrationSettings>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const prev = parseIntegrationSettings(existing);
  const next: VillageIntegrationSettings = {
    idmVillageCode: integrations.idmVillageCode ?? prev.idmVillageCode,
  };
  return {
    ...base,
    integrations: {
      idmVillageCode: next.idmVillageCode,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const mail = parseMailSettings(village.settings);
    const integrations = parseIntegrationSettings(village.settings);

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
      integrations,
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
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

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
      integrations,
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

    if (integrations !== undefined) {
      if (
        !integrations ||
        typeof integrations !== "object" ||
        Array.isArray(integrations)
      ) {
        return NextResponse.json(
          { error: "Data integrasi tidak valid" },
          { status: 400 },
        );
      }
      const code = String(
        (integrations as Record<string, unknown>).idmVillageCode ?? "",
      ).trim();
      if (
        code &&
        (!/^\d+$/.test(code) || code.length < 8 || code.length > 13)
      ) {
        return NextResponse.json(
          { error: "Kode desa IDM tidak valid" },
          { status: 400 },
        );
      }
    }

    const newSettings = mergeMailSectionIntoVillageSettings(village.settings, {
      kepalaDesaNama: String(mail.kepalaDesaNama ?? "").trim(),
      kepalaDesaNip: String(mail.kepalaDesaNip ?? "").trim(),
      sekretarisNama: String(mail.sekretarisNama ?? "").trim(),
      camatNama: String(mail.camatNama ?? "").trim(),
    });

    const withIntegrations =
      integrations === undefined
        ? newSettings
        : mergeIntegrationSettingsIntoVillageSettings(newSettings, {
            idmVillageCode: String(
              (integrations as Record<string, unknown>).idmVillageCode ?? "",
            ).trim(),
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
        phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
        email: typeof email === "string" && email.trim() ? email.trim() : null,
        website:
          typeof website === "string" && website.trim() ? website.trim() : null,
        logoUrl:
          typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null,
        settings: withIntegrations as Prisma.InputJsonValue,
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
