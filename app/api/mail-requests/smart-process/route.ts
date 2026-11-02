import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { AI_CREDITS_CONSUMPTION_ENABLED } from "@/lib/ai/credits";
import { getAiConfig } from "@/lib/ai/openrouter";
import { getAiCreditBalance, refundAiCredit, reserveAiCredit } from "@/lib/ai/village-assistant";
import { addTokensUsed, checkTokenBudget } from "@/lib/ai/token-budget";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { callJsonModel } from "@/lib/mail/ai-call";
import { runSmartProcess } from "@/lib/mail/request-smart";

/**
 * Proses Cerdas: siapkan usulan setuju untuk permohonan yang bersih dan dinilai cocok oleh AI (1 kredit AI per proses,
 * dikembalikan bila gagal). Hanya USULAN; konfirmasi lewat /api/ai/actions/confirm. Body: { ids?: number[] }.
 */
export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const rl = await checkRateLimitDb(limiterKey("mail-smart", userId), { max: 6, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    }
    const config = getAiConfig();
    if (!config) return NextResponse.json({ error: "AI belum dikonfigurasi." }, { status: 503 });
    const budget = await checkTokenBudget(userId);
    if (!budget.ok) return NextResponse.json({ error: "Batas pemakaian AI harian tercapai. Coba lagi besok." }, { status: 429 });

    const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = Array.isArray(body?.ids) ? body.ids.filter((i): i is number => Number.isInteger(i) && i > 0).slice(0, 25) : undefined;

    const out = await runSmartProcess(
      { villageId: village.id, userId, ids },
      {
        reserve: async () => (AI_CREDITS_CONSUMPTION_ENABLED ? reserveAiCredit(userId, 1) : true),
        refund: async () => {
          if (AI_CREDITS_CONSUMPTION_ENABLED) await refundAiCredit(userId, 1).catch(() => undefined);
        },
        callModel: (system, user) => callJsonModel({ config, system, user, maxTokens: 1200, timeoutMs: 50_000 }),
        addTokens: (n) => addTokensUsed(userId, n),
      },
    );
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status });

    if (out.charged) {
      await auditWeb(req, loaded.ctx, "ai_smart_process", "mail_requests", "batch", { considered: out.considered, proposed: out.proposals.length, manual: out.manual.length });
    }
    return NextResponse.json({
      proposals: out.proposals,
      manual: out.manual,
      considered: out.considered,
      remainingCredits: await getAiCreditBalance(userId),
    });
  } catch (e) {
    console.error("POST /api/mail-requests/smart-process", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
