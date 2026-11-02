import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveParents, emptyHeader, emptyMember, FAMILY_LIMITS, hasBlockingIssues, inferFromNik, toResidentData, validateFamily,
  type FamilyInput, type FamilyMemberInput,
} from "../lib/kependudukan/family.ts";

const NOW = new Date("2026-11-02T00:00:00Z");
const KK = "3508070101100001";

// NIK sah: DDMMYY pada digit 7-12 (perempuan: DD+40).
const NIK_BUDI = "3508070101900001"; // laki-laki, 1990-01-01
const NIK_SITI = "3508074101920002"; // perempuan, 1992-01-01
const NIK_ANAK = "3508071501150003"; // laki-laki, 2015-01-15

const header = () => ({ ...emptyHeader(), kk: KK, address: "Jl. Mawar 1", rt: "01", rw: "02", hamlet: "Karangsari" });
const budi = (o: Partial<FamilyMemberInput> = {}) => emptyMember({ familyRole: "Kepala Keluarga", name: "Budi", nik: NIK_BUDI, gender: "Laki-laki", birthplace: "Lumajang", birthDate: "1990-01-01", religion: "Islam", maritalStatus: "Menikah", ...o });
const siti = (o: Partial<FamilyMemberInput> = {}) => emptyMember({ familyRole: "Istri", name: "Siti", nik: NIK_SITI, gender: "Perempuan", birthplace: "Lumajang", birthDate: "1992-01-01", religion: "Islam", maritalStatus: "Menikah", ...o });
const anak = (o: Partial<FamilyMemberInput> = {}) => emptyMember({ familyRole: "Anak", name: "Andi", nik: NIK_ANAK, gender: "Laki-laki", birthplace: "Lumajang", birthDate: "2015-01-15", religion: "Islam", maritalStatus: "Belum Menikah", ...o });
const fam = (members: FamilyMemberInput[], h = header()): FamilyInput => ({ header: h, members });

describe("inferFromNik", () => {
  it("laki-laki dan perempuan (DD+40); NIK tak sah → null", () => {
    assert.deepEqual(inferFromNik(NIK_BUDI, NOW), { birthDate: "1990-01-01", gender: "Laki-laki" });
    assert.deepEqual(inferFromNik(NIK_SITI, NOW), { birthDate: "1992-01-01", gender: "Perempuan" });
    assert.equal(inferFromNik("123", NOW), null);
    assert.equal(inferFromNik("3508079999999999", NOW), null);
  });
});

describe("validateFamily", () => {
  it("keluarga lengkap yang benar: tanpa masalah dan tanpa peringatan", () => {
    const r = validateFamily(fam([budi(), siti(), anak()]), { now: NOW });
    assert.equal(hasBlockingIssues(r), false);
    assert.deepEqual(r.warnings, []);
  });

  it("KK, alamat, anggota kosong", () => {
    const r = validateFamily({ header: emptyHeader(), members: [] }, { now: NOW });
    assert.ok(r.header.kk && r.header.address);
    assert.ok(r.general.some((g) => /minimal satu anggota/.test(g)));
    assert.equal(hasBlockingIssues(r), true);
  });

  it("kolom wajib per anggota ditandai pada anggota yang tepat", () => {
    const r = validateFamily(fam([budi(), emptyMember({ familyRole: "Anak" })]), { now: NOW });
    assert.deepEqual(r.members[0], {});
    for (const k of ["name", "nik", "gender", "birthplace", "birthDate", "religion", "maritalStatus"]) assert.ok(r.members[1][k], k);
  });

  it("NIK ganda dalam keluarga ditolak pada anggota kedua", () => {
    const r = validateFamily(fam([budi(), siti({ nik: NIK_BUDI })]), { now: NOW });
    assert.deepEqual(r.members[0], {});
    assert.match(r.members[1].nik, /sama dengan anggota nomor 1/);
  });

  it("KK baru: wajib tepat satu Kepala Keluarga", () => {
    const none = validateFamily(fam([siti(), anak()]), { now: NOW });
    assert.ok(none.general.some((g) => /Kepala Keluarga/.test(g)));
    const two = validateFamily(fam([budi(), budi({ nik: NIK_SITI, name: "Lain" })]), { now: NOW });
    assert.match(two.members[1].familyRole, /hanya punya satu Kepala/);
  });

  it("KK yang sudah punya kepala: anggota baru tidak boleh menjadi kepala lagi", () => {
    const r = validateFamily(fam([budi()]), { now: NOW, existing: { hasHead: true } });
    assert.match(r.members[0].familyRole, /sudah punya Kepala Keluarga/);
    const ok = validateFamily(fam([anak()]), { now: NOW, existing: { hasHead: true } });
    assert.equal(hasBlockingIssues(ok), false);
  });

  it("KK yang ada tanpa kepala: boleh tanpa kepala tetapi diberi peringatan", () => {
    const r = validateFamily(fam([anak()]), { now: NOW, existing: { hasHead: false } });
    assert.equal(hasBlockingIssues(r), false);
    assert.ok(r.warnings.some((w) => w.index === null && /belum punya Kepala/.test(w.message)));
  });

  it("peringatan (tidak memblokir): NIK tak cocok, peran tak cocok jenis kelamin, anak terlalu dekat usianya", () => {
    const r = validateFamily(fam([budi(), siti({ gender: "Laki-laki" }), anak({ birthDate: "2000-05-05" })]), { now: NOW });
    assert.equal(hasBlockingIssues(r), false);
    const msgs = r.warnings.map((w) => w.message).join(" | ");
    assert.match(msgs, /berbeda dengan yang tersirat dari NIK/);
    assert.match(msgs, /Istri' tetapi jenis kelamin laki-laki/);
    assert.match(msgs, /terpaut kurang dari 12 tahun/);
  });

  it("tanggal lahir/datang di masa depan atau tak ada di kalender ditolak", () => {
    const r = validateFamily(fam([budi({ birthDate: "2027-01-01" }), siti({ birthDate: "1992-02-30" })], { ...header(), arrival: { enabled: true, date: "2027-03-01", origin: "", residencyStatus: "TETAP" } }), { now: NOW });
    assert.ok(r.members[0].birthDate && r.members[1].birthDate);
    assert.ok(r.header.arrivalDate);
  });

  it("kejadian: 'datang' butuh data kedatangan keluarga; 'lahir' untuk yang lahir lama diberi peringatan", () => {
    const r = validateFamily(fam([budi({ event: "MOVE_IN" })]), { now: NOW });
    assert.ok(r.members[0].event);
    const r2 = validateFamily(fam([budi({ event: "BIRTH" })]), { now: NOW });
    assert.ok(r2.warnings.some((w) => /lahir lebih dari setahun lalu/.test(w.message)));
    const h = { ...header(), arrival: { enabled: true, date: "2026-10-20", origin: "Surabaya", residencyStatus: "TETAP" as const } };
    assert.equal(hasBlockingIssues(validateFamily(fam([budi({ event: "MOVE_IN" })], h), { now: NOW })), false);
  });

  it("pilihan di luar daftar baku ditolak (agama, status kawin, hubungan KK, KTP-el)", () => {
    const r = validateFamily(fam([budi({ religion: "Lain", maritalStatus: "X", familyRole: "Bos" }), siti({ ktpStatus: "ya", bloodType: "Z" })]), { now: NOW });
    assert.ok(r.members[0].religion && r.members[0].maritalStatus && r.members[0].familyRole);
    assert.ok(r.members[1].ktpStatus && r.members[1].bloodType);
  });

  it("dibatasi jumlah anggota", () => {
    const many = Array.from({ length: FAMILY_LIMITS.maxMembers + 1 }, (_, i) => anak({ nik: String(3508070000000000 + i) }));
    assert.ok(validateFamily(fam([budi(), ...many]), { now: NOW }).general.some((g) => /Maksimal/.test(g)));
  });
});

describe("deriveParents", () => {
  it("anak mengikuti suami/istri atau kepala sesuai jenis kelamin; tidak menimpa isian", () => {
    const { members, filled } = deriveParents([budi(), siti(), anak(), anak({ nik: "3508071501170004", name: "Beni", fatherName: "Pak Lain" })]);
    assert.equal(members[2].fatherName, "Budi");
    assert.equal(members[2].fatherNik, NIK_BUDI);
    assert.equal(members[2].motherName, "Siti");
    assert.equal(members[2].motherNik, NIK_SITI);
    assert.equal(members[3].fatherName, "Pak Lain", "isian tidak ditimpa");
    assert.equal(members[3].fatherNik, "", "tidak mencampur ayah isian dengan NIK ayah turunan");
    assert.equal(members[3].motherName, "Siti");
    assert.deepEqual(filled, [2, 3]);
  });
  it("kepala perempuan tanpa suami: ia menjadi ibu, ayah dibiarkan kosong", () => {
    const { members } = deriveParents([siti({ familyRole: "Kepala Keluarga" }), anak()]);
    assert.equal(members[1].motherName, "Siti");
    assert.equal(members[1].fatherName, "");
  });
  it("selain Anak tidak disentuh dan masukan tidak diubah", () => {
    const input = [budi(), siti()];
    const copy = JSON.stringify(input);
    const { members, filled } = deriveParents(input);
    assert.deepEqual(members, input);
    assert.deepEqual(filled, []);
    assert.equal(JSON.stringify(input), copy);
  });
});

describe("toResidentData", () => {
  it("memetakan header + anggota ke baris warga baku", () => {
    const d = toResidentData(header(), budi({ name: "  Budi   Santoso ", ethnicity: "suku jawa", bloodType: "O", education: "SLTA", occupation: "Petani/Pekebun" }));
    assert.equal(d.name, "Budi Santoso");
    assert.equal(d.kk, KK);
    assert.equal(d.gender, "Laki-laki");
    assert.equal(d.ethnicity, "Jawa");
    assert.equal(d.birthDate.toISOString(), "1990-01-01T00:00:00.000Z");
    assert.deepEqual([d.rt, d.rw, d.hamlet], ["01", "02", "Karangsari"]);
    assert.equal(d.isAlive, true);
    assert.equal(d.arrivalDate, null);
    assert.equal(d.residencyStatus, null);
    assert.equal(d.fatherNik, null);
  });
  it("keluarga datang: tanggal/asal/status hanya pada anggota berkejadian datang", () => {
    const h = { ...header(), arrival: { enabled: true, date: "2026-10-20", origin: " Surabaya ", residencyStatus: "TIDAK_TETAP" as const } };
    const a = toResidentData(h, budi({ event: "MOVE_IN" }));
    const b = toResidentData(h, anak({ event: "NONE" }));
    assert.equal(a.arrivalDate?.toISOString(), "2026-10-20T00:00:00.000Z");
    assert.equal(b.arrivalDate, null);
    assert.equal(a.originAddress, "Surabaya");
    assert.equal(a.residencyStatus, "TIDAK_TETAP");
  });
});
