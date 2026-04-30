import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { getInitials } from "@/utils";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

interface Activity {
  id: string;
  type: "surat" | "warga" | "keuangan";
  title: string;
  description: string;
  timestamp: string;
  status: "pending" | "approved" | "rejected" | "completed";
  user?: string;
  createdAt: Date;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Baru saja";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit yang lalu`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} jam yang lalu`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} hari yang lalu`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} minggu yang lalu`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} bulan yang lalu`;
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const villageId = village.id;
    const limit = 10; // Limit activities

    const activities: Activity[] = [];

    // 1. Get recent MailService (surat yang dibuat)
    const recentMailServices = await prisma.mailService.findMany({
      where: { villageId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        createdUser: {
          select: { name: true },
        },
      },
    });

    for (const mail of recentMailServices) {
      const status =
        mail.status === "completed"
          ? "completed"
          : mail.status === "draft"
          ? "pending"
          : "approved";

      activities.push({
        id: `mail-${mail.id}`,
        type: "surat",
        title: mail.templateName || "Surat",
        description: `${mail.applicantName} - NIK: ${mail.applicantNik}`,
        timestamp: formatTimeAgo(mail.createdAt),
        status,
        user: mail.createdUser?.name
          ? getInitials(mail.createdUser.name)
          : undefined,
        createdAt: mail.createdAt,
      });
    }

    // 2. Get recent MailRequest (permohonan surat)
    const recentMailRequests = await prisma.mailRequest.findMany({
      where: { villageId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    for (const request of recentMailRequests) {
      const status =
        request.status === "approved"
          ? "approved"
          : request.status === "rejected"
          ? "rejected"
          : "pending";

      activities.push({
        id: `request-${request.id}`,
        type: "surat",
        title: `Permohonan ${request.mailType}`,
        description: `${request.name} - NIK: ${request.nik}`,
        timestamp: formatTimeAgo(request.createdAt),
        status,
        createdAt: request.createdAt,
      });
    }

    // 3. Get recent Transactions (keuangan)
    const recentTransactions = await prisma.transaction.findMany({
      where: { villageId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    for (const transaction of recentTransactions) {
      activities.push({
        id: `transaction-${transaction.id}`,
        type: "keuangan",
        title:
          transaction.type === "income"
            ? "Pemasukan Keuangan"
            : "Pengeluaran Keuangan",
        description: `${transaction.category} - ${
          transaction.description || ""
        }`,
        timestamp: formatTimeAgo(transaction.createdAt),
        status: "completed",
        createdAt: transaction.createdAt,
      });
    }

    // 4. Get recent Resident updates (jika ada tracking)
    // Note: Ini memerlukan tracking perubahan di Resident model
    // Untuk sementara, kita bisa skip atau gunakan updatedAt
    const recentResidents = await prisma.resident.findMany({
      where: { villageId },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });

    // Hanya tambahkan jika updatedAt berbeda dari createdAt (ada perubahan)
    for (const resident of recentResidents) {
      if (resident.updatedAt.getTime() !== resident.createdAt.getTime()) {
        activities.push({
          id: `resident-${resident.id}`,
          type: "warga",
          title: "Data Warga Diperbarui",
          description: `${resident.name} - NIK: ${resident.nik}`,
          timestamp: formatTimeAgo(resident.updatedAt),
          status: "completed",
          createdAt: resident.updatedAt,
        });
      }
    }

    // Sort by createdAt (most recent first) and limit
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limitedActivities = activities.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limitedActivities,
    });
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
