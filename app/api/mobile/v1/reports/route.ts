import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import {
  MAX_REPORTS_PER_DAY, MAX_REPORT_PHOTOS, buildReportTitle, categoryLabel, describeReport, isOwnReportPhotoUrl, isReportCategory, parseImages, validCoordinates,
} from "@/lib/mobile/report-logic";
import { getSpacesConfig } from "@/lib/spaces";
import { notifyVillageStaff } from "@/lib/mobile/notify";

/** Laporan milik warga yang login. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const rows = await prisma.citizenReport.findMany({
    where: { villageId: loaded.ctx.villageId, residentId: me.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: rows.map((r) => {
      const v = describeReport(r.status, false);
      return {
        id: Number(r.id), title: r.title, category: categoryLabel(r.category), status: r.status, stage: v.stage, stageTitle: v.title,
        steps: v.steps.map((s) => s.state), createdAt: r.createdAt, thumb: parseImages(r.images)[0] ?? null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const category = body?.category;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!isReportCategory(category) || content.length < 10 || content.length > 1500) {
    return mobileError("INVALID_REQUEST", "Pilih jenis masalah dan jelaskan minimal 10 huruf.", 400);
  }

  const photos = Array.isArray(body?.photos) ? (body.photos as unknown[]) : [];
  const cdn = getSpacesConfig().cdnBaseUrl;
  if (photos.length > MAX_REPORT_PHOTOS || !photos.every((u) => isOwnReportPhotoUrl(u, cdn, ctx.village.code))) {
    return mobileError("INVALID_REQUEST", `Foto tidak valid. Maksimal ${MAX_REPORT_PHOTOS} foto.`, 400);
  }

  const coords = body?.location && typeof body.location === "object"
    ? validCoordinates((body.location as Record<string, unknown>).lat, (body.location as Record<string, unknown>).lng)
    : null;
  const locationNote = typeof body?.locationNote === "string" ? body.locationNote.trim().slice(0, 200) || null : null;

  const today = await prisma.citizenReport.count({
    where: { residentId: me.id, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  if (today >= MAX_REPORTS_PER_DAY) {
    return mobileError("RATE_LIMITED", "Batas laporan hari ini tercapai. Coba lagi besok, atau hubungi kantor desa bila mendesak.", 429);
  }

  const created = await prisma.citizenReport.create({
    data: {
      villageId: ctx.villageId,
      reportType: "WARGA",
      title: buildReportTitle(category, content),
      content,
      images: photos.length ? (photos as string[]).join(",") : null,
      status: "PENDING",
      isPublic: body?.isPublic === true,
      reporterName: me.name,
      reporterNik: me.nik,
      residentId: me.id,
      category,
      locationLat: coords?.lat ?? null,
      locationLng: coords?.lng ?? null,
      locationNote,
      isAnonymous: body?.isAnonymous === true,
    },
  });
  void notifyVillageStaff(ctx.villageId, "citizen_reports", {
    type: "report_status", title: "Laporan warga baru", body: created.title, deepLink: `/staff/lapor/${Number(created.id)}`,
  });
  return NextResponse.json({ id: Number(created.id) }, { status: 201 });
}
