import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import ProdukUKMClient from "./ProdukUKMClient";
import type { UkmProduct } from "./_types";
import { normalizeImageUrls } from "./_utils";
import { parseUkmSettings } from "@/lib/mobile/ukm-logic";

export default async function ProdukUKMPage() {
  const session = await auth();
  const village = await resolveVillage({ session });

  if (!village) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        Desa tidak ditemukan.
      </div>
    );
  }

  const rows = await prisma.potential.findMany({
    where: {
      villageId: village.id,
      category: { in: ["UMKM", "UKM"] },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      subCategory: true,
      productionValue: true,
      productionUnit: true,
      stockQuantity: true,
      productNotes: true,
      images: true,
      status: true,
      contactPhone: true,
      contactVisible: true,
      resident: { select: { id: true, name: true, nik: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  const initialProducts: UkmProduct[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.subCategory ?? null,
    price: p.productionValue ? Number(p.productionValue) : null,
    unit: p.productionUnit ?? null,
    stockQuantity: p.stockQuantity ?? null,
    notes: p.productNotes ?? null,
    images: normalizeImageUrls(p.images),
    status: p.status,
    contact: p.contactPhone ? { phone: p.contactPhone, visible: p.contactVisible } : null,
    owner: p.resident
      ? { id: p.resident.id, name: p.resident.name, nikLast4: p.resident.nik.slice(-4) }
      : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <ProdukUKMClient initialProducts={initialProducts} initialModeration={parseUkmSettings(village.settings).moderation} />;
}
