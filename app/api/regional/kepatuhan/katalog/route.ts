import { NextRequest, NextResponse } from "next/server";
import { requireRegionalApi } from "@/lib/regional-api-handler";
import { logRegionalAccess } from "@/lib/regional-audit";
import { prisma } from "@/lib/prisma";
import { deleteCatalogEntry, listCatalog, saveCatalogEntry } from "@/lib/kepatuhan/service";
import { writableScope } from "@/lib/kepatuhan/regional";
import { codeKey, normKey } from "@/lib/kepatuhan/catalog";
import type { RegionalApiContext } from "@/lib/regional-api-handler";

export const dynamic = "force-dynamic";

const keysOf = (ctx: RegionalApiContext) => writableScope({ role: ctx.regional.role, scope: ctx.regional.scope, villages: ctx.villages });

/** Katalog tenggat yang berlaku: bawaan, penimpaan platform, dan penimpaan kabupaten akun ini (hanya miliknya). */
export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_kepatuhan_katalog_get");
  if (!loaded.ok) return loaded.response;
  const w = keysOf(loaded.ctx);
  const scope = loaded.ctx.regional.scope;
  // Akun yang tidak boleh menulis tetap boleh membaca katalog wilayahnya.
  const code = scope.kodeKabKota?.trim();
  const regencyKey = w.ok ? w.regencyKey : code ? codeKey(code) : normKey(scope.regency);
  const provinceKey = w.ok ? w.provinceKey : code ? "" : normKey(scope.province);
  const view = await listCatalog(prisma, { regencyKey, provinceKey });
  return NextResponse.json({ ...view, canEdit: w.ok, reason: w.ok ? null : w.error });
}

/** Menyimpan satu penimpaan untuk kabupaten akun ini: { itemKey, fromYear, disabled?, ruleKind, ..., basis, verification? }. */
export async function PUT(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_kepatuhan_katalog_put");
  if (!loaded.ok) return loaded.response;
  const w = keysOf(loaded.ctx);
  if (!w.ok) return NextResponse.json({ error: w.error }, { status: 403 });
  const body = await req.json().catch(() => null);
  const r = await saveCatalogEntry(prisma, { scope: "REGENCY", regencyKey: w.regencyKey, provinceKey: w.provinceKey, editor: { regionalUserId: loaded.ctx.regional.regionalUserId }, input: body });
  if (!r.ok) return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
  await logRegionalAccess({ regionalUserId: loaded.ctx.regional.regionalUserId, action: `regional_kepatuhan_katalog_put:${r.data.itemKey}:${r.data.fromYear}`, path: req.nextUrl.pathname, req });
  return NextResponse.json({ success: true, ...r.data });
}

/** Menghapus penimpaan milik kabupaten akun ini (?id=). Baris kabupaten lain atau lapis platform tidak terjangkau. */
export async function DELETE(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_kepatuhan_katalog_delete");
  if (!loaded.ok) return loaded.response;
  const w = keysOf(loaded.ctx);
  if (!w.ok) return NextResponse.json({ error: w.error }, { status: 403 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  const r = await deleteCatalogEntry(prisma, { scope: "REGENCY", regencyKey: w.regencyKey, provinceKey: w.provinceKey, id });
  if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
  await logRegionalAccess({ regionalUserId: loaded.ctx.regional.regionalUserId, action: `regional_kepatuhan_katalog_delete:${r.data.id}`, path: req.nextUrl.pathname, req });
  return NextResponse.json({ success: true });
}
