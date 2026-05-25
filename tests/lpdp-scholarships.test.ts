import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLpdpOpenScholarships,
  DEFAULT_LPDP_APPLY_URL,
  LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL,
} from "@/lib/scholarships/lpdp";

test("normalizeLpdpOpenScholarships maps core fields", () => {
  const items = normalizeLpdpOpenScholarships({
    code: 200,
    success: true,
    data: [
      {
        jenjang: "Magister",
        jenis_program: "Beasiswa Reguler",
        instansi_string: "LPDP",
        deskripsi: "Program pendanaan untuk studi lanjut.",
        deadline_pendaftaran: "2026-05-31",
        deadline_pendaftaran_hari: "12",
        jam_tutup: "23:59",
      },
    ],
  });

  assert.equal(items.length, 1);
  const it = items[0]!;
  assert.equal(it.title, "Beasiswa Reguler");
  assert.equal(it.level, "Magister");
  assert.equal(it.provider, "LPDP");
  assert.equal(it.description, "Program pendanaan untuk studi lanjut.");
  assert.equal(it.deadlineDate, "2026-05-31");
  assert.equal(it.deadlineAt, "2026-05-31T23:59:00+07:00");
  assert.equal(it.daysLeft, 12);
  assert.equal(it.status, "open");
  assert.equal(it.category, "");
  assert.equal(it.sourceUrl, LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL);
  assert.equal(it.applyUrl, DEFAULT_LPDP_APPLY_URL);
  assert.ok(it.id.length > 0);
});

test("normalizeLpdpOpenScholarships derives status from daysLeft", () => {
  const items = normalizeLpdpOpenScholarships({
    code: 200,
    success: true,
    data: [
      {
        jenjang: "Doktor",
        jenis_program: "Program A",
        instansi_string: "LPDP",
        deskripsi: "A",
        deadline_pendaftaran: "2026-05-01",
        deadline_pendaftaran_hari: -1,
        jam_tutup: "00:00",
      },
      {
        jenjang: "Doktor",
        jenis_program: "Program B",
        instansi_string: "LPDP",
        deskripsi: "B",
        deadline_pendaftaran: "2026-05-01",
        deadline_pendaftaran_hari: 0,
        jam_tutup: "00:00",
      },
      {
        jenjang: "Doktor",
        jenis_program: "Program C",
        instansi_string: "LPDP",
        deskripsi: "C",
        deadline_pendaftaran: "2026-05-01",
        deadline_pendaftaran_hari: 7,
        jam_tutup: "00:00",
      },
    ],
  });

  assert.equal(items[0]!.status, "closed");
  assert.equal(items[1]!.status, "last_day");
  assert.equal(items[2]!.status, "open");
});

test("normalizeLpdpOpenScholarships flattens category buckets (API 2026 shape)", () => {
  const detailUrl =
    "https://beasiswalpdp-terintegrasi.kemenkeu.go.id/api/file/cms/x.pdf";
  const applyUrl = "https://beasiswalpdp-terintegrasi.kemenkeu.go.id/login";

  const items = normalizeLpdpOpenScholarships({
    code: 200,
    success: true,
    data: [
      {
        id: 1,
        nama_kategori: "Beasiswa",
        deskripsi_kategori: "Cat A",
        data: [
          {
            jenjang: "Magister",
            jenis_program: "Prog A",
            instansi_string: "KEMENAG",
            deskripsi: "Desc A.",
            deadline_pendaftaran: "2026-05-31",
            deadline_pendaftaran_hari: "6",
            jam_tutup: "00:00",
            link_detail: detailUrl,
            link_apply: applyUrl,
          },
        ],
      },
      {
        nama_kategori: "Riset",
        data: [
          {
            jenjang: "Doktor",
            jenis_program: "Prog B",
            instansi_string: "LPDP",
            deskripsi: "Desc B.",
            deadline_pendaftaran: "2026-06-01",
            deadline_pendaftaran_hari: "10",
            jam_tutup: "12:30",
          },
          {
            jenjang: "Magister",
            jenis_program: "Prog C",
            instansi_string: "BRIN",
            deskripsi: "Desc C.",
            deadline_pendaftaran: "2026-06-02",
            deadline_pendaftaran_hari: "11",
            jam_tutup: "00:00",
          },
        ],
      },
      { nama_kategori: "Kebudayaan", data: [] },
    ],
  });

  assert.equal(items.length, 3);
  const a = items.find((x) => x.title === "Prog A")!;
  assert.equal(a.category, "Beasiswa");
  assert.equal(a.sourceUrl, detailUrl);
  assert.equal(a.applyUrl, applyUrl);
  assert.ok(a.requirements.some((r) => r.startsWith("Jenjang:")));

  const b = items.find((x) => x.title === "Prog B")!;
  assert.equal(b.category, "Riset");
  assert.equal(b.sourceUrl, LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL);
  assert.equal(b.applyUrl, DEFAULT_LPDP_APPLY_URL);
  assert.equal(b.deadlineAt, "2026-06-01T12:30:00+07:00");
});

