import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkItemCard } from "../app/(app)/data-warga/kualitas/_components/WorkItemCard.tsx";
import { ConfidenceBadge } from "../app/(app)/data-warga/kualitas/_components/ConfidenceBadge.tsx";
import type { PersonView, SuggestionView, WorkItemView } from "../lib/kependudukan/labels.ts";

const person = (over: Partial<PersonView> = {}): PersonView => ({
  id: 1, name: "Budi Santoso", gender: "Laki-laki", familyRole: "KKKK", kk: "350801010101000", birthDate: "1980-01-01", rt: "01", rw: "02", status: "aktif", ...over,
});
const setKk = (over: Partial<SuggestionView> = {}): SuggestionView =>
  ({
    type: "SET_KK", kk: "3508010101010001", residentId: 1, reason: "Hanya kurang satu angka dari KK ini", confidence: "TINGGI", person: person(),
    targetKk: { last4: "0001", memberCount: 3, headName: "Slamet", memberNames: ["Slamet", "Sri"] }, ...over,
  }) as SuggestionView;
const item = (suggestions: SuggestionView[], over: Partial<WorkItemView> = {}): WorkItemView => ({
  id: "INVALID_KK:1", kind: "INVALID_KK", kk: null, residents: [person()], suggestions, ...over,
});
const render = (i: WorkItemView, disabled = false, busy: ReadonlySet<string> = new Set()) =>
  renderToStaticMarkup(createElement(WorkItemCard, { item: i, busy, disabled, onApply: () => {}, onSkip: () => {} }));

describe("WorkItemCard", () => {
  it("menampilkan judul awam, bantuan, orang, saran, alasan, dan KK tujuan", () => {
    const html = render(item([setKk()]));
    assert.match(html, /Nomor KK tidak lengkap/);
    assert.match(html, /Budi Santoso/);
    assert.match(html, /Masukkan ke KK berakhiran 0001/);
    assert.match(html, /Kepala: Slamet · 3 anggota/);
    assert.match(html, /Alasan: Hanya kurang satu angka/);
    assert.match(html, /Yakin/);
  });

  it("tombol terapkan punya nama yang jelas bagi pembaca layar dan target sentuh >= 44px", () => {
    const html = render(item([setKk()]));
    assert.match(html, /aria-label="Masukkan ke KK berakhiran 0001, untuk Budi Santoso"/);
    assert.match(html, /min-h-11/);
    assert.match(html, /Terapkan saran ini/);
  });

  it("ikon dekoratif disembunyikan dari pembaca layar dan keyakinan tidak hanya lewat warna", () => {
    const badge = renderToStaticMarkup(createElement(ConfidenceBadge, { confidence: "SEDANG" }));
    assert.match(badge, /aria-hidden="true"/);
    assert.match(badge, /Perlu dicek/);
  });

  it("hanya saran pertama berstatus tombol utama; saran lain bergaya sekunder", () => {
    const html = render(item([setKk(), setKk({ kk: "3508010101010002", confidence: "RENDAH", targetKk: { last4: "0002", memberCount: 1, headName: null, memberNames: [] } } as Partial<SuggestionView>)]));
    assert.equal((html.match(/Terapkan saran ini/g) ?? []).length, 2);
    assert.match(html, /Belum ada kepala · 1 anggota/);
    assert.match(html, /Kurang yakin/);
  });

  it("tombol dinonaktifkan saat penerapan massal berjalan, dan menunjukkan 'Menyimpan' saat sedang bekerja", () => {
    assert.match(render(item([setKk()]), true), /disabled=""/);
    const key = "INVALID_KK:1:SET_KK:1";
    const working = render(item([setKk()]), false, new Set([key]));
    assert.match(working, /Menyimpan…/);
    assert.match(working, /disabled=""/);
  });

  it("KEEP_HEAD tidak punya tombol terapkan, hanya penjelasan dan tautan ke Data Warga", () => {
    const keep = { type: "KEEP_HEAD", residentId: 1, reason: "Tertua", confidence: "RENDAH", person: person() } as SuggestionView;
    const html = render(item([keep], { kind: "MULTIPLE_HEADS", kk: "3508010101010001", members: [person(), person({ id: 2, name: "Ani" })] }));
    assert.doesNotMatch(html, /Terapkan saran ini/);
    assert.match(html, /Ini hanya petunjuk/);
    assert.match(html, /href="\/data-warga"/);
    assert.match(html, /KK berakhiran 0001/);
    assert.match(html, /Ani/);
  });

  it("tanpa saran: memberi jalan keluar (Data Warga) dan 'Sembunyikan dulu', bukan jalan buntu", () => {
    const html = render(item([]));
    assert.match(html, /Belum ada saran untuk temuan ini/);
    assert.match(html, /href="\/data-warga"/);
    assert.match(html, /Sembunyikan dulu/);
  });

  it("warga yang meninggal/pindah diberi penanda teks dan peran kosong tampil sebagai '(kosong)'", () => {
    const html = render(item([], { residents: [person({ familyRole: "", status: "meninggal" })] }));
    assert.match(html, /Meninggal/);
    assert.match(html, /\(kosong\)/);
  });

  it("nama panjang boleh membungkus (tidak memotong layar kecil)", () => {
    const html = render(item([], { residents: [person({ name: "Muhammad".repeat(12) })] }));
    assert.match(html, /overflow-wrap:anywhere/);
  });
});
