import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildStatisticCsv,
  buildStatisticSheets,
  buildStatisticTables,
  percent,
  safeSheetName,
  slugifyFile,
  statisticFileName,
} from "../lib/statistics/export.ts";
import { buildPopulationChange, mutationRange, recentMonthKeys } from "../lib/statistics/population-change.ts";
import { residentExportRow, filterResidents, type ResidentDb } from "../lib/statistics/residents-by-category.ts";
import { resolveApiPermission } from "../lib/permissions/api-route-map.ts";
import type { StatisticsData } from "../lib/statistics/types.ts";

const data = (over: Partial<StatisticsData> = {}): StatisticsData => ({
  summary: { totalPenduduk: 200, lakiLaki: 110, perempuan: 90 },
  jenisKelamin: [
    { name: "Laki-laki", value: 110, percentage: 55 },
    { name: "Perempuan", value: 90, percentage: 45 },
  ],
  usia: [
    { range: "0-4", lakilaki: 10, perempuan: 10, total: 20 },
    { range: "5-9", lakilaki: 30, perempuan: 10, total: 40 },
    { range: "10-14", lakilaki: 70, perempuan: 70, total: 140 },
  ],
  pendidikan: [{ tingkat: "SMA/Sederajat", jumlah: 120 }, { tingkat: "SD/Sederajat", jumlah: 80 }],
  pekerjaan: [{ pekerjaan: "=HYPERLINK(\"x\")", jumlah: 150 }, { pekerjaan: "Petani/Pekebun", jumlah: 50 }],
  perkawinan: [{ status: "Menikah", jumlah: 100 }, { status: "Belum Menikah", jumlah: 100 }],
  agama: [{ agama: "Islam", jumlah: 200 }],
  golonganDarah: [{ golongan: "O", jumlah: 120 }, { golongan: "Tidak Diketahui", jumlah: 80 }],
  wilayah: [{ wilayah: "Dusun A/B: Utara?", jumlah: 200 }],
  kesehatan: [{ kategori: "Peserta BPJS/KIS", jumlah: 150 }, { kategori: "Ibu Hamil", jumlah: 5 }],
  perubahanPenduduk: null,
  dihitungPada: "2026-11-01T03:00:00.000Z",
  ...over,
});

const meta = { villageName: "Desa Sukamaju", generatedAt: new Date("2026-11-01T03:00:00.000Z") };

describe("tabel statistik", () => {
  it("persen satu desimal dan aman terhadap penyebut 0", () => {
    assert.equal(percent(1, 3), 33.3);
    assert.equal(percent(5, 0), 0);
  });

  it("total dan persen konsisten dengan datanya", () => {
    const t = buildStatisticTables(data()).find((x) => x.sheet === "Pendidikan")!;
    assert.deepEqual(t.rows, [["SMA/Sederajat", 120, 60], ["SD/Sederajat", 80, 40]]);
    assert.deepEqual(t.total, ["Total", 200, 100]);
  });

  it("tabel usia menjumlahkan laki-laki, perempuan, dan total", () => {
    const t = buildStatisticTables(data()).find((x) => x.sheet === "Usia")!;
    assert.deepEqual(t.total, ["Total", 110, 90, 200, 100]);
  });

  it("kesehatan tidak dijumlahkan dan memakai total penduduk sebagai penyebut", () => {
    const t = buildStatisticTables(data()).find((x) => x.sheet === "Kesehatan")!;
    assert.equal(t.total, undefined);
    assert.deepEqual(t.rows[0], ["Peserta BPJS/KIS", 150, 75]);
    assert.match(t.note ?? "", /lebih dari satu kategori/);
  });

  it("tidak pernah memuat tren atau pertumbuhan karangan", () => {
    const names = buildStatisticTables(data()).map((t) => t.sheet);
    assert.ok(!names.includes("Perubahan Penduduk"), "tanpa data mutasi, sheet perubahan tidak ada");
    assert.ok(!JSON.stringify(buildStatisticSheets(data(), meta)).toLowerCase().includes("trend"));
  });
});

describe("sheet Excel", () => {
  it("nama sheet aman, unik, dan tidak lebih dari 31 karakter", () => {
    const sheets = buildStatisticSheets(data(), meta);
    const names = sheets.map((s) => s.name);
    assert.equal(new Set(names).size, names.length);
    for (const n of names) {
      assert.ok(n.length >= 1 && n.length <= 31, n);
      assert.doesNotMatch(n, /[\\/?*[\]:]/);
    }
  });

  it("sheet pertama adalah ringkasan berisi nama desa, tanggal, dan catatan sumber", () => {
    const [first] = buildStatisticSheets(data(), meta);
    assert.equal(first.name, "Ringkasan");
    const flat = JSON.stringify(first.rows);
    assert.match(flat, /Desa Sukamaju/);
    assert.match(flat, /1 November 2026/);
    assert.match(flat, /hanya penduduk berstatus hidup/i);
  });

  it("sheet perubahan penduduk hanya ada bila ada data mutasi", () => {
    const change = buildPopulationChange(
      [{ type: "BIRTH", effectiveDate: "2026-11-01", rw: null, rt: null }],
      200,
      new Date("2026-11-15T00:00:00Z"),
    );
    const sheets = buildStatisticSheets(data({ perubahanPenduduk: change }), meta);
    assert.ok(sheets.some((s) => s.name === "Perubahan Penduduk"));
  });

  it("nama sheet berisi karakter terlarang dibersihkan", () => {
    assert.equal(safeSheetName("Dusun A/B: Utara?"), "Dusun A B Utara");
    assert.equal(safeSheetName("x".repeat(60)).length, 31);
    assert.equal(safeSheetName("///"), "Data");
  });
});

describe("CSV", () => {
  it("format panjang dengan BOM dan sel rumus dinetralkan", () => {
    const csv = buildStatisticCsv(data());
    assert.ok(csv.startsWith("﻿\"Dimensi\",\"Kategori\",\"Jumlah\",\"Persen (%)\""));
    assert.ok(csv.includes("\"'=HYPERLINK("), "sel diawali = harus diberi tanda petik");
    assert.ok(!csv.includes("\"=HYPERLINK"));
  });
});

describe("nama berkas", () => {
  it("slug aman untuk nama desa berspasi dan beraksen", () => {
    assert.equal(slugifyFile("Desa Sùkamaju (Utara)"), "desa-sukamaju-utara");
    assert.equal(slugifyFile("!!!"), "desa");
    assert.equal(
      statisticFileName("Desa Sukamaju", "xlsx", new Date("2026-11-01T03:00:00Z")),
      "statistik-kependudukan-desa-sukamaju-2026-11-01.xlsx",
    );
  });
});

describe("perubahan penduduk dari mutasi", () => {
  const now = new Date("2026-06-15T10:00:00Z");

  it("enam bulan terakhir, lintas tahun, terlama lebih dulu", () => {
    assert.deepEqual(recentMonthKeys(new Date("2026-02-10T00:00:00Z")), [
      "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
    ]);
  });

  it("rentang query memakai tanggal valid (Juni = 30 hari)", () => {
    const { from, to } = mutationRange(now);
    assert.equal(from, "2026-01-01");
    assert.equal(to, "2026-06-30");
    assert.ok(!Number.isNaN(new Date(`${to}T00:00:00.000Z`).getTime()));
  });

  it("selisih = lahir + datang − meninggal − pindah, bulan kosong bernilai 0", () => {
    const rows = [
      { type: "BIRTH" as const, effectiveDate: "2026-06-02", rw: null, rt: null },
      { type: "BIRTH" as const, effectiveDate: "2026-06-03", rw: null, rt: null },
      { type: "MOVE_IN" as const, effectiveDate: "2026-06-05", rw: null, rt: null },
      { type: "DEATH" as const, effectiveDate: "2026-06-06", rw: null, rt: null },
      { type: "MOVE_OUT" as const, effectiveDate: "2026-04-06", rw: null, rt: null },
      { type: "KK_CHANGE" as const, effectiveDate: "2026-06-07", rw: null, rt: null },
      { type: "BIRTH" as const, effectiveDate: "2025-12-31", rw: null, rt: null },
    ];
    const c = buildPopulationChange(rows, 1000, now);
    assert.equal(c.perBulan.length, 6);
    const jun = c.perBulan[5];
    assert.deepEqual([jun.lahir, jun.datang, jun.meninggal, jun.pindah, jun.selisih], [2, 1, 1, 0, 2]);
    assert.equal(c.perBulan[3].selisih, -1, "April: satu pindah keluar");
    assert.equal(c.perBulan[0].selisih, 0, "Januari kosong");
    assert.equal(c.bulanIni, 2);
    assert.equal(c.persenBulanIni, 0.2, "2 dari 998 penduduk awal bulan");
  });

  it("persen aman bila jumlah awal bulan nol", () => {
    assert.equal(buildPopulationChange([], 0, now).persenBulanIni, 0);
  });
});

describe("ekspor daftar warga per kategori", () => {
  const mk = (over: Partial<ResidentDb>): ResidentDb => ({
    id: 1, name: "Budi", nik: "3374010101900001", kk: "3374010101900099", gender: "Laki-laki",
    birthDate: new Date("1990-01-05T00:00:00Z"), occupation: "Petani/Pekebun", maritalStatus: "Menikah",
    religion: "Islam", education: "SMA/Sederajat", bloodType: "O", hamlet: "Dusun A", rt: "01", rw: "02",
    isDisability: false, isBpjsKis: true, isPregnant: false, isBreastfeeding: false, isStunting: false, ...over,
  });

  it("NIK dan KK tetap teks, tanggal lahir dd/mm/yyyy, kolom sesuai urutan header", () => {
    const row = residentExportRow(mk({}), 1);
    assert.equal(row.length, 15);
    assert.equal(row[2], "3374010101900001");
    assert.equal(typeof row[2], "string");
    assert.equal(row[5], "05/01/1990");
  });

  it("filter kategori + jenis kelamin + pencarian", () => {
    const all = [
      mk({ id: 1, name: "Budi" }),
      mk({ id: 2, name: "Siti", gender: "Perempuan", nik: "3374010101900002" }),
      mk({ id: 3, name: "Andi", hamlet: "Dusun B" }),
    ];
    assert.deepEqual(filterResidents(all, { dimension: "hamlet", category: "Dusun A" }).map((r) => r.name), ["Budi", "Siti"]);
    assert.deepEqual(filterResidents(all, { dimension: "hamlet", category: "Dusun A", gender: "Perempuan" }).map((r) => r.name), ["Siti"]);
    assert.deepEqual(filterResidents(all, { dimension: "hamlet", category: "Dusun A", search: "3374010101900002" }).map((r) => r.name), ["Siti"]);
    assert.deepEqual(filterResidents(all, { dimension: "health", category: "Peserta BPJS/KIS" }).length, 3);
  });
});

describe("izin ekspor daftar warga", () => {
  it("rute ekspor daftar memakai izin residents.export, bukan statistics.read", () => {
    assert.deepEqual(resolveApiPermission("/api/statistics/residents-by-category/export", "GET"), {
      resource: "residents",
      action: "export",
    });
  });

  it("rute statistik biasa dan daftar tetap statistics.read", () => {
    assert.deepEqual(resolveApiPermission("/api/statistics", "GET"), { resource: "statistics", action: "read" });
    assert.deepEqual(resolveApiPermission("/api/statistics/residents-by-category", "GET"), { resource: "statistics", action: "read" });
  });
});
