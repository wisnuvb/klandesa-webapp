import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  mergeMailSectionIntoVillageSettings,
  parseMailSettings,
} from "@/lib/mail/letterFormSnapshot";
import {
  inferWilayahCodesFromText,
  isValidWilayahCodes,
  mergeWilayahIntoVillageSettings,
  parseWilayahSettings,
  resolveWilayahLabelsFromCodes,
  type VillageWilayahCodes,
} from "@/lib/village/wilayah-settings";

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
    let wilayah = parseWilayahSettings(village.settings);
    if (!isValidWilayahCodes(wilayah)) {
      wilayah = await inferWilayahCodesFromText(
        village.province,
        village.regency,
      );
    }

    return NextResponse.json({
      id: village.id,
      code: village.code,
      name: village.name,
      district: village.district,
      regency: village.regency,
      province: village.province,
      wilayah,
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
      wilayah: wilayahBody,
    } = body ?? {};

    const n = typeof name === "string" ? name.trim() : "";
    const d = typeof district === "string" ? district.trim() : "";
    const a = typeof address === "string" ? address.trim() : "";

    let wilayahCodes: VillageWilayahCodes = { kode_provinsi: "", kode_kab_kota: "" };
    if (wilayahBody && typeof wilayahBody === "object" && !Array.isArray(wilayahBody)) {
      const w = wilayahBody as Record<string, unknown>;
      wilayahCodes = {
        kode_provinsi: String(w.kode_provinsi ?? "").trim(),
        kode_kab_kota: String(w.kode_kab_kota ?? "").trim(),
      };
    }

    if (!n || !d || !a) {
      return NextResponse.json(
        {
          error: "Nama desa, kecamatan, dan alamat wajib diisi",
        },
        { status: 400 },
      );
    }

    if (!isValidWilayahCodes(wilayahCodes)) {
      return NextResponse.json(
        {
          error:
            "Pilih provinsi dan kabupaten/kota dari daftar resmi (Kemendag).",
        },
        { status: 400 },
      );
    }

    const labels = await resolveWilayahLabelsFromCodes(wilayahCodes);
    if (!labels) {
      return NextResponse.json(
        { error: "Kombinasi provinsi dan kabupaten/kota tidak valid." },
        { status: 400 },
      );
    }

    const p = labels.province;
    const r = labels.regency;

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

    const withWilayah = mergeWilayahIntoVillageSettings(
      withIntegrations,
      wilayahCodes,
    );

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
        settings: withWilayah as Prisma.InputJsonValue,
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
