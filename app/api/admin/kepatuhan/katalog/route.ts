import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { deleteCatalogEntry, listCatalog, saveCatalogEntry } from "@/lib/kepatuhan/service";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf, clip } from "@/lib/platform/legacy-audit";

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
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  await auditPlatform(req, actorOf(auth), {
    action: "compliance_catalog.save",
    targetType: "system",
    targetId: `compliance_catalog:${r.data.id}`,
    summary: `Menyimpan penimpaan katalog kepatuhan global "${clip(r.data.itemKey, 80)}" berlaku mulai ${r.data.fromYear}${b.disabled === true ? " (dinonaktifkan)" : ""}`,
    metadata: {
      entryId: r.data.id,
      itemKey: r.data.itemKey,
      fromYear: r.data.fromYear,
      disabled: b.disabled === true,
      ...(typeof b.ruleKind === "string" ? { ruleKind: clip(b.ruleKind, 40) } : {}),
      ...(typeof b.verification === "string" ? { verification: clip(b.verification, 10) } : {}),
    },
  });
  return NextResponse.json({ success: true, ...r.data });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const entryId = Number(req.nextUrl.searchParams.get("id"));
  const prior = Number.isInteger(entryId) && entryId > 0
    ? await prisma.complianceCatalogEntry.findFirst({ where: { id: entryId, scope: "GLOBAL" }, select: { itemKey: true, fromYear: true } })
    : null;
  const r = await deleteCatalogEntry(prisma, { scope: "GLOBAL", regencyKey: "", provinceKey: "", id: entryId });
  if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
  await auditPlatform(req, actorOf(auth), {
    action: "compliance_catalog.delete",
    targetType: "system",
    targetId: `compliance_catalog:${entryId}`,
    summary: `Menghapus penimpaan katalog kepatuhan global "${clip(prior?.itemKey ?? "?", 80)}"${prior ? ` (mulai ${prior.fromYear})` : ""}`,
    metadata: { entryId, itemKey: prior?.itemKey ?? null, fromYear: prior?.fromYear ?? null },
  });
  return NextResponse.json({ success: true });
}
