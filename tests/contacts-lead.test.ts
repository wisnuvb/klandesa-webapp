import assert from "node:assert/strict";
import test from "node:test";
import {
  ageLabel,
  contactSourceLabel,
  contactWaLink,
  extractVillageFromMessage,
  isSyntheticContactEmail,
  normalizeWaNumber,
  oneLine,
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
