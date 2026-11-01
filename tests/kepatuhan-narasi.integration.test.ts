/** Bantuan narasi LPPD/LKPPD (baca-saja) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("narasi LPPD/LKPPD untuk Laras (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let nar: typeof import("../lib/kepatuhan/narasi");
  let vA = 0;
  let vB = 0;
  const t = `${Date.now() % 1e7}${Math.floor(Math.random() * 900 + 100)}`;

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    nar = await import("../lib/kepatuhan/narasi");
    const mk = async (c: string) => (await prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: `r${t}`, province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
    vA = await mk("NA");
    vB = await mk("NB");
    const doc = await prisma.apbdesDocument.create({ data: { villageId: vA, year: 2026, version: 0, status: "DITETAPKAN", regulationNumber: `5/${t}`, regulationDate: new Date("2025-12-20T00:00:00Z") } });
    const line = (accountCode: string, amountCents: bigint, activityCode: string | null, description: string) => prisma.apbdesLine.create({ data: { documentId: doc.id, villageId: vA, accountCode, amountCents, activityCode, description } });
    await line("4.2.1.01", 1_000_000_00n, null, "Dana Desa");
    await line("5.2.1.01", 600_000_00n, "2.3.01", "Rabat jalan");
    await line("5.2.1.02", 100_000_00n, "1.1.01", "ATK kantor");
    const entry = (type: string, accountCode: string, amount: bigint, activityCode: string | null, voucher: string) => prisma.apbdesEntry.create({ data: { villageId: vA, year: 2026, entryDate: new Date("2026-03-01T00:00:00Z"), voucherNo: voucher, type, channel: "BANK", accountCode, activityCode, description: "uji", amountCents: amount } });
    await entry("PENERIMAAN", "4.2.1.01", 500_000_00n, null, "P1");
    await entry("PENGELUARAN", "5.2.1.01", 300_000_00n, "2.3.01", "B1");
    await prisma.rpjmdesPlan.create({ data: { villageId: vA, title: "RPJM Uji", periodStart: 2021, periodEnd: 2027, vision: "Desa mandiri dan sejahtera", mission: "Meningkatkan layanan publik", status: "active" } as never });
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("fakta bertanda sumber; angka di draf hanya yang ada pada fakta yang dikutip", async () => {
    const r = await nar.buildNarrationFacts(prisma, { villageId: vA, year: 2026 });
    assert.ok(r.ok, JSON.stringify(r));
    if (!r.ok) return;
    const n = r.data;
    assert.ok(n.facts.length >= 4);
    for (const f of n.facts) {
      assert.match(f.id, /^F\d+$/);
      assert.ok(f.source.length > 5, `fakta ${f.id} tanpa sumber`);
    }
    const income = n.facts.find((f) => f.text.startsWith("Pendapatan dianggarkan"))!;
    assert.match(income.text, /Rp1\.000\.000,00/);
    assert.match(income.text, /Rp500\.000,00/);
    assert.match(income.text, /50%/);
    const spend = n.facts.find((f) => f.text.startsWith("Belanja dianggarkan"))!;
    assert.match(spend.text, /Rp700\.000,00/);
    assert.match(spend.text, /Rp300\.000,00/);
    // Setiap angka di draf harus muncul pada teks fakta yang dikutip; setiap kalimat berangka mengutip fakta.
    const digits = (s: string) => (s.replace(/\[F\d+\]/g, "").match(/\d[\d.,]*/g) ?? []).map((x) => x.replace(/[.,]+$/, ""));
    for (const s of n.sections.filter((x) => !x.needsHuman)) {
      assert.ok(s.factIds.length > 0, s.sectionId);
      const pool = s.factIds.map((id) => n.facts.find((f) => f.id === id)!.text).join(" ");
      for (const d of digits(s.draft)) assert.ok(pool.includes(d), `angka ${d} di bagian ${s.sectionId} tidak berasal dari fakta`);
      for (const id of s.factIds) assert.ok(s.draft.includes(`[${id}]`), `${s.sectionId}: fakta ${id} tidak dikutip`);
    }
    // Bagian yang butuh penilaian manusia tidak diisi
    const human = n.sections.filter((s) => s.needsHuman);
    assert.ok(human.length >= 10);
    for (const s of human) assert.equal(s.draft, "");
    assert.ok(human.some((s) => s.sectionId === "berhasil_pembangunan"));
    assert.match(n.instruction, /HANYA fakta/);
    assert.match(nar.narrationToPrompt(n), /\[F1\]/);
    const vm = n.sections.find((s) => s.sectionId === "visi_misi")!;
    assert.equal(vm.needsHuman, false, "visi dan misi dikutip dari RPJM Desa");
    assert.match(vm.draft, /Desa mandiri dan sejahtera/);
  });
  it("tanpa APB Desa: tidak ada narasi keuangan dan ada peringatan, bukan angka karangan", async () => {
    const r = await nar.buildNarrationFacts(prisma, { villageId: vB, year: 2026 });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.ok(r.data.warnings.some((w) => /belum ditetapkan/.test(w)));
    assert.equal(r.data.facts.some((f) => /dianggarkan/.test(f.text)), false);
    assert.equal(JSON.stringify(r.data).includes(`5/${t}`), false, "data desa lain tidak bocor");
  });
  it("masukan jahat: tahun di luar rentang dan desa tak ada ditolak; fungsi tidak menulis apa pun", async () => {
    assert.ok(!(await nar.buildNarrationFacts(prisma, { villageId: vA, year: 1999 })).ok);
    assert.ok(!(await nar.buildNarrationFacts(prisma, { villageId: vA, year: 2026.5 })).ok);
    const missing = await nar.buildNarrationFacts(prisma, { villageId: 2_000_000_000, year: 2026 });
    assert.ok(!missing.ok && missing.status === 404);
    const before = await prisma.apbdesEntry.count({ where: { villageId: vA } });
    await nar.buildNarrationFacts(prisma, { villageId: vA, year: 2026 });
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: vA } }), before);
  });
});
