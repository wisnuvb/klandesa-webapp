import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KkCompositionChips,
  KkFilterBar,
  KkFlagBadges,
  KkSummaryStrip,
  RevealToggle,
  EMPTY_FILTERS,
} from "../components/app/kependudukan/KkListParts.tsx";
import { DetailKKModal } from "../components/modals/DetailKKModal.tsx";
import type { KkSummary } from "../lib/kependudukan/kk-list.ts";

const summary: KkSummary = {
  totalKk: 1520,
  totalJiwa: 5230,
  rataRataAnggota: 3.4,
  perhatian: 12,
  lansiaSendiri: 30,
  tanpaDewasa: 2,
  wilayah: { dusun: ["Karangsari", "Sukamaju"], rw: ["1", "2"], rt: ["1", "2", "3"] },
};
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("ringkasan KK", () => {
  it("menampilkan angka berformat Indonesia dan tiga pintasan filter sebagai tombol bertoggle", () => {
    const out = html(createElement(KkSummaryStrip, { summary, preset: "perhatian", onPreset: () => {} }));
    assert.match(out, /1\.520/);
    assert.match(out, /5\.230/);
    assert.match(out, /Perlu perhatian/);
    assert.equal((out.match(/aria-pressed="/g) ?? []).length, 3);
    assert.equal((out.match(/aria-pressed="true"/g) ?? []).length, 1, "hanya preset aktif yang bertanda tekan");
  });
  it("sebelum data ada, tidak menampilkan angka palsu", () => {
    const out = html(createElement(KkSummaryStrip, { summary: null, preset: "", onPreset: () => {} }));
    assert.doesNotMatch(out, /0<\/p>/);
    assert.doesNotMatch(out, /aria-pressed/);
  });
});

describe("filter KK", () => {
  it("setiap dropdown punya label terlihat yang tertaut ke kontrolnya (opsi baru dipasang saat dibuka)", () => {
    const out = html(createElement(KkFilterBar, { summary, filters: EMPTY_FILTERS, onChange: () => {} }));
    for (const id of ["kk-f-dusun", "kk-f-rw", "kk-f-rt", "kk-f-size", "kk-f-has"]) {
      assert.match(out, new RegExp(`for="${id}"`));
      assert.match(out, new RegExp(`role="combobox"[^>]*id="${id}"`));
    }
    assert.doesNotMatch(out, /<select/, "tidak boleh ada <select> native");
    assert.doesNotMatch(out, /Hapus semua filter/, "tombol hapus hanya muncul bila ada filter aktif");
  });
  it("tombol hapus filter muncul bila ada filter aktif", () => {
    const out = html(createElement(KkFilterBar, { summary, filters: { ...EMPTY_FILTERS, rw: "2" }, onChange: () => {} }));
    assert.match(out, /Hapus semua filter/);
  });
});

describe("lencana dan chip", () => {
  it("lencana selalu bertuliskan teks, bukan hanya warna", () => {
    const out = html(createElement(KkFlagBadges, { flags: ["NO_HEAD", "BAD_NIK"] }));
    assert.match(out, /Tanpa kepala keluarga/);
    assert.match(out, /NIK perlu dicek/);
  });
  it("tanpa masalah: strip, bukan lencana", () => {
    assert.match(html(createElement(KkFlagBadges, { flags: [] })), />-</);
  });
  it("chip komposisi hanya menampilkan yang ada, tanpa nama orang", () => {
    const out = html(createElement(KkCompositionChips, { komposisi: { balita: 2, lansia: 0, hamil: 1, disabilitas: 0, stunting: 0 } }));
    assert.match(out, /Balita/);
    assert.match(out, /Hamil/);
    assert.doesNotMatch(out, /Lansia|Disabilitas|Stunting/);
  });
  it("tombol buka nomor lengkap menandai statusnya", () => {
    assert.match(html(createElement(RevealToggle, { on: false, onToggle: () => {} })), /aria-pressed="false"[\s\S]*Tampilkan nomor lengkap/);
    assert.match(html(createElement(RevealToggle, { on: true, onToggle: () => {} })), /aria-pressed="true"[\s\S]*Sembunyikan nomor lengkap/);
  });
});

describe("modal detail KK", () => {
  const kkData = {
    id: "7",
    ref: 7,
    family_card_number: "•••• •••• •••• 0021",
    revealed: false,
    kepalaKeluarga: "Budi",
    alamat: "Jl. Mawar 1",
    rt: "01",
    rw: "02",
    hamlet: "Karangsari",
    jumlahAnggota: 1,
    anggotaKeluarga: [
      { id: 7, name: "Budi", id_number: "•••• •••• •••• 0011", gender: "M" as const, birthplace: "Lumajang", date_of_birth: "1990-01-01T00:00:00.000Z", religion_id: 1, education_id: 1, job_id: 1, marital_status: "M", status_family: "Kepala Keluarga", is_live: "Y", role: "CITIZEN" },
    ],
  };
  const render = (extra: object) => html(createElement(DetailKKModal, { isOpen: true, onClose: () => {}, kkData, ...extra }));

  it("menampilkan nomor tersamar apa adanya dan tidak menawarkan tombol buka bagi non-admin", () => {
    const out = render({});
    assert.match(out, /•••• •••• •••• 0021/);
    assert.match(out, /•••• •••• •••• 0011/);
    assert.doesNotMatch(out, /Tampilkan NIK dan KK lengkap/);
  });
  it("modal adalah dialog yang benar: role, aria-modal, judul tertaut, tombol tutup bernama", () => {
    const out = render({});
    assert.match(out, /role="dialog"/);
    assert.match(out, /aria-modal="true"/);
    assert.match(out, /aria-labelledby="kk-detail-title"/);
    assert.match(out, /id="kk-detail-title"/);
    assert.match(out, /aria-label="Tutup"/);
  });
  it("anggota yang meninggal atau pindah ditandai dan dijelaskan", () => {
    const base = kkData.anggotaKeluarga[0];
    const data = {
      ...kkData,
      jumlahAnggota: 3,
      anggotaKeluarga: [
        base,
        { ...base, id: 8, name: "Almarhum Kakek", is_live: "N", is_active: false },
        { ...base, id: 9, name: "Sudah Pindah", is_live: "Y", is_active: false },
      ],
    };
    const out = html(createElement(DetailKKModal, { isOpen: true, onClose: () => {}, kkData: data }));
    assert.match(out, /1 anggota aktif; 2 tercatat meninggal atau sudah pindah/);
    assert.match(out, />Meninggal</);
    assert.match(out, />Sudah pindah</);
  });
  it("admin melihat tombol buka; saat terbuka berubah jadi sembunyikan", () => {
    assert.match(render({ canReveal: true, onReveal: () => {} }), /aria-pressed="false"[\s\S]*Tampilkan NIK dan KK lengkap/);
    const open = html(createElement(DetailKKModal, { isOpen: true, onClose: () => {}, kkData: { ...kkData, revealed: true }, canReveal: true, onReveal: () => {} }));
    assert.match(open, /Sembunyikan NIK dan KK/);
  });
});
