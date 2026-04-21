import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

const ALLOWED_TYPES = new Set(["PEMDES", "BPD", "KADUS", "RT", "RW", "WARGA"]);
const ALLOWED_STATUSES = new Set([
  "ALL",
  "DRAFT",
  "PENDING",
  "PROCESS",
  "DONE",
  "REJECT",
]);

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;
    const status = url.searchParams.get("status") ?? "ALL";
    const reportType = url.searchParams.get("reportType") ?? "ALL";
    const isPublic = url.searchParams.get("isPublic") ?? "ALL";

    const village = await resolveVillage({
      req,
      queryVillageCode: villageCode,
      session,
    });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const where: Record<string, unknown> = { villageId: village.id };
    if (status !== "ALL" && ALLOWED_STATUSES.has(status)) where.status = status;
    if (reportType !== "ALL" && ALLOWED_TYPES.has(reportType))
      where.reportType = reportType;
    if (isPublic === "Y") where.isPublic = true;
    if (isPublic === "N") where.isPublic = false;

    const rows = await prisma.citizenReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { responses: true } },
      },
    });

    const mapped = rows.map((r) => ({
      id: Number(r.id),
      village_id: r.villageId,
      report_type: r.reportType,
      title: r.title,
      content: r.content,
      images: r.images,
      status: r.status,
      is_public: r.isPublic ? "Y" : "N",
      reporter_name: r.reporterName,
      reporter_nik: r.reporterNik,
      done_by: r.doneById,
      responses_count: r._count.responses,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/citizen-reports error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const {
      report_type,
      title,
      content,
      is_public,
      reporter_name,
      reporter_nik,
    } = body;

    if (!report_type || !ALLOWED_TYPES.has(report_type)) {
      return NextResponse.json(
        { error: "Tipe laporan tidak valid" },
        { status: 400 },
      );
    }
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Judul dan isi laporan wajib diisi" },
        { status: 400 },
      );
    }
    if (!reporter_name?.trim()) {
      return NextResponse.json(
        { error: "Nama pelapor wajib diisi" },
        { status: 400 },
      );
    }

    const created = await prisma.citizenReport.create({
      data: {
        villageId: village.id,
        reportType: report_type,
        title: title.trim(),
        content: content.trim(),
        isPublic: is_public !== "N",
        reporterName: reporter_name.trim(),
        reporterNik: reporter_nik?.trim() || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ id: Number(created.id) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/citizen-reports error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
