import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { userId } = loaded.ctx;
    const { searchParams } = new URL(req.url);
    const partnerReff = searchParams.get("ref");

    if (!partnerReff) {
      return NextResponse.json({ error: "partnerReff tidak valid" }, { status: 400 });
    }

    const invoice = await prisma.billingInvoice.findUnique({
      where: { partnerReff },
      include: { items: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
    }

    // Ensure user owns this invoice (via metadata userId check or village ownership)
    const meta =
      invoice.metadata && typeof invoice.metadata === "object"
        ? (invoice.metadata as Record<string, unknown>)
        : null;
    const invoiceUserId = meta?.userId ? Number(meta.userId) : null;
    if (invoiceUserId && invoiceUserId !== userId) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    // Get latest user credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiCredits: true },
    });

    return NextResponse.json({
      ok: true,
      invoice: {
        id: invoice.id,
        status: invoice.status,
        paidAt: invoice.paidAt,
        vaNumber: invoice.vaNumber,
        qrImageUrl: invoice.qrImageUrl,
        paymentUrl: invoice.paymentUrl,
        qrContent: invoice.qrContent,
        expiresAt: invoice.expiresAt,
      },
      credits: user?.aiCredits ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
