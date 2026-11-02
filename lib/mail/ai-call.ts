import type { AiConfig } from "@/lib/ai/openrouter";
import { AI_MODEL, getAiHeaders } from "@/lib/ai/openrouter";
import { providerPreferences } from "@/lib/ai/laras-agent";
import { estimateTokens } from "@/lib/ai/token-budget";

/**
 * Satu panggilan model bertipe "keluaran JSON" untuk fitur Permohonan Warga (tanpa tool, tanpa riwayat).
 * Sama seperti Laras: penyedia yang boleh menyimpan/melatih dari prompt tidak dipakai (providerPreferences).
 */

export type JsonCallResult =
  | { ok: true; text: string; tokens: number }
  | { ok: false; kind: "timeout" | "upstream" | "empty"; tokens: number };

type Completion = {
  usage?: { total_tokens?: number };
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

export async function callJsonModel(args: {
  config: AiConfig;
  system: string;
  user: string;
  maxTokens: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}): Promise<JsonCallResult> {
  const fetchFn = args.fetchFn ?? fetch;
  const estimated = estimateTokens(args.system.length + args.user.length) + args.maxTokens;
  try {
    const res = await fetchFn(`${args.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: getAiHeaders(args.config),
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.2,
        max_tokens: args.maxTokens,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        ...providerPreferences(args.config.baseUrl),
      }),
      signal: AbortSignal.timeout(args.timeoutMs ?? 40_000),
    });
    const data = (await res.json().catch(() => null)) as Completion | null;
    if (!res.ok) {
      console.error("mail-ai upstream error", res.status, data?.error?.message);
      return { ok: false, kind: "upstream", tokens: estimated };
    }
    const tokens = typeof data?.usage?.total_tokens === "number" ? data.usage.total_tokens : estimated;
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, kind: "empty", tokens };
    return { ok: true, text, tokens };
  } catch (e) {
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return { ok: false, kind: "timeout", tokens: estimated };
    console.error("mail-ai fetch failed", e);
    return { ok: false, kind: "upstream", tokens: estimated };
  }
}

/** Ambil objek JSON pertama dari teks model (boleh dibungkus ```json … ``` atau didahului kalimat). */
export function extractJson(text: string): unknown | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
