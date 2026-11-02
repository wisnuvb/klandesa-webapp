import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { AI_CREDITS_CONSUMPTION_ENABLED } from "@/lib/ai/credits";
import { getAiConfig } from "@/lib/ai/openrouter";
import { getAiCreditBalance, refundAiCredit, reserveAiCredit } from "@/lib/ai/village-assistant";
import { addTokensUsed, checkTokenBudget } from "@/lib/ai/token-budget";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { callJsonModel } from "@/lib/mail/ai-call";
import { buildNlSystem, parseNlFilter } from "@/lib/mail/request-nl-filter";
import { sanitizeForPrompt } from "@/lib/ai/laras-guard";

/** Pencarian bahasa alami → filter. 1 kredit AI; dikembalikan bila gagal. Body: { query }. */
export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const body = (await req.json().catch(() => null)) as { query?: unknown } | null;
    const query = sanitizeForPrompt(typeof body?.query === "string" ? body.query : "", 200);
    if (query.length < 3) return NextResponse.json({ error: "Tulis permintaan pencarian (minimal 3 huruf)." }, { status: 400 });

    const rl = await checkRateLimitDb(limiterKey("mail-nl", userId), { max: 20, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    }
    const config = getAiConfig();
    if (!config) return NextResponse.json({ error: "AI belum dikonfigurasi." }, { status: 503 });
    const budget = await checkTokenBudget(userId);
    if (!budget.ok) return NextResponse.json({ error: "Batas pemakaian AI harian tercapai. Coba lagi besok." }, { status: 429 });

    let charged = false;
    if (AI_CREDITS_CONSUMPTION_ENABLED) {
      if (!(await reserveAiCredit(userId, 1))) {
        return NextResponse.json({ error: "Kredit AI Anda habis. Tambah kredit di menu Langganan." }, { status: 402 });
      }
      charged = true;
    }
    const refund = async () => {
      if (charged) await refundAiCredit(userId, 1).catch(() => undefined);
    };

    try {
      const types = await prisma.mailRequest.groupBy({ by: ["mailType"], where: { villageId: village.id }, orderBy: { mailType: "asc" }, take: 100 });
      const jenis = types.map((t) => t.mailType);
      const today = new Date().toISOString().slice(0, 10);
      const call = await callJsonModel({ config, system: buildNlSystem(jenis, today), user: JSON.stringify({ permintaan: query }), maxTokens: 400, timeoutMs: 25_000 });
      await addTokensUsed(userId, call.tokens).catch(() => undefined);
      if (!call.ok) {
        await refund();
        return NextResponse.json({ error: "Pencarian cerdas sedang bermasalah. Kredit tidak terpakai; coba lagi." }, { status: call.kind === "timeout" ? 504 : 502 });
      }
      const parsed = parseNlFilter(call.text, jenis);
      if (!parsed) {
        await refund();
        return NextResponse.json({ error: "Permintaan tidak bisa diterjemahkan menjadi filter. Kredit tidak terpakai; coba kalimat lain." }, { status: 422 });
      }
      // Isi permintaan tidak dicatat; hanya bahwa fitur dipakai dan kunci filter yang dihasilkan.
      await auditWeb(req, loaded.ctx, "ai_nl_filter", "mail_requests", "search", { filterKeys: Object.keys(parsed.filters) });
      return NextResponse.json({ ...parsed, remainingCredits: await getAiCreditBalance(userId) });
    } catch (e) {
      await refund();
      throw e;
    }
  } catch (e) {
    console.error("POST /api/mail-requests/nl-filter", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
