import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { listClaims } from "@/lib/aspirasi/moderation";
import { pageParam } from "@/lib/aspirasi/http";

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const sp = req.nextUrl.searchParams;
  return NextResponse.json(await listClaims(prisma, { status: sp.get("status") ?? "PENDING", page: pageParam(sp.get("page")) }));
}
