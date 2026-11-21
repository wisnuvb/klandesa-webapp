import assert from "node:assert/strict";
import test from "node:test";
import {
  ageLabel,
  contactSourceLabel,
  contactWaLink,
  extractVillageFromMessage,
  isSyntheticContactEmail,
  contactRoleLabel,
  normalizeWaNumber,
  oneLine,
  parseContactRole,
} from "@/lib/contacts/lead";
import { buildContactReceivedEmail } from "@/lib/notifications/owner-notify";

test("nomor WhatsApp dinormalkan ke format 62", () => {
  assert.equal(normalizeWaNumber("0812-3456-7890"), "6281234567890");
  assert.equal(normalizeWaNumber("+62 812 3456 7890"), "6281234567890");
  assert.equal(normalizeWaNumber("81234567890"), "6281234567890");
  assert.equal(normalizeWaNumber("123"), null);
  assert.equal(normalizeWaNumber(null), null);
  assert.equal(contactWaLink("08123456789", "Halo & selamat"), "https://wa.me/628123456789?text=Halo%20%26%20selamat");
  assert.equal(contactWaLink("abc"), null);
});

test("email sintetis dari nomor dikenali, email asli tidak", () => {
  assert.equal(isSyntheticContactEmail("kontak+6281234567890@inbound.klandesa.id"), true);
  assert.equal(isSyntheticContactEmail("budi@desa.id"), false);
});

test("label sumber, nama desa, dan umur lead", () => {
  assert.equal(contactSourceLabel("iklan-meta"), "Iklan Meta");
  assert.equal(contactSourceLabel("sumber-baru"), "sumber-baru");
  assert.equal(extractVillageFromMessage("Desa: Sumberharjo, Kab. Sleman\n\nSumber: iklan Meta"), "Sumberharjo, Kab. Sleman");
  assert.equal(extractVillageFromMessage("tanpa desa"), null);
  const now = new Date("2026-11-17T10:00:00Z");
  assert.equal(ageLabel(new Date("2026-11-17T09:59:40Z"), now), "baru saja");
  assert.equal(ageLabel(new Date("2026-11-17T09:30:00Z"), now), "30 menit lalu");
  assert.equal(ageLabel(new Date("2026-11-17T04:00:00Z"), now), "6 jam lalu");
  assert.equal(ageLabel(new Date("2026-11-14T10:00:00Z"), now), "3 hari lalu");
});

test("teks pengunjung di subjek email jadi satu baris dan dipotong", () => {
  assert.equal(oneLine("Budi\r\nBcc: x@y.z"), "Budi Bcc: x@y.z");
  assert.equal(oneLine("a".repeat(100), 10).length, 10);
});

test("email lead: memuat nama, WA, sumber, desa; tanpa email sintetis; teks pengunjung di-escape", () => {
  const m = buildContactReceivedEmail({
    id: "7",
    name: "Budi <script>alert(1)</script>",
    phone: "081234567890",
    email: "kontak+81234567890@inbound.klandesa.id",
    subject: "Iklan Meta - minta dihubungi",
    message: "Desa: Sumberharjo, Kab. Sleman\n\nSumber: iklan Meta (utm_source=facebook)",
    source: "iklan-meta",
    sourcePath: "/desa-digital?utm_source=facebook",
    receivedAt: new Date("2026-11-17T03:00:00Z"),
  });
  assert.match(m.subject, /^\[Klandesa\] Lead baru \(Iklan Meta\): /);
  assert.ok(!m.subject.includes("\n"));
  assert.ok(!m.html.includes("<script>"), "HTML tidak di-escape");
  assert.match(m.text, /https:\/\/wa\.me\/6281234567890/);
  assert.match(m.text, /Sumberharjo, Kab\. Sleman/);
  assert.match(m.text, /Email: -/);
  assert.match(m.text, /\/admin\/kontak/);
});

test("peran kosong tetap diterima (klien lama), peran tak dikenal ditolak", () => {
  assert.deepEqual(parseContactRole(undefined, undefined), { ok: true, role: null, position: null });
  assert.deepEqual(parseContactRole("", "apa saja"), { ok: true, role: null, position: null });
  const bad = parseContactRole("direktur", "");
  assert.equal(bad.ok, false);
});

test("warga diarahkan ke formulir aspirasi, bukan dijadikan lead", () => {
  const r = parseContactRole("warga", "");
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.redirectTo, "/aspirasi/kirim");
    assert.match(r.error, /aspirasi/i);
  }
});

test("perangkat desa wajib berjabatan; jabatan dirapikan dan dipotong", () => {
  assert.equal(parseContactRole("perangkat_desa", "").ok, false);
  assert.equal(parseContactRole("perangkat_desa", " x ").ok, false);
  assert.deepEqual(parseContactRole("PERANGKAT_DESA", "  Sekretaris   Desa "), { ok: true, role: "perangkat_desa", position: "Sekretaris Desa" });
  const long = parseContactRole("perangkat_desa", "K".repeat(300));
  assert.equal(long.ok && long.position?.length, 120);
});

test("peran lainnya boleh tanpa jabatan; label peran terbaca", () => {
  assert.deepEqual(parseContactRole("lainnya", ""), { ok: true, role: "lainnya", position: null });
  assert.equal(contactRoleLabel("perangkat_desa"), "Perangkat desa");
  assert.equal(contactRoleLabel(null), "Tidak diisi");
});

test("email pemilik memuat peran dan jabatan", () => {
  const mail = buildContactReceivedEmail({
    id: "1",
    name: "Budi",
    phone: "081234567890",
    email: "kontak+081234567890@inbound.klandesa.id",
    subject: "Demo",
    message: "Desa: Sumberharjo",
    source: "demo",
    role: "perangkat_desa",
    position: "Sekretaris Desa",
    sourcePath: "/demo",
    receivedAt: new Date("2026-11-21T03:00:00Z"),
  });
  assert.match(mail.text, /Peran: Perangkat desa/);
  assert.match(mail.text, /Jabatan: Sekretaris Desa/);
  assert.match(mail.subject, /Sekretaris Desa/);
});
