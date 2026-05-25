import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  buildSystemPrompt,
  buildVillageAssistantContext,
  deductAiCredit,
  type VillageAssistantMode,
} from "@/lib/ai/village-assistant";
import {
  checkAiCredit,
  getAiConfig,
  getAiHeaders,
  OPENROUTER_MODELS,
  resolveAiModel,
} from "@/lib/ai/openrouter";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

const MODES: VillageAssistantMode[] = [
  "sdgs_analysis",
  "rpjmdes_draft",
  "program_recommendation",
  "citizen_faq",
];

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const session = await getApiSession(req);
    const accountType = session?.user?.accountType;
    const isPlatform = accountType === "platform";

    if (!isPlatform) {
      const credit = await checkAiCredit({ userId: String(userId) });
      if (!credit.hasCredit) {
        return NextResponse.json(
          { error: "Kredit AI habis. Hubungi admin untuk top-up." },
          { status: 402 },
        );
      }
    }

    const config = getAiConfig();
    if (!config) {
      return NextResponse.json(
        { error: "AI belum dikonfigurasi (OPENROUTER_API_KEY)" },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      message?: string;
      mode?: string;
      model?: string;
      history?: Array<{ role: string; content: string }>;
    } | null;

    const message = String(body?.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });
    }

    const mode = MODES.includes(body?.mode as VillageAssistantMode)
      ? (body!.mode as VillageAssistantMode)
      : "citizen_faq";

    const ctx = await buildVillageAssistantContext(village.id);
    const system = buildSystemPrompt(mode, ctx);

    const history = Array.isArray(body?.history)
      ? body!.history
          .filter(
            (m) =>
              m &&
              typeof m.content === "string" &&
              (m.role === "user" || m.role === "assistant"),
          )
          .slice(-8)
      : [];

    const model = resolveAiModel(body?.model, OPENROUTER_MODELS.gpt4oMini);

    const payload = {
      model,
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
    };

    const url = `${config.baseUrl}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: getAiHeaders(config),
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      const errMsg = data?.error?.message || "Gagal memanggil AI";
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "";

    let remaining: number | null = null;
    if (!isPlatform && userId) {
      remaining = await deductAiCredit(userId, 1);
    }

    return NextResponse.json({
      ok: true,
      reply,
      mode,
      remainingCredits: remaining,
    });
  } catch (e) {
    console.error("POST /api/ai/village-assistant", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
