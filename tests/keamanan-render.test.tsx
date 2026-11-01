import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Check, Empty, Field, Findings, Item, ResidentField, fmtDay, fmtDayShort, where } from "../app/(app)/keamanan/_components/shared.tsx";
import { PRIVACY_NOTE } from "../app/(app)/keamanan/_components/EventsTab.tsx";

const h = React.createElement;

describe("komponen Keamanan (render server)", () => {
  it("temuan memakai ikon + teks sulih untuk pembaca layar (status tidak hanya warna); daftar kosong tidak dirender", () => {
    const html = renderToStaticMarkup(h(Findings, { label: "Temuan", items: [{ level: "WARN", code: "A", message: "Peserta kurang" }, { level: "INFO", code: "B", message: "Belum ada SK" }] }));
    assert.match(html, /aria-label="Temuan"/);
    assert.match(html, /Perlu diperiksa: /);
    assert.match(html, /Catatan: /);
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
    assert.equal(renderToStaticMarkup(h(Findings, { label: "x", items: [] })), "");
  });

  it("kolom formulir: label terhubung, wajib bertanda, petunjuk dan galat terlihat", () => {
    const html = renderToStaticMarkup(h(Field, { id: "f1", label: "Nama regu", value: "", onChange: () => undefined, error: "Wajib diisi", hint: "Contoh: Ronda RT 02", required: true }));
    assert.match(html, /<label[^>]*for="f1"[^>]*>Nama regu \*<\/label>/);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /aria-describedby="f1-h"/);
    assert.match(html, /Wajib diisi/);
    assert.match(html, /class="[^"]*h-11/);
  });

  it("kotak centang punya target sentuh 44px dan label terhubung", () => {
    const html = renderToStaticMarkup(h(Check, { id: "c1", label: "Hadir", checked: true, onChange: () => undefined }));
    assert.match(html, /for="c1"/);
    assert.match(html, /min-h-11/);
  });

  it("pemilih warga: label, petunjuk 3 huruf, tanpa hasil sebelum diketik; setelah dipilih ada tombol Ganti dan tanpa NIK", () => {
    const empty = renderToStaticMarkup(h(ResidentField, { id: "r1", label: "Cari warga", value: null, onChange: () => undefined }));
    assert.match(empty, /<label[^>]*for="r1"/);
    assert.match(empty, /Ketik minimal 3 huruf/);
    assert.doesNotMatch(empty, /Tidak ditemukan/);
    const picked = renderToStaticMarkup(h(ResidentField, { id: "r1", label: "Cari warga", value: { id: 1, name: "Sutarno", rt: "02", rw: "01" }, onChange: () => undefined }));
    assert.match(picked, /Sutarno/);
    assert.match(picked, /RW 01\/RT 02/);
    assert.match(picked, />Ganti</);
  });

  it("tanggal ditampilkan tanpa pergeseran zona; wilayah RW/RT", () => {
    assert.match(fmtDay("2026-11-01"), /1 Nov 2026/);
    assert.match(fmtDayShort("2026-11-01"), /1 Nov/);
    assert.equal(fmtDay(null), "-");
    assert.equal(where({ rw: "01", rt: "02", hamlet: "Krajan" }), "Dusun Krajan, RW 01/RT 02");
    assert.equal(where({ rw: null, rt: null }), "");
  });

  it("keadaan kosong dan butir data dapat membungkus teks panjang", () => {
    assert.match(renderToStaticMarkup(h(Empty, null, "Belum ada")), /border-dashed/);
    assert.match(renderToStaticMarkup(h(Item, { k: "Lokasi", v: "x" })), /break-words/);
  });

  it("catatan privasi menyebut perempuan/anak dan tidak menyimpan identitas korban", () => {
    assert.match(PRIVACY_NOTE, /perempuan atau anak/);
    assert.match(PRIVACY_NOTE, /tidak dicatat/);
    assert.match(PRIVACY_NOTE, /rujukan/);
  });

  it("layar: tanpa <select> mentah, ruang bawah pb-24, dan tab Rujukan tersedia", () => {
    const dir = join(process.cwd(), "app/(app)/keamanan/_components");
    for (const f of readdirSync(dir)) assert.doesNotMatch(readFileSync(join(dir, f), "utf8"), /<select\b/, f);
    const view = readFileSync(join(dir, "KeamananView.tsx"), "utf8");
    assert.match(view, /pb-24/);
    assert.match(view, /value="rujukan"/);
    // dialog/tabel diberi min-w-0 dan pembungkus overflow-x-auto agar tidak mendorong lebar di 390px
    assert.match(readFileSync(join(dir, "Schedule.tsx"), "utf8"), /overflow-x-auto/);
  });
});
