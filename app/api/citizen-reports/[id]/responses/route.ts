import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";

function mapRoleLabel(role?: string | null): string {
  const mapping: Record<string, string> = {
    admin: "Admin Desa",
    staff: "Staff Desa",
    village_head: "Kepala Desa",
    secretary: "Sekretaris Desa",
  };
  return role ? (mapping[role] || role) : "Warga";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const body = await req.json();
    const { response } = body;

    if (!response?.trim()) {
      return NextResponse.json({ error: "Isi tanggapan wajib diisi" }, { status: 400 });
    }

    const reportId = BigInt(id);
    const existing = await prisma.citizenReport.findFirst({
      where: { id: reportId, villageId: village.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
    }

    if (existing.status === "REJECT" || existing.status === "DONE") {
      return NextResponse.json(
        { error: "Tidak dapat menambah tanggapan pada laporan yang sudah selesai atau ditolak" },
        { status: 400 }
      );
    }

    const userId = Number((session.user as { id?: string | number }).id);
    const created = await prisma.citizenReportResponse.create({
      data: {
        citizenReportId: reportId,
        villageId: village.id,
        response: response.trim(),
        responderId: userId || null,
        responderName: session.user.name || "Admin",
        responderRole: mapRoleLabel((session.user as { role?: string }).role),
      },
    });

    return NextResponse.json(
      {
        id: Number(created.id),
        response: created.response,
        responder_name: created.responderName,
        responder_role: created.responderRole,
        created_at: created.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/citizen-reports/[id]/responses error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
