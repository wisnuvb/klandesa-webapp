import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GolonganSelect } from "../components/app/GolonganSelect.tsx";
import { GOLONGAN_MAX_LENGTH, GOLONGAN_OPTIONS, isKnownGolongan } from "../lib/letters/golongan.ts";

describe("daftar pangkat/golongan", () => {
  it("PNS I/a–IV/e lengkap (17 ruang) dan PPPK I–XVII (17), tanpa duplikat", () => {
    const pns = GOLONGAN_OPTIONS.filter((o) => o.group === "PNS");
    const pppk = GOLONGAN_OPTIONS.filter((o) => o.group === "PPPK");
    assert.equal(pns.length, 17);
    assert.equal(pppk.length, 17);
    assert.equal(new Set(GOLONGAN_OPTIONS.map((o) => o.value)).size, GOLONGAN_OPTIONS.length);
    const ruang = pns.map((o) => /\(([IV]+\/[a-e])\)$/.exec(o.value)?.[1]);
    assert.deepEqual(
      [...ruang].sort(),
      ["I/a", "I/b", "I/c", "I/d", "II/a", "II/b", "II/c", "II/d", "III/a", "III/b", "III/c", "III/d", "IV/a", "IV/b", "IV/c", "IV/d", "IV/e"].sort(),
    );
  });

  it("pasangan pangkat–ruang benar untuk yang paling sering dipakai di kecamatan dan desa", () => {
    for (const v of [
      "Pembina Tk. I (IV/b)", "Pembina (IV/a)", "Penata Tk. I (III/d)", "Penata (III/c)", "Penata Muda Tk. I (III/b)",
      "Penata Muda (III/a)", "Pengatur Tk. I (II/d)", "Pengatur (II/c)", "Juru (I/c)", "PPPK Golongan IX",
    ]) assert.ok(isKnownGolongan(v), v);
    assert.ok(!isKnownGolongan("Penata Tk1"));
    assert.ok(!isKnownGolongan(""));
  });

  it("nilai muat di batas panjang isian dan golongan bisa dicari tanpa garis miring (iiid)", () => {
    for (const o of GOLONGAN_OPTIONS) {
      assert.ok(o.value.length <= GOLONGAN_MAX_LENGTH, o.value);
      assert.ok(o.keywords.length > 0);
    }
    assert.ok(GOLONGAN_OPTIONS.find((o) => o.value === "Penata Tk. I (III/d)")!.keywords.includes("IIId"));
  });
});

describe("GolonganSelect", () => {
  const html = (props: Record<string, unknown>) =>
    renderToStaticMarkup(createElement(GolonganSelect, { value: "", onChange: () => {}, ...props }));

  it("kosong: menampilkan teks petunjuk, tanpa kolom tulis sendiri", () => {
    const out = html({ placeholder: "Penata (III/c) (dari Pengaturan Desa)" });
    assert.ok(out.includes("Penata (III/c) (dari Pengaturan Desa)"));
    assert.ok(!out.includes("<input"));
  });

  it("nilai baku: tampil sebagai pilihan; tanpa kolom tulis sendiri", () => {
    const out = html({ value: "Penata Tk. I (III/d)" });
    assert.ok(out.includes("Penata Tk. I (III/d)"));
    assert.ok(!out.includes("<input"));
  });

  it("nilai di luar daftar: otomatis mode tulis sendiri dengan isi tetap terlihat", () => {
    const out = html({ value: "Penata Tk1" });
    assert.ok(out.includes("Lainnya (tulis sendiri)"));
    assert.ok(out.includes('value="Penata Tk1"'));
    assert.ok(out.includes(`maxLength="${GOLONGAN_MAX_LENGTH}"`) || out.includes(`maxlength="${GOLONGAN_MAX_LENGTH}"`));
  });
});
