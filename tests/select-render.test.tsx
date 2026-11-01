import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchSelect } from "../components/ui/search-select.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.tsx";

const h = React.createElement;

describe("SearchSelect (pengganti <select> native), render server", () => {
  const options = [
    h("option", { key: "k", value: "" }, "Semua status"),
    h("option", { key: "a", value: "a" }, "Menunggu"),
    h("option", { key: "b", value: "b" }, "Selesai"),
  ];

  it("label pilihan sudah ada di HTML server (tanpa menunggu hidrasi)", () => {
    const html = renderToStaticMarkup(h(SearchSelect, { value: "b" }, options));
    assert.match(html, /role="combobox"/);
    assert.match(html, />Selesai</);
  });

  it("opsi pertama dianggap terpilih bila tanpa value, seperti <select> native", () => {
    const html = renderToStaticMarkup(h(SearchSelect, null, options));
    assert.match(html, />Semua status</);
  });

  it("defaultValue tanpa onChange tetap menampilkan labelnya", () => {
    const html = renderToStaticMarkup(h(SearchSelect, { defaultValue: "a" }, options));
    assert.match(html, />Menunggu</);
  });

  it("name mengirim nilai lewat input tersembunyi (untuk <form> GET/POST)", () => {
    const html = renderToStaticMarkup(h(SearchSelect, { name: "status", value: "a" }, options));
    assert.match(html, /<input type="hidden" name="status" value="a"/);
  });

  it("required memakai input tersembunyi yang bisa divalidasi browser", () => {
    const html = renderToStaticMarkup(h(SearchSelect, { name: "s", value: "", required: true }, options));
    assert.match(html, /<input[^>]*required=""/);
    assert.match(html, /aria-hidden="true"/);
  });

  it("opsi value kosong yang nyata tampil normal, bukan sebagai placeholder", () => {
    const html = renderToStaticMarkup(h(SearchSelect, { value: "" }, options));
    assert.doesNotMatch(html, /data-placeholder/);
  });

  it("tanpa opsi kosong, nilai kosong tampil sebagai placeholder redup", () => {
    const html = renderToStaticMarkup(
      h(SearchSelect, { value: "", placeholder: "Pilih…" }, [h("option", { key: "a", value: "a" }, "A")]),
    );
    assert.match(html, /data-placeholder/);
    assert.match(html, />Pilih…</);
  });

  it("tanpa kelas lebar, lebar mengikuti opsi terpanjang; dengan w-full tidak", () => {
    const auto = renderToStaticMarkup(h(SearchSelect, { className: "h-9 border" }, options));
    assert.match(auto, /invisible[^>]*>Menunggu</);
    const full = renderToStaticMarkup(h(SearchSelect, { className: "h-9 w-full border" }, options));
    assert.doesNotMatch(full, /invisible/);
  });

  it("disabled menonaktifkan tombol trigger (tidak bisa difokus/dibuka)", () => {
    const html = renderToStaticMarkup(h(SearchSelect, { value: "a", disabled: true }, options));
    assert.match(html, /<button[^>]*disabled=""/);
  });

  it("disabled pada <Select> shadcn juga menonaktifkan trigger", () => {
    const html = renderToStaticMarkup(
      h(
        Select,
        { value: "", disabled: true },
        h(SelectTrigger, null, h(SelectValue, { placeholder: "Pilih" })),
        h(SelectContent, null, h(SelectItem, { value: "a" }, "A")),
      ),
    );
    assert.match(html, /<button[^>]*disabled=""/);
  });
});

describe("Select (API shadcn), render server", () => {
  it("menampilkan placeholder saat kosong dan menandai combobox", () => {
    const html = renderToStaticMarkup(
      h(
        Select,
        { value: "" },
        h(SelectTrigger, { id: "x" }, h(SelectValue, { placeholder: "Pilih desa" })),
        h(SelectContent, null, h(SelectItem, { value: "a" }, "Desa A")),
      ),
    );
    assert.match(html, /id="x"/);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, />Pilih desa</);
  });

  it("SelectItem di luar Select melempar galat yang jelas", () => {
    assert.throws(
      () => renderToStaticMarkup(h(SelectItem, { value: "a" }, "A")),
      /harus berada di dalam <Select>/,
    );
  });
});

describe("tidak ada <select> native tersisa", () => {
  const roots = ["app", "components"];
  const skip = new Set(["node_modules", ".next"]);

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (full.endsWith(".tsx")) out.push(full);
    }
    return out;
  };

  it("semua dropdown memakai Select/SearchSelect yang bisa dicari", () => {
    const offenders = roots
      .flatMap((r) => walk(join(process.cwd(), r)))
      // search-select.tsx menyebut tag ini di komentar dokumentasinya.
      .filter((f) => !f.endsWith("components/ui/search-select.tsx"))
      .filter((f) => /<select(?=[\s>])/.test(readFileSync(f, "utf8")))
      .map((f) => f.replace(process.cwd() + "/", ""));
    assert.deepEqual(
      offenders,
      [],
      "Pakai <SearchSelect> dari components/ui/search-select (cukup ganti nama tag) atau <Select> dari components/ui/select.",
    );
  });
});
