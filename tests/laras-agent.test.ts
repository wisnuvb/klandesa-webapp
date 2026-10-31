import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_COMPLETION_TOKENS,
  MAX_TOOL_CHARS_PER_TURN,
  MAX_TOOL_ROUNDS,
  providerPreferences,
  runLarasChat,
} from "../lib/ai/laras-agent.ts";
import { executeLarasTool } from "../lib/ai/laras-tools.ts";
import { resolveApiPermission } from "../lib/permissions/api-route-map.ts";
import { roleCan } from "../lib/permissions/matrix.ts";

const config = { baseUrl: "https://openrouter.ai/api/v1", apiKey: "k" };
const msgs = [
  { role: "system" as const, content: "s" },
  { role: "user" as const, content: "berapa warga?" },
];
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const toolCall = (name: string, args = "{}") => ({ id: "c1", type: "function", function: { name, arguments: args } });

function fakeFetch(responses: Response[], seen: Array<Record<string, unknown>> = []) {
  let i = 0;
  const fn = (async (_url: string | URL | Request, init?: RequestInit) => {
    seen.push(JSON.parse(String(init?.body)));
    return responses[Math.min(i++, responses.length - 1)]!;
  }) as typeof fetch;
  return fn;
}

describe("runLarasChat", () => {
  it("menjawab langsung bila model tidak memanggil tool, dengan batas token", async () => {
    const seen: Array<Record<string, unknown>> = [];
    const r = await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      {
        fetchFn: fakeFetch([json(200, { choices: [{ message: { content: " Halo " } }] })], seen),
        executeTool: async () => ({ ok: true, result: {} }),
        toolSpecs: [{ type: "function" }],
      },
    );
    assert.deepEqual(r.ok && r.reply, "Halo");
    assert.equal(seen[0]!.max_tokens, MAX_COMPLETION_TOKENS);
    assert.deepEqual(seen[0]!.provider, { data_collection: "deny" });
  });

  it("menjalankan tool lalu menjawab dengan hasilnya", async () => {
    const calls: string[] = [];
    const seen: Array<Record<string, unknown>> = [];
    const r = await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      {
        fetchFn: fakeFetch(
          [
            json(200, { choices: [{ message: { content: null, tool_calls: [toolCall("population_stats", '{"rt":"01"}')] } }] }),
            json(200, { choices: [{ message: { content: "RT 01 berpenduduk 120 jiwa." } }] }),
          ],
          seen,
        ),
        executeTool: async (name, args) => {
          calls.push(`${name}:${args}`);
          return { ok: true, result: { total: 120 } };
        },
        toolSpecs: [{ type: "function" }],
      },
    );
    assert.ok(r.ok);
    assert.deepEqual(calls, ['population_stats:{"rt":"01"}']);
    assert.deepEqual(r.ok && r.toolsUsed, ["population_stats"]);
    const second = seen[1]!.messages as Array<{ role: string; content: string }>;
    assert.equal(second.at(-1)!.role, "tool");
    assert.equal(second.at(-1)!.content, '{"total":120}');
  });

  it("model yang terus meminta tool dibatasi: putaran terakhir tanpa tool", async () => {
    const seen: Array<Record<string, unknown>> = [];
    const loop = json(200, { choices: [{ message: { content: "jawab", tool_calls: [toolCall("finance_summary")] } }] });
    const r = await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      {
        fetchFn: (async (_u: unknown, init?: RequestInit) => {
          seen.push(JSON.parse(String(init?.body)));
          return loop.clone();
        }) as typeof fetch,
        executeTool: async () => ({ ok: true, result: {} }),
        toolSpecs: [{ type: "function" }],
      },
    );
    assert.equal(seen.length, MAX_TOOL_ROUNDS + 1);
    assert.equal("tools" in seen.at(-1)!, false);
    assert.ok(r.ok && r.reply === "jawab");
  });

  it("model tanpa dukungan tool: ulangi sekali tanpa tool", async () => {
    const seen: Array<Record<string, unknown>> = [];
    const r = await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      {
        fetchFn: fakeFetch(
          [
            json(404, { error: { message: "No endpoints found that support tool use" } }),
            json(200, { choices: [{ message: { content: "ok tanpa tool" } }] }),
          ],
          seen,
        ),
        executeTool: async () => ({ ok: true, result: {} }),
        toolSpecs: [{ type: "function" }],
      },
    );
    assert.ok(r.ok && r.reply === "ok tanpa tool");
    assert.equal("tools" in seen[1]!, false);
  });

  it("galat penyedia dan jawaban kosong dilaporkan agar kredit bisa dikembalikan", async () => {
    const deps = { executeTool: async () => ({ ok: true, result: {} }), toolSpecs: [] };
    const bad = await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      { ...deps, fetchFn: fakeFetch([json(500, { error: { message: "rahasia internal penyedia" } })]) },
    );
    assert.ok(!bad.ok && bad.kind === "upstream" && bad.status === 502);
    const empty = await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      { ...deps, fetchFn: fakeFetch([json(200, { choices: [{ message: { content: "  " } }] })]) },
    );
    assert.ok(!empty.ok && empty.kind === "empty" && empty.status === 502);
  });
});

describe("pencatatan token", () => {
  const deps = (responses: Response[], tool?: () => Promise<{ ok: boolean; result: unknown }>) => ({
    fetchFn: fakeFetch(responses),
    executeTool: tool ?? (async () => ({ ok: true, result: {} })),
    toolSpecs: [{ type: "function" }],
  });
  it("menjumlahkan usage dari semua putaran model", async () => {
    const r = await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      deps([
        json(200, { usage: { prompt_tokens: 1000, completion_tokens: 50, total_tokens: 1050 }, choices: [{ message: { content: null, tool_calls: [toolCall("population_stats")] } }] }),
        json(200, { usage: { prompt_tokens: 1400, completion_tokens: 200, total_tokens: 1600 }, choices: [{ message: { content: "Selesai." } }] }),
      ]),
    );
    assert.ok(r.ok);
    assert.deepEqual(r.usage, { prompt: 2400, completion: 250, total: 2650, estimated: false });
  });
  it("bila penyedia tidak melaporkan usage, diperkirakan dari panjang teks dan ditandai estimasi", async () => {
    const r = await runLarasChat({ config, messages: msgs, deadlineMs: 30_000 }, deps([json(200, { choices: [{ message: { content: "Halo dunia" } }] })]));
    assert.ok(r.ok && r.usage.estimated === true && r.usage.total > 0);
  });
  it("token tetap dicatat walau jawaban gagal (kosong)", async () => {
    const r = await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      deps([json(200, { usage: { prompt_tokens: 900, completion_tokens: 0, total_tokens: 900 }, choices: [{ message: { content: "  " } }] })]),
    );
    assert.ok(!r.ok && r.usage.total === 900);
  });
  it("hasil tool yang menumpuk dibatasi per pertanyaan (tiap putaran mengirim ulang semuanya)", async () => {
    const big = JSON.stringify({ data: "x".repeat(7000) });
    const tcs = Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, type: "function", function: { name: "population_stats", arguments: "{}" } }));
    const seen: Array<Record<string, unknown>> = [];
    const f = fakeFetch(
      [json(200, { choices: [{ message: { content: null, tool_calls: tcs } }] }), json(200, { choices: [{ message: { content: "ok" } }] })],
      seen,
    );
    await runLarasChat(
      { config, messages: msgs, deadlineMs: 30_000 },
      { fetchFn: f, executeTool: async () => ({ ok: true, result: JSON.parse(big) }), toolSpecs: [{ type: "function" }] },
    );
    const toolMsgs = (seen[1]!.messages as Array<{ role: string; content: string }>).filter((m) => m.role === "tool");
    const total = toolMsgs.reduce((n, m) => n + m.content.length, 0);
    assert.ok(total <= MAX_TOOL_CHARS_PER_TURN + 200, `total ${total}`);
    assert.ok(toolMsgs.some((m) => /Batas data per pertanyaan/.test(m.content)));
  });
});

describe("providerPreferences", () => {
  it("hanya untuk OpenRouter dan bisa dimatikan lewat env", () => {
    assert.deepEqual(providerPreferences("https://openrouter.ai/api/v1", {}), { provider: { data_collection: "deny" } });
    assert.equal(providerPreferences("https://api.openai.com/v1", {}), undefined);
    assert.equal(providerPreferences("https://openrouter.ai/api/v1", { OPENROUTER_ALLOW_DATA_COLLECTION: "1" }), undefined);
  });
});

describe("izin Laras", () => {
  it("semua role desa boleh bertanya dan menghapus percakapan sendiri (regresi: dulu hanya admin)", () => {
    for (const [path, method] of [
      ["/api/ai/village-assistant", "POST"],
      ["/api/ai/threads/5", "DELETE"],
      ["/api/ai/threads", "GET"],
    ] as const) {
      const perm = resolveApiPermission(path, method)!;
      for (const role of ["admin", "village_head", "secretary", "staff"] as const) {
        assert.equal(roleCan(perm.resource, perm.action, role), true, `${role} ${method} ${path}`);
      }
    }
  });
  it("tool menolak akun non-desa tanpa menyentuh database", async () => {
    const session = { user: { id: "rg:1", role: "admin" } } as never;
    const out = await executeLarasTool({ villageId: 1, userId: 1, role: "admin", village: {} as never, session }, "population_stats", "{}");
    assert.equal(out.ok, false);
    assert.match(JSON.stringify(out.result), /izin/);
  });
  it("tool tak dikenal ditolak", async () => {
    const out = await executeLarasTool({ villageId: 1, userId: 1, role: "admin", village: {} as never, session: {} as never }, "drop_tables", "{}");
    assert.equal(out.ok, false);
  });
});
