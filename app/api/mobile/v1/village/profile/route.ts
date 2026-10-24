import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileContext } from "@/lib/mobile/context";
import { readVillageInfoSettings, visibleOfficials } from "@/lib/mobile/village-info-logic";

/** Info Desa untuk warga dan staf: kontak kantor, jam layanan, nomor penting, dan perangkat desa. Tanpa NIK/telepon pribadi perangkat. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req);
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  const [village, officials] = await Promise.all([
    prisma.village.findUnique({
      where: { id: ctx.villageId },
      select: { name: true, district: true, regency: true, province: true, address: true, postalCode: true, phone: true, email: true, website: true, logoUrl: true, settings: true },
    }),
    prisma.official.findMany({
      where: { villageId: ctx.villageId, status: "active" },
      select: { id: true, name: true, photoUrl: true, status: true, endDate: true, position: { select: { name: true, level: true } } },
      take: 100,
    }),
  ]);
  if (!village) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Desa tidak ditemukan." } }, { status: 404 });
  const info = readVillageInfoSettings(village.settings);

  return NextResponse.json({
    village: {
      name: village.name, district: village.district, regency: village.regency, province: village.province,
      address: village.address, postalCode: village.postalCode, phone: village.phone, email: village.email,
      website: village.website, logoUrl: village.logoUrl,
    },
    serviceHours: info.serviceHours,
    emergencyContacts: info.emergencyContacts,
    budgetPublic: info.budgetPublic,
    officials: visibleOfficials(officials).map((o) => ({ id: o.id, name: o.name, position: o.position.name, photoUrl: o.photoUrl })),
  });
}
