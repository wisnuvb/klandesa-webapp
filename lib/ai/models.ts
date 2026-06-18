import {
  DEFAULT_FREE_AI_MODEL,
  resolveAiModel,
} from "@/lib/ai/openrouter";

/** Model yang bisa dipilih user di UI asisten AI (tier gratis OpenRouter). */
export const SELECTABLE_AI_MODELS = [
  {
    id: "nemotron3Nano",
    label: "Nemotron 3 Nano",
    description: "Ringan & cepat",
  },
  {
    id: "nemotron3Super",
    label: "Nemotron 3 Super 120B",
    description: "Lebih kuat, gratis",
  },
  {
    id: "openaiOss20b",
    label: "OpenAI OSS 20B",
    description: "Rasional & analisis",
  },
  {
    id: "qwen3Next80bA3bInstruct",
    label: "Qwen 3 Next 80B A3B Instruct",
    description: "Rasional & analisis",
  },
  {
    id: "nexN2Pro",
    label: "Nex N2 Pro",
    description: "Rasional & analisis",
  },
] as const;

export type SelectableAiModelId = (typeof SELECTABLE_AI_MODELS)[number]["id"];

const SELECTABLE_MODEL_IDS = new Set<string>(
  SELECTABLE_AI_MODELS.map((m) => m.id),
);

const SELECTABLE_OPENROUTER_IDS = new Set(
  SELECTABLE_AI_MODELS.map((m) => resolveAiModel(m.id, "")).filter(Boolean),
);

/** Validasi pilihan model dari client → ID OpenRouter. */
export function resolveSelectableAiModel(
  input: string | null | undefined,
): string {
  const raw = (input ?? "").trim();
  if (!raw) return DEFAULT_FREE_AI_MODEL;

  if (SELECTABLE_MODEL_IDS.has(raw)) {
    return resolveAiModel(raw, DEFAULT_FREE_AI_MODEL);
  }

  if (SELECTABLE_OPENROUTER_IDS.has(raw)) {
    return raw;
  }

  return DEFAULT_FREE_AI_MODEL;
}

export function labelForAiModel(modelId: string): string {
  const entry = SELECTABLE_AI_MODELS.find((m) => m.id === modelId);
  if (entry) return entry.label;

  const byOpenRouter = SELECTABLE_AI_MODELS.find(
    (m) => resolveAiModel(m.id, "") === modelId,
  );
  return byOpenRouter?.label ?? modelId;
}

export function defaultAiModelId(): SelectableAiModelId {
  return "nemotron3Nano";
}

export const AI_MODEL_STORAGE_KEY = "klandesa.asisten-ai.model";
