import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AspirationCard, ProgressBadge } from "../components/aspirasi-publik/AspirationCard.tsx";
import { ClaimPanel } from "../components/aspirasi-publik/ClaimPanel.tsx";
import { matchWilayah, normWilayah } from "../components/aspirasi-publik/WilayahPicker.tsx";
import { publicPath, type DashboardData, type VillageAspiration } from "../components/aspirasi-publik/types.ts";
import { canDo } from "../components/admin/aspirasi/types.ts";
import { canModerate, type ModerationAction } from "../lib/aspirasi/moderation.ts";
import { MODERATION_STATUSES } from "../lib/aspirasi/catalog.ts";

const h = React.createElement;

const item: VillageAspiration = {
  code: "abcd234567",
  slug: "sampah-menumpuk",
  category: "sampah",
  title: "Sampah menumpuk di tepi jalan",
  body: "Sudah dua minggu sampah tidak diangkut.",
  locationNote: "Dekat pasar",
  photos: ["https://cdn.example/a.webp"],
  progress: "IN_PROGRESS",
  publishedAt: "2026-11-10T03:00:00.000Z",
  openFlags: 0,
  replies: [
    { id: "1", kind: "PROGRESS", body: "Sedang dijadwalkan pengangkutan.", authorLabel: "Pemerintah Desa Contoh", createdAt: "2026-11-11T03:00:00.000Z", mine: true },
    { id: "2", kind: "RESPONSE", body: "Terima kasih laporannya.", authorLabel: "Pemerintah Desa Contoh", createdAt: "2026-11-10T05:00:00.000Z", mine: false },
  ],
};

const data = (over: Partial<DashboardData> = {}): DashboardData => ({
  can: { read: true, create: true, update: true, delete: true },
  village: { name: "Contoh", district: "Muara Badak", regency: "Kabupaten Kutai Kartanegara", province: "Kalimantan Timur" },
  area: null,
  claim: null,
  total: 0,
  counts: {},
  items: [],
  ...over,
});

describe("Aspirasi Publik (render server)", () => {
  it("lencana status memakai ikon dan teks, bukan warna saja", () => {
    const html = renderToStaticMarkup(h(ProgressBadge, { progress: "RESOLVED" }));
    assert.match(html, /Selesai/);
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
  });

  it("kartu aspirasi: foto beralt, tautan publik, tanggapan, hapus hanya untuk tanggapan milik desa", () => {
    const html = renderToStaticMarkup(h("ul", null, h(AspirationCard, { item, villageName: "Contoh", canReply: true, canDelete: true, onChanged: () => undefined })));
    assert.match(html, /alt="Foto laporan 1 dari 1"/);
    assert.ok(html.includes(`href="${publicPath(item)}"`));
    assert.match(html, /Tanggapi/);
    assert.match(html, /Ajukan keberatan/);
    assert.equal((html.match(/>Hapus</g) ?? []).length, 1, "hanya tanggapan mine yang bisa dihapus");
    assert.match(html, /aria-label="Tanggapan desa"/);
  });

  it("tanpa izin: tombol Tanggapi, Keberatan, dan Hapus disembunyikan; halaman publik tetap ada", () => {
    const html = renderToStaticMarkup(h("ul", null, h(AspirationCard, { item, villageName: "Contoh", canReply: false, canDelete: false, onChanged: () => undefined })));
    assert.doesNotMatch(html, /Tanggapi/);
    assert.doesNotMatch(html, /Ajukan keberatan/);
    assert.doesNotMatch(html, />Hapus</);
    assert.match(html, /Lihat halaman publik/);
  });

  it("panel klaim: formulir dengan label terhubung; status menunggu menyembunyikan formulir", () => {
    const form = renderToStaticMarkup(h(ClaimPanel, { data: data(), prefillSlug: null, onSubmitted: () => undefined }));
    assert.match(form, /Aktifkan halaman aspirasi desa Anda/);
    assert.match(form, /Jabatan Anda di desa/);
    assert.match(form, /Bukti Anda mewakili desa ini/);
    const pending = renderToStaticMarkup(
      h(ClaimPanel, {
        data: data({ claim: { id: 1, status: "PENDING", reviewNote: null, createdAt: "2026-11-20T03:00:00.000Z", area: { slug: "x", name: "Contoh", district: "A", regency: "B" } } }),
        prefillSlug: null,
        onSubmitted: () => undefined,
      }),
    );
    assert.match(pending, /menunggu verifikasi/);
    assert.doesNotMatch(pending, /Ajukan klaim/);
  });

  it("panel klaim tanpa izin create tidak menampilkan formulir", () => {
    const html = renderToStaticMarkup(h(ClaimPanel, { data: data({ can: { read: true, create: false, update: false, delete: false } }), prefillSlug: null, onSubmitted: () => undefined }));
    assert.match(html, /tidak berhak mengajukan klaim/);
    assert.doesNotMatch(html, /Ajukan klaim/);
  });

  it("pencocokan nama wilayah: abaikan kata penanda, tolak yang ambigu", () => {
    assert.equal(normWilayah("Kabupaten Kutai Kartanegara"), "kutai kartanegara");
    const items = [
      { code: "64.01", name: "Kabupaten Paser" },
      { code: "64.02", name: "Kabupaten Kutai Kartanegara" },
      { code: "64.07", name: "Kabupaten Kutai Barat" },
    ];
    assert.equal(matchWilayah(items, "Kutai Kartanegara")?.code, "64.02");
    assert.equal(matchWilayah(items, "Kab. Paser")?.code, "64.01");
    assert.equal(matchWilayah(items, "Kutai"), null, "ambigu: dua kabupaten memuat 'kutai'");
    assert.equal(matchWilayah(items, ""), null);
  });

  it("aturan aksi moderasi di klien sama dengan server", () => {
    assert.equal(canDo("PENDING", "publish"), true);
    assert.equal(canDo("PUBLISHED", "publish"), false);
    assert.equal(canDo("PUBLISHED", "hide"), true);
    assert.equal(canDo("REJECTED", "reopen"), true);
    assert.equal(canDo("REMOVED", "edit"), false);
    assert.equal(canDo("REMOVED", "remove"), false);
  });

  it("salinan aturan di klien identik dengan canModerate server untuk semua pasangan aksi dan status", () => {
    const actions: ModerationAction[] = ["publish", "reject", "hide", "remove", "reopen", "noindex", "index", "edit"];
    for (const a of actions) for (const st of MODERATION_STATUSES) assert.equal(canDo(st, a), canModerate(st, a), `${a} pada ${st}`);
  });
});
