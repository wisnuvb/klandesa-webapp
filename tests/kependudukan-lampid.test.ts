import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildLampid,
  eventsFromMutations,
  eventsFromResidents,
  isForeign,
  mergeEvents,
  monthRange,
  shiftMonth,
  tallyKeyOf,
  tallyTotal,
  type LampidActiveGroup,
  type LampidMutationRow,
  type LampidResidentRow,
} from "../lib/kependudukan/lampid";
import { buildLampidCsv, buildLampidSheets, buildLampidTables } from "../lib/kependudukan/lampid-export";

function assertMatch(actual: unknown, expected: Record<string, unknown>) {
  const a = actual as Record<string, unknown>;
  for (const [k, v] of Object.entries(expected)) assert.deepEqual(a[k], v, `kolom ${k}`);
}

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

const resident = (over: Partial<LampidResidentRow> & { id: number }): LampidResidentRow => ({
  name: `Warga ${over.id}`,
  nik: `3201000000000${String(over.id).padStart(3, "0")}`,
  gender: "Laki-laki",
  nationality: "Indonesia",
  hamlet: "Dusun A",
  rt: "01",
  rw: "01",
  birthDate: d("1990-01-01"),
  arrivalDate: null,
  originAddress: null,
  motherName: null,
  fatherName: null,
  isAlive: true,
  deathDate: null,
  moveDate: null,
  ...over,
});

const active = (count: number, over: Partial<LampidActiveGroup> = {}): LampidActiveGroup => ({ gender: "Laki-laki", nationality: "Indonesia", hamlet: "Dusun A", rt: "01", rw: "01", count, ...over });

describe("rentang bulan", () => {
  it("menghitung akhir bulan, termasuk Februari kabisat", () => {
    assert.deepEqual(monthRange("2026-06"), { from: "2026-06-01", to: "2026-06-30" });
    assert.equal(monthRange("2028-02").to, "2028-02-29");
    assert.equal(monthRange("2026-12").to, "2026-12-31");
  });
  it("menggeser bulan melewati batas tahun", () => {
    assert.equal(shiftMonth("2026-01", -1), "2025-12");
    assert.equal(shiftMonth("2026-12", 1), "2027-01");
  });
});

describe("kewarganegaraan dan jenis kelamin", () => {
  it("mengenali WNA dan menormalkan jenis kelamin lama", () => {
    assert.equal(isForeign("Indonesia"), false);
    assert.equal(isForeign("WNI"), false);
    assert.equal(isForeign(""), false);
    assert.equal(isForeign("Jepang"), true);
    assert.equal(tallyKeyOf("F", "Indonesia"), "wniP");
    assert.equal(tallyKeyOf("Laki-laki", "Jepang"), "wnaL");
    assert.equal(tallyKeyOf(null, "Indonesia"), "wniX");
  });
});

describe("kejadian dari kolom data warga", () => {
  it("membaca lahir, datang, mati, pindah", () => {
    const rows = [
      resident({ id: 1, birthDate: d("2026-06-10") }), // lahir
      resident({ id: 2, birthDate: d("2026-06-12"), arrivalDate: d("2026-06-20"), originAddress: "Bogor" }), // datang, bukan lahir
      resident({ id: 3, isAlive: false, deathDate: d("2026-06-05") }), // mati
      resident({ id: 4, moveDate: d("2026-06-15") }), // pindah
      resident({ id: 5, birthDate: d("1980-01-01") }), // tidak ada kejadian
    ];
    const ev = eventsFromResidents(rows, "2026-06-01");
    assert.deepEqual(ev.map((e) => `${e.residentId}:${e.kind}`).sort(), ["1:LAHIR", "2:DATANG", "3:MATI", "4:PINDAH"]);
    assert.equal(ev.find((e) => e.kind === "DATANG")?.note, "Bogor");
    assert.equal(ev.every((e) => e.source === "data"), true);
  });
  it("tidak menghitung kejadian sebelum awal jendela dan mengabaikan pindah pada warga yang meninggal", () => {
    const ev = eventsFromResidents([resident({ id: 1, birthDate: d("2026-05-31") }), resident({ id: 2, isAlive: false, deathDate: d("2026-06-02"), moveDate: d("2026-06-03") })], "2026-06-01");
    assert.deepEqual(ev.map((e) => e.kind), ["MATI"]);
  });
  it("mencatat nama ibu pada kelahiran", () => {
    const [e] = eventsFromResidents([resident({ id: 1, birthDate: d("2026-06-10"), motherName: "Siti" })], "2026-06-01");
    assert.equal(e.note, "Ibu: Siti");
  });
});

describe("kejadian dari Buku Mutasi", () => {
  const mut = (over: Partial<LampidMutationRow>): LampidMutationRow => ({ type: "DEATH", effectiveDate: d("2026-06-05"), residentId: 3, residentName: "Warga 3", residentNikLast4: "0003", rt: "01", rw: "01", details: null, ...over });
  it("mengabaikan KK_CHANGE dan memakai atribut warga terkini", () => {
    const r = resident({ id: 3, gender: "Perempuan", hamlet: "Dusun B", nationality: "Jepang" });
    const ev = eventsFromMutations([mut({ details: { cause: "Sakit" } }), mut({ type: "KK_CHANGE" })], new Map([[3, r]]));
    assert.equal((ev).length, 1);
    assertMatch(ev[0], { kind: "MATI", note: "Sakit", hamlet: "Dusun B", nationality: "Jepang", gender: "Perempuan", source: "mutasi" });
  });
  it("memakai cuplikan bila warga sudah dihapus", () => {
    const ev = eventsFromMutations([mut({ type: "MOVE_OUT", residentId: null, details: { destination: "Medan" } })], new Map());
    assertMatch(ev[0], { kind: "PINDAH", name: "Warga 3", nikLast4: "0003", note: "Medan", hamlet: null });
  });
});

describe("penggabungan tanpa hitung ganda", () => {
  it("Buku Mutasi menang untuk pasangan (warga, jenis) yang sama; kolom mengisi sisanya", () => {
    const r1 = resident({ id: 1, isAlive: false, deathDate: d("2026-06-05") });
    const r2 = resident({ id: 2, moveDate: d("2026-06-07") });
    const fromMut = eventsFromMutations(
      [{ type: "DEATH", effectiveDate: d("2026-06-06"), residentId: 1, residentName: null, residentNikLast4: null, rt: null, rw: null, details: null }],
      new Map([[1, r1]]),
    );
    const merged = mergeEvents(fromMut, eventsFromResidents([r1, r2], "2026-06-01"));
    assert.deepEqual(merged.map((e) => `${e.residentId}:${e.kind}:${e.date}:${e.source}`).sort(), ["1:MATI:2026-06-06:mutasi", "2:PINDAH:2026-06-07:data"]);
  });
  it("satu warga pindah lalu datang kembali tetap dua kejadian berbeda", () => {
    const r = resident({ id: 1 });
    const mk = (type: string, date: string): LampidMutationRow => ({ type, effectiveDate: d(date), residentId: 1, residentName: null, residentNikLast4: null, rt: null, rw: null, details: null });
    const merged = mergeEvents(eventsFromMutations([mk("MOVE_OUT", "2026-06-02"), mk("MOVE_IN", "2026-06-20")], new Map([[1, r]])), []);
    assert.deepEqual(merged.map((e) => e.kind), ["PINDAH", "DATANG"]);
  });
});

describe("buildLampid", () => {
  // Sekarang (Juli 2026): 100 laki-laki di Dusun A. Kejadian Juni: 2 lahir, 1 mati, 1 pindah, 3 datang. Kejadian Juli: 1 lahir, 1 mati.
  const ev = (kind: "LAHIR" | "MATI" | "PINDAH" | "DATANG", date: string, over: object = {}) => ({
    kind,
    date,
    residentId: null,
    name: "X",
    nikLast4: "1234",
    gender: "Laki-laki",
    nationality: "Indonesia",
    hamlet: "Dusun A",
    rt: "01",
    rw: "01",
    note: "",
    source: "mutasi" as const,
    ...over,
  });
  const events = [
    ev("LAHIR", "2026-06-03"),
    ev("LAHIR", "2026-06-10"),
    ev("MATI", "2026-06-12"),
    ev("PINDAH", "2026-06-15"),
    ev("DATANG", "2026-06-18"),
    ev("DATANG", "2026-06-20"),
    ev("DATANG", "2026-06-30"),
    ev("LAHIR", "2026-07-02"),
    ev("MATI", "2026-07-03"),
  ];

  it("menghitung akhir bulan mundur dari stok sekarang, lalu awal dari akhir", () => {
    const r = buildLampid({ month: "2026-06", group: "dusun", active: [active(100)], events });
    // Setelah Juni: +1 lahir −1 mati = 0 → akhir Juni = 100. Net Juni = 2−1−1+3 = +3 → awal = 97.
    assert.equal(tallyTotal(r.totals.akhir), 100);
    assert.equal(tallyTotal(r.totals.awal), 97);
    assert.deepEqual([r.totals.lahir, r.totals.mati, r.totals.pindah, r.totals.datang].map(tallyTotal), [2, 1, 1, 3]);
    assert.deepEqual(r.lines, [{ region: "Dusun A", awal: 97, lahir: 2, mati: 1, pindah: 1, datang: 3, akhir: 100 }]);
  });

  it("untuk bulan berjalan tidak ada kejadian sesudahnya", () => {
    const r = buildLampid({ month: "2026-07", group: "dusun", active: [active(100)], events });
    assert.equal(tallyTotal(r.totals.akhir), 100);
    assert.equal(tallyTotal(r.totals.awal), 100); // +1 lahir −1 mati
  });

  it("memecah per wilayah dan menaruh wilayah kosong terakhir", () => {
    const r = buildLampid({
      month: "2026-06",
      group: "dusun",
      active: [active(10), active(5, { hamlet: "Dusun B" }), active(2, { hamlet: null })],
      events: [ev("LAHIR", "2026-06-03", { hamlet: "Dusun B" }), ev("DATANG", "2026-06-04", { hamlet: null })],
    });
    assert.deepEqual(r.lines.map((l) => l.region), ["Dusun A", "Dusun B", "(Belum diisi)"]);
    assertMatch(r.lines.find((l) => l.region === "Dusun B"), { awal: 4, lahir: 1, akhir: 5 });
  });

  it("mengelompokkan per RW/RT", () => {
    const r = buildLampid({ month: "2026-06", group: "rtrw", active: [active(3, { rw: "02", rt: "05" })], events: [] });
    assert.equal(r.lines[0].region, "RW 02 / RT 05");
  });

  it("memecah jenis kelamin dan kewarganegaraan, dan totalnya cocok dengan jumlah", () => {
    const r = buildLampid({
      month: "2026-06",
      group: "dusun",
      active: [active(5), active(4, { gender: "Perempuan" }), active(1, { gender: "Perempuan", nationality: "Jepang" })],
      events: [ev("LAHIR", "2026-06-03", { gender: "Perempuan" }), ev("DATANG", "2026-06-04", { nationality: "Jepang" })],
    });
    assertMatch(r.totals.akhir, { wniL: 5, wniP: 4, wnaP: 1 });
    assert.equal(r.totals.lahir.wniP, 1);
    assert.equal(r.totals.datang.wnaL, 1);
    // awal = akhir − (+1 lahir P WNI) − (+1 datang L WNA)
    assertMatch(r.totals.awal, { wniL: 5, wniP: 3, wnaL: -1, wnaP: 1 });
    assert.equal(r.warnings.some((w) => w.includes("negatif")), false); // ringkasan per wilayah (jumlah) tidak negatif
  });

  it("memperingatkan jumlah negatif, tanggal meninggal kosong, dan kejadian dari data warga", () => {
    const r = buildLampid({ month: "2026-06", group: "dusun", active: [], events: [ev("LAHIR", "2026-06-03", { source: "data" })], unplacedDeaths: 2 });
    assert.ok((r.warnings.join(" ")).includes("negatif"));
    assert.ok((r.warnings.join(" ")).includes("2 warga berstatus meninggal"));
    assert.ok((r.warnings.join(" ")).includes("1 dari 1 kejadian"));
    assert.deepEqual(r.sources, { mutasi: 0, data: 1 });
  });

  it("mengurutkan daftar menurut tanggal lalu nama", () => {
    const r = buildLampid({ month: "2026-06", group: "dusun", active: [active(5)], events: [ev("LAHIR", "2026-06-10", { name: "B" }), ev("LAHIR", "2026-06-03", { name: "Z" }), ev("LAHIR", "2026-06-10", { name: "A" })] });
    assert.deepEqual(r.list.LAHIR.map((i) => i.name), ["Z", "A", "B"]);
  });

  it("mengabaikan kejadian sebelum bulan laporan", () => {
    const r = buildLampid({ month: "2026-06", group: "dusun", active: [active(5)], events: [ev("LAHIR", "2026-05-31")] });
    assert.equal(tallyTotal(r.totals.lahir), 0);
    assert.equal(tallyTotal(r.totals.awal), 5);
  });
});

describe("ekspor", () => {
  const r = buildLampid({
    month: "2026-06",
    group: "dusun",
    active: [active(10)],
    events: [
      { kind: "LAHIR", date: "2026-06-03", residentId: 1, name: 'Budi "Kecil"', nikLast4: "4321", gender: "Laki-laki", nationality: "Indonesia", hamlet: "Dusun A", rt: "01", rw: "01", note: "Ibu: Siti", source: "mutasi" },
    ],
  });

  it("menyusun tabel: ringkasan, wilayah, rincian, dan 4 daftar", () => {
    const tables = buildLampidTables(r);
    assert.deepEqual(tables.map((t) => t.sheet), ["Ringkasan", "Per Dusun", "Rincian WNI-WNA", "Daftar Lahir", "Daftar Mati", "Daftar Pindah", "Daftar Datang"]);
    assert.deepEqual(tables[0].rows.map((x) => x[0]), ["Penduduk awal bulan", "(+) Lahir", "(−) Mati", "(−) Pindah", "(+) Datang", "Penduduk akhir bulan"]);
    assert.equal(tables[0].rows[5][3], 10);
    assert.deepEqual(tables[1].total, ["Jumlah", 9, 1, 0, 0, 0, 10]);
  });

  it("tidak pernah menulis NIK penuh dan menandai bulan tanpa kejadian", () => {
    const tables = buildLampidTables(r);
    assert.equal(tables[3].rows[0][2], "••••4321");
    assert.ok(tables[4].note?.includes("Tidak ada kejadian"));
    const csv = buildLampidCsv(r);
    assert.ok((csv).includes('"Kategori","Tanggal","Nama"'));
    assert.ok((csv).includes('"Budi ""Kecil"""'));
    assert.doesNotMatch(csv, /\d{16}/);
  });

  it("membuat nama sheet unik dan sah untuk Excel", () => {
    const sheets = buildLampidSheets(r, "Desa Maju", "Per 2 November 2026");
    const names = sheets.map((s) => s.name);
    assert.equal(new Set(names).size, names.length);
    assert.equal(names.every((n) => n.length <= 31 && !/[\\/?*[\]:]/.test(n)), true);
    assert.ok(String(sheets[0].rows[0][0]).includes("Laporan LAMPID"));
  });
});
