import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillageAdminResponse } from "@/lib/access-policy";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { AI_CREDITS_CONSUMPTION_ENABLED } from "@/lib/ai/credits";
import {
  DEFAULT_FREE_AI_MODEL,
  getAiConfig,
  getAiHeaders,
  resolveAiModel,
} from "@/lib/ai/openrouter";
import { getAiCreditBalance, refundAiCredit, reserveAiCredit } from "@/lib/ai/village-assistant";
import { mergeVariantAllowlists } from "@/lib/website-engine/block-variants";
import {
  AI_MAX_REQUEST_CHARS,
  WEBSITE_AI_CREDIT_COST,
  buildDesignMessages,
  buildProposal,
} from "@/lib/website-engine/ai-design";
import { editingCustomizationRaw } from "@/lib/website-engine/customization-store";
import { checkWebsiteEnginePatchLimit } from "@/lib/website-engine/engine-rate-limit";
import { parseTemplateStructureManifest } from "@/lib/website-engine/manifest";
import { resolveEffectiveStructure, resolveEffectiveTheme } from "@/lib/website-engine/normalize";
import { getTemplatePack } from "@/lib/website-engine/template-packs/registry";

const MODEL_TIMEOUT_MS = 60_000;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Minta AI menyusun usulan perbaikan tampilan. Tidak menyimpan apa pun: hasilnya hanya usulan yang
 * ditinjau desa, lalu diterapkan lewat PATCH config biasa (masuk sebagai draf, disanitasi ulang).
 */
export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const rl = checkWebsiteEnginePatchLimit(clientIp(req));
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan, coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = (await req.json().catch(() => null)) as { request?: unknown } | null;
    const request = typeof body?.request === "string" ? body.request.trim() : "";
    if (request.length < 5) {
      return NextResponse.json({ error: "Tulis permintaan Anda (minimal 5 karakter)" }, { status: 400 });
    }
    if (request.length > AI_MAX_REQUEST_CHARS) {
      return NextResponse.json({ error: `Permintaan terlalu panjang (maks. ${AI_MAX_REQUEST_CHARS} karakter)` }, { status: 400 });
    }

    const subscription = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      select: { customization: true, template: { select: { structure: true } } },
    });
    if (!subscription?.template) {
      return NextResponse.json({ error: "Website belum aktif" }, { status: 404 });
    }

    const config = getAiConfig();
    if (!config) return NextResponse.json({ error: "AI belum dikonfigurasi" }, { status: 503 });

    // AI bekerja dari versi yang sedang diedit (draf bila ada), sama seperti yang dilihat desa di CMS.
    const structure = subscription.template.structure;
    const manifest = parseTemplateStructureManifest(structure);
    const editing = editingCustomizationRaw(subscription.customization);
    const engine = resolveEffectiveStructure({ templateStructure: structure, customization: editing });
    const theme = resolveEffectiveTheme({ templateStructure: structure, customization: editing });
    const aiCtx = {
      templateKey: manifest.templateKey,
      capabilities: manifest.capabilities,
      villageName: village.name,
      place: [village.district, village.regency].filter(Boolean).join(", "),
      engine,
      theme,
      variantAllow: mergeVariantAllowlists(getTemplatePack(manifest.templateKey).blockVariants, manifest.blockVariants),
    };
    const { system, user } = buildDesignMessages(aiCtx, request);

    const session = await getApiSession(req);
    const isPlatform = session?.user?.accountType === "platform";
    const charge = !isPlatform && AI_CREDITS_CONSUMPTION_ENABLED;
    if (charge && !(await reserveAiCredit(userId, WEBSITE_AI_CREDIT_COST))) {
      return NextResponse.json(
        { error: `Kredit AI tidak cukup (butuh ${WEBSITE_AI_CREDIT_COST} kredit). Isi ulang lewat halaman Asisten Desa AI.` },
        { status: 402 },
      );
    }
    const refund = () => (charge ? refundAiCredit(userId, WEBSITE_AI_CREDIT_COST).catch(() => undefined) : Promise.resolve());

    let reply = "";
    try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: getAiHeaders(config),
        signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
        body: JSON.stringify({
          model: resolveAiModel(process.env.WEBSITE_AI_MODEL, DEFAULT_FREE_AI_MODEL),
          temperature: 0.4,
          max_tokens: 3000,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        await refund();
        return NextResponse.json({ error: data?.error?.message || "Gagal memanggil AI. Kredit dikembalikan." }, { status: 502 });
      }
      reply = data?.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      await refund();
      const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      return NextResponse.json(
        { error: timedOut ? "AI terlalu lama merespons. Kredit dikembalikan, silakan coba lagi." : "Gagal menghubungi AI. Kredit dikembalikan." },
        { status: 504 },
      );
    }

    const result = buildProposal(reply, aiCtx);
    if (!result.ok) {
      await refund();
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    const { proposal } = result;
    return NextResponse.json({
      ok: true,
      proposal: {
        summary: proposal.summary,
        changes: proposal.changes,
        skipped: proposal.skipped,
        theme: proposal.theme,
        overrides: { version: 2, nav: proposal.engine.nav, pages: proposal.engine.pages },
      },
      creditCost: charge ? WEBSITE_AI_CREDIT_COST : 0,
      remainingCredits: isPlatform ? null : await getAiCreditBalance(userId),
    });
  } catch (e) {
    console.error("POST /api/website/ai/suggest error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
