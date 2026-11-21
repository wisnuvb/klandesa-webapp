import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { listForAdmin } from "@/lib/aspirasi/moderation";
import { pageParam } from "@/lib/aspirasi/http";
import { photoUrls } from "@/lib/aspirasi/photo-urls";

/** Antrean dan daftar aspirasi untuk moderasi (termasuk kontak pelapor: hanya admin platform). */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const sp = req.nextUrl.searchParams;
  const r = await listForAdmin(prisma, { status: sp.get("status") ?? undefined, q: sp.get("q") ?? undefined, page: pageParam(sp.get("page")) });
  return NextResponse.json({
    ...r,
    items: r.items.map(({ photoKeys, ...rest }) => ({ ...rest, photoKeys, photos: photoUrls(photoKeys) })),
  });
}
