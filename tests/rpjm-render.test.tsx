import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AlignmentTab } from "../app/(app)/rpjm/_components/ContentTab.tsx";
import { ProgramsTab } from "../app/(app)/rpjm/_components/ProgramsTab.tsx";
import { TeamTab } from "../app/(app)/rpjm/_components/TeamTab.tsx";
import type { DetailResponse } from "../app/(app)/rpjm/_components/types.ts";

const h = React.createElement;
const CAN = { read: true, create: true, update: true, delete: true, export: true, approve: true };

const fixture = (over: Partial<DetailResponse["plan"]> = {}): DetailResponse =>
  ({
    plan: {
      id: 7,
      title: "RPJM Desa 2026-2033",
      status: "draft",
      periodStart: 2026,
      periodEnd: 2033,
      termYears: 8,
      termNote: null,
      locked: false,
      untouched: false,
      team: [{ id: 1, residentId: null, name: "Bu Sari", role: "SEKRETARIS", roleLabel: "Sekretaris", position: null, gender: "P" }],
      teamWarnings: ["Tim penyusun baru 1 orang; paling sedikit 7 orang."],
      programs: [
        {
          id: 3, fieldCode: "2", fieldLabel: "Pelaksanaan Pembangunan Desa", year: 2027, title: "Rabat jalan <script>x</script>", description: null, activityCode: "2.1.01", activityName: "Penyelenggaraan PAUD",
          location: "Dusun Krajan", outputVolume: "120.00", outputUnit: "m", benefit: null, budget: "15000000.00", fundSource: "DD", method: "SWAKELOLA", rkpCount: 2, warnings: ["Sasaran/manfaat belum diisi."],
        },
      ],
      summary: { count: 1, complete: 0, totalBudget: "15000000.00", linkedToRkp: 1 },
      matrix: {
        years: [2026, 2027],
        fields: [
          { code: "1", label: "Penyelenggaraan Pemerintahan Desa", count: 0, perYear: ["0.00", "0.00"], total: "0.00" },
          { code: "2", label: "Pelaksanaan Pembangunan Desa", count: 1, perYear: ["0.00", "15000000.00"], total: "15000000.00" },
        ],
        yearTotals: ["0.00", "15000000.00"],
        total: "15000000.00",
        outside: { count: 1, total: "100.00" },
      },
      flags: [
        { code: "TERM_LEGACY", level: "perlu", message: "RPJM Desa berjangka 6 tahun (aturan lama)." },
        { code: "SDGS_NOT_RECORDED", level: "info", message: "SDGs belum dicatat." },
      ],
      events: [{ id: 1, kind: "REOPEN", reason: "KEBIJAKAN", reasonLabel: "Perubahan kebijakan", note: "Perubahan tata ruang", createdAt: "2026-10-01T00:00:00.000Z" }],
      ...over,
    },
    options: { meetings: [], perdes: [] },
    can: CAN,
    village: { name: "Desa Uji" },
    terms: {
      fields: { "1": "Penyelenggaraan Pemerintahan Desa", "2": "Pelaksanaan Pembangunan Desa", "3": "Pembinaan Kemasyarakatan Desa", "4": "Pemberdayaan Masyarakat Desa" },
      paguSources: { DD: "Dana Desa" },
      methods: { SWAKELOLA: "Swakelola Desa" },
      teamRoles: { ANGGOTA: "Anggota" },
      changeReasons: {},
      activityCodes: [],
      rules: { termYears: 8, teamMin: 7 },
    },
  }) as unknown as DetailResponse;

describe("layar tahapan RPJM Desa (render server)", () => {
  it("program dikelompokkan per bidang, ada keadaan kosong per bidang, teks pengguna disanitasi, tautan RKP dan catatan tampil", () => {
    const html = renderToStaticMarkup(h(ProgramsTab, { data: fixture(), editable: true, canDelete: true, reload: () => undefined }));
    assert.match(html, /Bidang 2\. Pelaksanaan Pembangunan Desa/);
    assert.match(html, /Belum ada program pada bidang ini/);
    assert.doesNotMatch(html, /<script>x<\/script>/);
    assert.match(html, /Dijabarkan ke 2 kegiatan RKP Desa/);
    assert.match(html, /1 catatan/);
    assert.match(html, /Tambah program/);
    assert.match(html, /<label[^>]*for="pr-year-filter"/);
  });

  it("tanpa izin ubah: tidak ada tombol tambah/ubah/hapus; tanpa program: keadaan kosong membantu", () => {
    const ro = renderToStaticMarkup(h(ProgramsTab, { data: fixture(), editable: false, canDelete: false, reload: () => undefined }));
    assert.doesNotMatch(ro, /Tambah program/);
    assert.doesNotMatch(ro, />Ubah</);
    assert.doesNotMatch(ro, />Hapus</);
    const empty = renderToStaticMarkup(h(ProgramsTab, { data: fixture({ programs: [], summary: { count: 0, complete: 0, totalBudget: "0.00", linkedToRkp: 0 } }), editable: true, canDelete: true, reload: () => undefined }));
    assert.match(empty, /Belum ada program\. Tambahkan program/);
  });

  it("keselarasan: bendera perlu penyesuaian tampil berteks (bukan hanya warna), matriks berjudul dan berlabel baris, riwayat dibuka kunci", () => {
    const html = renderToStaticMarkup(h(AlignmentTab, { data: fixture() }));
    assert.match(html, /Perlu penyesuaian \(tidak memblokir\)/);
    assert.match(html, /aturan lama/);
    assert.match(html, /<caption class="sr-only">Anggaran indikatif RPJM Desa per bidang per tahun/);
    assert.match(html, /<th scope="row"[^>]*>\s*2\. Pelaksanaan Pembangunan Desa/);
    assert.match(html, /Rp15\.000\.000/);
    assert.match(html, /Dibuka untuk perubahan/);
    assert.match(html, /1 program \(Rp100\) berada di luar periode/);
    const clean = renderToStaticMarkup(h(AlignmentTab, { data: fixture({ flags: [] }) }));
    assert.match(clean, /Tidak ada bendera perlu penyesuaian/);
  });

  it("tim: peringatan komposisi tampil, daftar bertabel dengan keterangan, formulir hanya untuk yang boleh ubah", () => {
    const edit = renderToStaticMarkup(h(TeamTab, { data: fixture(), editable: true, reload: () => undefined }));
    assert.match(edit, /Komposisi tim perlu diperiksa/);
    assert.match(edit, /<caption class="sr-only">Anggota tim penyusun RPJM Desa/);
    assert.match(edit, /aria-label="Hapus Bu Sari dari tim"/);
    assert.match(edit, /Tambah ke tim/);
    const ro = renderToStaticMarkup(h(TeamTab, { data: fixture(), editable: false, reload: () => undefined }));
    assert.doesNotMatch(ro, /Tambah ke tim/);
    assert.doesNotMatch(ro, /Hapus Bu Sari/);
  });
});
