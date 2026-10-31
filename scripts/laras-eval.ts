/**
 * Evaluasi perilaku Laras terhadap MODEL ASLI (red-team + kualitas), memakai prompt sistem dan spesifikasi tool produksi
 * dengan data desa rekaan (tidak ada data nyata yang dikirim). Tool ditiru dan menerapkan aturan server yang sama.
 *
 *   pnpm laras:eval                       # semua skenario, 1 kali
 *   pnpm laras:eval --runs 3              # ulangi 3x (model tidak deterministik)
 *   pnpm laras:eval --only ann-complete,pii-dump
 *   pnpm laras:eval --dry-run             # hanya daftar skenario + perkiraan biaya, tanpa memanggil model
 *   pnpm laras:eval --out laras-eval.json # simpan hasil lengkap (balasan + panggilan tool)
 *
 * Butuh OPENROUTER_API_KEY (dibaca dari .env.local / .env bila ada; LARAS_EVAL_NO_DOTENV=1 melewatinya).
 * PERHATIAN: tanpa --dry-run skrip ini MEMANGGIL MODEL (berbayar) memakai kunci tersebut.
 * Keluar dengan kode 1 bila ada kegagalan KRITIS.
 */
import { existsSync, writeFileSync } from "node:fs";
import { getAiConfig, AI_MODEL } from "../lib/ai/openrouter";
import { SCENARIOS } from "../lib/ai/eval/scenarios";
import { runScenario, summarize } from "../lib/ai/eval/runner";
import type { ScenarioResult } from "../lib/ai/eval/types";

// LARAS_EVAL_NO_DOTENV=1 melewati pemuatan berkas env (mis. untuk menguji jalur "tanpa API key" tanpa memanggil model).
for (const f of process.env.LARAS_EVAL_NO_DOTENV ? [] : [".env.local", ".env"]) {
  if (existsSync(f)) {
    try {
      process.loadEnvFile(f);
    } catch {
      /* abaikan berkas env yang rusak */
    }
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--") ? process.argv[i + 1] : "true") : undefined;
}

async function main() {
  const runs = Math.max(1, Math.min(10, Number(arg("runs") ?? 1) || 1));
  const only = arg("only")?.split(",").map((x) => x.trim()).filter(Boolean);
  const selected = only ? SCENARIOS.filter((s) => only.includes(s.id)) : SCENARIOS;
  if (selected.length === 0) {
    console.error(`Tidak ada skenario yang cocok. Tersedia: ${SCENARIOS.map((s) => s.id).join(", ")}`);
    process.exit(2);
  }

  const estCalls = selected.length * runs * 2.3;
  const estTokens = Math.round(estCalls * 4_500);
  console.log(`Model: ${AI_MODEL} · ${selected.length} skenario × ${runs} ulangan · perkiraan ±${Math.round(estCalls)} panggilan model, ±${(estTokens / 1000).toFixed(0)}k token`);

  if (arg("dry-run")) {
    for (const s of selected) {
      console.log(`\n[${s.category}] ${s.id} — ${s.title}\n  > ${s.message}`);
      for (const c of s.checks) console.log(`  - (${c.severity}) ${c.description}`);
    }
    return;
  }

  const config = getAiConfig();
  if (!config) {
    console.error("OPENROUTER_API_KEY belum diset (taruh di .env.local atau ekspor di shell).");
    process.exit(2);
  }

  const results: ScenarioResult[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const s of selected) {
      process.stdout.write(`run ${run}/${runs}  ${s.id.padEnd(28)} `);
      const r = await runScenario(s, { config }, run);
      results.push(r);
      const failed = r.checks.filter((c) => !c.passed);
      console.log(r.error ? `GALAT (${r.error})` : failed.length === 0 ? "ok" : failed.map((c) => `✘ ${c.severity}:${c.id}`).join("  "));
    }
  }

  const sum = summarize(results);
  console.log("\n══════ Ringkasan ══════");
  for (const k of ["kritis", "perilaku", "kualitas"] as const) {
    const v = sum.bySeverity[k];
    console.log(`${k.padEnd(9)} ${v.passed}/${v.total} lulus${v.total ? ` (${Math.round((v.passed / v.total) * 100)}%)` : ""}`);
  }
  console.log(`token terpakai: ${sum.totalTokens.toLocaleString("id-ID")}${sum.errors ? ` · galat panggilan model: ${sum.errors}` : ""}`);
  if (sum.criticalFailures.length) {
    console.log("\nKEGAGALAN KRITIS (tidak bisa ditutup oleh server):");
    for (const f of sum.criticalFailures) console.log(`  ✘ ${f.scenarioId}/${f.check}: ${f.description}  [gagal ${f.failedRuns}/${f.runs}]`);
  }

  const out = arg("out");
  if (out) {
    writeFileSync(out, JSON.stringify({ model: AI_MODEL, at: new Date().toISOString(), summary: sum, results }, null, 2));
    console.log(`\nHasil lengkap disimpan: ${out}`);
  }
  process.exit(sum.criticalFailures.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
