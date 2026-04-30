import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { resolveFinanceWriteVillage } from "@/lib/finance-village-context";

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

    const existing = await prisma.transaction.findFirst({
      where: { id: BigInt(transactionId), villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
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
        ...(verifiedBy != null && Number.isFinite(verifiedBy) ? { verifiedBy } : {}),
        ...(reason ? { description: reason } : {}),
      },
    });

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
