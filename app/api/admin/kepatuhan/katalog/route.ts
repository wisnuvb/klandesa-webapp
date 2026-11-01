import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { deleteCatalogEntry, listCatalog, saveCatalogEntry } from "@/lib/kepatuhan/service";

export const dynamic = "force-dynamic";

/** Katalog tenggat lapis platform (berlaku untuk semua desa). Admin platform saja; belum ada layar, dipakai lewat API. */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const view = await listCatalog(prisma, { regencyKey: "", provinceKey: "" });
  return NextResponse.json({ builtin: view.builtin, global: view.global });
}

/** Menyimpan penimpaan global: { itemKey, fromYear, disabled?, ruleKind, ..., basis, verification (V/R/K) }. */
export async function PUT(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => null);
  const r = await saveCatalogEntry(prisma, { scope: "GLOBAL", regencyKey: "", provinceKey: "", editor: { label: `platform:${auth.admin.platformUserId}` }, input: body });
  if (!r.ok) return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
  return NextResponse.json({ success: true, ...r.data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const r = await deleteCatalogEntry(prisma, { scope: "GLOBAL", regencyKey: "", provinceKey: "", id: Number(req.nextUrl.searchParams.get("id")) });
  return r.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: r.errors[0] }, { status: r.status });
}
