import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StepKeluarga } from "../app/(app)/data-warga/keluarga/tambah/_components/StepKeluarga.tsx";
import { MemberCard } from "../app/(app)/data-warga/keluarga/tambah/_components/MemberCard.tsx";
import { StepPeriksa } from "../app/(app)/data-warga/keluarga/tambah/_components/StepPeriksa.tsx";
import { coerceFamilyInput, emptyHeader, emptyMember, FAMILY_LIMITS, validateFamily } from "../lib/kependudukan/family.ts";

const h = React.createElement;
const noop = () => undefined;
const NIK = "3508070101900001";

describe("wizard Tambah Keluarga: langkah 1", () => {
  it("label wajib, kolom KK numerik, pilihan jenis pencatatan sebagai radio berlegenda", () => {
    const html = renderToStaticMarkup(h(StepKeluarga, { header: emptyHeader(), errors: {}, existing: null, onChange: noop }));
    assert.match(html, /Nomor Kartu Keluarga/);
    assert.match(html, /inputMode="numeric"/);
    assert.match(html, /maxLength="16"|maxlength="16"/i);
    assert.match(html, /<legend[^>]*>Jenis pencatatan<\/legend>/);
    assert.equal((html.match(/type="radio"/g) ?? []).length, 2);
    assert.match(html, /\(wajib\)/);
    assert.doesNotMatch(html, /Tanggal datang/, "kolom kedatangan tersembunyi sampai dipilih");
  });
  it("galat terhubung ke kolomnya lewat aria-describedby dan aria-invalid", () => {
    const html = renderToStaticMarkup(h(StepKeluarga, { header: emptyHeader(), errors: { kk: "No. KK harus 16 digit angka." }, existing: null, onChange: noop }));
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /aria-describedby="kk-err"/);
    assert.match(html, /id="kk-err"/);
  });
  it("KK yang sudah ada: pemberitahuan status (bukan galat) dengan jumlah anggota", () => {
    const html = renderToStaticMarkup(h(StepKeluarga, { header: { ...emptyHeader(), kk: "3508070101100011" }, errors: {}, existing: { kk: "3508070101100011", headName: "Budi", activeMembers: 3, address: "a", rt: null, rw: null, hamlet: null }, onChange: noop }));
    assert.match(html, /role="status"/);
    assert.match(html, /kepala keluarga Budi/);
    assert.match(html, /3 anggota aktif/);
  });
  it("keluarga datang: tanggal datang, status, dan asal muncul", () => {
    const header = { ...emptyHeader(), arrival: { enabled: true, date: "", origin: "", residencyStatus: "TETAP" as const } };
    const html = renderToStaticMarkup(h(StepKeluarga, { header, errors: { arrivalDate: "Isi tanggal datang." }, existing: null, onChange: noop }));
    assert.match(html, /Tanggal datang/);
    assert.match(html, /Alamat atau daerah asal/);
    assert.match(html, /aria-describedby="arrivalDate-err"/);
  });
});

describe("wizard Tambah Keluarga: kartu anggota", () => {
  const card = (over: Record<string, unknown> = {}) =>
    renderToStaticMarkup(h(MemberCard, { index: 1, member: emptyMember({ familyRole: "Anak", name: "Andi" }), errors: {}, canRemove: true, arrivalEnabled: false, onChange: noop, onRemove: noop, ...over }));

  it("id kolom unik per anggota, tombol hapus punya nama yang jelas, judul memakai nama", () => {
    const html = card();
    assert.match(html, /id="m1-nik"/);
    assert.match(html, /id="m1-name"/);
    assert.match(html, /aria-label="Hapus anggota 2, Andi"/);
    assert.match(html, /Anggota 2/);
  });
  it("anggota tunggal tidak bisa dihapus", () => {
    assert.doesNotMatch(card({ canRemove: false }), /Hapus anggota/);
  });
  it("data tambahan tertutup bila tak ada galat, terbuka otomatis bila ada galat di dalamnya", () => {
    const closed = card();
    assert.match(closed, /aria-expanded="false"/);
    assert.doesNotMatch(closed, /id="m1-extra"/);
    const open = card({ errors: { fatherNik: "NIK orang tua harus 16 digit angka." } });
    assert.match(open, /aria-expanded="true"/);
    assert.match(open, /id="m1-fatherNik"/);
    assert.match(open, /aria-describedby="m1-fatherNik-err"/);
  });
  it("kejadian 'Datang' tampil bila keluarga ditandai datang, dan tidak muncul pada keluarga biasa", () => {
    const withEvent = (event: "NONE" | "MOVE_IN", arrivalEnabled: boolean) => card({ arrivalEnabled, member: emptyMember({ familyRole: "Anak", name: "Andi", event }), errors: { event: "x" } });
    assert.match(withEvent("MOVE_IN", true), /Datang dari luar desa/);
    assert.doesNotMatch(withEvent("NONE", false), /Datang dari luar desa/);
    assert.match(withEvent("NONE", false), /Data awal/);
  });
  it("memuat NIK dengan pola angka dan menampilkan jumlah digit", () => {
    const html = card({ member: emptyMember({ familyRole: "Anak", nik: NIK.slice(0, 10) }) });
    assert.match(html, /10\/16 digit/);
  });
});

describe("wizard Tambah Keluarga: periksa", () => {
  const members = [
    emptyMember({ familyRole: "Kepala Keluarga", name: "Budi", nik: NIK, gender: "Laki-laki", birthDate: "1990-01-01", event: "NONE" }),
    emptyMember({ familyRole: "Anak", name: "Andi", nik: "3508071501150003", gender: "Laki-laki", birthDate: "2015-01-15", event: "BIRTH" }),
  ];
  const issues = (over = {}) => ({ header: {}, members: members.map(() => ({})), general: [], warnings: [], ...over });
  const render = (iss: ReturnType<typeof issues>, acknowledged = false) =>
    renderToStaticMarkup(h(StepPeriksa, { input: { header: { ...emptyHeader(), kk: "3508070101100011", address: "Jl. A" }, members }, issues: iss, existing: null, parents: [{ fatherName: "", fatherNik: "", motherName: "", motherNik: "" }, { fatherName: "Budi", fatherNik: "", motherName: "", motherNik: "" }], acknowledged, onAcknowledge: noop, onFix: noop }));

  it("tidak pernah menampilkan NIK atau KK utuh; tabel punya caption dan header berskop", () => {
    const html = render(issues());
    assert.doesNotMatch(html, new RegExp(NIK));
    assert.doesNotMatch(html, /3508070101100011/);
    assert.match(html, /••••0001/);
    assert.match(html, /<caption class="sr-only">/);
    assert.match(html, /scope="col"/);
    assert.match(html, /scope="row"/);
    assert.match(html, /Ayah: Budi/);
  });
  it("tanpa masalah: pesan siap simpan, tanpa kotak persetujuan", () => {
    const html = render(issues());
    assert.match(html, /Data lengkap dan siap disimpan/);
    assert.doesNotMatch(html, /type="checkbox"/);
  });
  it("peringatan tanpa galat: kotak persetujuan wajib muncul", () => {
    const html = render(issues({ warnings: [{ index: 1, message: "Anak lebih tua dari kepala." }] }));
    assert.match(html, /Mohon dibaca \(1\)/);
    assert.match(html, /type="checkbox"/);
  });
  it("galat: daftar perbaikan dengan tombol Perbaiki, tanpa kotak persetujuan", () => {
    const html = render(issues({ members: [{}, { nik: "NIK ini sudah terdaftar." }], warnings: [{ index: 0, message: "x" }] }));
    assert.match(html, /role="alert"/);
    assert.match(html, /Perbaiki dulu sebelum menyimpan \(1\)/);
    assert.match(html, />Perbaiki</);
    assert.doesNotMatch(html, /type="checkbox"/);
  });
});

describe("coerceFamilyInput", () => {
  it("menolak yang bukan objek/tanpa daftar anggota; memaksa semua kolom menjadi string", () => {
    assert.equal(coerceFamilyInput(null), null);
    assert.equal(coerceFamilyInput([]), null);
    assert.equal(coerceFamilyInput({ header: {}, members: "x" }), null);
    const r = coerceFamilyInput({ header: { kk: 3508070101100011, address: { x: 1 } }, members: [{ name: 5, nik: NIK, event: "HACK", nationality: "" }, null] });
    assert.ok(r);
    assert.equal(r.header.kk, "3508070101100011");
    assert.equal(r.header.address, "");
    assert.equal(r.members[0].name, "5");
    assert.equal(r.members[0].event, "NONE");
    assert.equal(r.members[0].nationality, "WNI");
    assert.equal(r.members[1].name, "");
  });
  it("memotong anggota di batas+1 sehingga validasi tetap bisa melaporkan terlalu banyak", () => {
    const many = Array.from({ length: 500 }, () => ({}));
    const r = coerceFamilyInput({ header: {}, members: many });
    assert.equal(r?.members.length, FAMILY_LIMITS.maxMembers + 1);
    assert.ok(validateFamily(r!).general.some((g) => /Maksimal/.test(g)));
  });
  it("kejadian dan status kependudukan hanya menerima nilai baku", () => {
    const r = coerceFamilyInput({ header: { arrival: { enabled: true, residencyStatus: "APA_SAJA" } }, members: [{ event: "BIRTH" }, { event: "MOVE_IN" }] });
    assert.equal(r?.header.arrival.residencyStatus, "TETAP");
    assert.deepEqual(r?.members.map((m) => m.event), ["BIRTH", "MOVE_IN"]);
  });
});

describe("rute keluarga (statis)", async () => {
  const { readFileSync } = await import("node:fs");
  it("penyimpanan memeriksa langganan, mengaudit tanpa data pribadi, dan memakai izin buat warga", () => {
    const src = readFileSync("app/api/residents/keluarga/route.ts", "utf8");
    assert.match(src, /await requireVillageApiContext\(/);
    assert.match(src, /isVillageSubscriptionActive/);
    assert.match(src, /await auditWeb\(/);
    const stmt = src.match(/await auditWeb\([^;]*;/)?.[0] ?? "";
    assert.match(stmt, /kkLast4/);
    assert.doesNotMatch(stmt, /nik|name|address/i, "catatan audit tanpa NIK, nama, atau alamat");
  });
  it("pemeriksaan tidak pernah mengirim NIK orang tua utuh", () => {
    const src = readFileSync("app/api/residents/keluarga/periksa/route.ts", "utf8");
    assert.match(src, /••••/);
  });
});
