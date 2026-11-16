import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ageOnDate,
  ageParts,
  areaLabel,
  birthDateRangeForGroup,
  formatAgeParts,
  buildSasaranReport,
  groupsOf,
  inSasaran,
  isFemale,
  isMarried,
  normalizeRtRw,
  SASARAN_AGE_GROUPS,
  SASARAN_COLUMNS,
  type SasaranResident,
} from "../lib/pkk/sasaran.ts";
import { buildSasaranSheet, sasaranCsv, sasaranFileName } from "../lib/pkk/sasaran-export.ts";
import { calculateAge } from "../utils/date-utils.tsx";

const NOW = new Date(2026, 10, 16, 9, 0, 0); // 16 Nov 2026
const born = (yearsAgo: number, dayOffset = 0) => new Date(NOW.getFullYear() - yearsAgo, NOW.getMonth(), NOW.getDate() + dayOffset);
const person = (over: Partial<SasaranResident> & { age?: number } = {}): SasaranResident => ({
  birthDate: born(over.age ?? 30),
  gender: "Perempuan",
  maritalStatus: "Belum Menikah",
  isPregnant: false,
  rt: "01",
  rw: "01",
  ...over,
});

describe("usia penuh", () => {
  it("sama dengan calculateAge di sekitar hari ulang tahun", () => {
    for (const years of [0, 1, 4, 5, 6, 15, 18, 19, 49, 50, 59, 60, 90]) {
      for (const off of [-2, -1, 0, 1, 2]) {
        const b = born(years, off);
        if (b > new Date()) continue; // lahir di masa depan: sengaja null (calculateAge memberi -1)
        assert.equal(ageOnDate(b, new Date()), calculateAge(b), `${years} th ${off} hari`);
      }
    }
  });
  it("tanggal lahir masa depan atau tidak masuk akal → null", () => {
    assert.equal(ageOnDate(born(-1), NOW), null);
    assert.equal(ageOnDate(new Date("invalid"), NOW), null);
    assert.equal(ageOnDate(born(200), NOW), null);
  });
});

describe("kelompok usia saling lepas dan batasnya", () => {
  const ageGroup = (age: number, dayOffset = 0) => groupsOf(person({ birthDate: born(age, dayOffset), gender: "Laki-laki" }), NOW).filter((g) => (SASARAN_AGE_GROUPS as readonly string[]).includes(g));
  it("balita 0–59 bulan, prasekolah 5 th, sekolah 6–18, dewasa 19–59, lansia 60+", () => {
    assert.deepEqual(ageGroup(0), ["balita"]);
    assert.deepEqual(ageGroup(4), ["balita"]);
    assert.deepEqual(ageGroup(5, 1), ["balita"], "sehari sebelum ulang tahun ke-5 = 59 bulan lebih, masih balita");
    assert.deepEqual(ageGroup(5), ["prasekolah"]);
    assert.deepEqual(ageGroup(6, 1), ["prasekolah"], "sehari sebelum ulang tahun ke-6");
    assert.deepEqual(ageGroup(6), ["sekolah"]);
    assert.deepEqual(ageGroup(18), ["sekolah"]);
    assert.deepEqual(ageGroup(19), ["dewasa"]);
    assert.deepEqual(ageGroup(59), ["dewasa"]);
    assert.deepEqual(ageGroup(60), ["lansia"]);
    assert.deepEqual(ageGroup(95), ["lansia"]);
  });
  it("tiap warga berusia valid masuk tepat satu kelompok usia, jadi jumlahnya = jumlah warga", () => {
    const residents = Array.from({ length: 100 }, (_, age) => person({ age, gender: age % 2 ? "Laki-laki" : "Perempuan" }));
    const rep = buildSasaranReport(residents, NOW);
    const sum = SASARAN_AGE_GROUPS.reduce((n, g) => n + rep.totals[g], 0);
    assert.equal(sum, 100);
    assert.equal(rep.totals.total, 100);
  });
});

describe("WUS, PUS, ibu hamil", () => {
  const has = (r: SasaranResident, g: string) => (groupsOf(r, NOW) as string[]).includes(g);
  it("WUS: perempuan 15–49 th; laki-laki dan di luar rentang bukan", () => {
    assert.ok(has(person({ age: 15 }), "wus"));
    assert.ok(has(person({ age: 49 }), "wus"));
    assert.ok(!has(person({ age: 14 }), "wus"));
    assert.ok(!has(person({ age: 50 }), "wus"));
    assert.ok(!has(person({ age: 30, gender: "Laki-laki" }), "wus"));
    assert.ok(has(person({ age: 30, gender: "P" }), "wus"), "kode jenis kelamin lama");
  });
  it("PUS: WUS yang berstatus kawin; belum kawin dan cerai bukan", () => {
    assert.ok(has(person({ age: 30, maritalStatus: "Menikah" }), "pus"));
    assert.ok(has(person({ age: 30, maritalStatus: "KAWIN TERCATAT" }), "pus"));
    assert.ok(!has(person({ age: 30, maritalStatus: "Belum Menikah" }), "pus"));
    assert.ok(!has(person({ age: 30, maritalStatus: "Belum Kawin" }), "pus"));
    assert.ok(!has(person({ age: 30, maritalStatus: "Cerai Hidup" }), "pus"));
    assert.ok(!has(person({ age: 30, maritalStatus: "Cerai Mati" }), "pus"));
    assert.ok(!has(person({ age: 30, maritalStatus: null }), "pus"));
    assert.ok(!has(person({ age: 52, maritalStatus: "Menikah" }), "pus"), "di atas 49");
    assert.ok(!has(person({ age: 30, gender: "Laki-laki", maritalStatus: "Menikah" }), "pus"));
  });
  it("PUS selalu bagian dari WUS; ibu hamil usia 25 masuk dewasa + hamil + WUS (+PUS bila kawin)", () => {
    assert.deepEqual(groupsOf(person({ age: 25, isPregnant: true, maritalStatus: "Menikah" }), NOW).sort(), ["dewasa", "ibuHamil", "pus", "wus"]);
    const rep = buildSasaranReport(Array.from({ length: 50 }, (_, i) => person({ age: 15 + (i % 40), maritalStatus: i % 2 ? "Menikah" : "Belum Menikah" })), NOW);
    assert.ok(rep.totals.pus <= rep.totals.wus);
  });
  it("ibu hamil dihitung walau tanggal lahir tidak valid; usia tidak valid keluar dari kelompok usia", () => {
    const r = person({ birthDate: born(-1), isPregnant: true });
    assert.deepEqual(groupsOf(r, NOW), ["ibuHamil"]);
    assert.deepEqual(groupsOf(person({ birthDate: born(-1) }), NOW), []);
    assert.equal(buildSasaranReport([r], NOW).usiaTidakValid, 1);
  });
});

describe("normalisasi gender dan status kawin", () => {
  it("dikenali", () => {
    assert.ok(isFemale("Perempuan") && isFemale(" wanita ") && isFemale("P"));
    assert.ok(!isFemale("Laki-laki") && !isFemale("") && !isFemale(null) && !isFemale("L"));
    assert.ok(isMarried("Menikah") && isMarried("Kawin") && isMarried("sudah menikah"));
    assert.ok(!isMarried("Belum Menikah") && !isMarried("Cerai Mati") && !isMarried(undefined));
  });
});

describe("RT/RW dan laporan", () => {
  it("RT ditulis beda ('1', '01', 'RT 01') dihitung satu baris", () => {
    assert.equal(normalizeRtRw("1"), "01");
    assert.equal(normalizeRtRw(" 001 "), "01");
    assert.equal(normalizeRtRw("RT 01"), "01");
    assert.equal(normalizeRtRw("12"), "12");
    assert.equal(normalizeRtRw(""), null);
    assert.equal(normalizeRtRw(null), null);
    const rep = buildSasaranReport([person({ rt: "1" }), person({ rt: "01" }), person({ rt: "RT 01" })], NOW);
    assert.equal(rep.rows.length, 1);
    assert.equal(rep.rows[0].total, 3);
  });
  it("urut RW lalu RT sebagai angka; tanpa RT di bawah; baris dan total konsisten", () => {
    const rep = buildSasaranReport(
      [person({ rw: "02", rt: "1" }), person({ rw: "01", rt: "10" }), person({ rw: "01", rt: "2" }), person({ rw: "01", rt: null }), person({ rw: null, rt: null })],
      NOW,
    );
    assert.deepEqual(rep.rows.map((r) => r.label), ["RT 02 / RW 01", "RT 10 / RW 01", "Tanpa RT (RW 01)", "RT 01 / RW 02", "Tanpa RT/RW"]);
    assert.equal(rep.tanpaRt, 2);
    for (const c of SASARAN_COLUMNS) assert.equal(rep.rows.reduce((n, r) => n + r[c.key], 0), rep.totals[c.key]);
    assert.equal(rep.rows.reduce((n, r) => n + r.total, 0), rep.totals.total);
  });
  it("desa kosong → tanpa baris, total nol", () => {
    const rep = buildSasaranReport([], NOW);
    assert.equal(rep.rows.length, 0);
    assert.equal(rep.totals.total, 0);
  });
  it("daftar nama (inSasaran) cocok dengan angka di tabel untuk tiap sel", () => {
    const residents = Array.from({ length: 200 }, (_, i) =>
      person({ age: (i * 7) % 85, rt: String((i % 3) + 1), rw: i % 5 === 0 ? "02" : "01", isPregnant: i % 11 === 0 && (i * 7) % 85 > 14, gender: i % 2 ? "Laki-laki" : "Perempuan", maritalStatus: i % 3 ? "Menikah" : "Belum Menikah" }),
    );
    const rep = buildSasaranReport(residents, NOW);
    for (const row of rep.rows) {
      for (const c of SASARAN_COLUMNS) {
        assert.equal(residents.filter((r) => inSasaran(r, c.key, row.key, NOW)).length, row[c.key], `${row.label} ${c.key}`);
      }
      assert.equal(residents.filter((r) => inSasaran(r, "semua", row.key, NOW)).length, row.total);
    }
    for (const c of SASARAN_COLUMNS) assert.equal(residents.filter((r) => inSasaran(r, c.key, null, NOW)).length, rep.totals[c.key]);
  });
  it("areaLabel", () => {
    assert.equal(areaLabel("02", "01"), "RT 01 / RW 02");
    assert.equal(areaLabel(null, null), "Tanpa RT/RW");
  });
});

describe("ekspor", () => {
  it("lembar: judul kolom sesuai urutan, total di akhir tabel, CSV aman dan nama berkas bersih", () => {
    const rep = buildSasaranReport([person({ age: 30, maritalStatus: "Menikah" }), person({ age: 2, gender: "Laki-laki", rt: "2" })], NOW);
    const sheet = buildSasaranSheet(rep, "Desa Contoh", NOW);
    assert.deepEqual(sheet[0], ["RT / RW", "Jumlah warga", ...SASARAN_COLUMNS.map((c) => c.label)]);
    assert.equal(sheet[3][0], "Total");
    assert.equal(sheet[3][1], 2);
    const csv = sasaranCsv(sheet);
    assert.ok(csv.startsWith("﻿"));
    assert.ok(csv.includes('"Ibu hamil"'));
    assert.equal(sasaranFileName("Desa Ünik / Baru", "xlsx", new Date("2026-11-16T03:00:00Z")), "data-sasaran-posyandu-desa-unik-baru-2026-11-16.xlsx");
  });
});

describe("status warga (filter pindah)", async () => {
  const m = await import("../lib/pkk/sasaran.ts");
  it("kosong → aktif; tiga nilai sah diterima; selain itu ditolak", () => {
    assert.equal(m.parseSasaranStatus(null), "aktif");
    assert.equal(m.parseSasaranStatus(""), "aktif");
    for (const s of m.SASARAN_STATUSES) assert.equal(m.parseSasaranStatus(s), s);
    for (const bad of ["AKTIF", "meninggal", "1; DROP", "all", " aktif"]) assert.equal(m.parseSasaranStatus(bad), null, bad);
  });
  it("ekspor mencantumkan status di judul, catatan, dan nama berkas (bawaan tanpa akhiran)", () => {
    const rep = buildSasaranReport([person()], NOW);
    const sheet = buildSasaranSheet(rep, "Desa Contoh", NOW, "pindah");
    const text = sheet.flat().join("\n");
    assert.match(text, /Status warga: Sudah pindah/);
    assert.match(text, /sudah tercatat pindah dari desa/);
    assert.match(sasaranFileName("Desa Contoh", "csv", new Date("2026-11-16T03:00:00Z"), "pindah"), /^data-sasaran-posyandu-desa-contoh-pindah-2026-11-16\.csv$/);
    assert.match(sasaranFileName("Desa Contoh", "csv", new Date("2026-11-16T03:00:00Z")), /^data-sasaran-posyandu-desa-contoh-2026-11-16\.csv$/);
  });
});

describe("usia terperinci (tahun, bulan, hari)", () => {
  const at = (y: number, m: number, d: number) => new Date(y, m - 1, d);
  it("contoh tetap", () => {
    assert.deepEqual(ageParts(at(2026, 8, 4), at(2026, 11, 16)), { years: 0, months: 3, days: 12 });
    assert.deepEqual(ageParts(at(2000, 1, 15), at(2026, 11, 16)), { years: 26, months: 10, days: 1 });
    assert.deepEqual(ageParts(at(2000, 11, 16), at(2026, 11, 16)), { years: 26, months: 0, days: 0 }, "tepat ulang tahun");
    assert.deepEqual(ageParts(at(2026, 11, 16), at(2026, 11, 16)), { years: 0, months: 0, days: 0 }, "lahir hari ini");
    assert.deepEqual(ageParts(at(2025, 12, 20), at(2026, 2, 10)), { years: 0, months: 1, days: 21 }, "melintasi pergantian tahun");
    assert.equal(formatAgeParts({ years: 0, months: 3, days: 12 }), "0 th 3 bln 12 hr");
    assert.equal(formatAgeParts(null), "-");
  });
  it("lahir 29 Februari dan akhir bulan tidak menghasilkan angka negatif; tahun selalu sama dengan usia penuh", () => {
    assert.deepEqual(ageParts(at(2020, 2, 29), at(2026, 2, 28)), { years: 5, months: 11, days: 30 });
    const p = ageParts(at(2025, 1, 31), at(2025, 3, 1))!;
    assert.ok(p.months >= 0 && p.days >= 0);
    for (let y = 0; y < 100; y += 7) {
      for (let dm = 0; dm < 400; dm += 13) {
        const now = new Date(2026, 10, 16);
        const b = new Date(now.getFullYear() - y, now.getMonth(), now.getDate() - dm);
        if (b > now) continue;
        const a = ageParts(b, now)!;
        assert.equal(a.years, ageOnDate(b, now), `${y} th -${dm} hr`);
        assert.ok(a.months >= 0 && a.months <= 11 && a.days >= 0 && a.days <= 31, JSON.stringify(a));
      }
    }
  });
  it("tanggal lahir tidak valid → null", () => {
    assert.equal(ageParts(new Date(2027, 0, 1), new Date(2026, 10, 16)), null);
  });
});

describe("rentang tanggal lahir untuk penyempitan query (tidak boleh lebih sempit dari groupsOf)", () => {
  it("setiap warga yang cocok menurut groupsOf selalu berada di dalam rentang database", () => {
    const now = new Date(2026, 10, 16, 15);
    const groups = ["balita", "prasekolah", "sekolah", "dewasa", "lansia", "wus", "pus"] as const;
    for (let age = 0; age < 110; age++) {
      for (const dayOff of [-2, -1, 0, 1, 2]) {
        const b = new Date(now.getFullYear() - age, now.getMonth(), now.getDate() + dayOff);
        if (b > now) continue;
        const r = person({ birthDate: b, maritalStatus: "Menikah" });
        for (const g of groups) {
          if (!(groupsOf(r, now) as string[]).includes(g)) continue;
          const range = birthDateRangeForGroup(g, now)!;
          assert.ok(b <= range.lte && (range.gt === undefined || b > range.gt), `${g} usia ${age} ${dayOff} hari`);
        }
      }
    }
  });
  it("ibu hamil tidak punya rentang usia (hanya tanda hamil)", () => {
    assert.equal(birthDateRangeForGroup("ibuHamil", new Date()), null);
  });
});

describe("status kehidupan Data Warga (filter)", async () => {
  const m = await import("../lib/residents/life-status.ts");
  it("tanpa parameter = tanpa filter (pemilih warga lain tak berubah); nilai asing ditolak", () => {
    assert.equal(m.parseLifeStatus(null), undefined);
    assert.equal(m.parseLifeStatus(""), undefined);
    for (const s of m.LIFE_STATUSES) assert.equal(m.parseLifeStatus(s), s);
    for (const bad of ["HIDUP", "mati", "1=1", " hidup", "aktif"]) assert.equal(m.parseLifeStatus(bad), null, bad);
  });
  it("kondisi query", () => {
    assert.deepEqual(m.lifeStatusWhere("hidup"), { isAlive: true });
    assert.deepEqual(m.lifeStatusWhere("meninggal"), { isAlive: false });
    assert.deepEqual(m.lifeStatusWhere("pindah"), { isAlive: true, moveDate: { not: null } });
    assert.deepEqual(m.lifeStatusWhere("semua"), {});
    assert.equal(m.DEFAULT_LIFE_STATUS, "hidup");
  });
});
