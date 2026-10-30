import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CurrencyInput } from "../components/ui/currency-input.tsx";
import {
  CURRENCY_MAX_DIGITS,
  caretAfterDigits,
  countDigitsBefore,
  formatDigits,
  toDigits,
} from "../lib/currency-input.ts";

describe("toDigits", () => {
  it("mengambil digit saja dan membuang pemisah/simbol", () => {
    assert.equal(toDigits("89.000.000"), "89000000");
    assert.equal(toDigits("Rp 1.500.000"), "1500000");
    assert.equal(toDigits("abc"), "");
    assert.equal(toDigits(""), "");
  });

  it("membuang pecahan desimal hasil paste, bukan menggabungkannya", () => {
    assert.equal(toDigits("1.500.000,00"), "1500000");
    assert.equal(toDigits("2500,5"), "2500");
  });

  it("merapikan nol di depan tetapi mempertahankan satu nol", () => {
    assert.equal(toDigits("007"), "7");
    assert.equal(toDigits("000"), "0");
    assert.equal(toDigits("0"), "0");
  });

  it("membatasi jumlah digit", () => {
    assert.equal(toDigits("9".repeat(30)).length, CURRENCY_MAX_DIGITS);
  });
});

describe("formatDigits", () => {
  it("memberi titik pemisah ribuan", () => {
    assert.equal(formatDigits(""), "");
    assert.equal(formatDigits("5"), "5");
    assert.equal(formatDigits("999"), "999");
    assert.equal(formatDigits("1000"), "1.000");
    assert.equal(formatDigits("89000000"), "89.000.000");
    assert.equal(formatDigits("1234567890"), "1.234.567.890");
  });
});

describe("posisi kursor", () => {
  it("menghitung digit sebelum kursor, mengabaikan titik", () => {
    assert.equal(countDigitsBefore("1.234.567", 0), 0);
    assert.equal(countDigitsBefore("1.234.567", 2), 1);
    assert.equal(countDigitsBefore("1.234.567", 5), 4);
    assert.equal(countDigitsBefore("1.234.567", 99), 7);
  });

  it("menempatkan kursor tepat setelah digit ke-n pada teks terformat", () => {
    assert.equal(caretAfterDigits("1.234.567", 0), 0);
    assert.equal(caretAfterDigits("1.234.567", 1), 1);
    assert.equal(caretAfterDigits("1.234.567", 2), 3);
    assert.equal(caretAfterDigits("1.234.567", 7), 9);
    assert.equal(caretAfterDigits("1.234.567", 50), 9);
  });

  it("mengetik di tengah: kursor tetap setelah digit yang baru diketik", () => {
    // "1.234" -> sisipkan '9' setelah digit pertama => teks mentah "19.234", kursor 2
    const raw = "19.234";
    const before = countDigitsBefore(raw, 2); // 2
    const formatted = formatDigits(toDigits(raw)); // 19.234
    assert.equal(formatted, "19.234");
    assert.equal(caretAfterDigits(formatted, before), 2);

    // "999" -> sisipkan '1' di depan => "1999" => "1.999", kursor setelah digit ke-1
    const raw2 = "1999";
    const f2 = formatDigits(toDigits(raw2));
    assert.equal(f2, "1.999");
    assert.equal(caretAfterDigits(f2, countDigitsBefore(raw2, 1)), 1);
  });
});

describe("CurrencyInput (render awal)", () => {
  const render = (props: Partial<Parameters<typeof CurrencyInput>[0]> = {}) =>
    renderToStaticMarkup(
      createElement(CurrencyInput, {
        value: "89000000",
        onValueChange: () => {},
        ...props,
      }),
    );

  it("menampilkan nilai mentah dengan pemisah ribuan dan keyboard numerik", () => {
    const html = render();
    assert.match(html, /value="89\.000\.000"/);
    assert.match(html, /inputMode="numeric"/);
    assert.match(html, /type="text"/);
  });

  it("menyembunyikan prefix Rp dari pembaca layar dan bisa dimatikan", () => {
    assert.match(render(), /<span aria-hidden="true"[^>]*>Rp<\/span>/);
    assert.doesNotMatch(render({ prefix: null }), /Rp<\/span>/);
  });

  it("menerima angka, kosong, dan null", () => {
    assert.match(render({ value: 1500000 }), /value="1\.500\.000"/);
    assert.match(render({ value: "" }), /value=""/);
    assert.match(render({ value: null }), /value=""/);
  });
});
