import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/bencana/http";
import { sendAlert } from "@/lib/bencana/service";

/**
 * Mengirim siaran peringatan dini ke warga (kotak masuk + push) per seluruh desa atau RT/RW:
 * { level, hazardType?, title, message, targetKind: "ALL"|"AREA", targets?: [{rw, rt?}], eventId?, preview? }.
 * `preview: true` hanya menghitung penerima. Izin: approve (Kepala Desa, sekretaris, admin).
 */
export async function POST(req: NextRequest) {
  return attempt("POST /api/bencana/peringatan/kirim", "Gagal mengirim peringatan dini", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await sendAlert(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    const { done, ...out } = r.data;
    void done;
    if (!out.preview) await auditWeb(req, ctx, "broadcast", AUDIT.alert, out.id ?? 0, { accounts: out.accounts, devices: out.devices });
    return NextResponse.json({ success: true, ...out }, { status: out.preview ? 200 : 201 });
  });
}
