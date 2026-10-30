import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { readWorkbookGrids } from "../lib/residents-import/read-workbook.ts";
import { planWorkbook } from "../lib/residents-import/plan.ts";
import {
  analyzeBatch,
  buildSheetRows,
  linkParents,
  mergeAcrossSheets,
  statusOf,
  type ImportRow,
} from "../lib/residents-import/batch.ts";
import { normalizeRow, toDbRecord } from "../lib/residents-import/normalize.ts";
import { parseDateLoose, parseLongNumber, parseNikInfo, splitBirthPlaceDate } from "../lib/residents-import/nik-date.ts";
import { CODES, resolveBlood, resolveJob } from "../lib/residents-import/vocab.ts";
import { headerSignature } from "../lib/residents-import/mapper.ts";

const NOW = new Date("2026-10-30T00:00:00Z");

const HEADER = [
  "Dusun", "RW", "RT", "Nama", "Nomor KK", "Nomor NIK", "Jenis Kelamin L/P", "",
  "Tempat Lahir", "Tanggal Lahir", "Agama", "Pendidikan (dLm KK)", "Pendidikan (sdg ditempuh)",
  "Pekerjaan", "Kawin", "Hub. Keluarga", "Kewarganegaraan", "Nama Ayah", "Nama Ibu", "Gol. Darah",
];

type Row = Array<string | number>;
const D = (dusun: string, rw: string, rt: string, nama: string, kk: string, nik: string, l: string, p: string,
  tl: string, tgl: string | number, agama: string, pend: number, pend2: number, kerja: number, kawin: number,
  hub: string, ayah: string, ibu: string): Row =>
  [dusun, rw, rt, nama, kk, nik, l, p, tl, tgl, agama, pend, pend2, kerja, kawin, hub, "WNI", ayah, ibu, 13];

const DESA: Row[] = [
  D("KARANGSARI", "01", "01", "TUMIN", "3508072508052984", "3508070101590017", "L", "", "LUMAJANG", "1959-01-01", "Islam", 3, 18, 9, 4, "KK", "GIYARTO", "SU"),
  D("KARANGSARI", "01", "01", "SUBANJAR", "3508072508052985", "3508071109430002", "L", "", "LUMAJANG", "1970-01-01", "Islam", 3, 18, 9, 2, "KK", "SUPANDAR", "SATURAH"),
  D("KARANGSARI", "01", "01", "SUWARI", "3508072508052985", "3508075303490002", "", "P", "LUMAJANG", "1949-03-13", "Islam", 3, 18, 2, 2, "Istri", "NAWAR", "SULANA"),
  D("KARANGSARI", "01", "01", "SOBI'I", "3508072508052987", "3508071208720007", "L", "", "LUMAJANG", "1972-08-12", "Islam", 5, 18, 9, 2, "KK", "PAKRAH", "SUNTIK"),
  D("KARANGSARI", "01", "01", "ROHMA", "3508072508052987", "3508074404800001", "", "P", "LUMAJANG", "1980-04-04", "Islam", 5, 18, 2, 2, "Istri", "SONO", "SUMIARAH"),
  D("KARANGSARI", "01", "01", "MUHAMMAD BAGUS FATWA", "3508072508052987", "3508072708050002", "L", "", "LUMAJANG", "2005-08-27", "Islam", 2, 4, 3, 1, "Anak", "SOBI'I", "ROHMA"),
  D("KARANGSARI", "01", "01", "NUKAN", "3508072508052986", "3508070101630007", "L", "", "LUMAJANG", "1963-01-01", "Islam", 2, 18, 8, 2, "KK", "'", "'"),
];
// Sel tanggal berformat tanggal Excel (serial) + NIK numerik terpotong
const SERIAL_ROW: Row = D("KARANGSARI", "01", "01", "SERIAL ORANG", "3508072508052990", "3508070101600001", "L", "", "LUMAJANG", 21916, "Islam", 3, 18, 9, 2, "KK", "", "");

function buildFixture(): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const desa = XLSX.utils.aoa_to_sheet([HEADER, ...DESA, SERIAL_ROW]);
  desa["!merges"] = [{ s: { r: 0, c: 6 }, e: { r: 0, c: 7 } }];
  // Jadikan sel tanggal terakhir sebagai tanggal Excel sungguhan
  const serialRef = XLSX.utils.encode_cell({ r: DESA.length + 1, c: 9 });
  desa[serialRef] = { t: "n", v: 21916, z: "yyyy-mm-dd" };
  XLSX.utils.book_append_sheet(wb, desa, "Desa");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, DESA[0]]), "Rw.01");
  const mati = D("KARANGSARI", "01", "01", "SUBANJAR", "3508072508052985", "3508071109430002", "L", "", "LUMAJANG", "1943-09-11", "Islam", 3, 18, 9, 2, "KK", "", "");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, mati]), "MENINGGAL");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, DESA[1]]), "PINDAH");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["No", "Nama", "Keterangan"], [1, "ABC", "belum rekam"]]),
    "DAFTAR BLM REKAM KTP EL",
  );
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("impor warga — NIK & tanggal", () => {
  it("menurunkan tanggal lahir dan jenis kelamin dari NIK (perempuan = hari + 40)", () => {
    assert.deepEqual(parseNikInfo("3508074404800001", NOW), { birthDate: "1980-04-04", gender: "Perempuan" });
    assert.deepEqual(parseNikInfo("3508070101590017", NOW), { birthDate: "1959-01-01", gender: "Laki-laki" });
    assert.deepEqual(parseNikInfo("3508075310090001", NOW), { birthDate: "2009-10-13", gender: "Perempuan" });
    assert.equal(parseNikInfo("3508073102900001", NOW).birthDate, null); // 31 Feb
    assert.equal(parseNikInfo("123", NOW).birthDate, null);
  });
  it("parse tanggal: hari dulu, nama bulan, serial Excel, dan tidak pernah menebak hari ini", () => {
    assert.equal(parseDateLoose("01/02/1959", NOW), "1959-02-01");
    assert.equal(parseDateLoose("13-03-1949", NOW), "1949-03-13");
    assert.equal(parseDateLoose("1 Januari 1959", NOW), "1959-01-01");
    assert.equal(parseDateLoose("27 AGU 05", NOW), "2005-08-27");
    assert.equal(parseDateLoose("1959-01-01T00:00:00", NOW), "1959-01-01");
    assert.equal(parseDateLoose(21916, NOW), "1960-01-01");
    assert.equal(parseDateLoose("bukan tanggal", NOW), null);
    assert.equal(parseDateLoose("", NOW), null);
  });
  it("memecah 'Tempat, Tgl Lahir'", () => {
    assert.deepEqual(splitBirthPlaceDate("LUMAJANG, 01-01-1959", NOW), { place: "LUMAJANG", date: "1959-01-01" });
    assert.deepEqual(splitBirthPlaceDate("Sleman 5 Mei 1966", NOW), { place: "Sleman", date: "1966-05-05" });
  });
  it("mengenali NIK numerik terpotong Excel", () => {
    assert.equal(parseLongNumber(3508070101590017).nik, "3508070101590017");
    assert.equal(parseLongNumber(3508070101590000).truncatedSuspect, true);
    assert.equal(parseLongNumber("'3508070101590017").nik, "3508070101590017");
    assert.equal(parseLongNumber("3.50807E+15").nik.length, 16);
  });
});

describe("impor warga — kosakata & kode", () => {
  it("tabel kode sesuai tabel Dukcapil", () => {
    assert.equal(CODES.job.length, 89);
    assert.equal(CODES.job[88], "Lainnya");
    assert.equal(CODES.job[0], "Belum/Tidak Bekerja");
    assert.equal(CODES.job[1], "Mengurus Rumah Tangga");
    assert.equal(CODES.job[8], "Petani/Pekebun");
    assert.equal(CODES.job[87], "Wiraswasta");
    assert.equal(CODES.familyRole[0], "Kepala Keluarga");
    assert.equal(CODES.familyRole[10], "Lainnya");
    assert.equal(CODES.education[2], "Tamat SD");
    assert.equal(CODES.marital[3], "Cerai Mati");
    assert.equal(CODES.blood[12], "Tidak Tahu");
  });
  it("golongan darah tidak menabrakkan A dengan A+", () => {
    assert.equal(resolveBlood("A+")?.value, "A+");
    assert.equal(resolveBlood("A")?.value, "A");
    assert.equal(resolveBlood("o negatif")?.value, "O-");
    assert.equal(resolveBlood("5")?.value, "A+");
  });
  it("pekerjaan: varian dan alias", () => {
    assert.equal(resolveJob("PNS")?.value, "Pegawai Negeri Sipil (PNS)");
    assert.equal(resolveJob("petani")?.value, "Petani/Pekebun");
    assert.equal(resolveJob("WIRASWASTA")?.value, "Wiraswasta");
    assert.equal(resolveJob("9")?.value, "Petani/Pekebun");
    assert.equal(resolveJob("astronot antariksa"), null);
  });
});

describe("impor warga — normalisasi baris", () => {
  it("kode angka, singkatan, dan sampah ditangani", () => {
    const { values, issues } = normalizeRow(
      {
        name: "  tumin ",
        id_number: "3508070101590017",
        gender: "L",
        date_of_birth: "1959-01-01",
        birthplace: "LUMAJANG",
        religion_id: "Islam",
        education_id: 3,
        job_id: 9,
        marital_status: 4,
        status_family_id: "KK",
        nationality: "WNI",
        father_name: "'",
        blood_type_id: 13,
        hamlet: "KARANGSARI",
        rt: "01",
        rw: "01",
      },
      { now: NOW },
    );
    assert.equal(values.name, "tumin");
    assert.equal(values.gender, "Laki-laki");
    assert.equal(values.education_id, "Tamat SD");
    assert.equal(values.job_id, "Petani/Pekebun");
    assert.equal(values.marital_status, "Cerai Mati");
    assert.equal(values.status_family_id, "Kepala Keluarga");
    assert.equal(values.nationality, "Indonesia");
    assert.equal(values.father_name, "");
    assert.equal(values.blood_type_id, "", "Tidak Tahu tidak muat di kolom 5 karakter");
    assert.equal(values.rt, "01");
    assert.equal(values.address, "Dusun KARANGSARI RT 01 RW 01");
    assert.equal(statusOf(issues), "ok");
  });
  it("tanggal lahir kosong atau placeholder diisi dari NIK, bukan hari ini", () => {
    const empty = normalizeRow({ name: "A", id_number: "3508074404800001", gender: "P" }, { now: NOW });
    assert.equal(empty.values.date_of_birth, "1980-04-04");
    assert.ok(empty.issues.some((i) => i.field === "date_of_birth" && i.level === "fixed"));
    const ph = normalizeRow({ name: "A", id_number: "3508071109430002", gender: "L", date_of_birth: "1970-01-01" }, { now: NOW });
    assert.equal(ph.values.date_of_birth, "1943-09-11");
  });
  it("tanggal lahir tak bisa dipastikan = error, bukan hari ini", () => {
    const r = normalizeRow({ name: "A", id_number: "1234567890123456", gender: "L" }, { now: NOW });
    assert.equal(r.values.date_of_birth, "");
    assert.equal(statusOf(r.issues), "error");
  });
  it("jenis kelamin diisi dari NIK; bentrok dengan NIK menjadi peringatan", () => {
    const fill = normalizeRow({ name: "A", id_number: "3508074404800001", date_of_birth: "1980-04-04" }, { now: NOW });
    assert.equal(fill.values.gender, "Perempuan");
    const clash = normalizeRow({ name: "A", id_number: "3508074404800001", gender: "L", date_of_birth: "1980-04-04" }, { now: NOW });
    assert.ok(clash.issues.some((i) => i.field === "gender" && i.level === "warning"));
  });
  it("NIK tidak 16 digit, kosong, dan terpotong", () => {
    assert.equal(statusOf(normalizeRow({ name: "A", id_number: "123", gender: "L", date_of_birth: "1990-01-01" }, { now: NOW }).issues), "error");
    assert.equal(statusOf(normalizeRow({ name: "A", gender: "L", date_of_birth: "1990-01-01" }, { now: NOW }).issues), "error");
    const t = normalizeRow({ name: "A", id_number: 3508070101590000, gender: "L", date_of_birth: "1959-01-01" }, { now: NOW });
    assert.ok(t.issues.some((i) => i.field === "id_number" && i.message.includes("terpotong")));
  });
  it("nilai tidak dikenali menjadi peringatan, bukan hilang diam-diam", () => {
    const r = normalizeRow({ name: "A", id_number: "3508070101590017", gender: "L", date_of_birth: "1959-01-01", religion_id: "Pastafarian", job_id: "Astronot" }, { now: NOW });
    assert.equal(r.values.religion_id, "Pastafarian");
    assert.equal(r.issues.filter((i) => i.level === "warning" && i.message.includes("daftar baku")).length, 2);
  });
  it("idempoten: normalisasi ulang tidak mengubah nilai", () => {
    const first = normalizeRow(
      { name: "Budi", id_number: "3508070101590017", gender: "1", date_of_birth: "01/01/1959", religion_id: 1, job_id: "petani", blood_type_id: "A positif", phone_number: "+62 812-3456-7890", rt: 1, rw: 2 },
      { now: NOW },
    );
    const second = normalizeRow(first.values, { now: NOW });
    assert.deepEqual(second.values, first.values);
    assert.equal(first.values.phone_number, "081234567890");
    assert.equal(first.values.rt, "01");
    assert.equal(first.values.blood_type_id, "A+");
  });
  it("bentuk DB: tanggal UTC, boolean, nol menjadi null", () => {
    const { values } = normalizeRow({ name: "Budi", id_number: "3508070101590017", gender: "L", date_of_birth: "1959-01-01", is_bpjs_kis: "Y", height: "170 cm" }, { now: NOW });
    const rec = toDbRecord(values);
    assert.equal(rec.birthDate.toISOString(), "1959-01-01T00:00:00.000Z");
    assert.equal(rec.isBpjsKis, true);
    assert.equal(rec.height, 170);
    assert.equal(rec.kk, null);
    assert.equal(rec.isAlive, true);
  });
});

describe("impor warga — workbook seperti di screenshot", () => {
  const grids = readWorkbookGrids(buildFixture());
  const plans = planWorkbook(grids);
  const desa = plans.find((p) => p.sheet.name === "Desa")!;

  it("memetakan header non-template ke field yang benar", () => {
    const byHeader = Object.fromEntries(desa.guesses.map((g) => [g.header, g.field]));
    assert.equal(byHeader["Dusun"], "hamlet");
    assert.equal(byHeader["RW"], "rw");
    assert.equal(byHeader["RT"], "rt");
    assert.equal(byHeader["Nama"], "name");
    assert.equal(byHeader["Nomor KK"], "family_card_number");
    assert.equal(byHeader["Nomor NIK"], "id_number");
    assert.equal(byHeader["Tempat Lahir"], "birthplace");
    assert.equal(byHeader["Tanggal Lahir"], "date_of_birth");
    assert.equal(byHeader["Pendidikan (dLm KK)"], "education_id");
    assert.equal(byHeader["Pendidikan (sdg ditempuh)"], null, "pendidikan yang sedang ditempuh diabaikan");
    assert.equal(byHeader["Kawin"], "marital_status");
    assert.equal(byHeader["Hub. Keluarga"], "status_family_id");
    assert.equal(byHeader["Kewarganegaraan"], "nationality");
    assert.equal(byHeader["Nama Ayah"], "father_name");
    assert.equal(byHeader["Nama Ibu"], "mother_name");
    assert.equal(byHeader["Gol. Darah"], "blood_type_id");
  });
  it("kolom jenis kelamin yang dipecah (header gabungan G:H) keduanya dipetakan ke gender", () => {
    const g = desa.mapping.map((f, i) => (f === "gender" ? i : -1)).filter((i) => i >= 0);
    assert.deepEqual(g, [6, 7]);
  });
  it("menentukan peran sheet dan pilihan default", () => {
    const sel = Object.fromEntries(plans.map((p) => [p.sheet.name, [p.role, p.selected]]));
    assert.deepEqual(sel["Desa"], ["master", true]);
    assert.deepEqual(sel["Rw.01"], ["split", false]);
    assert.deepEqual(sel["MENINGGAL"], ["deceased", true]);
    assert.deepEqual(sel["PINDAH"], ["moved", false]);
    assert.deepEqual(sel["DAFTAR BLM REKAM KTP EL"], ["auxiliary", false]);
  });
  it("membangun baris: gender dari dua kolom, kode angka, tanggal serial, apostrof", async () => {
    const rows = await buildSheetRows(desa, { now: NOW });
    assert.equal(rows.length, DESA.length + 1);
    const tumin = rows[0].values;
    assert.equal(tumin.gender, "Laki-laki");
    assert.equal(tumin.education_id, "Tamat SD");
    assert.equal(tumin.job_id, "Petani/Pekebun");
    assert.equal(tumin.marital_status, "Cerai Mati");
    assert.equal(tumin.status_family_id, "Kepala Keluarga");
    assert.equal(tumin.nationality, "Indonesia");
    assert.equal(tumin.rt, "01");
    assert.equal(tumin.address, "Dusun KARANGSARI RT 01 RW 01");
    assert.equal(rows[2].values.gender, "Perempuan", "P berada di kolom H");
    assert.equal(rows[1].values.date_of_birth, "1943-09-11", "placeholder 1970-01-01 diganti dari NIK");
    assert.equal(rows[6].values.father_name, "", "apostrof tunggal dibersihkan");
    assert.equal(rows[7].values.date_of_birth, "1960-01-01", "serial Excel tanpa geser zona waktu");
    assert.equal(statusOf(rows[0].issues), "ok");
  });
  it("menggabungkan sheet MENINGGAL ke data induk dan membuang salinan per-RW", async () => {
    const chosen = plans.filter((p) => p.selected || p.sheet.name === "Rw.01");
    const all: ImportRow[] = [];
    let key = 0;
    for (const p of chosen) {
      const rows = await buildSheetRows(p, { now: NOW, startKey: key });
      key += rows.length;
      all.push(...rows);
    }
    const { rows, summary } = mergeAcrossSheets(all, NOW);
    assert.equal(summary.merged, 2); // MENINGGAL→Desa, Rw.01→Desa
    assert.equal(rows.filter((r) => r.values.id_number === "3508071109430002").length, 1);
    const subanjar = rows.find((r) => r.values.id_number === "3508071109430002")!;
    assert.equal(subanjar.values.is_alive, "N");
    assert.equal(subanjar.sheet, "Desa");
    assert.equal(toDbRecord(subanjar.values).isAlive, false);
  });
  it("menautkan NIK ayah/ibu dari anggota KK yang sama", async () => {
    const rows = await buildSheetRows(desa, { now: NOW });
    const n = linkParents(rows);
    assert.equal(n, 2);
    const anak = rows.find((r) => r.values.name === "MUHAMMAD BAGUS FATWA")!;
    assert.equal(anak.values.father_nik, "3508071208720007");
    assert.equal(anak.values.mother_nik, "3508074404800001");
  });
  it("analisis lintas baris: NIK ganda dan KK tanpa kepala", async () => {
    const rows = await buildSheetRows(desa, { now: NOW });
    const dup = { ...rows[0], key: 999, srcRow: 50 };
    const issues = analyzeBatch([...rows, dup]);
    assert.ok(issues.get(999)?.some((i) => i.level === "error" && i.field === "id_number"));
    assert.equal(issues.get(rows[0].key), undefined);
  });
  it("tanda tangan header stabil dan sensitif terhadap perubahan kolom", () => {
    assert.equal(headerSignature(HEADER), headerSignature([...HEADER]));
    assert.notEqual(headerSignature(HEADER), headerSignature([...HEADER, "Kolom Baru"]));
  });
});

describe("impor warga — pemeta kolom bertumpu pada isi", () => {
  it("menebak kolom tanpa header yang dikenal lewat profil isi", () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["Kolom A", "Kolom B", "Kolom C", "Kolom D"],
      ["3508070101590017", "3508072508052984", "L", "Islam"],
      ["3508074404800001", "3508072508052984", "P", "Islam"],
      ["3508072708050002", "3508072508052987", "L", "Kristen"],
      ["3508075303490002", "3508072508052985", "P", "Hindu"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Data");
    const plan = planWorkbook(readWorkbookGrids(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer))[0];
    assert.deepEqual(plan.mapping, ["id_number", "family_card_number", "gender", "religion_id"]);
  });
  it("mendeteksi baris header di bawah judul laporan dan membuang baris JUMLAH", () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["DAFTAR PENDUDUK DESA CONTOH"],
      [],
      ["No", "Nama", "NIK", "Jenis Kelamin", "Tanggal Lahir"],
      [1, "A", "3508070101590017", "Laki-laki", "01/01/1959"],
      [],
      ["JUMLAH", "", "", "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Data");
    const plan = planWorkbook(readWorkbookGrids(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer))[0];
    assert.equal(plan.sheet.headerRow, 2);
    assert.equal(plan.sheet.dataRows.length, 1);
    assert.equal(plan.mapping[0], null, "kolom nomor urut diabaikan");
    assert.equal(plan.mapping[2], "id_number");
  });
});

describe("impor warga — template", () => {
  it("template memuat semua field non-virtual dan kolom identitas berformat teks", async () => {
    const { buildTemplateWorkbook } = await import("../lib/residents-import/template.ts");
    const { FIELDS } = await import("../lib/residents-import/fields.ts");
    const buf = XLSX.write(buildTemplateWorkbook(), { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const wb = XLSX.read(buf, { type: "array", cellNF: true });
    const ws = wb.Sheets["Data Warga"];
    const header = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0];
    assert.equal(header.length, FIELDS.filter((f) => !f.virtual).length);
    const nikCol = header.indexOf("NIK");
    assert.equal(ws[XLSX.utils.encode_cell({ r: 5, c: nikCol })]?.z, "@");
    // Template yang diunduh bisa dibaca kembali oleh adaptor tanpa pemetaan manual
    const plan = planWorkbook(readWorkbookGrids(buf))[0];
    assert.equal(plan.sheet.name, "Data Warga");
    assert.ok(plan.mapping.includes("id_number") && plan.mapping.includes("name") && plan.mapping.includes("date_of_birth"));
    const rows = await buildSheetRows(plan, { now: NOW });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].values.name, "BUDI SANTOSO");
    assert.equal(statusOf(rows[0].issues), "ok");
  });
});

describe("impor warga — baris sampah vs data", () => {
  it("data berisi kata mirip header (KK/AYAH/IBU) tidak dibuang; header berulang dan JUMLAH dibuang", () => {
    const wb = XLSX.utils.book_new();
    const head = ["Nama", "Nomor KK", "Nomor NIK", "Hub. Keluarga", "Nama Ayah", "Nama Ibu"];
    const rows = [
      head,
      ["BUDI", "3508072508052984", "3508070101590017", "KK", "AYAH", "IBU"],
      head,
      ["TOTAL BAGUS", "3508072508052985", "3508071109430002", "Anak", "X", "Y"],
      ["JUMLAH", "", "", "", "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Data");
    const plan = planWorkbook(readWorkbookGrids(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer))[0];
    assert.deepEqual(plan.sheet.dataRows.map((r) => r.cells[0]), ["BUDI", "TOTAL BAGUS"]);
    assert.equal(plan.sheet.skipped.repeatedHeader, 1);
    assert.equal(plan.sheet.skipped.summary, 1);
  });
});

describe("impor warga — pembantu server", () => {
  it("UPDATE dilewati bila tidak ada perubahan; 'isi kosong' tak menyentuh data terisi; sel kosong tak menghapus", async () => {
    const { buildUpdate } = await import("../lib/residents-import/server-helpers.ts");
    const incoming = toDbRecord(
      normalizeRow({ name: "BUDI", id_number: "3508070101590017", gender: "L", date_of_birth: "1959-01-01", job_id: "petani", phone_number: "" }, { now: NOW }).values,
    );
    const existingSame = { ...incoming };
    assert.deepEqual(buildUpdate(incoming, existingSame, "overwrite", { is_alive: "" }), {}, "tanpa perubahan = tanpa UPDATE");

    const existing = { ...incoming, occupation: "Pelajar/Mahasiswa", phone: null, address: "Jl. lama" };
    assert.deepEqual(buildUpdate(incoming, existing, "fill", {}), {}, "occupation sudah terisi → tidak diisi");
    assert.deepEqual(buildUpdate(incoming, existing, "overwrite", {}), { occupation: "Petani/Pekebun" });
    // address di file kosong → tidak menghapus "Jl. lama"
    assert.equal("address" in buildUpdate({ ...incoming, address: "" }, existing, "overwrite", {}), false);
    // tanggal dibandingkan menurut nilai, bukan referensi objek
    assert.equal("birthDate" in buildUpdate(incoming, { ...incoming, birthDate: new Date(incoming.birthDate) }, "overwrite", {}), false);
  });
  it("runPool membatasi konkurensi dan menyelesaikan semua item", async () => {
    const { runPool } = await import("../lib/residents-import/server-helpers.ts");
    let running = 0;
    let peak = 0;
    let done = 0;
    await runPool(Array.from({ length: 50 }, (_, i) => i), 4, async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 2));
      running--;
      done++;
    });
    assert.equal(done, 50);
    assert.ok(peak <= 4 && peak > 1, `peak=${peak}`);
    await runPool([], 4, async () => assert.fail("tidak boleh dipanggil"));
  });
  it("pembacaan lewat readAndPlan identik dengan jalur worker (fungsi yang sama)", async () => {
    const { readAndPlan } = await import("../lib/residents-import/read-plan.ts");
    const buf = buildFixture();
    const direct = planWorkbook(readWorkbookGrids(buf));
    const viaHelper = readAndPlan(buf);
    assert.deepEqual(viaHelper.map((p) => [p.sheet.name, p.selected, p.mapping]), direct.map((p) => [p.sheet.name, p.selected, p.mapping]));
    // hasil harus bisa di-structured-clone (syarat pengiriman dari Worker)
    assert.equal(structuredClone(viaHelper).length, viaHelper.length);
  });
});

describe("impor warga — sambungan ke aplikasi mobile", () => {
  const base = { name: "SOBI'I", id_number: "3508071208720007", gender: "L", date_of_birth: "1972-08-12", family_card_number: "3508072508052987" };

  it("kesiapan: mandiri bila NIK + tgl lahir + nama ibu; via kode bila nama ibu kosong; diblokir bila meninggal/pindah", async () => {
    const { mobileReadiness, summarizeReadiness } = await import("../lib/residents-import/mobile-readiness.ts");
    const v = (extra: Record<string, unknown>) => normalizeRow({ ...base, ...extra }, { now: NOW }).values;
    assert.equal(mobileReadiness(v({ mother_name: "SUNTIK" })).level, "identity");
    const kode = mobileReadiness(v({ mother_name: "'" }));
    assert.equal(kode.level, "code");
    assert.match(kode.reason!, /kode aktivasi/);
    assert.equal(mobileReadiness(v({ mother_name: "12345" })).level, "code", "nama ibu berisi angka tidak bisa dicocokkan");
    assert.equal(mobileReadiness(v({ mother_name: "SUNTIK", is_alive: "meninggal" })).level, "blocked");
    assert.equal(mobileReadiness(v({ mother_name: "SUNTIK", move_date: "2025-01-01" })).level, "blocked");
    assert.equal(mobileReadiness(v({ family_card_number: "", mother_name: "" })).level, "blocked", "tanpa ibu dan tanpa KK");
    const s = summarizeReadiness([{ values: v({ mother_name: "SUNTIK" }) }, { values: v({}) }, { values: v({ is_alive: "N" }) }]);
    assert.deepEqual(s, { identity: 1, code: 1, blocked: 1 });
  });

  it("kontrak: data hasil impor lolos syarat pendaftaran mobile (registerWithIdentity) dan kode KK", async () => {
    const { namesMatch, sameCalendarDay, parseYmd } = await import("../lib/mobile/citizen.ts");
    const { values } = normalizeRow({ ...base, mother_name: "  Suntik  ", birthplace: "Lumajang" }, { now: NOW });
    const rec = toDbRecord(values);
    // Persis kondisi pada lib/mobile/citizen-register.ts
    assert.equal(rec.isAlive !== false && !rec.moveDate, true);
    assert.equal(sameCalendarDay(rec.birthDate, parseYmd("1972-08-12")!), true, "tanggal lahir cocok persis");
    assert.equal(namesMatch(rec.motherName, "SUNTIK"), true, "nama ibu cocok setelah normalisasi mobile");
    assert.equal(namesMatch(rec.motherName, "Alm. Suntik"), true);
    assert.equal(rec.kk, "3508072508052987", "KK 16 digit bersih untuk pendaftaran via kode");
    assert.equal(rec.nik.length, 16);
  });

  it("aturan nama impor = aturan nama mobile (satu sumber)", async () => {
    const a = await import("../lib/mobile/person-name.ts");
    const b = await import("../lib/mobile/citizen.ts");
    assert.equal(a.namesMatch, b.namesMatch);
    assert.equal(a.normalizePersonName, b.normalizePersonName);
  });

  it("mode status: hanya mengubah status meninggal/pindah; warga baru tidak dibuat; akun dinonaktifkan", async () => {
    const { buildUpdate, deactivatesAccount } = await import("../lib/residents-import/server-helpers.ts");
    const incoming = toDbRecord(
      normalizeRow({ ...base, address: "Jl. Baru", is_alive: "N", death_date: "2025-03-01" }, { now: NOW }).values,
    );
    const existing = { ...incoming, isAlive: true, deathDate: null, address: "Jl. Lama" };
    const data = buildUpdate(incoming, existing, "status", { is_alive: "N" });
    assert.deepEqual(Object.keys(data).sort(), ["deathDate", "isAlive"], "alamat dan kolom lain tidak disentuh");
    assert.equal(deactivatesAccount(data), true);
    // sudah berstatus meninggal → tidak ada perubahan
    assert.deepEqual(buildUpdate(incoming, { ...existing, isAlive: false, deathDate: incoming.deathDate }, "status", { is_alive: "N" }), {});
    // pindah → nonaktifkan; perubahan alamat saja → tidak
    assert.equal(deactivatesAccount({ moveDate: new Date() }), true);
    assert.equal(deactivatesAccount({ address: "x" }), false);
    // baris tanpa status (warga hidup biasa) tidak mengubah apa pun di mode status
    const alive = toDbRecord(normalizeRow(base, { now: NOW }).values);
    assert.deepEqual(buildUpdate(alive, { ...alive, address: "lain" }, "status", {}), {});
  });
});
