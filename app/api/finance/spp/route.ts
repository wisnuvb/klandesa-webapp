import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";
import { getToken } from "next-auth/jwt";
import { toJSONSafe } from "@/utils/json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveVillage(session: any, token?: any) {
  if (session?.user?.villageCode) {
    const v = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (v) return v;
  }
  if (token?.villageCode) {
    const v = await prisma.village.findUnique({
      where: { code: token.villageCode },
    });
    if (v) return v;
  }
  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const v = await prisma.village.findUnique({ where: { code: defaultCode } });
    if (v) return v;
  }
  return prisma.village.findFirst({ orderBy: { id: "asc" } });
}

// Approve or reject SPP (update transaction status)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const token = await getToken({ req, secret: authOptions.secret });
    const apiKeyHeader = req.headers.get("x-api-key");
    const validApiKey = process.env.FINANCE_API_KEY;
    if (!session?.user && !token?.id) {
      if (!validApiKey || apiKeyHeader !== validApiKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const village = await resolveVillage(session, token);
    if (!village) {
      return NextResponse.json(
        { error: "Tidak ada desa yang tersedia" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { transactionId, action, reason } = body;

    if (!transactionId || !action) {
      return NextResponse.json(
        { error: "Transaction ID dan action diperlukan" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action harus 'approve' atau 'reject'" },
        { status: 400 }
      );
    }

    const status = action === "approve" ? "approved" : "rejected";

    const transaction = await prisma.transaction.update({
      where: { id: BigInt(transactionId) },
      data: {
        status,
        ...(session?.user?.id && {
          verifiedBy: parseInt(session.user.id as string),
        }),
        ...(reason && { description: reason }), // Store rejection reason in description or add a separate field
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
