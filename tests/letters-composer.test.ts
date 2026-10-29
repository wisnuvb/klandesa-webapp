import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateDocument } from "../lib/letters/document/validate.ts";
import { deriveFormSpec } from "../lib/letters/document/form-spec.ts";
import { sampleLetterValues } from "../lib/letters/values.ts";
import {
  buildPayload,
  buildPreviewValues,
  initialState,
  isoToDate,
  missingForCompletion,
  moneyDigits,
  personOverrides,
  refToTarget,
  stateFromValues,
  type ComposerState,
  type PreviewContext,
} from "../app/(app)/layanan-surat/buat/_utils/composer.ts";
import { FIXTURES } from "./letters-fixtures.ts";

function load(name: keyof typeof FIXTURES) {
  const r = validateDocument(FIXTURES[name]);
  assert.ok(r.ok, r.ok ? "" : JSON.stringify(r.issues));
  return { doc: r.doc, spec: deriveFormSpec(r.doc) };
}

const context: PreviewContext = {
  desa: { nama: "Brambang", kecamatan: "Gondangwetan", kabupaten: "Pasuruan" },
  pejabat: {
    kades: { nama: "Sofwan", nip: "", jabatan: "Kepala Desa" },
    sekdes: { nama: "", nip: "", jabatan: "Sekretaris Desa" },
    camat: { nama: "", nip: "", jabatan: "Camat" },
  },
  logoUrl: "/uploads/logo.png",
};

describe("initialState", () => {
  it("orang kosong, grup mulai dari jumlah baris minimum", () => {
    const { spec } = load("ahliWaris");
    const s = initialState(spec, "2026-10-29");
    assert.deepEqual(Object.keys(s.people).sort(), ["almarhum", "pemohon"]);
    assert.equal(s.people.pemohon.mode, "unset");
    assert.equal(s.groups.ahli_waris.length, 1);
    assert.equal(s.groups.saksi.length, 2);
    assert.equal(s.date, "2026-10-29");
  });
});

describe("buildPreviewValues", () => {
  it("menggabungkan orang, isian, grup, desa, pejabat, dan data surat", () => {
    const { doc, spec } = load("ahliWaris");
    const s = initialState(spec, "2026-10-29");
    s.people.almarhum = { mode: "manual", query: "", db: {}, values: { nama: "Slamet", tanggal_meninggal: "2026-10-10" } };
    s.fields.keperluan = "Pengurusan tanah";
    s.groups.ahli_waris[0].values = { nama: "Budi", nik: "3201" };
    const v = buildPreviewValues({ doc, context, state: s, date: isoToDate(s.date), nomor: "" });
    assert.equal(v.people.almarhum.nama, "Slamet");
    assert.equal(v.people.pemohon, undefined);
    assert.equal(v.fields.keperluan, "Pengurusan tanah");
    assert.deepEqual(v.groups.ahli_waris[0], { nama: "Budi", ttl: "", nik: "3201", pekerjaan: "", alamat: "" });
    assert.equal(v.desa.nama, "Brambang");
    assert.equal(v.pejabat.kades.nama, "Sofwan");
    assert.equal(v.surat.tanggal, "2026-10-29");
    assert.equal(v.surat.nomor, "");
    assert.equal(v.surat.tempat, "Brambang");
    assert.equal(v.logoUrl, "/uploads/logo.png");
  });
  it("orang manual dilengkapi isian turunan (ttl, umur)", () => {
    const { doc, spec } = load("keteranganDomisili");
    const s = initialState(spec, "2026-10-29");
    s.people.pemohon = { mode: "manual", query: "", db: {}, values: { nama: "Ani", tempat_lahir: "Malang", tanggal_lahir: "2000-01-31" } };
    const v = buildPreviewValues({ doc, context, state: s, date: isoToDate(s.date), nomor: "", today: new Date(2026, 9, 29) });
    assert.equal(v.people.pemohon.ttl, "Malang, 31 Januari 2000");
    assert.equal(v.people.pemohon.umur, "26");
  });
  it("tidak melempar pada state kosong", () => {
    const { doc, spec } = load("kematian");
    const v = buildPreviewValues({ doc, context, state: initialState(spec), date: new Date(), nomor: "" });
    assert.deepEqual(v.people, {});
  });
});

describe("buildPayload", () => {
  it("warga dari database: hanya selisih yang dikirim sebagai overrides", () => {
    const { spec } = load("keteranganDomisili");
    const s = initialState(spec, "2026-10-29");
    s.people.pemohon = {
      mode: "resident", residentId: 5, query: "Budi",
      db: { nama: "Budi", pekerjaan: "Petani", alamat_lengkap: "Jl. A" },
      values: { nama: "Budi", pekerjaan: "Wiraswasta", alamat_lengkap: "Jl. A" },
    };
    const p = buildPayload({ spec, state: s, status: "draft", templateId: 3, numberingMode: "auto" });
    assert.deepEqual(p.people.pemohon, { residentId: 5, overrides: { pekerjaan: "Wiraswasta" } });
    assert.equal(p.templateId, 3);
    assert.equal(p.status, "draft");
    assert.equal(p.letterDate, "2026-10-29");
    assert.equal(p.number, undefined);
  });
  it("tanpa selisih: tidak ada overrides; nilai yang dikosongkan ikut terkirim", () => {
    const { spec } = load("keteranganDomisili");
    const s = initialState(spec);
    s.people.pemohon = { mode: "resident", residentId: 5, query: "", db: { nama: "Budi", pekerjaan: "Petani" }, values: { nama: "Budi", pekerjaan: "Petani" } };
    assert.deepEqual(buildPayload({ spec, state: s, status: "draft", numberingMode: "auto" }).people.pemohon, { residentId: 5 });
    s.people.pemohon.values.pekerjaan = "";
    assert.deepEqual(personOverrides(s.people.pemohon), { pekerjaan: "" });
  });
  it("orang manual: hanya isian terisi; orang belum dipilih tidak dikirim", () => {
    const { spec } = load("ahliWaris");
    const s = initialState(spec);
    s.people.almarhum = { mode: "manual", query: "", db: {}, values: { nama: " Slamet ", agama: "", alamat: "Dusun X" } };
    const p = buildPayload({ spec, state: s, status: "draft", numberingMode: "auto" });
    assert.deepEqual(p.people.almarhum, { manual: { nama: "Slamet", alamat: "Dusun X" } });
    assert.equal(p.people.pemohon, undefined);
  });
  it("uang hanya digit; isian lain dirapikan", () => {
    assert.equal(moneyDigits("Rp 1.500.000,-"), "1500000" + "");
    const { spec } = load("jualBeliTanah");
    const s = initialState(spec);
    s.fields.harga = "Rp 250.000.000";
    s.fields.lokasi = "  Dusun Krajan ";
    const p = buildPayload({ spec, state: s, status: "completed", numberingMode: "auto" });
    assert.equal(p.fields.harga, "250000000");
    assert.equal(p.fields.lokasi, "Dusun Krajan");
  });
  it("baris grup kosong dibuang; baris dari warga mengirim residentId + selisih saja", () => {
    const { spec } = load("ahliWaris");
    const s = initialState(spec);
    s.groups.ahli_waris = [
      { key: "a", query: "", db: {}, values: {} },
      { key: "b", query: "Ani", residentId: 9, db: { nama: "Ani", nik: "111" }, values: { nama: "Ani", nik: "111", pekerjaan: "Guru" } },
      { key: "c", query: "", db: {}, values: { nama: "Citra", nik: "" } },
    ];
    const p = buildPayload({ spec, state: s, status: "draft", numberingMode: "auto" });
    assert.deepEqual(p.groups.ahli_waris, [
      { residentId: 9, values: { pekerjaan: "Guru" } },
      { values: { nama: "Citra" } },
    ]);
    assert.deepEqual(p.groups.saksi, []);
  });
  it("nomor hanya dikirim pada mode manual", () => {
    const { spec } = load("keteranganDomisili");
    const s = initialState(spec);
    s.number = " 12/ABC ";
    assert.equal(buildPayload({ spec, state: s, status: "completed", numberingMode: "manual" }).number, "12/ABC");
    assert.equal(buildPayload({ spec, state: s, status: "completed", numberingMode: "auto" }).number, undefined);
  });
});

describe("stateFromValues", () => {
  it("draf dibuka sebagai isian manual yang bisa diubah", () => {
    const { doc, spec } = load("ahliWaris");
    const values = sampleLetterValues(doc);
    values.fields.keperluan = "Keperluan X";
    const s = stateFromValues({ doc, spec, values, letterDate: "2026-10-20T05:00:00.000Z", letterNumber: "DRAFT-AB12CD34" });
    assert.equal(s.date, "2026-10-20");
    assert.equal(s.people.almarhum.mode, "manual");
    assert.equal(s.people.almarhum.residentId, undefined);
    assert.equal(s.fields.keperluan, "Keperluan X");
    assert.equal(s.groups.ahli_waris.length, values.groups.ahli_waris.length);
    assert.equal(s.number, "");
  });
  it("nomor manual yang sungguhan dipertahankan; peran kosong tetap belum dipilih", () => {
    const { doc, spec } = load("kematian");
    const values = sampleLetterValues(doc);
    values.people = { almarhum: { nama: "Slamet" } };
    const s = stateFromValues({ doc, spec, values, letterDate: "2026-10-20", letterNumber: "045/2026" });
    assert.equal(s.number, "045/2026");
    assert.equal(s.people.pemohon.mode, "unset");
    assert.equal(s.people.almarhum.values.nama, "Slamet");
  });
  it("tanggal rusak jatuh ke hari ini", () => {
    const { doc, spec } = load("keteranganDomisili");
    const s = stateFromValues({ doc, spec, values: sampleLetterValues(doc), letterDate: "bukan-tanggal" });
    assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("refToTarget", () => {
  it("memetakan isian di kertas ke id input", () => {
    assert.deepEqual(refToTarget("pemohon.nama"), { kind: "input", id: "person-pemohon-nama", fallbackId: "person-pemohon-cari" });
    assert.deepEqual(refToTarget("isian.luas"), { kind: "input", id: "field-luas" });
    assert.deepEqual(refToTarget("grup.ahli_waris.2.nik"), { kind: "input", id: "group-ahli_waris-2-nik", fallbackId: "group-ahli_waris-2-cari" });
  });
  it("desa, pejabat, surat terisi otomatis; ref ngawur → null", () => {
    for (const r of ["desa.nama", "pejabat.kades.nama", "surat.nomor"]) assert.equal(refToTarget(r)?.kind, "auto", r);
    assert.equal(refToTarget("desa.rahasia"), null);
    assert.equal(refToTarget(""), null);
    assert.equal(refToTarget("grup.x.y.z"), null);
  });
});

describe("missingForCompletion", () => {
  it("peran wajib, isian wajib, minimal baris grup, nomor manual", () => {
    const { spec } = load("ahliWaris");
    const s = initialState(spec);
    const missing = missingForCompletion(spec, s, "manual");
    const ids = missing.map((m) => m.inputId);
    assert.ok(ids.includes("person-pemohon-cari"));
    assert.ok(ids.includes("person-almarhum-cari"));
    assert.ok(ids.includes("field-keperluan"));
    assert.ok(ids.some((i) => i.startsWith("group-ahli_waris-0")));
    assert.ok(ids.some((i) => i.startsWith("group-saksi-0")));
    assert.ok(ids.includes("letter-number"));
  });
  it("lengkap = tidak ada yang kurang", () => {
    const { spec } = load("keteranganDomisili");
    const s = initialState(spec);
    s.people.pemohon = { mode: "manual", query: "", db: {}, values: { nama: "Ani" } };
    s.fields.keperluan = "Melamar kerja";
    assert.deepEqual(missingForCompletion(spec, s, "auto"), []);
  });
  it("baris grup terisi sebagian meminta isian wajib lainnya", () => {
    const { spec } = load("ahliWaris");
    const s: ComposerState = initialState(spec);
    s.groups.ahli_waris[0].values = { nama: "Budi" };
    const m = missingForCompletion(spec, s, "auto").map((x) => x.inputId);
    assert.ok(m.includes("group-ahli_waris-0-nik"));
  });
});

describe("render komponen (SSR smoke + aksesibilitas)", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { AppDialogProvider } = await import("../components/providers/AppDialogProvider.tsx");
  const { CustomFieldInput } = await import("../app/(app)/layanan-surat/buat/_components/CustomFieldInput.tsx");
  const { PeopleSection } = await import("../app/(app)/layanan-surat/buat/_components/PeopleSection.tsx");
  const { GroupsSection } = await import("../app/(app)/layanan-surat/buat/_components/GroupsSection.tsx");
  const { CheckPanel } = await import("../app/(app)/layanan-surat/buat/_components/CheckPanel.tsx");
  const { PaperPane } = await import("../app/(app)/layanan-surat/buat/_components/PaperPane.tsx");

  const noop = () => undefined;
  const html = (el: React.ReactElement) => renderToStaticMarkup(React.createElement(AppDialogProvider, null, el));

  it("tiap jenis isian punya label terhubung & penanda wajib/sensitif", () => {
    const base = { label: "Nominal", required: true, sensitive: true, help: "Bantuan", options: ["A", "B", "C", "D"] };
    for (const type of ["text", "longtext", "number", "money", "date", "choice"] as const) {
      const out = html(React.createElement(CustomFieldInput, { id: "field-x", field: { ...base, type }, value: "", onChange: noop }));
      assert.match(out, /Nominal/, type);
      assert.match(out, /\(wajib diisi\)/, type);
      assert.match(out, /Data sensitif/, type);
      assert.match(out, /id="field-x-help"/, type);
      assert.match(out, /for="field-x"|aria-labelledby="field-x-label"/, type);
    }
  });
  it("pilihan ≤3 berupa radio, >3 berupa select", () => {
    const f = { label: "Hubungan", required: true, type: "choice" as const, sensitive: false };
    const radio = html(React.createElement(CustomFieldInput, { id: "field-h", field: { ...f, options: ["Anak", "Istri"] }, value: "Anak", onChange: noop }));
    assert.match(radio, /role="radiogroup"/);
    const sel = html(React.createElement(CustomFieldInput, { id: "field-h", field: { ...f, options: ["a", "b", "c", "d"] }, value: "", onChange: noop }));
    assert.match(sel, /role="combobox"/);
  });
  it("uang ditampilkan dengan pemisah ribuan", () => {
    const out = html(React.createElement(CustomFieldInput, { id: "field-m", field: { label: "Harga", required: true, type: "money", sensitive: false }, value: "2500000", onChange: noop }));
    assert.match(out, /value="2\.500\.000"/);
  });
  it("PeopleSection: pencarian warga berlabel, sakelar manual, isian hanya setelah dipilih", () => {
    const { spec } = load("ahliWaris");
    const s = initialState(spec);
    const actions = { selectPerson: noop, clearPerson: noop, setPersonQuery: noop, setPersonManual: noop, setPersonValue: noop };
    const out = html(React.createElement(PeopleSection, { spec, state: s, loadingKeys: new Set<string>(), actions }));
    assert.match(out, /for="person-pemohon-cari"/);
    assert.match(out, /Bukan warga desa — isi manual/);
    assert.ok(!/id="person-pemohon-nama"/.test(out));

    s.people.almarhum = { mode: "manual", query: "", db: {}, values: { nama: "Slamet" } };
    const manual = html(React.createElement(PeopleSection, { spec, state: s, loadingKeys: new Set<string>(), actions }));
    assert.match(manual, /id="person-almarhum-nama"/);
    assert.match(manual, /value="Slamet"/);
    assert.match(manual, /Isi data orang ini/);
  });
  it("PeopleSection: data warga ditandai 'bisa diperbaiki'; status memuat diumumkan", () => {
    const { spec } = load("keteranganDomisili");
    const s = initialState(spec);
    s.people.pemohon = { mode: "resident", residentId: 1, query: "Budi", db: { nama: "Budi" }, values: { nama: "Budi", pekerjaan: "Petani" } };
    const actions = { selectPerson: noop, clearPerson: noop, setPersonQuery: noop, setPersonManual: noop, setPersonValue: noop };
    const out = html(React.createElement(PeopleSection, { spec, state: s, loadingKeys: new Set<string>(), actions }));
    assert.match(out, /Terisi dari data warga, bisa diperbaiki/);
    assert.match(out, /id="person-pemohon-pekerjaan"/);
    const loading = html(React.createElement(PeopleSection, { spec, state: s, loadingKeys: new Set(["person-pemohon"]), actions }));
    assert.match(loading, /role="status"/);
  });
  it("GroupsSection: baris, tombol hapus berlabel, batas minimum/maksimum", () => {
    const { spec } = load("ahliWaris");
    const s = initialState(spec);
    const actions = { addRow: noop, removeRow: noop, setRowValue: noop, setRowQuery: noop, selectRowResident: noop, clearRowResident: noop };
    const out = html(React.createElement(GroupsSection, { spec, state: s, loadingKeys: new Set<string>(), actions }));
    assert.match(out, /aria-label="Hapus Ahli waris baris 1"/);
    assert.match(out, /id="group-ahli_waris-0-nik"/);
    assert.match(out, /for="group-ahli_waris-0-cari"/);
    assert.match(out, /Tambah ahli waris/);
    // minimal 1 baris → satu-satunya baris tidak bisa dihapus
    assert.match(out, /aria-label="Hapus Ahli waris baris 1"[^>]*disabled|disabled=""[^>]*aria-label="Hapus Ahli waris baris 1"/);
  });
  it("CheckPanel menampilkan yang kurang sebagai tombol; kosong = pesan lengkap", () => {
    const out = html(React.createElement(CheckPanel, { missing: [{ inputId: "field-x", message: "Keperluan belum diisi" }], warnings: [{ code: "NO_SIGNATURE", message: "Belum ada bagian tanda tangan." }, { code: "UNUSED_FIELD", message: "tersembunyi" }] }));
    assert.match(out, /Keperluan belum diisi/);
    assert.match(out, /Belum ada bagian tanda tangan/);
    assert.ok(!/tersembunyi/.test(out));
    assert.match(html(React.createElement(CheckPanel, { missing: [], warnings: [] })), /Semua isian wajib sudah terisi/);
  });
  it("PaperPane: kontrol zoom bertekan-status & region aria-live, kertas merender isian", () => {
    const { doc } = load("keteranganDomisili");
    const values = sampleLetterValues(doc);
    const out = html(React.createElement(PaperPane, { doc, values, onFieldClick: noop, notice: "Terisi otomatis dari Pengaturan Desa." }));
    assert.match(out, /aria-pressed="true"/);
    assert.match(out, /aria-live="polite"/);
    assert.match(out, /Terisi otomatis dari Pengaturan Desa\./);
    assert.match(out, /data-ref="pemohon\.nama"/);
  });
  it("nilai berbahaya di isian tidak lolos sebagai HTML di pratinjau", () => {
    const { doc, spec } = load("keteranganDomisili");
    const s = initialState(spec);
    s.fields.keperluan = '<img src=x onerror="alert(1)">';
    const v = buildPreviewValues({ doc, context, state: s, date: new Date(), nomor: "" });
    const out = html(React.createElement(PaperPane, { doc, values: v, onFieldClick: noop, notice: "" }));
    assert.ok(!out.includes("<img src=x"));
    assert.match(out, /&lt;img src=x/);
  });
});
