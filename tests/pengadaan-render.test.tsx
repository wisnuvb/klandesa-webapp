import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FindingList } from "../components/app/FindingList.tsx";
import { PengaduanCard } from "../app/(app)/dana-desa/_components/PengaduanCard.tsx";

const h = React.createElement;

describe("kartu pengaduan Dana Desa (Lampiran Permendesa PDT 16/2025, BAB III)", () => {
  it("memuat tiga nomor resmi dan tautan yang dapat dihubungi", () => {
    const html = renderToStaticMarkup(h(PengaduanCard));
    assert.match(html, />1500040</);
    assert.match(html, /href="tel:1500040"/);
    assert.match(html, /href="sms:081288990040"/);
    assert.match(html, /href="https:\/\/wa\.me\/6287788990040"/);
    assert.match(html, /0812 8899 0040/);
    assert.match(html, /0877 8899 0040/);
    assert.match(html, /Permendesa PDT 16\/2025/);
  });
  it("tautan luar aman dan judul bagian terhubung", () => {
    const html = renderToStaticMarkup(h(PengaduanCard));
    assert.match(html, /aria-labelledby="dd-aduan-h"/);
    assert.match(html, /id="dd-aduan-h"/);
    for (const m of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) assert.match(m[0], /rel="noopener noreferrer"/);
  });
});

describe("daftar temuan bersama", () => {
  it("tingkat selalu berteks; ERROR memakai role=alert; kosong tidak merender apa pun", () => {
    const html = renderToStaticMarkup(
      h(FindingList, {
        findings: [
          { level: "ERROR", code: "A", message: "satu" },
          { level: "WARN", code: "B", message: "dua", ref: "Pasal 1" },
          { level: "INFO", code: "C", message: "tiga" },
        ],
      }),
    );
    assert.match(html, /role="alert"/);
    assert.match(html, />Perlu diperbaiki \(1\)</);
    assert.match(html, />Perlu diperiksa \(1\)</);
    assert.match(html, />Catatan \(1\)</);
    assert.match(html, /Dasar: Pasal 1/);
    assert.equal(renderToStaticMarkup(h(FindingList, { findings: [] })), "");
  });
});
