import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { sendNow } from "@/lib/webhooks/deliver";
import { enqueueTestEvent } from "@/lib/webhooks/service";
import { FixedWindowLimiter } from "@/lib/api-keys/rate-limit";

/** Cegah "Kirim uji" dipakai membombardir host lain: 5 per menit per desa. */
const testLimiter = new FixedWindowLimiter(5, 60_000);

/** Kirim kejadian uji ke satu tujuan dan langsung laporkan hasilnya (tanpa percobaan ulang). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return NextResponse.json({ error: "Hanya admin desa yang dapat mengelola webhook." }, { status: 403 });
    const rl = testLimiter.check(`v${ctx.village.id}`);
    if (!rl.allowed) return NextResponse.json({ error: `Terlalu sering menguji. Coba lagi dalam ${rl.retryAfterSec} detik.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    const raw = (await params).id;
    if (!/^\d{1,10}$/.test(raw)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const deliveryId = await enqueueTestEvent(prisma, { villageId: ctx.village.id, endpointId: Number(raw) });
    if (deliveryId == null) return NextResponse.json({ error: "Tujuan tidak ditemukan." }, { status: 404 });
    const result = await sendNow(prisma, deliveryId);
    if (!result) return NextResponse.json({ error: "Pengujian sedang berjalan. Coba lagi sebentar." }, { status: 409 });
    await auditWeb(req, ctx, "test", "webhook_endpoints", raw, { status: result.status, statusCode: result.statusCode });
    return NextResponse.json({ success: result.status === "SUCCESS", ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("POST /api/developer/webhooks/[id]/test error:", e);
    return NextResponse.json({ error: "Gagal mengirim uji" }, { status: 500 });
  }
}
