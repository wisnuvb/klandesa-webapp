import { test } from "node:test";
import assert from "node:assert/strict";
import { manifestHash, reviewManifest, summarizeManifest, validateManifest } from "../lib/village-apps/manifest.ts";

const good = () => ({
  schemaVersion: 1,
  tables: [
    {
      ref: "posyandu",
      name: "Data Posyandu",
      description: "Kunjungan balita",
      linkResident: false,
      fields: [
        { label: "Nama Balita", type: "text", required: true, piiClass: "PERSONAL" },
        { label: "Status Gizi", type: "select", options: ["Baik", "Kurang"], piiClass: "NONE" },
        { label: "Berat", type: "number", options: { min: 0, max: 40, unit: "kg" }, piiClass: "NONE" },
        { label: "Catatan Bidan", type: "longtext", piiClass: "SENSITIVE" },
      ],
    },
  ],
  dashboard: [
    { type: "count", title: "Jumlah kunjungan", table: "posyandu" },
    { type: "recent", title: "Terbaru", table: "posyandu", columns: ["Nama Balita", "Berat"], limit: 5 },
    { type: "breakdown", title: "Per status gizi", table: "posyandu", field: "Status Gizi" },
    { type: "sum", title: "Total berat", table: "posyandu", field: "Berat" },
  ],
});

test("manifes sah diterima dan dinormalkan; hash stabil", () => {
  const r = validateManifest(good());
  assert.ok(r.ok, r.ok ? "" : r.errors.join());
  if (r.ok) {
    assert.equal(r.manifest.tables[0].fields.length, 4);
    assert.equal(manifestHash(r.manifest), manifestHash(r.manifest));
    const again = validateManifest(JSON.parse(JSON.stringify(r.manifest)));
    assert.ok(again.ok && manifestHash(again.manifest) === manifestHash(r.manifest), "bolak-balik tidak mengubah hash");
  }
});

test("kelas data kolom WAJIB eksplisit (tidak ada bawaan 'bukan pribadi')", () => {
  const m = good();
  delete (m.tables[0].fields[0] as { piiClass?: string }).piiClass;
  const r = validateManifest(m);
  assert.equal(r.ok, false);
  assert.match(!r.ok ? r.errors.join(" ") : "", /piiClass/);
  const bad = good();
  (bad.tables[0].fields[0] as { piiClass: string }).piiClass = "PUBLIK";
  assert.equal(validateManifest(bad).ok, false);
});

test("hanya data: isian tak dikenal, kode, URL, dan kunci berbahaya ditolak", () => {
  const cases: Record<string, (m: ReturnType<typeof good>) => void> = {
    "kunci tak dikenal di atas": (m) => ((m as Record<string, unknown>).script = "alert(1)"),
    "kunci tak dikenal di tabel": (m) => ((m.tables[0] as Record<string, unknown>).onLoad = "x()"),
    "kunci tak dikenal di kolom": (m) => ((m.tables[0].fields[0] as Record<string, unknown>).url = "https://jahat.example"),
    "kunci tak dikenal di widget": (m) => ((m.dashboard[0] as Record<string, unknown>).html = "<img onerror=x>"),
    "versi salah": (m) => ((m as Record<string, unknown>).schemaVersion = 2),
    "jenis widget asing": (m) => ((m.dashboard[0] as Record<string, unknown>).type = "iframe"),
  };
  for (const [name, mutate] of Object.entries(cases)) {
    const m = good();
    mutate(m);
    assert.equal(validateManifest(JSON.parse(JSON.stringify(m)) as unknown).ok, false, name);
  }
  // __proto__ lewat JSON.parse menjadi kunci biasa dan harus ditolak
  const viaJson = JSON.parse('{"schemaVersion":1,"__proto__":{"x":1},"tables":[],"dashboard":[]}');
  assert.equal(validateManifest(viaJson).ok, false);
});

test("batas: jumlah tabel, widget, ukuran; ref unik dan berbentuk benar", () => {
  const many = good();
  many.tables = Array.from({ length: 6 }, (_, i) => ({ ...good().tables[0], ref: `t${i}` }));
  assert.equal(validateManifest(many).ok, false);
  const widgets = good();
  widgets.dashboard = Array.from({ length: 9 }, () => ({ type: "count", title: "x", table: "posyandu" })) as never;
  assert.equal(validateManifest(widgets).ok, false);
  const dup = good();
  dup.tables = [good().tables[0], good().tables[0]];
  assert.equal(validateManifest(dup).ok, false);
  for (const ref of ["", "A", "1abc", "a-b", "a".repeat(31)]) {
    const m = good();
    m.tables[0].ref = ref;
    assert.equal(validateManifest(m).ok, false, ref);
  }
  const big = good();
  big.tables[0].description = "x".repeat(70_000);
  assert.equal(validateManifest(big).ok, false);
  assert.equal(validateManifest(null).ok, false);
  assert.equal(validateManifest("teks").ok, false);
  assert.equal(validateManifest([]).ok, false);
});

test("widget harus merujuk tabel dan kolom yang ada dengan jenis yang cocok", () => {
  const t = (mut: (m: ReturnType<typeof good>) => void) => {
    const m = good();
    mut(m);
    return validateManifest(m).ok;
  };
  assert.equal(t((m) => ((m.dashboard[0] as { table: string }).table = "hilang")), false);
  assert.equal(t((m) => ((m.dashboard[1] as { columns: string[] }).columns = ["Tidak Ada"])), false);
  assert.equal(t((m) => ((m.dashboard[1] as { columns: string[] }).columns = ["Nama Balita", "Nama Balita"])), false, "kolom ganda");
  assert.equal(t((m) => ((m.dashboard[1] as { columns: string[] }).columns = ["Nama Balita", "Status Gizi", "Berat", "Catatan Bidan", "Nama Balita"])), false);
  assert.equal(t((m) => ((m.dashboard[2] as { field: string }).field = "Berat")), false, "breakdown butuh pilihan/ya-tidak");
  assert.equal(t((m) => ((m.dashboard[3] as { field: string }).field = "Status Gizi")), false, "sum butuh angka");
  assert.equal(t((m) => ((m.dashboard[1] as { limit: number }).limit = 500)), false);
  assert.equal(t((m) => ((m.dashboard[0] as { title: string }).title = "")), false);
  assert.equal(t((m) => ((m as { dashboard?: unknown }).dashboard = "x")), false);
});

test("heuristik PII: tahan variasi penulisan (Handphone, N I K, Nomor Induk Kependudukan, Ponsel, Domisili, Nama)", () => {
  for (const label of ["Handphone", "N I K", "Nomor Induk Kependudukan", "Ponsel Wali", "Domisili", "Nama Lengkap", "No. HP", "Tempat Tinggal", "E-mail", "KTP"]) {
    const m = good();
    m.tables[0].fields.push({ label, type: "text", piiClass: "NONE" } as never);
    const r = validateManifest(m);
    assert.ok(r.ok, label);
    if (r.ok) assert.ok(reviewManifest(r.manifest).some((w) => w.includes(`"${label}"`)), `${label} harus diperingatkan`);
  }
  for (const label of ["Teknik", "Unik", "Jumlah Dosis", "Tanggal Kunjungan"]) {
    const m = good();
    m.tables[0].fields.push({ label, type: "text", piiClass: "NONE" } as never);
    const r = validateManifest(m);
    assert.ok(r.ok && !reviewManifest(r.manifest).some((w) => w.includes(`"${label}"`)), `${label} tidak boleh salah tuduh`);
  }
});

test("tabel terhubung warga: kolom teks bukan-pribadi diperingatkan", () => {
  const m = good();
  m.tables[0].linkResident = true;
  m.tables[0].fields.push({ label: "Keterangan Tambahan", type: "text", piiClass: "NONE" } as never);
  const r = validateManifest(m);
  assert.ok(r.ok);
  if (r.ok) assert.ok(reviewManifest(r.manifest).some((w) => /Keterangan Tambahan.*identitas/.test(w)));
});

test("peninjauan otomatis menandai kolom yang tampak pribadi tetapi ditandai bukan pribadi", () => {
  const m = good();
  m.tables[0].fields.push({ label: "Nomor HP Ibu", type: "text", piiClass: "NONE" } as never, { label: "Keluhan", type: "longtext", piiClass: "NONE" } as never);
  const r = validateManifest(m);
  assert.ok(r.ok);
  if (r.ok) {
    const w = reviewManifest(r.manifest).join(" | ");
    assert.match(w, /Nomor HP Ibu/);
    assert.match(w, /Keluhan/);
    assert.ok(!/Nama Balita/.test(w), "kolom yang sudah ditandai pribadi tidak diperingatkan");
    const s = summarizeManifest(r.manifest);
    assert.equal(s.tables[0].personal, 1);
    assert.equal(s.tables[0].sensitive, 1);
    assert.equal(s.widgets, 4);
  }
});
