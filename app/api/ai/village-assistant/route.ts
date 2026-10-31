import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  getRecentMessagesForAi,
  getThreadOwned,
  saveExchange,
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
import { checkAiCredit, getAiConfig } from "@/lib/ai/openrouter";
import { redactSensitive, sanitizeAssistantMarkdown } from "@/lib/ai/laras-guard";
import { executeLarasTool, larasToolLabel, larasToolSpecs } from "@/lib/ai/laras-tools";
import { runLarasChat } from "@/lib/ai/laras-agent";
import { trimHistoryForAi } from "@/lib/ai/history";
import { addTokensUsed, checkTokenBudget } from "@/lib/ai/token-budget";
import { NDJSON_CONTENT_TYPE, ndjsonResponse, type StreamEvent } from "@/lib/ai/ndjson";
import { checkRateLimitDb, clientIp, limiterKey } from "@/lib/mobile/rate-limit";
import { prisma } from "@/lib/prisma";
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

// Batas per pengguna (bersama lintas worker PM2 lewat tabel rate limit): cegah ledakan biaya model.
const RATE_PER_MINUTE = { max: 8, windowMs: 60_000 };
const RATE_PER_HOUR = { max: 100, windowMs: 3_600_000 };

const OUT_OF_CREDIT = "Kredit AI habis. Isi ulang lewat tombol Top Up di halaman Asisten Desa AI.";

async function auditQuery(
  req: NextRequest,
  entry: { villageId: number; userId: number; threadId: number; metadata: Record<string, unknown> },
) {
  try {
    await prisma.auditLog.create({
      data: {
        villageId: entry.villageId,
        userId: entry.userId,
        action: "ai_query",
        entity: "ai_assistant",
        entityId: String(entry.threadId),
        metadata: entry.metadata as never,
        ipAddress: clientIp(req).slice(0, 50),
        userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (e) {
    console.error("audit ai_query failed", e);
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village, userId, session: villageSession, dbUser } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const session = await getApiSession(req);
    const accountType = session?.user?.accountType;
    const isPlatform = accountType === "platform";

    for (const [name, rule] of [["m", RATE_PER_MINUTE], ["h", RATE_PER_HOUR]] as const) {
      const rl = await checkRateLimitDb(limiterKey(`laras:${name}`, userId), rule);
      if (!rl.ok) {
        return NextResponse.json(
          { error: "Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi sebentar lagi." },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
        );
      }
    }

    // Anggaran token harian per pengguna: kredit flat 1/pertanyaan, tetapi biaya model mengikuti token.
    const budget = await checkTokenBudget(userId);
    if (!budget.ok) {
      return NextResponse.json(
        { error: "Batas pemakaian harian Laras tercapai. Coba lagi besok, atau hubungi admin bila perlu tambahan." },
        { status: 429 },
      );
    }

    if (!isPlatform && AI_CREDITS_CONSUMPTION_ENABLED) {
      const credit = await checkAiCredit({ userId: String(userId) });
      if (!credit.hasCredit) {
        return NextResponse.json({ error: OUT_OF_CREDIT }, { status: 402 });
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

    const rawMessage = String(body?.message ?? "").trim();
    if (!rawMessage) {
      return NextResponse.json({ error: "Pesan wajib diisi" }, { status: 400 });
    }
    if (rawMessage.length > 8000) {
      return NextResponse.json(
        { error: "Pesan terlalu panjang (maks. 8000 karakter)" },
        { status: 400 },
      );
    }
    // NIK/telepon yang ditempel pengguna disamarkan sebelum disimpan dan sebelum dikirim ke penyedia AI.
    const inputRedaction = redactSensitive(rawMessage);
    const message = inputRedaction.text;

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
      const existing = await getThreadOwned(
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

    // Riwayat sebelum pesan ini (pesan baru baru disimpan setelah model menjawab).
    const historyForAi = threadId
      ? trimHistoryForAi(
          (await getRecentMessagesForAi(threadId, 8))
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        )
      : [];

    const userName = session?.user?.name || session?.user?.email?.split("@")[0];
    const ctx = await buildVillageAssistantContext(village.id, userName);
    const system = buildSystemPrompt(mode, ctx);

    // Kredit dipesan atomik sebelum memanggil AI; dikembalikan bila panggilan gagal atau jawaban kosong.
    const chargeCredit = !isPlatform && AI_CREDITS_CONSUMPTION_ENABLED;
    if (chargeCredit && !(await reserveAiCredit(userId, 1))) {
      return NextResponse.json({ error: OUT_OF_CREDIT }, { status: 402 });
    }
    const refund = () =>
      chargeCredit ? refundAiCredit(userId, 1).catch(() => undefined) : Promise.resolve();

    const toolCtx = { villageId: village.id, userId, role: dbUser.role, village, session: villageSession, proposals: { count: 0 }, cache: new Map() };

    type Outcome = { status: number; body: Record<string, unknown> };
    const fail = (status: number, error: string): Outcome => ({ status, body: { error } });

    // Seluruh pekerjaan setelah kredit dipesan. `emit` hanya ada pada mode streaming (status per langkah).
    const finish = async (emit?: (e: StreamEvent) => void): Promise<Outcome> => {
      const result = await runLarasChat(
        {
          config,
          messages: [
            { role: "system", content: system },
            ...historyForAi,
            { role: "user", content: message },
          ],
          deadlineMs: Math.max(5_000, AI_UPSTREAM_TIMEOUT_MS - (Date.now() - startedAt)),
        },
        {
          toolSpecs: larasToolSpecs(),
          executeTool: (name, args) => {
            emit?.({ type: "progress", label: larasToolLabel(name) });
            return executeLarasTool(toolCtx, name, args);
          },
        },
      );

      // Pemakaian token dicatat walau jawaban gagal (token sudah terpakai di penyedia).
      await addTokensUsed(userId, result.usage.total).catch((e) => console.error("addTokensUsed failed", e));

      if (!result.ok) {
        await refund();
        return fail(
          result.status,
          result.kind === "timeout"
            ? "AI terlalu lama merespons. Kredit Anda tidak dipotong, silakan coba lagi"
            : result.kind === "empty"
              ? "AI tidak memberikan jawaban. Kredit Anda tidak dipotong, silakan coba lagi."
              : "Layanan AI sedang bermasalah. Kredit Anda tidak dipotong, silakan coba lagi.",
        );
      }

      const output = sanitizeAssistantMarkdown(result.reply);
      const reply = output.text.trim();
      if (!reply) {
        await refund();
        return fail(502, "AI tidak memberikan jawaban. Kredit Anda tidak dipotong, silakan coba lagi.");
      }

      let savedThreadId: number;
      try {
        savedThreadId = await saveExchange({
          villageId: village.id,
          userId,
          mode,
          threadId,
          title: titleFromFirstMessage(message),
          userMessage: message,
          assistantMessage: reply,
        });
      } catch (e) {
        await refund();
        throw e;
      }

      await auditQuery(req, {
        villageId: village.id,
        userId,
        threadId: savedThreadId,
        metadata: {
          mode,
          tools: result.toolsUsed,
          rounds: result.rounds,
          proposals: result.actions.map((a) => a.key),
          inputRedactions: inputRedaction.redacted,
          outputRedactions: output.redacted,
          tokens: result.usage.total,
          promptTokens: result.usage.prompt,
          completionTokens: result.usage.completion,
          tokensEstimated: result.usage.estimated,
          ms: Date.now() - startedAt,
        },
      });

      let remaining: number | null = null;
      if (!isPlatform && userId) {
        remaining = chargeCredit ? await getAiCreditBalance(userId) : await ensureDefaultAiCredits(userId);
      }

      return {
        status: 200,
        body: {
          ok: true,
          reply,
          threadId: savedThreadId,
          mode,
          remainingCredits: remaining,
          actions: result.actions,
          ...(inputRedaction.redacted > 0
            ? { notice: "NIK/nomor telepon pada pesan Anda disamarkan sebelum diproses demi privasi warga." }
            : {}),
        },
      };
    };

    // Klien yang meminta NDJSON mendapat status per langkah; yang lain tetap menerima satu JSON seperti sebelumnya.
    if (req.headers.get("accept")?.includes(NDJSON_CONTENT_TYPE)) {
      return ndjsonResponse(async (emit) => {
        const out = await finish(emit);
        emit(
          out.status === 200
            ? ({ type: "done", ...out.body } as StreamEvent)
            : { type: "error", error: String(out.body.error ?? "Gagal"), status: out.status },
        );
      });
    }
    const out = await finish();
    return NextResponse.json(out.body, { status: out.status });
  } catch (e) {
    console.error("POST /api/ai/village-assistant", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
