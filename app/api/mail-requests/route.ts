import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 10);

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const where: any = { villageId: village.id };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nik: { contains: search } },
        { mailType: { contains: search } },
        { requestNumber: { contains: search } },
      ];
    }

    if (status && status !== "all") {
      const statusMap: Record<string, string> = {
        PENDING: "pending",
        DIPROSES: "pending",
        SELESAI: "approved",
        DITOLAK: "rejected",
      };
      const dbStatus = statusMap[status];
      if (dbStatus) {
        where.status = dbStatus;
      }
    }

    const total = await prisma.mailRequest.count({ where });

    const rows = await prisma.mailRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: Math.max(0, (page - 1) * pageSize),
      take: Math.max(1, pageSize),
    });

    const mappedRows = rows.map((row) => ({
      id: Number(row.id),
      pemohon_name: row.name,
      pemohon_nik: row.nik,
      pemohon_phone: "",
      jenis_surat: row.mailType,
      keperluan: row.purpose,
      status:
        row.status === "approved"
          ? "SELESAI"
          : row.status === "rejected"
            ? "DITOLAK"
            : "PENDING",
      created_at: row.requestDate.toISOString(),
      lampiran: [],
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
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID dan status harus diisi" },
        { status: 400 },
      );
    }

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
        { status: 400 },
      );
    }

    const existing = await prisma.mailRequest.findFirst({
      where: { id: BigInt(id), villageId: village.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Permohonan tidak ditemukan" },
        { status: 404 },
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
      { status: 500 },
    );
  }
}
