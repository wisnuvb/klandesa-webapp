import { runLarasChat, type TokenUsage } from "@/lib/ai/laras-agent";
import type { AiConfig } from "@/lib/ai/openrouter";
import { larasToolSpecs } from "@/lib/ai/laras-tools";
import { buildSystemPrompt, type VillageAssistantContext } from "@/lib/ai/village-assistant";
import { redactSensitive } from "@/lib/ai/laras-guard";
import { reportSafetyRules, validateReportProposal } from "@/lib/ai/laras-report";
import { validateAnnouncementProposal } from "@/lib/ai/laras-announcement";
import type { CheckResult, EvalRun, Scenario, ScenarioResult, ToolCallRecord } from "./types";

/** Desa rekaan: tidak ada data asli yang dikirim ke penyedia model. */
const FAKE_CONTEXT: VillageAssistantContext = {
  villageName: "Desa Contoh",
  villageCode: "0000000000",
  regency: "Kabupaten Contoh",
  province: "Provinsi Contoh",
  sdgsSummary: Array.from({ length: 17 }, (_, i) => `${i + 1}. Tujuan ${i + 1}: 55/100 (medium)`).join("\n"),
  lowGoals: "Goal 1 (Tanpa Kemiskinan): skor 38\nGoal 6 (Air Bersih): skor 41",
  rpjmdesCount: 1,
  mailServiceCount: 12,
  socialProgramCount: 2,
  totalResidents: 1500,
  userName: "Pak Budi",
  bumdesSummary: "BUMDes Maju Bersama",
  pengaduanTerbuka: 3,
  pengaduanSelesai: 14,
  posyanduCount: 24,
  pkkCount: 8,
  pertanianPlotCount: 30,
};

type ToolResult = { ok: boolean; result: unknown };
const err = (error: string): ToolResult => ({ ok: false, result: { error } });

/**
 * Tool rekaan yang meniru aturan server (fungsi murni yang sama dengan produksi), sehingga model melihat pesan galat yang
 * sama. Usulan yang ditolak aturan server tetap dicatat (outcome "blocked") sebagai tanda model sempat mencobanya.
 */
function stubTool(s: Scenario, name: string, args: Record<string, unknown>): ToolResult {
  const fx = s.fixtures;
  if (name === "propose_mail_decision") {
    const list = (fx.mail_requests_pending as { permohonan?: Array<{ id: number; peringatan: string[] }> } | undefined)?.permohonan ?? [];
    const row = list.find((m) => m.id === args.request_id);
    if (!row) return err("Permohonan tidak ditemukan.");
    const blockers = row.peringatan.filter((w) => !/Sudah menunggu/i.test(w));
    if (args.decision === "approve" && blockers.length > 0) {
      return err(`Tidak diusulkan setuju karena ada peringatan: ${blockers.join(" ")} Jelaskan peringatan ini kepada pengguna dan serahkan keputusan padanya.`);
    }
    if (args.decision === "reject" && String(args.note ?? "").trim().length < 5) return err("Usulan penolakan wajib menyertakan alasan yang jelas (minimal 5 huruf).");
    return { ok: true, result: { status: "usulan_disiapkan", belum_dijalankan: true, id: row.id, instruksi: "Usulan sudah tampil sebagai kartu. JANGAN katakan sudah disetujui/ditolak; katakan menunggu konfirmasi." } };
  }
  if (name === "propose_report_action") {
    const list = (fx.citizen_reports_open as { laporan?: Array<{ id: number; status: string; kategori: string }> } | undefined)?.laporan ?? [];
    const row = list.find((r) => r.id === args.report_id);
    if (!row) return err("Laporan tidak ditemukan.");
    const check = validateReportProposal({ status: row.status }, { status: args.status as never, response: args.response as string | undefined });
    if (!check.ok) return err(check.error);
    const safety = reportSafetyRules(row.kategori, check.status);
    if (safety.block) return err(safety.block);
    return { ok: true, result: { status: "usulan_disiapkan", belum_dijalankan: true, id: row.id, instruksi: "Usulan sudah tampil sebagai kartu. JANGAN katakan sudah dijalankan; katakan menunggu konfirmasi." } };
  }
  if (name === "propose_announcement") {
    const check = validateAnnouncementProposal({
      title: String(args.title ?? ""), content: String(args.content ?? ""), category: String(args.category ?? ""), pinned: args.pinned === true,
    });
    if (!check.ok) return err(check.error);
    return { ok: true, result: { status: "usulan_disiapkan", belum_dijalankan: true, judul: check.title, instruksi: "Usulan tampil sebagai kartu. JANGAN katakan sudah terbit; katakan menunggu konfirmasi, dan setelah dikonfirmasi langsung tayang untuk publik." } };
  }
  const fixture = fx[name];
  if (fixture === undefined) return err("Tool tidak tersedia pada skenario ini.");
  const value = typeof fixture === "function" ? (fixture as (a: Record<string, unknown>) => unknown)(args) : fixture;
  const failed = typeof value === "object" && value !== null && "error" in value;
  return { ok: !failed, result: value };
}

export type RunnerDeps = { config: AiConfig; fetchFn?: typeof fetch; deadlineMs?: number };

export async function runScenario(s: Scenario, deps: RunnerDeps, run = 1): Promise<ScenarioResult> {
  // Pesan pengguna melewati penyamaran yang sama dengan rute produksi.
  const message = redactSensitive(s.message).text;
  const calls: ToolCallRecord[] = [];
  const result = await runLarasChat(
    {
      config: deps.config,
      messages: [
        { role: "system", content: buildSystemPrompt("citizen_faq", FAKE_CONTEXT) },
        { role: "user", content: message },
      ],
      deadlineMs: deps.deadlineMs ?? 50_000,
    },
    {
      fetchFn: deps.fetchFn,
      toolSpecs: larasToolSpecs(),
      executeTool: async (name, rawArgs) => {
        let args: Record<string, unknown> = {};
        try {
          args = rawArgs?.trim() ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
        } catch {
          calls.push({ name, args: {}, outcome: "blocked" });
          return { ok: false, result: { error: "Argumen bukan JSON yang valid." } };
        }
        const out = stubTool(s, name, args);
        calls.push({ name, args, outcome: out.ok ? "ok" : "blocked" });
        return out;
      },
    },
  );

  const usage: TokenUsage = result.usage;
  const evalRun: EvalRun = { calls, reply: result.ok ? result.reply : "", usage, ...(result.ok ? {} : { error: result.kind }) };
  const checks: CheckResult[] = s.checks.map((ch) => {
    let passed = false;
    try {
      // Bila model tidak menjawab sama sekali, hanya pengecekan yang memang menguji ketiadaan sesuatu yang bisa lulus.
      passed = ch.test(evalRun, s);
    } catch {
      passed = false;
    }
    return { id: ch.id, severity: ch.severity, description: ch.description, passed };
  });
  return { scenarioId: s.id, run, checks, calls, reply: evalRun.reply, usage, ...(evalRun.error ? { error: evalRun.error } : {}) };
}

export type Summary = {
  runs: number;
  scenarios: number;
  bySeverity: Record<"kritis" | "perilaku" | "kualitas", { passed: number; total: number }>;
  criticalFailures: Array<{ scenarioId: string; check: string; description: string; failedRuns: number; runs: number }>;
  totalTokens: number;
  errors: number;
};

export function summarize(results: ScenarioResult[]): Summary {
  const bySeverity = { kritis: { passed: 0, total: 0 }, perilaku: { passed: 0, total: 0 }, kualitas: { passed: 0, total: 0 } };
  const crit = new Map<string, { scenarioId: string; check: string; description: string; failedRuns: number; runs: number }>();
  let totalTokens = 0;
  let errors = 0;
  for (const r of results) {
    totalTokens += r.usage.total;
    if (r.error) errors++;
    for (const c of r.checks) {
      bySeverity[c.severity].total++;
      if (c.passed) bySeverity[c.severity].passed++;
      if (c.severity === "kritis") {
        const key = `${r.scenarioId}/${c.id}`;
        const e = crit.get(key) ?? { scenarioId: r.scenarioId, check: c.id, description: c.description, failedRuns: 0, runs: 0 };
        e.runs++;
        if (!c.passed) e.failedRuns++;
        crit.set(key, e);
      }
    }
  }
  return {
    runs: new Set(results.map((r) => r.run)).size,
    scenarios: new Set(results.map((r) => r.scenarioId)).size,
    bySeverity,
    criticalFailures: [...crit.values()].filter((e) => e.failedRuns > 0),
    totalTokens,
    errors,
  };
}
