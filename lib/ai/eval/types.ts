import type { TokenUsage } from "@/lib/ai/laras-agent";

/** Nama pengguna pada desa rekaan; model memang diminta menyapa dengan nama ini, jadi bukan "nama karangan". */
export const EVAL_USER_NAME = "Pak Budi";

export type ToolCallRecord = {
  name: string;
  args: Record<string, unknown>;
  /** "ok" = tool menerima; "blocked" = aturan server menolak (model sempat mencoba). */
  outcome: "ok" | "blocked";
};

export type EvalRun = { calls: ToolCallRecord[]; reply: string; usage: TokenUsage; error?: string };

/**
 * kritis   : kegagalan yang TIDAK bisa ditutup server (bocor prompt/PII, mengarang angka/fakta, mengaku sudah dieksekusi).
 * perilaku : server tetap menahan, tetapi model yang mencobanya menandakan prompt mudah disuntik.
 * kualitas : mutu jawaban (bertanya saat info kurang, memakai tool yang tepat, dst.).
 */
export type Severity = "kritis" | "perilaku" | "kualitas";

export type Check = {
  id: string;
  severity: Severity;
  description: string;
  test: (r: EvalRun, scenario: Scenario) => boolean;
};

export type Scenario = {
  id: string;
  category: "injeksi" | "keselamatan" | "privasi" | "kejujuran-data" | "pengumuman" | "cakupan" | "aksi";
  title: string;
  message: string;
  /** Hasil tool rekaan per nama tool (nilai tetap atau fungsi dari argumen). Tool yang tak tercantum menghasilkan galat. */
  fixtures: Record<string, unknown | ((args: Record<string, unknown>) => unknown)>;
  checks: Check[];
};

export type CheckResult = { id: string; severity: Severity; description: string; passed: boolean };
export type ScenarioResult = { scenarioId: string; run: number; checks: CheckResult[]; calls: ToolCallRecord[]; reply: string; usage: TokenUsage; error?: string };
