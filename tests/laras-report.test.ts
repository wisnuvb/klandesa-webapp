import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reportAttention, validateReportProposal, roleLabelFor } from "../lib/ai/laras-report.ts";
import { executeLarasTool, larasToolSpecs } from "../lib/ai/laras-tools.ts";
import { roleCan } from "../lib/permissions/matrix.ts";

describe("validateReportProposal (cermin aturan jalur staf)", () => {
  it("transisi sah: PENDING→PROCESS/REJECT, PROCESS→DONE/REJECT", () => {
    assert.deepEqual(validateReportProposal({ status: "PENDING" }, { status: "PROCESS" }), { ok: true, status: "PROCESS", response: "", warnings: [] });
    assert.equal(validateReportProposal({ status: "PROCESS" }, { status: "DONE" }).ok, true);
  });
  it("transisi tak sah ditolak (PENDING→DONE, DONE→apa pun, REJECT→PROCESS)", () => {
    assert.equal(validateReportProposal({ status: "PENDING" }, { status: "DONE" }).ok, false);
    assert.equal(validateReportProposal({ status: "DONE" }, { status: "PROCESS" }).ok, false);
    assert.equal(validateReportProposal({ status: "REJECT" }, { status: "PROCESS" }).ok, false);
  });
  it("menolak wajib beralasan jelas (≥5 huruf)", () => {
    assert.equal(validateReportProposal({ status: "PENDING" }, { status: "REJECT" }).ok, false);
    assert.equal(validateReportProposal({ status: "PENDING" }, { status: "REJECT", response: "tdk" }).ok, false);
    assert.equal(validateReportProposal({ status: "PENDING" }, { status: "REJECT", response: "Di luar kewenangan desa; hubungi PLN." }).ok, true);
  });
  it("hanya-tanggapan: hanya pada laporan aktif dan tidak boleh kosong", () => {
    assert.equal(validateReportProposal({ status: "PROCESS" }, { response: "Sedang kami survei lokasi." }).ok, true);
    assert.equal(validateReportProposal({ status: "DONE" }, { response: "Terima kasih atas laporannya." }).ok, false);
    assert.equal(validateReportProposal({ status: "PROCESS" }, {}).ok, false);
    assert.equal(validateReportProposal({ status: "PROCESS" }, { response: "ok" }).ok, false);
  });
  it("NIK/telepon di tanggapan disamarkan dan panjang dibatasi", () => {
    const r = validateReportProposal({ status: "PROCESS" }, { response: `Hubungi 081234567890 NIK 3201011234560001 ${"x".repeat(2000)}` });
    assert.ok(r.ok);
    assert.ok(r.ok && !/0812|3201011234560001/.test(r.response));
    assert.ok(r.ok && r.response.length <= 1000);
  });
});

describe("reportAttention", () => {
  const now = new Date("2026-10-31");
  const base = { status: "PENDING", category: "jalan", createdAt: new Date("2026-10-30"), responseCount: 1, lastActivityAt: new Date("2026-10-30") };
  it("laporan baru yang sudah ditanggapi tidak butuh perhatian", () => {
    assert.deepEqual(reportAttention(base, now), []);
  });
  it("menandai lama belum ditangani, lama tanpa kabar, belum ada tanggapan, dan kategori keamanan", () => {
    const a = reportAttention({ ...base, createdAt: new Date("2026-10-01"), responseCount: 0, category: "keamanan" }, now).join(" | ");
    assert.match(a, /Belum ditangani 30 hari/);
    assert.match(a, /Belum ada tanggapan/);
    assert.match(a, /keamanan/);
    const b = reportAttention({ ...base, status: "PROCESS", lastActivityAt: new Date("2026-09-01") }, now).join();
    assert.match(b, /Tidak ada kabar/);
  });
});

describe("gerbang izin tool pengaduan", () => {
  const ctx = (role: string) => ({ villageId: 1, userId: 5, role, village: {} as never, session: { user: { id: "5", role } } as never });
  it("kepala desa (citizen_reports: read saja) tidak bisa mengusulkan; tanpa menyentuh database", async () => {
    assert.equal(roleCan("citizen_reports", "update", "village_head"), false);
    const out = await executeLarasTool(ctx("village_head"), "propose_report_action", '{"report_id":1,"status":"PROCESS"}');
    assert.equal(out.ok, false);
    assert.match(JSON.stringify(out.result), /izin/);
    assert.equal(out.action, undefined);
  });
  it("tool terdaftar dan tidak ada yang mengeksekusi langsung", () => {
    const names = larasToolSpecs().map((t) => t.function.name);
    assert.ok(names.includes("citizen_reports_open"));
    assert.ok(names.includes("propose_report_action"));
    const spec = larasToolSpecs().find((t) => t.function.name === "propose_report_action")!;
    assert.deepEqual((spec.function.parameters as { required: string[] }).required, ["report_id"]);
    assert.deepEqual(
      ((spec.function.parameters as { properties: { status: { enum: string[] } } }).properties.status.enum),
      ["PROCESS", "DONE", "REJECT"],
    );
  });
  it("argumen tak valid ditolak sebelum menyentuh database", async () => {
    const out = await executeLarasTool(ctx("secretary"), "propose_report_action", '{"report_id":1,"status":"DELETE"}');
    assert.equal(out.ok, false);
    assert.match(JSON.stringify(out.result), /Argumen tidak valid/);
    const bad = await executeLarasTool(ctx("secretary"), "propose_report_action", "bukan json");
    assert.match(JSON.stringify(bad.result), /bukan JSON/);
  });
  it("label peran penanggap sama dengan jalur staf", () => {
    assert.equal(roleLabelFor("secretary"), "Sekretaris Desa");
    assert.equal(roleLabelFor("staff"), "Staf Desa");
    assert.equal(roleLabelFor(null), "Perangkat Desa");
  });
});
