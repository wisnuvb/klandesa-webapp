import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLpdpOpenScholarships,
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
  assert.equal(it.sourceUrl, LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL);
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

