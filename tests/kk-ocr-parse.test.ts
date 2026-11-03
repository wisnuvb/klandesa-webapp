import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fixDigits, levenshtein, parseKkText } from "../lib/kependudukan/kk-ocr/parse.ts";
import { lineFromWords } from "../lib/kependudukan/kk-ocr/lines.ts";

const L = (s: string) => ({ text: s });

// Teks seperti keluaran OCR pada KK bersih (kolom dipisah dua spasi).
const CLEAN = [
  "KARTU KELUARGA",
  "No. 3508070101100011",
  "Nama Kepala Keluarga : BUDI SANTOSO    Desa/Kelurahan : KARANGSARI",
  "Alamat : DUSUN KRAJAN  Kecamatan : TEMPEH",
  "RT/RW : 003 / 002    Kabupaten : LUMAJANG",
  "No Nama Lengkap NIK Jenis Kelamin Tempat Lahir Tanggal Lahir Agama Pendidikan Jenis Pekerjaan Golongan Darah",
  "1 BUDI SANTOSO 3508070101900001 LAKI-LAKI LUMAJANG 01-01-1990 ISLAM SLTA/SEDERAJAT PETANI/PEKEBUN O",
  "2 SITI AMINAH 3508074101920002 PEREMPUAN LUMAJANG 01-01-1992 ISLAM SLTP/SEDERAJAT MENGURUS RUMAH TANGGA -",
  "3 ANDI SANTOSO 3508071501150003 LAKI-LAKI LUMAJANG 15-01-2015 ISLAM BELUM TAMAT SD/SEDERAJAT BELUM/TIDAK BEKERJA -",
  "No Status Perkawinan Tanggal Perkawinan Status Hubungan Dalam Keluarga Kewarganegaraan No Paspor No KITAS Nama Ayah Nama Ibu",
  "1 KAWIN TERCATAT 10-05-2012 KEPALA KELUARGA WNI - - SUPARDI  SUMINI",
  "2 KAWIN TERCATAT 10-05-2012 ISTRI WNI - - HARTONO  SRI WAHYUNI",
  "3 BELUM KAWIN - ANAK WNI - - BUDI SANTOSO  SITI AMINAH",
].map(L);

describe("pembantu", () => {
  it("memperbaiki huruf yang menyerupai angka dan jarak sunting", () => {
    assert.equal(fixDigits("35O8O7 O1O1 9OOO1"), "350807010190001");
    assert.equal(fixDigits("3S08l7"), "350817");
    assert.equal(levenshtein("kitten", "sitting"), 3);
  });
  it("menyusun baris dari kata dan menandai celah kolom dengan dua spasi", () => {
    const l = lineFromWords([
      { text: "SUPARDI", x0: 0, x1: 70 },
      { text: "SUMINI", x0: 200, x1: 260 },
    ]);
    assert.equal(l.text, "SUPARDI  SUMINI");
    assert.equal(lineFromWords([{ text: "BUDI", x0: 0, x1: 40 }, { text: "SANTOSO", x0: 48, x1: 118 }]).text, "BUDI SANTOSO");
  });
});

describe("KK bersih", () => {
  const d = parseKkText(CLEAN);
  it("membaca header", () => {
    assert.equal(d.kk, "3508070101100011");
    assert.equal(d.rt, "03");
    assert.equal(d.rw, "02");
    assert.match(d.address, /DUSUN KRAJAN/);
    assert.equal(d.hamlet, "Krajan");
    assert.deepEqual(d.headerFlags, {});
  });
  it("membaca tiga anggota dengan kosakata aplikasi", () => {
    assert.equal(d.members.length, 3);
    const [budi, siti, andi] = d.members;
    assert.deepEqual(
      { n: budi.name, nik: budi.nik, g: budi.gender, bp: budi.birthplace, bd: budi.birthDate, r: budi.religion, e: budi.education, j: budi.occupation, b: budi.bloodType, m: budi.maritalStatus, role: budi.familyRole },
      { n: "BUDI SANTOSO", nik: "3508070101900001", g: "Laki-laki", bp: "LUMAJANG", bd: "1990-01-01", r: "Islam", e: "SLTA", j: "Petani/Pekebun", b: "O", m: "Menikah", role: "Kepala Keluarga" },
    );
    assert.equal(siti.gender, "Perempuan");
    assert.equal(siti.occupation, "Mengurus Rumah Tangga");
    assert.equal(siti.familyRole, "Istri");
    assert.equal(andi.education, "Belum Tamat SD");
    assert.equal(andi.maritalStatus, "Belum Menikah");
    assert.equal(andi.familyRole, "Anak");
  });
  it("memisahkan nama ayah dan ibu dari celah kolom", () => {
    assert.deepEqual(d.members.map((m) => [m.fatherName, m.motherName]), [["SUPARDI", "SUMINI"], ["HARTONO", "SRI WAHYUNI"], ["BUDI SANTOSO", "SITI AMINAH"]]);
    assert.ok(d.members.every((m) => Object.keys(m.flags).length === 0), JSON.stringify(d.members.map((m) => m.flags)));
    assert.deepEqual(d.notes, []);
  });
});

describe("KK dengan salah baca umum", () => {
  const NOISY = [
    "KARTU KELUARGA",
    "No : 35O8O7O1O11OOO11",
    "Alamat : JL MAWAR NO 5",
    "RT/RW : 01 / 02",
    "1 BUDI SANTOSO 3508 0701 0190 0001 LAKI-LAKI LUMAJANG O1-O1-1990 ISLAM SLTA/SEDERAJAT PETANI/PEKEBUN -",
    "2 SITI AMINAH 35O8074I01920002 PEREMPUAN LUMAJANG 01-01-1992 ISLAN SLTA/SEDERAJAT KARYAWAN SWASTA -",
    "1 KAWIN TERCATAT KEPALA KELUARGA WNI SUPARDI SUMINI",
    "2 KAWIN TERCATAT ISTRI WNI",
  ].map(L);
  const d = parseKkText(NOISY);
  it("memperbaiki angka yang tertukar huruf dan menormalkan agama yang salah baca", () => {
    assert.equal(d.kk, "3508070101100011");
    assert.equal(d.members[0].nik, "3508070101900001");
    assert.equal(d.members[0].birthDate, "1990-01-01");
    assert.equal(d.members[1].nik, "3508074101920002");
    assert.equal(d.members[1].religion, "Islam");
  });
  it("menandai nama orang tua yang ambigu dan yang tidak terbaca", () => {
    assert.ok(d.members[0].flags.fatherName);
    assert.equal(d.members[0].fatherName, "SUPARDI");
    assert.equal(d.members[1].fatherName, "");
  });
});

describe("pemeriksaan silang dengan NIK", () => {
  it("melengkapi tanggal lahir dan jenis kelamin dari NIK bila OCR gagal, tanpa menandai", () => {
    const d = parseKkText([L("No 3508070101100011"), L("1 BUDI SANTOSO 3508070101900001 LUMAJANG ISLAM"), L("1 KAWIN KEPALA KELUARGA WNI")]);
    // Tanpa jenis kelamin/tanggal pada baris → tidak dikenali sebagai baris anggota
    assert.equal(d.members.length, 0);
    assert.ok(d.notes.some((n) => n.includes("Tidak ada anggota")));
  });
  it("menandai tanggal lahir dan jenis kelamin yang bertentangan dengan NIK", () => {
    const d = parseKkText([L("No 3508070101100011"), L("1 BUDI SANTOSO 3508070101900001 PEREMPUAN LUMAJANG 05-05-1991 ISLAM SLTA/SEDERAJAT PETANI/PEKEBUN -")]);
    assert.ok(d.members[0].flags.gender);
    assert.ok(d.members[0].flags.birthDate);
    assert.equal(d.members[0].gender, "Perempuan", "nilai KK dipertahankan, hanya ditandai");
    assert.equal(d.members[0].birthDate, "1991-05-05");
  });
  it("menandai NIK yang bukan 16 digit atau tidak sah, dan NIK ganda", () => {
    const d = parseKkText([
      L("No 3508070101100011"),
      L("1 A BUDI 35080701019000 LAKI-LAKI LUMAJANG 01-01-1990 ISLAM SLTA/SEDERAJAT PETANI/PEKEBUN -"),
      L("2 B BUDI 9999999999999999 LAKI-LAKI LUMAJANG 01-01-1990 ISLAM SLTA/SEDERAJAT PETANI/PEKEBUN -"),
      L("3 C BUDI 9999999999999999 LAKI-LAKI LUMAJANG 01-01-1990 ISLAM SLTA/SEDERAJAT PETANI/PEKEBUN -"),
    ]);
    assert.match(d.members[0].flags.nik ?? "", /14 digit/);
    assert.match(d.members[1].flags.nik ?? "", /tidak sah/);
    assert.match(d.members[2].flags.nik ?? "", /sama dengan anggota lain/);
  });
});

describe("masukan buruk", () => {
  it("teks kosong atau tanpa tabel tidak melempar galat dan memberi catatan", () => {
    for (const lines of [[], [L("")], [L("foto buram tidak terbaca")], [L("No 3508070101100011")]]) {
      const d = parseKkText(lines);
      assert.equal(d.members.length, 0);
      assert.ok(d.notes.length >= 1);
    }
  });
  it("jumlah baris tabel kedua berbeda dengan tabel pertama diberi catatan", () => {
    const d = parseKkText(CLEAN.slice(0, -1));
    assert.ok(d.notes.some((n) => n.includes("tabel hubungan")));
  });
});

describe("nomor KK vs awalan NIK anggota", () => {
  it("menandai nomor KK yang awalannya beda dari NIK mayoritas anggota", () => {
    const row = (n: number, nik: string, g: string, d: string) => L(`${n} NAMA ${["SATU","DUA"][n - 1]} ${nik} ${g} LUMAJANG ${d} ISLAM SLTA/SEDERAJAT PETANI/PEKEBUN -`);
    const d = parseKkText([L("No 2508070101100011"), row(1, "3508070101900001", "LAKI-LAKI", "01-01-1990"), row(2, "3508074101920002", "PEREMPUAN", "01-01-1992")]);
    assert.match(d.headerFlags.kk ?? "", /Awalan nomor KK/);
    const ok = parseKkText([L("No 3508070101100011"), row(1, "3508070101900001", "LAKI-LAKI", "01-01-1990"), row(2, "3508074101920002", "PEREMPUAN", "01-01-1992")]);
    assert.equal(ok.headerFlags.kk, undefined);
  });
});

describe("nama dan pencocokan tabel", () => {
  const row = (n: string, name: string, nik: string, g: string, d: string) => L(`${n} ${name} ${nik} ${g} DENPASAR ${d} HINDU SLTA/SEDERAJAT PETANI/PEKEBUN -`);
  it("membuang serpihan satu huruf di depan nama tetapi mempertahankan awalan Bali", () => {
    const d = parseKkText([L("No 5171010101100011"), row("1", "A BUDI SANTOSO", "5171010101900001", "LAKI-LAKI", "01-01-1990"), row("2", "I WAYAN SUKA", "5171010101910002", "LAKI-LAKI", "01-01-1991")]);
    assert.equal(d.members[0].name, "BUDI SANTOSO");
    assert.equal(d.members[1].name, "I WAYAN SUKA");
  });
  it("tidak memasangkan tabel hubungan menurut urutan bila jumlah baris berbeda dan tanpa nomor urut", () => {
    const d = parseKkText([
      L("No 5171010101100011"),
      row("", "BUDI SANTOSO", "5171010101900001", "LAKI-LAKI", "01-01-1990"),
      row("", "SITI AMINAH", "5171014101920002", "PEREMPUAN", "01-01-1992"),
      L("KAWIN TERCATAT 10-05-2012 ISTRI WNI - - HARTONO  SRI"),
    ]);
    assert.ok(d.members.every((m) => m.familyRole === "" && m.flags.familyRole));
  });
});
