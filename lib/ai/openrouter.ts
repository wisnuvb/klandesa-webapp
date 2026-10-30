import { z } from "zod";

/** Satu-satunya model AI yang dipakai di seluruh aplikasi (tidak ada pilihan model oleh user). */
export const AI_MODEL = "openai/gpt-6-luna";

const configSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  referer: z.string().url().optional(),
  title: z.string().min(1).max(200).optional(),
});

export type AiConfig = z.infer<typeof configSchema>;

function normalizeBaseUrl(raw: string) {
  return raw.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
}

export function getAiConfig(): AiConfig | null {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY?.trim() || "";
  const legacyApiKey = process.env.AI_API_KEY?.trim() || "";

  const apiKey = openrouterApiKey || legacyApiKey;
  if (!apiKey) return null;

  const baseUrl = normalizeBaseUrl(
    openrouterApiKey
      ? process.env.OPENROUTER_BASE_URL?.trim() ||
          "https://openrouter.ai/api/v1"
      : process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1",
  );

  const referer = process.env.OPENROUTER_SITE_URL?.trim() || undefined;
  const title = process.env.OPENROUTER_SITE_NAME?.trim() || undefined;

  const parsed = configSchema.safeParse({
    baseUrl,
    apiKey,
    referer: openrouterApiKey ? referer : undefined,
    title: openrouterApiKey ? title : undefined,
  });

  if (!parsed.success) return null;
  return parsed.data;
}

export function getAiHeaders(config: AiConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };

  if (config.referer) headers["HTTP-Referer"] = config.referer;
  if (config.title) headers["X-Title"] = config.title;

  return headers;
}

export type AiCreditCheckInput = {
  userId?: string | null;
  role?: string | null;
  credits?: number | null;
};

export async function checkAiCredit(input: AiCreditCheckInput) {
  const fallbackCredits = typeof input.credits === "number" ? input.credits : 0;
  const fallbackResult = {
    hasCredit: fallbackCredits > 0,
    remaining: fallbackCredits,
  };

  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/ai/credit");
      if (!response.ok) return fallbackResult;
      const data = (await response.json()) as {
        hasCredit?: boolean;
        remaining?: number;
      };
      if (typeof data.remaining !== "number") return fallbackResult;
      return {
        hasCredit: !!data.hasCredit,
        remaining: data.remaining,
      };
    } catch {
      return fallbackResult;
    }
  }

  const userIdRaw = input.userId?.trim();
  if (!userIdRaw) return fallbackResult;
  const userId = Number(userIdRaw);
  if (!Number.isFinite(userId)) return fallbackResult;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiCredits: true },
  });
  const remaining =
    typeof user?.aiCredits === "number" ? user.aiCredits : fallbackCredits;
  const hasCredit = remaining > 0;
  return {
    hasCredit,
    remaining,
  };
}

export async function checkSellerAiCredit(input: AiCreditCheckInput) {
  return checkAiCredit(input);
}
