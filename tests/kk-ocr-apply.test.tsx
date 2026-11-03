import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberCard } from "../app/(app)/data-warga/keluarga/tambah/_components/MemberCard.tsx";
import { draftToFamily, memberNotes } from "../lib/kependudukan/kk-ocr/apply.ts";
import { parseKkText } from "../lib/kependudukan/kk-ocr/parse.ts";
import { emptyHeader, emptyMember, validateFamily } from "../lib/kependudukan/family.ts";

const h = React.createElement;
const noop = () => undefined;
const L = (text: string) => ({ text });

const draft = parseKkText([
  L("No. 3508070101100011"),
  L("Alamat : DUSUN KRAJAN"),
  L("RT/RW : 003 / 002"),
  L("1 BUDI SANTOSO 3508070101900001 LAKI-LAKI LUMAJANG 01-01-1990 ISLAM SLTA/SEDERAJAT PETANI/PEKEBUN O"),
  L("2 SITI AMINAH 3508074101920002 PEREMPUAN LUMAJANG 05-05-1991 ISLAM SLTP/SEDERAJAT MENGURUS RUMAH TANGGA -"),
  L("1 KAWIN TERCATAT 10-05-2012 KEPALA KELUARGA WNI - - SUPARDI  SUMINI"),
  L("2 KAWIN TERCATAT 10-05-2012 ISTRI WNI - - HARTONO  SRI WAHYUNI"),
]);

describe("draf OCR → isian wizard", () => {
  it("memetakan header dan anggota ke bentuk wizard dengan kosakata aplikasi", () => {
    const a = draftToFamily(draft, { arrival: false });
    assert.deepEqual(a.header, { kk: "3508070101100011", address: "DUSUN KRAJAN", rt: "03", rw: "02", hamlet: "Krajan" });
    assert.equal(a.members.length, 2);
    assert.deepEqual(
      [a.members[0].familyRole, a.members[0].gender, a.members[0].birthDate, a.members[0].religion, a.members[0].bloodType, a.members[0].nationality, a.members[0].event],
      ["Kepala Keluarga", "Laki-laki", "1990-01-01", "Islam", "O", "WNI", "NONE"],
    );
  });
  it("keluarga datang: semua anggota diberi kejadian MOVE_IN", () => {
    const a = draftToFamily(draft, { arrival: true });
    assert.ok(a.members.every((m) => m.event === "MOVE_IN"));
  });
  it("hasil lolos validasi wizard yang sama; ketidakcocokan dengan NIK tetap tertangkap sebagai peringatan/galat", () => {
    const a = draftToFamily(draft, { arrival: false });
    const issues = validateFamily({ header: { ...emptyHeader(), ...a.header }, members: a.members }, { now: new Date("2026-11-02T00:00:00Z") });
    assert.equal(issues.header.kk, undefined);
    assert.ok(a.notes[1].some((n) => n.startsWith("Tanggal lahir:")), "tanggal lahir Siti (05-05-1991) ≠ NIK (01-01-1992)");
  });
  it("catatan 'periksa' memakai nama kolom yang dikenal operator", () => {
    assert.deepEqual(memberNotes({ ...draft.members[0], flags: { nik: "NIK tidak sah." } }), ["NIK: NIK tidak sah."]);
  });
});

describe("kartu anggota dengan catatan dari foto KK", () => {
  const card = (ocrNotes?: string[]) => renderToStaticMarkup(h(MemberCard, { index: 0, member: emptyMember({ familyRole: "Anak", name: "Andi" }), errors: {}, canRemove: false, arrivalEnabled: false, ocrNotes, onChange: noop, onRemove: noop }));
  it("menampilkan kotak catatan beralaskan teks (bukan hanya warna) bila ada", () => {
    const html = card(["NIK: tidak sah"]);
    assert.match(html, /role="note"/);
    assert.match(html, /Dari foto KK, periksa:/);
    assert.match(html, /NIK: tidak sah/);
  });
  it("tidak menampilkan apa pun tanpa catatan", () => {
    assert.doesNotMatch(card(), /Dari foto KK/);
    assert.doesNotMatch(card([]), /Dari foto KK/);
  });
});
