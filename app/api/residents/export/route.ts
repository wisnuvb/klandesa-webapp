import { getApiSession } from "@/lib/api-session";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import * as XLSX from "xlsx";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "excel";
    const search = url.searchParams.get("search") ?? undefined;
    const gender = url.searchParams.get("gender") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    // Resolve village using the same pattern as other endpoints
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
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    // Build where clause (same logic as GET /api/residents)
    const where: any = { villageId: village.id };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nik: { contains: search } },
        { kk: { contains: search } },
      ];
    }
    if (gender && (gender === "Laki-laki" || gender === "Perempuan")) {
      where.gender = gender;
    }
    if (
      status &&
      ["Belum Menikah", "Menikah", "Cerai Hidup", "Cerai Mati"].includes(status)
    ) {
      where.maritalStatus = status;
    }

    // Get all residents matching the filter (no pagination for export)
    const residents = await prisma.resident.findMany({
      where,
      orderBy: { name: "asc" },
    });

    if (residents.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data untuk diekspor" },
        { status: 404 }
      );
    }

    // Format data for export
    const exportData = residents.map((resident, index) => ({
      No: index + 1,
      Nama: resident.name || "",
      NIK: resident.nik || "",
      "No. KK": resident.kk || "",
      "Jenis Kelamin": resident.gender || "",
      "Tempat Lahir": resident.birthplace || "",
      "Tanggal Lahir": resident.birthDate
        ? new Date(resident.birthDate).toLocaleDateString("id-ID")
        : "",
      Alamat: resident.address || "",
      RT: resident.rt || "",
      RW: resident.rw || "",
      Dusun: resident.hamlet || "",
      Agama: resident.religion || "",
      "Status Pernikahan": resident.maritalStatus || "",
      Pendidikan: resident.education || "",
      Pekerjaan: resident.occupation || "",
      "Golongan Darah": resident.bloodType || "",
    }));

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    let filename = `data-warga-${village.code}-${timestamp}`;
    let contentType: string;
    let buffer: Buffer;

    if (format === "csv") {
      // Generate CSV
      const headers = Object.keys(exportData[0]).join(",");
      const rows = exportData.map((row) =>
        Object.values(row)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csvContent = [headers, ...rows].join("\n");
      buffer = Buffer.from(csvContent, "utf-8");
      filename += ".csv";
      contentType = "text/csv; charset=utf-8";
    } else if (format === "pdf") {
      // For PDF, we'll return JSON for now or implement PDF generation later
      // You can use libraries like pdfkit or jspdf
      return NextResponse.json(
        { error: "PDF export belum tersedia. Gunakan Excel atau CSV." },
        { status: 400 }
      );
    } else {
      // Generate Excel (default)
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Warga");

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(exportData[0]).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map(
            (row) => String(row[key as keyof typeof row]).length
          )
        );
        return { wch: Math.min(maxLength + 2, maxWidth) };
      });
      worksheet["!cols"] = colWidths;

      buffer = Buffer.from(
        XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
      );
      filename += ".xlsx";
      contentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    // Return file with proper headers
    return new NextResponse(buffer.toString(), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.toString().length.toString(),
      },
    });
  } catch (error) {
    console.error("Error exporting residents:", error);
    return NextResponse.json(
      { error: "Gagal mengekspor data" },
      { status: 500 }
    );
  }
}
