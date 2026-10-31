import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiOk, badRequest, notFound } from "@/lib/api-v1/http";
import { parsePaging, slicePage } from "@/lib/api-v1/page";
import { publicFieldView, publicFields, publicRecordData } from "@/lib/custom-data/public";
import { toFieldDef } from "@/lib/custom-data/service";
import { SLUG_PATTERN } from "@/lib/custom-data/schema";

/** Baris satu tabel data kustom (hanya kolom bukan data pribadi), lama dulu. Tanpa tautan ke warga. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireApiKey(req, "data-kustom:read");
  if (!auth.ok) return auth.response;
  const slug = (await params).slug;
  if (!SLUG_PATTERN.test(slug)) return badRequest(auth, "slug tabel tidak valid.");
  const paging = parsePaging(new URL(req.url).searchParams);
  if (!paging.ok) return badRequest(auth, paging.message);
  const villageId = auth.ctx.village.id;

  const table = await prisma.customTable.findFirst({
    where: { villageId, slug, isArchived: false },
    select: { id: true, slug: true, name: true, fields: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { key: true, label: true, type: true, required: true, options: true, piiClass: true, position: true, isArchived: true } } },
  });
  if (!table) return notFound(auth, "Tabel");
  const fields = table.fields.map(toFieldDef);

  const rows = await prisma.customRecord.findMany({
    where: { villageId, tableId: table.id, deletedAt: null, ...(paging.cursor ? { id: { gt: BigInt(paging.cursor) } } : {}) },
    orderBy: { id: "asc" },
    take: paging.limit + 1,
    select: { id: true, data: true, createdAt: true, updatedAt: true },
  });
  const { data, page } = slicePage(rows, paging.limit, (r) => Number(r.id));
  return apiOk(auth, {
    table: { slug: table.slug, name: table.name, fields: publicFields(fields).map(publicFieldView) },
    data: data.map((r) => ({ id: Number(r.id), data: publicRecordData(r.data, fields), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
    page,
  });
}
