import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { EthnicityField } from "../components/app/data-warga/EthnicityField.tsx";

const h = React.createElement;

function Host({ value }: { value: string }) {
  const { control } = useForm<{ ethnicity: string }>({ defaultValues: { ethnicity: value } });
  return h(EthnicityField<{ ethnicity: string }>, { name: "ethnicity", control });
}

describe("EthnicityField, render server", () => {
  it("suku baku: menampilkan labelnya dan tanpa kolom ketik sendiri", () => {
    const html = renderToStaticMarkup(h(Host, { value: "Jawa" }));
    assert.match(html, />Suku\s*</);
    assert.match(html, />Jawa</);
    assert.doesNotMatch(html, /aria-label="Nama suku"/);
  });

  it("kosong: placeholder dan tanpa kolom ketik sendiri", () => {
    const html = renderToStaticMarkup(h(Host, { value: "" }));
    assert.match(html, /Pilih suku/);
    assert.doesNotMatch(html, /aria-label="Nama suku"/);
  });

  it("suku di luar daftar tersimpan: pilihan 'Lainnya' + kolom berisi nilainya", () => {
    const html = renderToStaticMarkup(h(Host, { value: "Dayak Ngaju" }));
    assert.match(html, /Lainnya \(ketik sendiri\)/);
    assert.match(html, /aria-label="Nama suku"/);
    assert.match(html, /value="Dayak Ngaju"/);
  });
});
