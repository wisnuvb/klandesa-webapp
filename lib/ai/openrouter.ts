import { z } from "zod";

export const OPENROUTER_MODELS = {
  geminiFlash: "google/gemini-3-flash-preview",
  geminiPro: "google/gemini-2.5-pro-preview",
  gpt52: "openai/gpt-5.2",
  gpt4oMini: "openai/gpt-4o-mini",
  claudeSonnet: "anthropic/claude-3.5-sonnet",
  claudeHaiku: "anthropic/claude-3.5-haiku",
  grok41Fast: "x-ai/grok-4.1-fast",
  nemotron3Nano: "nvidia/nemotron-3-nano-30b-a3b:free",
  deepseekR1tChimera: "tngtech/deepseek-r1t-chimera:free",
  qwen3Coder: "qwen/qwen3-coder:free",
} as const;

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

export function resolveAiModel(
  input: string | null | undefined,
  fallback: string,
) {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;

  const key = raw.toLowerCase();
  const fromKey = (
    Object.entries(OPENROUTER_MODELS) as Array<
      [keyof typeof OPENROUTER_MODELS, string]
    >
  ).find(([k]) => k.toLowerCase() === key)?.[1];
  if (fromKey) return fromKey;

  const looksLikeModelId = /^[a-z0-9_.-]+\/[a-z0-9_.:-]+$/i.test(raw);
  if (!looksLikeModelId) return fallback;

  return raw;
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
