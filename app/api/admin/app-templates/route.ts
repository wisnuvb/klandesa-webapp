import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { listForReview } from "@/lib/village-apps/service";

/** Antrean tinjauan templat Aplikasi Desa. `?status=all` menampilkan riwayat. Hanya admin platform. */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const items = await listForReview(prisma, req.nextUrl.searchParams.get("status") === "all" ? "ALL" : "PENDING");
  return NextResponse.json({ items });
}
