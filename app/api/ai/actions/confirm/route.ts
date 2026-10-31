import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireModuleEntitlement } from "@/lib/modules/require-module";
import { larasCan } from "@/lib/ai/laras-authz";
import { MAX_TOKENS_PER_CALL, confirmActions } from "@/lib/ai/laras-confirm";
import { executeMailDecision } from "@/lib/ai/laras-mail";
import { executeReportAction, roleLabelFor } from "@/lib/ai/laras-report";
import { executeAnnouncementPublish } from "@/lib/ai/laras-announcement";
import { consumeActionToken, releaseActionToken } from "@/lib/ai/laras-token-store";
import { checkRateLimitDb, clientIp, limiterKey } from "@/lib/mobile/rate-limit";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

/**
 * Konfirmasi usulan aksi Laras oleh perangkat desa. Token bertanda tangan menjamin isi usulan tidak diubah klien, hanya
 * berlaku untuk pengguna + desa yang sama, dan hanya bisa dipakai sekali. Izin dicek ulang dengan role SEGAR dari DB
 * (bukan JWT yang bisa basi), lalu eksekusi memakai update bersyarat yang sama dengan jalur manual.
 * Logika per token ada di lib/ai/laras-confirm.ts (teruji tanpa HTTP).
 */
export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId, session, dbUser } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const rl = await checkRateLimitDb(limiterKey("laras:confirm", userId), { max: 30, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = (await req.json().catch(() => null)) as { tokens?: unknown } | null;
    const tokens = Array.isArray(body?.tokens) ? body.tokens : [];
    if (tokens.length === 0 || tokens.length > MAX_TOKENS_PER_CALL) {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }

    const actor = { userId, ip: clientIp(req), userAgent: req.headers.get("user-agent") };
    const results = await confirmActions(
      { tokens, userId, villageId: village.id },
      {
        can: (resource, action) => larasCan(session, dbUser.role, resource, action),
        entitled: async (moduleId) => (await requireModuleEntitlement(village, moduleId)).ok,
        consume: consumeActionToken,
        release: releaseActionToken,
        executeMail: (p) => executeMailDecision(p, actor),
        executeReport: (p) =>
          executeReportAction(p, { ...actor, name: session.user.name || "Perangkat Desa", roleLabel: roleLabelFor(dbUser.role) }),
        executeAnnouncement: (p) => executeAnnouncementPublish(p, actor),
      },
    );

    return NextResponse.json({ ok: results.every((r) => r.ok), results });
  } catch (e) {
    console.error("POST /api/ai/actions/confirm", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
