import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { resolveFinanceWriteVillage } from "@/lib/finance-village-context";
import { auditWeb } from "@/lib/audit/web-audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const resolved = await resolveFinanceWriteVillage(req, body as { villageId?: unknown });
    if (!resolved.ok) return resolved.response;
    const { village, userId: ctxUserId } = resolved;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { transactionId, action, reason } = body as {
      transactionId?: string;
      action?: string;
      reason?: string;
    };

    if (!transactionId || !action) {
      return NextResponse.json(
        { error: "Transaction ID dan action diperlukan" },
        { status: 400 },
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action harus 'approve' atau 'reject'" },
        { status: 400 },
      );
    }

    const status = action === "approve" ? "approved" : "rejected";
    const reasonText = typeof reason === "string" ? reason.trim() : "";
    if (action === "reject" && !reasonText) {
      return NextResponse.json(
        { error: "Alasan penolakan harus diisi" },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: BigInt(transactionId), villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    // Hanya SPP yang masih menunggu yang boleh diputuskan; mencegah setuju-ulang / tolak-ulang.
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "SPP ini sudah diproses dan tidak dapat diubah lagi" },
        { status: 409 },
      );
    }

    let verifiedBy: number | undefined = ctxUserId;
    if (verifiedBy == null || !Number.isFinite(verifiedBy)) {
      const session = await getApiSession(req);
      if (session?.user?.id) {
        verifiedBy = parseInt(String(session.user.id), 10);
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        status,
        verifiedAt: new Date(),
        ...(verifiedBy != null && Number.isFinite(verifiedBy) ? { verifiedBy } : {}),
        // Uraian asli dipertahankan; alasan penolakan ditambahkan di belakangnya.
        ...(action === "reject"
          ? { description: `${existing.description} [Ditolak: ${reasonText}]` }
          : {}),
      },
    });

    await auditWeb(
      req,
      { userId: verifiedBy != null && Number.isFinite(verifiedBy) ? verifiedBy : null, village },
      action,
      "transactions",
      transaction.id,
      { status, reason: action === "reject" ? reasonText : null, category: transaction.category, amount: Number(transaction.amount) },
    );

    return NextResponse.json({
      success: true,
      data: toJSONSafe(transaction),
      message: `SPP berhasil ${action === "approve" ? "disetujui" : "ditolak"}`,
    });
  } catch (err) {
    console.error("POST /api/finance/spp error:", err);
    return NextResponse.json({ error: "Gagal memproses SPP" }, { status: 500 });
  }
}
