import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRIORITIES } from "../lib/pktd/catalog";
import { activityWarnings, meetsWageShare, shareBps, wageProblem } from "../lib/pktd/calc";
import { parseActivityCreate, parseActivityPatch, parseDays, parsePay, parseWorker } from "../lib/pktd/schema";
import { RULES } from "../lib/dana-desa/rules";

const W = (o: Partial<Parameters<typeof activityWarnings>[0]> = {}) =>
  activityWarnings({ minPct: 50, costCents: 100_000_000n, plannedWageCents: 60_000_000n, recordedWageCents: 0n, unpaidDays: 0, wageMinCents: 5_000_000n, wageMaxCents: 10_000_000n, workerCount: 3, priorityWorkerCount: 2, done: false, ...o });

describe("PKTD: hitungan upah (Lampiran II.F)", () => {
  it("batas upah paling sedikit 50% dari biaya kegiatan: tepat 50% lolos, kurang sedikit tidak", () => {
    assert.equal(RULES[2026]!.pktdWageMinPct, 50);
    assert.equal(meetsWageShare(50_000_000n, 100_000_000n, 50), true);
    assert.equal(meetsWageShare(49_999_999n, 100_000_000n, 50), false);
    assert.equal(meetsWageShare(1n, 0n, 50), false, "biaya nol tidak sah");
    assert.equal(shareBps(33_333_333n, 100_000_000n), 3333);
    assert.equal(shareBps(1n, 0n), 0);
  });

  it("upah harian: harus positif dan di dalam batas bawah/atas bila ditetapkan", () => {
    assert.equal(wageProblem(0n, null, null)?.includes("lebih dari nol"), true);
    assert.equal(wageProblem(7_500_000n, 5_000_000n, 10_000_000n), null);
    assert.match(wageProblem(4_999_999n, 5_000_000n, 10_000_000n)!, /batas bawah Rp50\.000/);
    assert.match(wageProblem(10_000_001n, 5_000_000n, 10_000_000n)!, /batas atas Rp100\.000/);
    assert.equal(wageProblem(1n, null, null), null, "tanpa batas ditetapkan, hanya wajib positif");
  });

  it("peringatan: rencana upah kurang, belum dibayar, batas belum ada, tanpa pekerja prioritas, selesai tapi kurang", () => {
    assert.deepEqual(W(), []);
    assert.equal(W({ plannedWageCents: 40_000_000n }).some((x) => x.level === "ERROR" && /40% dari biaya/.test(x.message)), true);
    assert.equal(W({ unpaidDays: 4 }).some((x) => x.level === "WARN" && /4 hari kerja belum/.test(x.message)), true);
    assert.equal(W({ wageMinCents: null }).some((x) => /Batas bawah dan batas atas/.test(x.message)), true);
    assert.equal(W({ priorityWorkerCount: 0 }).some((x) => x.level === "INFO"), true);
    assert.equal(W({ priorityWorkerCount: 0, workerCount: 0 }).some((x) => x.level === "INFO"), false, "tanpa pekerja sama sekali tidak diperingatkan soal prioritas");
    assert.equal(W({ done: true, recordedWageCents: 30_000_000n }).some((x) => /terealisasi baru 30%/.test(x.message)), true);
    assert.equal(W({ done: false, recordedWageCents: 30_000_000n }).some((x) => /terealisasi/.test(x.message)), false, "belum selesai: tidak dianggap kurang");
    assert.equal(W({ recordedWageCents: 100_000_001n }).some((x) => /melebihi total biaya/.test(x.message)), true);
  });

  it("enam kelompok prioritas sesuai Lampiran II.F.3", () => {
    const keys = Object.entries(PRIORITIES).filter(([, v]) => v.priority).map(([k]) => k);
    assert.deepEqual(keys, ["PENGANGGUR", "SETENGAH_PENGANGGUR", "PEREMPUAN_KK", "KELUARGA_MISKIN", "MARGINAL", "DISABILITAS"]);
  });
});

describe("PKTD: validasi isian", () => {
  it("kegiatan: biaya wajib, rencana upah tak boleh melebihi biaya, tanggal berurutan, kode dikenal", () => {
    const ok = parseActivityCreate({ year: 2026, title: "Rabat jalan", cost: "100000000", plannedWage: "60000000", activityCode: "2.3.01", startDate: "2026-03-01", endDate: "2026-04-01" });
    assert.ok(ok.ok && ok.value.costCents === 10_000_000_000n && ok.value.plannedWageCents === 6_000_000_000n);
    assert.equal(parseActivityCreate({ year: 2026, title: "x", cost: "0" }).ok, false);
    assert.equal(parseActivityCreate({ year: 2026, title: "x", cost: "100", plannedWage: "200" }).ok, false);
    assert.equal(parseActivityCreate({ year: 2026, title: "x", cost: "100", startDate: "2026-04-01", endDate: "2026-03-01" }).ok, false);
    assert.equal(parseActivityCreate({ year: 2026, title: "x", cost: "100", activityCode: "9.9.99" }).ok, false);
    assert.equal(parseActivityCreate({ year: 2026, title: "", cost: "100" }).ok, false);
  });

  it("perubahan sebagian: batas atas tidak di bawah batas bawah; status hanya AKTIF/SELESAI", () => {
    const p = parseActivityPatch({ wageMin: "50000", wageMax: "100000", wageBasis: "Hasil Musdes 12 Maret", status: "SELESAI" });
    assert.ok(p.ok && p.value.wageMinCents === 5_000_000n && p.value.status === "SELESAI" && !("title" in p.value));
    assert.equal(parseActivityPatch({ wageMin: "100000", wageMax: "50000" }).ok, false);
    assert.equal(parseActivityPatch({ status: "BATAL" }).ok, false);
    assert.ok(parseActivityPatch({ wageMin: "" }).ok, "kosong = hapus batas");
  });

  it("pekerja: warga atau nama; kelompok wajib", () => {
    assert.ok(parseWorker({ residentId: 5, priority: "PENGANGGUR" }).ok);
    assert.ok(parseWorker({ name: "Pak Tarno", gender: "L", priority: "LAINNYA" }).ok);
    assert.equal(parseWorker({ priority: "PENGANGGUR" }).ok, false);
    assert.equal(parseWorker({ name: "x", priority: "KAYA" }).ok, false);
    assert.equal(parseWorker({ name: "x", gender: "X", priority: "LAINNYA" }).ok, false);
  });

  it("hari kerja: tanggal, jenis, upah, dan paling sedikit satu pekerja; duplikat id dibuang", () => {
    const ok = parseDays({ workDate: "2026-03-02", task: "PELAKSANAAN", wage: "80000", workerIds: [1, 2, 2, "3"], paid: true });
    assert.ok(ok.ok && ok.value.workerIds.join() === "1,2,3" && ok.value.wageCents === 8_000_000n && ok.value.paid);
    assert.equal(parseDays({ workDate: "2026-03-02", task: "PELAKSANAAN", wage: "80000", workerIds: [] }).ok, false);
    assert.equal(parseDays({ workDate: "2026-03-02", task: "TIDUR", wage: "80000", workerIds: [1] }).ok, false);
    assert.equal(parseDays({ workDate: "2026-03-02", task: "PELAKSANAAN", wage: "-1", workerIds: [1] }).ok, false);
    assert.equal(parseDays({ workDate: "2026-03-02", task: "PELAKSANAAN", wage: "80000", workerIds: Array.from({ length: 201 }, (_, i) => i + 1) }).ok, false);
  });

  it("pembayaran upah: tidak sebelum tanggal kerja", () => {
    assert.ok(parsePay({ workDate: "2026-03-02", paidOn: "2026-03-02" }).ok);
    assert.equal(parsePay({ workDate: "2026-03-02", paidOn: "2026-03-01" }).ok, false);
    assert.equal(parsePay({ workDate: "2026-02-30", paidOn: "2026-03-01" }).ok, false);
  });
});
