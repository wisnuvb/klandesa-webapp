import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { submitThemePack } from "@/lib/website-engine/theme-pack-service";

const STATUSES = new Set(["submitted", "approved", "rejected", "superseded", "withdrawn"]);

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status") || "";
  const rows = await prisma.websiteThemePack.findMany({
    where: STATUSES.has(status) ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      key: true,
      version: true,
      name: true,
      authorName: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      templateId: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ packs: rows });
}

/** Ajukan paket tema atas nama penulis (staf platform meng-onboard developer). Isi divalidasi penuh. */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as { manifest?: unknown; authorName?: unknown } | null;
  if (!body || typeof body !== "object" || body.manifest === undefined) {
    return NextResponse.json({ error: "Body harus berisi { manifest }" }, { status: 400 });
  }
  const result = await submitThemePack(
    body.manifest,
    typeof body.authorName === "string" ? body.authorName : undefined,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Manifest tidak valid", errors: result.errors }, { status: result.status });
  }
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
