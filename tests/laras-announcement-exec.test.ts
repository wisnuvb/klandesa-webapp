import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.ts";
import { executeAnnouncementPublish } from "../lib/ai/laras-announcement.ts";
import type { AnnouncementPublishPayload } from "../lib/ai/laras-actions.ts";

// Menambal delegasi Prisma di memori agar logika eksekusi teruji tanpa database.
type Calls = { created: unknown[]; audits: unknown[] };
let calls: Calls;
let existing: { id: number } | null;
let usedToday: number;

beforeEach(() => {
  calls = { created: [], audits: [] };
  existing = null;
  usedToday = 0;
  const p = prisma as unknown as Record<string, Record<string, unknown>>;
  p.announcement = {
    findFirst: async () => existing,
    count: async () => usedToday,
    create: async (a: { data: unknown }) => {
      calls.created.push(a.data);
      return { id: 99 };
    },
  };
  p.auditLog = { create: async (a: unknown) => void calls.audits.push(a) };
});

const payload = (p: Partial<AnnouncementPublishPayload> = {}): AnnouncementPublishPayload => ({
  v: 1, t: "announcement_publish", u: 7, vi: 3, ti: "Kerja Bakti", co: "Minggu pagi di balai desa.", ca: "Pengumuman", pn: false, e: 0, ...p,
});
const actor = { userId: 7, ip: "1.2.3.4", userAgent: "test" };

describe("executeAnnouncementPublish", () => {
  it("menerbitkan dengan desa & penulis dari konteks server, lalu mencatat audit tanpa isi", async () => {
    const r = await executeAnnouncementPublish(payload(), actor);
    assert.deepEqual(r, { ok: true, summary: "Pengumuman #99 terbit." });
    assert.deepEqual(calls.created[0], {
      villageId: 3, title: "Kerja Bakti", content: "Minggu pagi di balai desa.", category: "Pengumuman", isPinned: false, createdById: 7,
    });
    const audit = JSON.stringify(calls.audits[0]);
    assert.match(audit, /"via":"laras"/);
    assert.ok(!audit.includes("Minggu pagi"));
  });
  it("idempoten: konfirmasi ganda tidak membuat pengumuman kedua", async () => {
    existing = { id: 41 };
    const r = await executeAnnouncementPublish(payload(), actor);
    assert.deepEqual(r, { ok: true, summary: "Pengumuman #41 sudah terbit sebelumnya." });
    assert.equal(calls.created.length, 0);
  });
  it("kuota harian pengguna ditegakkan saat eksekusi (bukan hanya saat usulan)", async () => {
    usedToday = 10;
    const r = await executeAnnouncementPublish(payload(), actor);
    assert.equal(r.ok, false);
    assert.equal(calls.created.length, 0);
  });
  it("payload yang entah bagaimana tidak valid ditolak dan tidak menulis apa pun", async () => {
    const r = await executeAnnouncementPublish(payload({ ca: "UMUM" as never }), actor);
    assert.deepEqual(r.ok, false);
    assert.equal(calls.created.length, 0);
  });
});
