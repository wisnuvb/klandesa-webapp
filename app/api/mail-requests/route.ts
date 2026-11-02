import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { NextRequest, NextResponse } from "next/server";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { getQueueStats, listMailRequests, parseQueueParams } from "@/lib/mail/request-queue";
import { decideMailRequest, normalizeNote } from "@/lib/mail/request-decision";

/** Daftar antrean + statistik (dari seluruh data, bukan halaman aktif). `?stats=0` melewatkan statistik. */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const url = new URL(req.url);
    const filters = parseQueueParams(url.searchParams);
    const [list, stats] = await Promise.all([
      listMailRequests(village.id, filters),
      url.searchParams.get("stats") === "0" ? Promise.resolve(null) : getQueueStats(village.id),
    ]);

    return NextResponse.json({
      rows: list.rows,
      total: list.total,
      page: filters.page,
      pageSize: filters.pageSize,
      stats,
    });
  } catch (err) {
    console.error("GET /api/mail-requests error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/**
 * Putuskan satu permohonan. Body: { id, decision: "approve" | "reject", note? }.
 * Bentuk lama { id, status: "SELESAI" | "DITOLAK", notes? } tetap diterima. Status "DIPROSES"/"PENDING" tidak bisa
 * ditetapkan (tidak ada di DB; permohonan otomatis pending sampai diputuskan).
 */
export async function PUT(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const idRaw = body?.id;
    const decision =
      body?.decision === "approve" || body?.status === "SELESAI"
        ? "approve"
        : body?.decision === "reject" || body?.status === "DITOLAK"
          ? "reject"
          : null;
    if (typeof idRaw !== "number" && typeof idRaw !== "string") {
      return NextResponse.json({ error: "ID permohonan harus diisi" }, { status: 400 });
    }
    if (!/^\d{1,18}$/.test(String(idRaw))) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    if (!decision) {
      return NextResponse.json({ error: "Keputusan harus 'setujui' atau 'tolak'" }, { status: 400 });
    }

    const note = normalizeNote(body?.note ?? body?.notes);
    const result = await decideMailRequest({ villageId: village.id, id: BigInt(String(idRaw)), decision, note });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    // Catatan/alasan penolakan (teks bebas) dan data pemohon tidak dicatat.
    await auditWeb(req, loaded.ctx, "decision", "mail_requests", String(idRaw), {
      requestNumber: result.requestNumber,
      decision,
      noteProvided: note.length > 0,
    });

    return NextResponse.json({ success: true, data: { id: Number(idRaw), status: decision === "approve" ? "approved" : "rejected" } });
  } catch (err) {
    console.error("PUT /api/mail-requests error:", err);
    return NextResponse.json({ error: "Gagal memperbarui permohonan" }, { status: 500 });
  }
}
