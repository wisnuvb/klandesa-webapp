import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { AI_CREDITS_CONSUMPTION_ENABLED } from "@/lib/ai/credits";
import { getAiConfig } from "@/lib/ai/openrouter";
import { getAiCreditBalance, refundAiCredit, reserveAiCredit } from "@/lib/ai/village-assistant";
import { addTokensUsed, checkTokenBudget } from "@/lib/ai/token-budget";
import { createTtlCache } from "@/lib/ai/ttl-cache";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { callJsonModel } from "@/lib/mail/ai-call";
import { enrichRows } from "@/lib/mail/request-queue";
import { ageYearsFromBirth, ASSIST_SYSTEM, buildAssistUserMessage, parseAssistOutput, type AssistResult } from "@/lib/mail/request-assist";

const OUT_OF_CREDIT = "Kredit AI Anda habis. Tambah kredit di menu Langganan untuk memakai asisten.";

class AssistError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Hasil telaah disimpan sebentar per permohonan (kunci memuat updatedAt): membuka ulang dialog tidak memakan kredit lagi.
const cache = createTtlCache<string, AssistResult>({ ttlMs: 10 * 60_000, max: 300 });

/** Telaah satu permohonan dengan AI. 1 kredit AI dari pengguna yang menekan; dikembalikan bila gagal. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const idRaw = (await params).id;
    if (!/^\d{1,18}$/.test(idRaw)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const rl = await checkRateLimitDb(limiterKey("mail-assist", userId), { max: 20, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    }

    const row = await prisma.mailRequest.findFirst({ where: { id: BigInt(idRaw), villageId: village.id } });
    if (!row) return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
    if (row.status !== "pending") return NextResponse.json({ error: "Permohonan ini sudah diputuskan; tidak perlu ditelaah." }, { status: 409 });

    const [item] = await enrichRows(village.id, [row]);
    if (!item.checks?.ready) {
      return NextResponse.json({ error: item.checks?.blocking.join(" ") || "Permohonan belum bisa diproses." }, { status: 409 });
    }

    let charged = false;
    let fresh = false;
    const result = await cache.get(`${village.id}:${row.id}:${row.updatedAt.getTime()}`, async () => {
      fresh = true;
      const config = getAiConfig();
      if (!config) throw new AssistError(503, "AI belum dikonfigurasi.");
      const budget = await checkTokenBudget(userId);
      if (!budget.ok) throw new AssistError(429, "Batas pemakaian AI harian tercapai. Coba lagi besok.");
      if (AI_CREDITS_CONSUMPTION_ENABLED) {
        if (!(await reserveAiCredit(userId, 1))) throw new AssistError(402, OUT_OF_CREDIT);
        charged = true;
      }
      const refund = async () => {
        if (charged) await refundAiCredit(userId, 1).catch(() => undefined);
        charged = false;
      };

      try {
        const [resident, earlier] = await Promise.all([
          row.residentId
            ? prisma.resident.findFirst({ where: { id: row.residentId, villageId: village.id }, select: { isAlive: true, birthDate: true, gender: true, maritalStatus: true } })
            : prisma.resident.findFirst({ where: { villageId: village.id, nik: row.nik }, select: { isAlive: true, birthDate: true, gender: true, maritalStatus: true } }),
          prisma.mailRequest.groupBy({
            by: ["status"],
            where: { villageId: village.id, nik: row.nik, mailType: row.mailType, id: { not: row.id } },
            _count: { _all: true },
          }),
        ]);
        const n = (s: string) => earlier.find((e) => e.status === s)?._count._all ?? 0;
        const formNote =
          row.formData && typeof row.formData === "object" && !Array.isArray(row.formData) && typeof (row.formData as { note?: unknown }).note === "string"
            ? (row.formData as { note: string }).note
            : null;

        const call = await callJsonModel({
          config,
          system: ASSIST_SYSTEM,
          user: buildAssistUserMessage({
            mailType: row.mailType,
            purpose: row.purpose,
            formNote,
            ageDays: item.ageDays,
            channel: row.channel,
            rtStatus: row.rtStatus,
            warnings: item.checks!.warnings,
            resident: resident
              ? { found: true, alive: resident.isAlive, ageYears: ageYearsFromBirth(resident.birthDate), gender: resident.gender, maritalStatus: resident.maritalStatus }
              : null,
            earlierSameType: { approved: n("approved"), rejected: n("rejected"), pending: n("pending") },
          }),
          maxTokens: 900,
        });
        await addTokensUsed(userId, call.tokens).catch(() => undefined);
        if (!call.ok) {
          await refund();
          throw new AssistError(call.kind === "timeout" ? 504 : 502, "Asisten AI sedang bermasalah. Kredit tidak terpakai; coba lagi.");
        }
        const parsed = parseAssistOutput(call.text, { blocksApproval: item.checks!.blocksApproval });
        if (!parsed.ok) {
          await refund();
          throw new AssistError(502, "Asisten tidak dapat menyusun hasil yang valid. Kredit tidak terpakai; coba lagi.");
        }
        return parsed.value;
      } catch (e) {
        if (!(e instanceof AssistError)) await refund();
        throw e;
      }
    });

    if (fresh) {
      await auditWeb(req, loaded.ctx, "ai_assist", "mail_requests", idRaw, { charged, recommendation: result.rekomendasi });
    }
    return NextResponse.json({ result, cached: !fresh, remainingCredits: await getAiCreditBalance(userId) });
  } catch (e) {
    if (e instanceof AssistError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("POST /api/mail-requests/[id]/assist", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
