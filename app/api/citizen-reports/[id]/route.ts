import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESS", "REJECT"],
  PROCESS: ["DONE", "REJECT"],
};

function mapRoleLabel(role?: string | null): string {
  const mapping: Record<string, string> = {
    admin: "Admin Desa",
    staff: "Staff Desa",
    village_head: "Kepala Desa",
    secretary: "Sekretaris Desa",
  };
  return role ? (mapping[role] || role) : "Warga";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const reportId = BigInt(id);
    const report = await prisma.citizenReport.findFirst({
      where: { id: reportId, villageId: village.id },
      include: {
        responses: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      id: Number(report.id),
      report_type: report.reportType,
      title: report.title,
      content: report.content,
      images: report.images,
      status: report.status,
      is_public: report.isPublic ? "Y" : "N",
      reporter_name: report.reporterName,
      reporter_nik: report.reporterNik,
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
      responses: report.responses.map((r) => ({
        id: Number(r.id),
        response: r.response,
        images: r.images,
        responder_name: r.responderName,
        responder_role: r.responderRole,
        created_at: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/citizen-reports/[id] error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getApiSession(req);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status } = body;

    const reportId = BigInt(id);
    const existing = await prisma.citizenReport.findFirst({
      where: { id: reportId, villageId: village.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        { error: `Tidak dapat mengubah status dari ${existing.status} ke ${status}` },
        { status: 400 }
      );
    }

    const userId = Number((session.user as { id?: string | number }).id);
    const updated = await prisma.citizenReport.update({
      where: { id: reportId },
      data: {
        status,
        doneById: status === "DONE" ? userId : undefined,
        updatedAt: new Date(),
      },
    });

    // If rejecting with reason, add a response automatically
    if (status === "REJECT" && body.reason?.trim()) {
      await prisma.citizenReportResponse.create({
        data: {
          citizenReportId: reportId,
          villageId: village.id,
          response: body.reason.trim(),
          responderId: userId || null,
          responderName: session.user.name || "Admin",
          responderRole: mapRoleLabel((session.user as { role?: string }).role),
        },
      });
    }

    return NextResponse.json({ status: updated.status });
  } catch (error) {
    console.error("PATCH /api/citizen-reports/[id] error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
