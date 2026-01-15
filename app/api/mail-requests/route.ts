/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10);

    const village = await resolveVillage({
      req,
      queryVillageCode: villageCode,
      session,
    });

    if (!village) {
      return NextResponse.json(
        {
          error:
            "Tidak ada desa yang tersedia. Login terlebih dahulu atau atur DEFAULT_VILLAGE_CODE di env.",
        },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = { villageId: village.id };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nik: { contains: search } },
        { mailType: { contains: search } },
        { requestNumber: { contains: search } },
      ];
    }

    // Map UI status to DB status
    if (status && status !== "all") {
      const statusMap: Record<string, string> = {
        PENDING: "pending",
        DIPROSES: "pending", // For now, "DIPROSES" maps to pending
        SELESAI: "approved",
        DITOLAK: "rejected",
      };
      const dbStatus = statusMap[status];
      if (dbStatus) {
        where.status = dbStatus;
      }
    }

    // Get total count
    const total = await prisma.mailRequest.count({ where });

    // Get paginated data
    const rows = await prisma.mailRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: Math.max(0, (page - 1) * pageSize),
      take: Math.max(1, pageSize),
    });

    // Map to UI format
    const mappedRows = rows.map((row) => ({
      id: Number(row.id),
      pemohon_name: row.name,
      pemohon_nik: row.nik,
      pemohon_phone: "", // Not in schema, can be added later
      jenis_surat: row.mailType,
      keperluan: row.purpose,
      status:
        row.status === "approved"
          ? "SELESAI"
          : row.status === "rejected"
          ? "DITOLAK"
          : "PENDING", // For now, all pending are shown as PENDING
      created_at: row.requestDate.toISOString(),
      lampiran: [], // Can be added if attachments are stored
      catatan: row.notes || row.rejectionReason || undefined,
      requestNumber: row.requestNumber,
      processedDate: row.processedDate?.toISOString(),
    }));

    return NextResponse.json({
      rows: mappedRows,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("GET /api/mail-requests error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

// PUT - Update status of mail request
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID dan status harus diisi" },
        { status: 400 }
      );
    }

    // Map UI status to DB status
    const statusMap: Record<string, string> = {
      PENDING: "pending",
      DIPROSES: "pending",
      SELESAI: "approved",
      DITOLAK: "rejected",
    };

    const dbStatus = statusMap[status];
    if (!dbStatus) {
      return NextResponse.json(
        { error: "Status tidak valid" },
        { status: 400 }
      );
    }

    const updateData: any = {
      status: dbStatus,
      processedDate: new Date(),
    };

    if (notes) {
      if (dbStatus === "rejected") {
        updateData.rejectionReason = notes;
      } else {
        updateData.notes = notes;
      }
    }

    const updated = await prisma.mailRequest.update({
      where: { id: BigInt(id) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: Number(updated.id),
        status: updated.status,
      },
    });
  } catch (err: any) {
    console.error("PUT /api/mail-requests error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal memperbarui permohonan" },
      { status: 500 }
    );
  }
}
