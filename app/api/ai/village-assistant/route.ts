import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  appendMessage,
  createThread,
  getRecentMessagesForAi,
  getThreadForUser,
  titleFromFirstMessage,
} from "@/lib/ai/thread-store";
import {
  buildSystemPrompt,
  buildVillageAssistantContext,
  getAiCreditBalance,
  refundAiCredit,
  reserveAiCredit,
  type VillageAssistantMode,
} from "@/lib/ai/village-assistant";
import {
  AI_CREDITS_CONSUMPTION_ENABLED,
  ensureDefaultAiCredits,
} from "@/lib/ai/credits";
import {
  AI_MODEL,
  checkAiCredit,
  getAiConfig,
  getAiHeaders,
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

// Di bawah batas proxy nginx (60 dtk) agar kegagalan model lambat tetap berupa JSON, bukan halaman 502 Cloudflare.
const AI_UPSTREAM_TIMEOUT_MS = 50_000;
export const maxDuration = 60;

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

    if (!isPlatform && AI_CREDITS_CONSUMPTION_ENABLED) {
      const credit = await checkAiCredit({ userId: String(userId) });
      if (!credit.hasCredit) {
        return NextResponse.json(
          { error: "Kredit AI habis. Isi ulang lewat tombol Top Up di halaman Asisten Desa AI." },
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
      threadId?: number | string | null;
    } | null;

    const message = String(body?.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });
    }
    if (message.length > 8000) {
      return NextResponse.json(
        { error: "Pesan terlalu panjang (maks. 8000 karakter)" },
        { status: 400 },
      );
    }

    const mode = MODES.includes(body?.mode as VillageAssistantMode)
      ? (body!.mode as VillageAssistantMode)
      : "citizen_faq";

    let threadId: number | null = null;
    const rawThreadId = body?.threadId;
    if (rawThreadId != null && rawThreadId !== "") {
      const parsed = Number(rawThreadId);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json({ error: "threadId tidak valid" }, { status: 400 });
      }
      const existing = await getThreadForUser(
        village.id,
        userId,
        Math.trunc(parsed),
      );
      if (!existing) {
        return NextResponse.json(
          { error: "Percakapan tidak ditemukan" },
          { status: 404 },
        );
      }
      threadId = existing.id;
    }

    if (!threadId) {
      const created = await createThread({
        villageId: village.id,
        userId,
        mode,
        title: titleFromFirstMessage(message),
      });
      threadId = created.id;
    }

    await appendMessage(threadId, "user", message);

    const dbHistory = await getRecentMessagesForAi(threadId, 8);
    const historyForAi = dbHistory
      .slice(0, -1)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const userName = session?.user?.name || session?.user?.email?.split("@")[0];
    const ctx = await buildVillageAssistantContext(village.id, userName);
    const system = buildSystemPrompt(mode, ctx);

    const payload = {
      model: AI_MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        ...historyForAi.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
    };

    // Kredit dipesan atomik sebelum memanggil AI; dikembalikan bila panggilan gagal atau jawaban kosong.
    const chargeCredit = !isPlatform && AI_CREDITS_CONSUMPTION_ENABLED;
    if (chargeCredit && !(await reserveAiCredit(userId, 1))) {
      return NextResponse.json(
        { error: "Kredit AI habis. Isi ulang lewat tombol Top Up di halaman Asisten Desa AI." },
        { status: 402 },
      );
    }

    let res: Response;
    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    } | null;
    try {
      const url = `${config.baseUrl}/chat/completions`;
      res = await fetch(url, {
        method: "POST",
        headers: getAiHeaders(config),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(AI_UPSTREAM_TIMEOUT_MS),
      });
      data = (await res.json().catch(() => null)) as typeof data;
    } catch (e) {
      if (chargeCredit) await refundAiCredit(userId, 1).catch(() => undefined);
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        return NextResponse.json(
          { error: "AI terlalu lama merespons. Kredit Anda tidak dipotong, silakan coba lagi" },
          { status: 504 },
        );
      }
      throw e;
    }

    if (!res.ok) {
      if (chargeCredit) await refundAiCredit(userId, 1).catch(() => undefined);
      const errMsg = data?.error?.message || "Gagal memanggil AI";
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!reply) {
      if (chargeCredit) await refundAiCredit(userId, 1).catch(() => undefined);
      return NextResponse.json({ error: "AI tidak memberikan jawaban. Kredit Anda tidak dipotong, silakan coba lagi." }, { status: 502 });
    }
    await appendMessage(threadId, "assistant", reply);

    let remaining: number | null = null;
    if (!isPlatform && userId) {
      remaining = chargeCredit ? await getAiCreditBalance(userId) : await ensureDefaultAiCredits(userId);
    }

    return NextResponse.json({
      ok: true,
      reply,
      threadId,
      mode,
      remainingCredits: remaining,
    });
  } catch (e) {
    console.error("POST /api/ai/village-assistant", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
