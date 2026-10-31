import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { announcementWarnings, validateAnnouncementProposal, CONTENT_MAX } from "../lib/ai/laras-announcement.ts";
import { signAction, verifyAction, type AnnouncementPublishPayload } from "../lib/ai/laras-actions.ts";
import { executeLarasTool, larasToolSpecs } from "../lib/ai/laras-tools.ts";
import { roleCan } from "../lib/permissions/matrix.ts";

const SECRET = "x".repeat(40);
const NOW = 1_800_000_000;
const ap = (p: Partial<AnnouncementPublishPayload> = {}): AnnouncementPublishPayload => ({
  v: 1, t: "announcement_publish", u: 7, vi: 3, ti: "Kerja Bakti", co: "Minggu pagi di balai desa.", ca: "Pengumuman", pn: false, e: NOW + 600, ...p,
});

describe("validateAnnouncementProposal (selaras jalur staf mobile)", () => {
  it("usulan wajar lolos; judul dijadikan satu baris, isi mempertahankan baris baru", () => {
    const r = validateAnnouncementProposal({ title: "  Kerja\nBakti  ", content: "Baris 1\n\nBaris 2", category: "Event", pinned: true });
    assert.deepEqual(r, { ok: true, title: "Kerja Bakti", content: "Baris 1\n\nBaris 2", category: "Event", pinned: true, redacted: 0, warnings: [] });
  });
  it("kategori di luar daftar baku, judul/isi terlalu pendek atau panjang ditolak", () => {
    assert.equal(validateAnnouncementProposal({ title: "Judul", content: "Isi", category: "UMUM" }).ok, false);
    assert.equal(validateAnnouncementProposal({ title: "ab", content: "Isi pengumuman", category: "Berita" }).ok, false);
    assert.equal(validateAnnouncementProposal({ title: "Judul", content: "x", category: "Berita" }).ok, false);
    assert.equal(validateAnnouncementProposal({ title: "x".repeat(201), content: "Isi", category: "Berita" }).ok, false);
    assert.equal(validateAnnouncementProposal({ title: "Judul", content: "x".repeat(CONTENT_MAX + 1), category: "Berita" }).ok, false);
  });
  it("NIK/telepon disamarkan dan dihitung agar kartu bisa memperingatkan", () => {
    const r = validateAnnouncementProposal({ title: "Info", content: "Hubungi 081234567890, NIK 3201011234560001", category: "Pengumuman" });
    assert.ok(r.ok && r.redacted === 2 && !/0812|3201011234560001/.test(r.content));
    assert.match(announcementWarnings({ outbound: r.ok ? r.warnings : [], duplicateTitle: false }).join(), /disamarkan/);
  });
  it("peringatan judul kembar; tanpa masalah tidak ada peringatan", () => {
    assert.match(announcementWarnings({ outbound: [], duplicateTitle: true }).join(), /sudah terbit/);
    assert.deepEqual(announcementWarnings({ outbound: [], duplicateTitle: false }), []);
  });
  it("tautan dan gambar dibuang dari judul/isi dan diberi peringatan (anti-phishing pada pengumuman publik)", () => {
    const r = validateAnnouncementProposal({ title: "Bansos baru", content: "Daftar di https://bansos-desa.example/daftar ![x](https://e.test/a.png)", category: "Pengumuman" });
    assert.ok(r.ok && !/https?:|e\.test|bansos-desa/.test(r.content));
    assert.match(r.ok ? r.warnings.join() : "", /Tautan dihapus/);
  });
  it("pin hanya bila benar-benar true", () => {
    const r = validateAnnouncementProposal({ title: "Judul", content: "Isi", category: "Berita", pinned: "true" as never });
    assert.ok(r.ok && r.pinned === false);
  });
});

describe("token pengumuman", () => {
  it("sah, termasuk isi panjang 4000 karakter dengan karakter non-ASCII", () => {
    const body = "Selamat pagi, warga — ikutilah kegiatan ini. ".repeat(100).slice(0, 4000);
    const v = verifyAction(signAction(ap({ co: body }), SECRET), SECRET, NOW);
    assert.ok(v.ok && v.payload.t === "announcement_publish" && v.payload.co.length === 4000);
  });
  it("isi diubah klien ditolak; kategori palsu, judul pendek, atau flag salah tipe ditolak", () => {
    const tok = signAction(ap(), SECRET);
    const [b, sig] = tok.split(".");
    const j = JSON.parse(Buffer.from(b!, "base64url").toString());
    j.co = "Transfer ke rekening 123";
    const forged = `${Buffer.from(JSON.stringify(j)).toString("base64url")}.${sig}`;
    assert.equal(verifyAction(forged, SECRET, NOW).ok, false);
    assert.equal(verifyAction(signAction(ap({ ca: "UMUM" as never }), SECRET), SECRET, NOW).ok, false);
    assert.equal(verifyAction(signAction(ap({ ti: "ab" }), SECRET), SECRET, NOW).ok, false);
    assert.equal(verifyAction(signAction(ap({ pn: "ya" as never }), SECRET), SECRET, NOW).ok, false);
  });
  it("kedaluwarsa dilaporkan terpisah", () => {
    assert.deepEqual(verifyAction(signAction(ap({ e: NOW - 1 }), SECRET), SECRET, NOW), { ok: false, reason: "expired" });
  });
});

describe("gerbang izin tool pengumuman", () => {
  const ctx = (role: string) => ({ villageId: 1, userId: 5, role, village: {} as never, session: { user: { id: "5", role } } as never });
  it("kepala desa (announcements: read saja) tidak bisa mengusulkan", async () => {
    assert.equal(roleCan("announcements", "create", "village_head"), false);
    const out = await executeLarasTool(ctx("village_head"), "propose_announcement", '{"title":"Judul","content":"Isi","category":"Berita"}');
    assert.equal(out.ok, false);
    assert.match(JSON.stringify(out.result), /izin/);
  });
  it("argumen tak valid ditolak sebelum menyentuh database", async () => {
    const out = await executeLarasTool(ctx("secretary"), "propose_announcement", '{"title":"Judul","content":"Isi","category":"UMUM"}');
    assert.match(JSON.stringify(out.result), /Argumen tidak valid/);
  });
  it("tool terdaftar; kategori terbatas pada daftar baku; tidak ada tool yang menerbitkan langsung", () => {
    const specs = larasToolSpecs();
    assert.ok(specs.some((t) => t.function.name === "announcements_recent"));
    const spec = specs.find((t) => t.function.name === "propose_announcement")!;
    const params = spec.function.parameters as { required: string[]; properties: { category: { enum: string[] } } };
    assert.deepEqual(params.required, ["title", "content", "category"]);
    assert.deepEqual(params.properties.category.enum, ["Pengumuman", "Berita", "Event"]);
    for (const t of specs) assert.doesNotMatch(t.function.name, /^(publish|create|post|send|broadcast)/);
  });
});
