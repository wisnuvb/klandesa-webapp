import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const url = new URL(req.url);
    const search = url.searchParams.get("search") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;

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

    const mailRequests = await prisma.mailRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (mailRequests.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data untuk diekspor" },
        { status: 404 },
      );
    }

    const exportData = mailRequests.map((request, index) => ({
      No: index + 1,
      "No. Permohonan": request.requestNumber || "",
      "Nama Pemohon": request.name || "",
      NIK: request.nik || "",
      "Jenis Surat": request.mailType || "",
      Keperluan: request.purpose || "",
      Status:
        request.status === "approved"
          ? "Selesai"
          : request.status === "rejected"
            ? "Ditolak"
            : "Pending",
      "Tanggal Pengajuan": request.requestDate
        ? new Date(request.requestDate).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      "Tanggal Diproses": request.processedDate
        ? new Date(request.processedDate).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      Catatan: request.notes || request.rejectionReason || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Permohonan Warga");

    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map((row) => String(row[key as keyof typeof row]).length),
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    worksheet["!cols"] = colWidths;

    const buffer = Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `permohonan-warga-${village.code}-${timestamp}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting mail requests:", error);
    return NextResponse.json(
      { error: "Gagal mengekspor data" },
      { status: 500 },
    );
  }
}
