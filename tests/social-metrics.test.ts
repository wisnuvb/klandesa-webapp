import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeFeed, type PostRow, type SignalRow } from "../lib/mobile/social-metrics.ts";
import { isHoldout } from "../lib/mobile/social-ranking.ts";

const NOW = Date.UTC(2026, 9, 29, 5, 0, 0);
const H = 3_600_000;
const sig = (accountId: number, postId: number, o: Partial<SignalRow> = {}): SignalRow => ({
  accountType: "citizen", accountId, postId, seenForYou: 0, seenLatest: 0, openForYou: 0, openLatest: 0, shares: 0, hidden: false, ...o,
});
const post = (id: number, authorId: number, o: Partial<PostRow> = {}): PostRow => ({ id, authorType: "citizen", authorId, likes: 0, comments: 0, reports: 0, createdAt: new Date(NOW - 24 * H), ...o });

describe("pengukuran Warga", () => {
  it("tanpa data: semua nol dan tidak membagi dengan nol", () => {
    const m = summarizeFeed({ days: 14, signals: [], posts: [], reactions: new Map(), reports: 0, now: NOW });
    assert.equal(m.readers, 0);
    assert.equal(m.cohorts.forYou.openRate, 0);
    assert.equal(m.fairness.top3AuthorShare, 0);
    assert.deepEqual(m.notes, []);
  });

  it("memisahkan angka per tab", () => {
    const m = summarizeFeed({
      days: 7, now: NOW, reactions: new Map(), reports: 0, posts: [post(1, 1)],
      signals: [sig(1, 1, { seenForYou: 10, openForYou: 5, seenLatest: 10, openLatest: 1 })],
    });
    assert.deepEqual(m.tabs.forYou, { seen: 10, openRate: 0.5 });
    assert.deepEqual(m.tabs.latest, { seen: 10, openRate: 0.1 });
  });

  it("memisahkan kelompok 'Untuk Anda' dari akun pembanding", () => {
    const holdoutId = Array.from({ length: 200 }, (_, i) => i + 1).find((i) => isHoldout("citizen", i))!;
    const normalId = Array.from({ length: 200 }, (_, i) => i + 1).find((i) => !isHoldout("citizen", i))!;
    const m = summarizeFeed({
      days: 7, now: NOW, reports: 0, posts: [post(1, 999)],
      reactions: new Map([[`citizen:${normalId}`, 4], [`citizen:${holdoutId}`, 1]]),
      signals: [sig(normalId, 1, { seenForYou: 8, openForYou: 4, shares: 2 }), sig(holdoutId, 1, { seenLatest: 8, openLatest: 2 })],
    });
    assert.equal(m.cohorts.forYou.readers, 1);
    assert.equal(m.cohorts.holdout.readers, 1);
    assert.equal(m.cohorts.forYou.openRate, 0.5);
    assert.equal(m.cohorts.holdout.openRate, 0.25);
    assert.equal(m.cohorts.forYou.reactionsPerReader, 4);
    assert.equal(m.cohorts.holdout.sharesPerReader, 0);
  });

  it("pemerataan: postingan yang tak pernah dibaca dan dominasi tiga penulis memicu catatan", () => {
    const posts = Array.from({ length: 12 }, (_, i) => post(i + 1, i + 1)); // 12 penulis berbeda
    const signals = [1, 2, 3].flatMap((p) => [sig(50, p, { seenForYou: 30 }), sig(51, p, { seenLatest: 30 })]); // hanya 3 postingan dibaca
    const m = summarizeFeed({ days: 14, now: NOW, reactions: new Map(), reports: 0, posts, signals });
    assert.equal(m.fairness.postsNeverSeen, 0.75);
    assert.equal(m.fairness.top3AuthorShare, 1);
    assert.ok(m.notes.some((n) => n.includes("belum dibaca siapa pun")));
    assert.ok(m.notes.some((n) => n.includes("gelembung")));
  });

  it("postingan yang terlalu baru (< 6 jam) tidak dihitung sebagai 'belum dibaca'", () => {
    const posts = Array.from({ length: 12 }, (_, i) => post(i + 1, i + 1, { createdAt: new Date(NOW - H) }));
    const m = summarizeFeed({ days: 14, now: NOW, reactions: new Map(), reports: 0, posts, signals: [] });
    assert.equal(m.fairness.postsNeverSeen, 0);
  });

  it("rasio laporan di atas 2% diberi catatan", () => {
    const m = summarizeFeed({ days: 14, now: NOW, reactions: new Map(), reports: 5, posts: Array.from({ length: 100 }, (_, i) => post(i + 1, i + 1)), signals: [] });
    assert.equal(m.reportRate, 0.05);
    assert.ok(m.notes.some((n) => n.includes("2%")));
  });

  it("perbandingan kelompok baru dilaporkan bila pembaca cukup; selain itu jujur bahwa belum cukup", () => {
    const few = summarizeFeed({ days: 14, now: NOW, reactions: new Map(), reports: 0, posts: [post(1, 1)], signals: [sig(1, 1, { seenForYou: 3 })] });
    assert.ok(few.notes.some((n) => n.includes("belum cukup")));
  });
});
