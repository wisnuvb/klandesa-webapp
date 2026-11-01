import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ScoreBar } from "../app/(app)/bencana/_components/ScoreBar.tsx";
import { ErrorBox, Loading, SearchPick, fromLocalInput, toLocalInput } from "../app/(app)/bencana/_components/common.tsx";

const h = React.createElement;

describe("komponen Kebencanaan (render server)", () => {
  it("batang skor menuliskan angka dan label aksesibel; nilai dijepit 0-100", () => {
    const html = renderToStaticMarkup(h(ScoreBar, { label: "Aktivitas Destana selesai", pct: 140, detail: "17 dari 17" }));
    assert.match(html, />100%</);
    assert.match(html, /aria-label="Aktivitas Destana selesai: 100 persen"/);
    assert.match(html, /17 dari 17/);
    assert.match(renderToStaticMarkup(h(ScoreBar, { label: "x", pct: -5 })), />0%</);
  });

  it("kotak pencarian punya label terhubung, petunjuk, dan tidak menampilkan hasil sebelum diketik", () => {
    const html = renderToStaticMarkup(h(SearchPick, { id: "t-kk", label: "Cari KK penerima *", url: (q: string) => `/x?q=${q}`, render: () => null, onPick: () => undefined }));
    assert.match(html, /<label[^>]*for="t-kk"/);
    assert.match(html, /aria-describedby="t-kk-h"/);
    assert.match(html, /Ketik minimal 3 huruf/);
    assert.doesNotMatch(html, /Tidak ditemukan/);
  });

  it("status memuat dan galat memakai role yang tepat", () => {
    assert.match(renderToStaticMarkup(h(Loading, { text: "Memuat" })), /role="status"/);
    assert.match(renderToStaticMarkup(h(ErrorBox, { message: "Gagal" })), /role="alert"/);
  });

  it("konversi waktu setempat <-> ISO bolak-balik; kosong/tidak valid menjadi kosong", () => {
    const iso = "2026-11-01T01:30:00.000Z";
    assert.equal(fromLocalInput(toLocalInput(iso)), iso);
    assert.equal(fromLocalInput(""), "");
    assert.equal(fromLocalInput("bukan tanggal"), "");
  });

  it("layar tidak memakai <select> mentah dan memberi ruang bawah pada halaman (pb-24)", () => {
    const dir = join(process.cwd(), "app/(app)/bencana/_components");
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), "utf8");
      assert.doesNotMatch(src, /<select\b/, f);
    }
    assert.match(readFileSync(join(dir, "BencanaView.tsx"), "utf8"), /pb-24/);
  });
});
