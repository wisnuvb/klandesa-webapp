import type { AiConfig } from "@/lib/ai/openrouter";
import { AI_MODEL, getAiHeaders } from "@/lib/ai/openrouter";
import type { ToolOutcome } from "@/lib/ai/laras-tools";
import type { ActionCard } from "@/lib/ai/laras-actions";

/** Batas biaya/latensi per pertanyaan (1 kredit): jumlah putaran model↔tool dan panggilan tool per putaran. */
export const MAX_TOOL_ROUNDS = 3;
export const MAX_TOOL_CALLS_PER_ROUND = 10;
export const MAX_COMPLETION_TOKENS = 1500;
const MAX_TOOL_RESULT_CHARS = 8000;

type ToolCall = { id: string; type?: string; function?: { name?: string; arguments?: string } };
type AiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};
type CompletionResponse = {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
  error?: { message?: string };
};

export type LarasChatResult =
  | { ok: true; reply: string; toolsUsed: string[]; rounds: number; actions: ActionCard[] }
  | { ok: false; kind: "timeout" | "upstream" | "empty"; status: number };

export type LarasChatDeps = {
  fetchFn?: typeof fetch;
  executeTool: (name: string, args: string) => Promise<ToolOutcome>;
  toolSpecs: unknown[];
  now?: () => number;
};

function isOpenRouter(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.endsWith("openrouter.ai");
  } catch {
    return false;
  }
}

/** Minta OpenRouter tidak merutekan ke penyedia yang boleh menyimpan/melatih dari prompt (data desa). */
export function providerPreferences(
  baseUrl: string,
  env: Record<string, string | undefined> = process.env,
): Record<string, unknown> | undefined {
  if (!isOpenRouter(baseUrl)) return undefined;
  if (env.OPENROUTER_ALLOW_DATA_COLLECTION === "1") return undefined;
  return { provider: { data_collection: "deny" } };
}

function looksLikeToolUnsupported(status: number, message: string | undefined): boolean {
  return (status === 400 || status === 404) && /tool/i.test(message ?? "");
}

export async function runLarasChat(
  params: {
    config: AiConfig;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    deadlineMs: number;
  },
  deps: LarasChatDeps,
): Promise<LarasChatResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const now = deps.now ?? Date.now;
  const deadline = now() + params.deadlineMs;
  const messages: AiMessage[] = params.messages.map((m) => ({ ...m }));
  const toolsUsed: string[] = [];
  const actions = new Map<string, ActionCard>();
  let useTools = deps.toolSpecs.length > 0;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const remaining = deadline - now();
    if (remaining <= 1000) return { ok: false, kind: "timeout", status: 504 };

    // Putaran terakhir tanpa tool supaya model wajib menjawab dengan data yang sudah ada.
    const offerTools = useTools && round < MAX_TOOL_ROUNDS;
    const body = {
      model: AI_MODEL,
      temperature: 0.3,
      max_tokens: MAX_COMPLETION_TOKENS,
      messages,
      ...(offerTools ? { tools: deps.toolSpecs, tool_choice: "auto" } : {}),
      ...providerPreferences(params.config.baseUrl),
    };

    let res: Response;
    let data: CompletionResponse | null;
    try {
      res = await fetchFn(`${params.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: getAiHeaders(params.config),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(remaining),
      });
      data = (await res.json().catch(() => null)) as CompletionResponse | null;
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        return { ok: false, kind: "timeout", status: 504 };
      }
      console.error("laras upstream fetch failed", e);
      return { ok: false, kind: "upstream", status: 502 };
    }

    if (!res.ok) {
      // Model/penyedia tidak mendukung tool: ulangi sekali tanpa tool (Laras tetap menjawab dari ringkasan konteks).
      if (round === 0 && offerTools && looksLikeToolUnsupported(res.status, data?.error?.message)) {
        console.warn("laras: model tidak mendukung tool, lanjut tanpa tool");
        useTools = false;
        round--;
        continue;
      }
      console.error("laras upstream error", res.status, data?.error?.message);
      return { ok: false, kind: "upstream", status: 502 };
    }

    const msg = data?.choices?.[0]?.message;
    const calls = (msg?.tool_calls ?? []).slice(0, MAX_TOOL_CALLS_PER_ROUND);

    if (offerTools && calls.length > 0) {
      messages.push({ role: "assistant", content: msg?.content ?? null, tool_calls: calls });
      for (const call of calls) {
        const name = call.function?.name ?? "";
        toolsUsed.push(name);
        const outcome = await deps.executeTool(name, call.function?.arguments ?? "{}");
        // Usulan terbaru untuk permohonan yang sama menggantikan yang lama.
        if (outcome.action) actions.set(outcome.action.key, outcome.action);
        let content = JSON.stringify(outcome.result);
        if (content.length > MAX_TOOL_RESULT_CHARS) {
          content = JSON.stringify({ error: "Hasil terlalu besar; persempit filter atau kelompokkan datanya." });
        }
        messages.push({ role: "tool", tool_call_id: call.id, content });
      }
      continue;
    }

    const reply = msg?.content?.trim() ?? "";
    if (!reply) return { ok: false, kind: "empty", status: 502 };
    return { ok: true, reply, toolsUsed, rounds: round + 1, actions: Array.from(actions.values()) };
  }

  return { ok: false, kind: "empty", status: 502 };
}
