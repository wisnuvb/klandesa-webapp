import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk } from "@/lib/api-v1/http";
import { publicFieldView } from "@/lib/custom-data/public";
import { toFieldDef } from "@/lib/custom-data/service";
import { publicFields } from "@/lib/custom-data/public";

/** Daftar tabel data kustom desa beserta kolom yang boleh dibaca (hanya kolom bukan data pribadi). */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "data-kustom:read");
  if (!auth.ok) return auth.response;
  const villageId = auth.ctx.village.id;

  const tables = await prisma.customTable.findMany({
    where: { villageId, isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, description: true, fields: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { key: true, label: true, type: true, required: true, options: true, piiClass: true, position: true, isArchived: true } } },
  });
  const counts = await prisma.customRecord.groupBy({ by: ["tableId"], where: { villageId, deletedAt: null }, _count: { _all: true } });
  const byTable = new Map(counts.map((c) => [c.tableId, c._count._all]));
  return apiOk(auth, {
    data: tables.map((t) => ({
      slug: t.slug,
      name: t.name,
      description: t.description,
      recordCount: byTable.get(t.id) ?? 0,
      fields: publicFields(t.fields.map(toFieldDef)).map(publicFieldView),
    })),
  });
}
