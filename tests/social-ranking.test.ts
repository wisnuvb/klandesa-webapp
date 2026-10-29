import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_WEIGHT, MAX_SIGNAL_EVENTS, RANKING, affinity, authorKey, decayed, encodeRankCursor, featuresOf, forYouAvailable, interestDeltas, interestKeys, isHoldout,
  parseRankCursor, parseSignalEvents, rankForYou, readFeedSetting, reasonOf, scoreOf, signalWeight, type Candidate, type Profile,
} from "../lib/mobile/social-ranking.ts";

const NOW = Date.UTC(2026, 9, 29, 5, 0, 0);
const H = 3_600_000;

let seq = 0;
function post(over: Partial<Candidate> & { ageH?: number } = {}): Candidate {
  const { ageH = 1, ...rest } = over;
  const id = rest.id ?? ++seq;
  return {
    id, authorType: "citizen", authorId: 100 + (id % 50), authorRt: "03", category: "info", tags: [], kind: "teks",
    authorName: `Warga ${id}`, createdAt: new Date(NOW - ageH * H), likes: 0, commenters: 0, reports: 0, seen: 0, opens: 0,
    hidden: false, mine: false, authorIsStaff: false, ...rest,
  };
}
const profileOf = (o: Record<string, number>): Profile => new Map(Object.entries(o));
const ctx = { now: NOW, viewerRt: "01" };
const ids = (r: { id: number }[]) => r.map((x) => x.id);

describe("profil minat", () => {
  it("setiap kejadian mengubah penulis, kategori, jenis, RT, dan #tag", () => {
    const f = featuresOf({ id: 7, authorType: "citizen", authorId: 12, authorRt: "03", category: "kegiatan", content: "Kerja bakti #GotongRoyong #desa", photos: 2, hasLink: false });
    assert.deepEqual(f.tags, ["gotongroyong", "desa"]);
    assert.equal(f.kind, "foto");
    const d = Object.fromEntries(interestDeltas(f, "like").map((x) => [x.key, x.delta]));
    assert.equal(d["author:citizen:12"], 1);
    assert.equal(d["cat:kegiatan"], 1);
    assert.equal(d["tag:gotongroyong"], 0.5);
    assert.equal(d["rt:03"], 0.5);
    assert.equal(d["kind:foto"], 0.5);
  });
  it("'kurangi yang seperti ini' dan laporan menurunkan minat", () => {
    const f = featuresOf({ id: 1, authorType: "citizen", authorId: 5, authorRt: null, category: "usaha", content: "", photos: 0, hasLink: true });
    assert.equal(f.kind, "video");
    assert.equal(interestKeys(f).some((k) => k.key.startsWith("rt:")), false);
    assert.ok(interestDeltas(f, "hide").every((d) => d.delta < 0));
    assert.ok(EVENT_WEIGHT.report < EVENT_WEIGHT.hide && EVENT_WEIGHT.hide < 0);
  });
  it("minat meluruh separuh tiap 14 hari", () => {
    const t = NOW - RANKING.interestHalfLifeDays * 86_400_000;
    assert.ok(Math.abs(decayed(8, t, NOW) - 4) < 1e-9);
    assert.equal(decayed(8, NOW, NOW), 8);
  });
});

describe("skor", () => {
  it("tanpa minat, postingan lebih baru menang (perilaku dasar = urut waktu)", () => {
    const a = scoreOf(post({ ageH: 2 }), new Map(), "01", NOW).score;
    const b = scoreOf(post({ ageH: 20 }), new Map(), "01", NOW).score;
    assert.ok(a > b);
  });
  it("minat pada penulis mengangkat postingan yang agak lebih lama", () => {
    const fav = post({ ageH: 10, authorId: 7 });
    const other = post({ ageH: 4, authorId: 8 });
    const prof = profileOf({ [authorKey("citizen", 7)]: 12 });
    assert.ok(scoreOf(fav, prof, "01", NOW).score > scoreOf(other, prof, "01", NOW).score);
  });
  it("minat negatif menurunkan, tetapi tidak sampai nol (selalu ada kemungkinan tampil)", () => {
    const p = post({ ageH: 2, authorId: 9 });
    const base = scoreOf(p, new Map(), "01", NOW).score;
    const neg = scoreOf(p, profileOf({ [authorKey("citizen", 9)]: -20 }), "01", NOW).score;
    assert.ok(neg < base && neg > 0);
  });
  it("konten yang dilaporkan tidak pernah mendapat dorongan minat maupun keramaian", () => {
    const p = post({ ageH: 2, authorId: 7, likes: 40, commenters: 9, reports: 1 });
    const prof = profileOf({ [authorKey("citizen", 7)]: 50 });
    const clean = post({ ageH: 2, authorId: 7 });
    assert.ok(scoreOf(p, prof, "01", NOW).score <= scoreOf(clean, new Map(), "01", NOW).score + 1e-9);
  });
  it("keramaian dihitung dari penulis komentar berbeda, bukan jumlah komentar", () => {
    const argument = post({ ageH: 3, likes: 0, commenters: 2 });
    const broad = post({ ageH: 3, likes: 0, commenters: 12 });
    assert.ok(scoreOf(broad, new Map(), "01", NOW).score > scoreOf(argument, new Map(), "01", NOW).score);
  });
  it("sudah tampil berkali-kali tapi tak pernah dibuka diturunkan; yang sudah dibuka sedikit diturunkan", () => {
    const fresh = scoreOf(post({ ageH: 3 }), new Map(), "01", NOW).score;
    assert.ok(scoreOf(post({ ageH: 3, seen: 2 }), new Map(), "01", NOW).score < fresh);
    assert.ok(scoreOf(post({ ageH: 3, seen: 3 }), new Map(), "01", NOW).score < scoreOf(post({ ageH: 3, seen: 2 }), new Map(), "01", NOW).score);
    assert.ok(scoreOf(post({ ageH: 3, opens: 1, seen: 5 }), new Map(), "01", NOW).score < fresh);
  });
  it("RT yang sama dengan warga memberi kedekatan", () => {
    const f = post({ authorRt: "01" });
    assert.ok(affinity(f, new Map(), "01") > affinity(post({ authorRt: "07" }), new Map(), "01"));
  });
});

describe("alasan tampil", () => {
  it("hanya memberi alasan bila minatnya cukup kuat, dalam bahasa awam", () => {
    const f = post({ authorId: 7, category: "usaha", authorName: "Bu Siti A." });
    assert.equal(reasonOf(f, new Map(), "01", "Bu Siti A."), null);
    assert.equal(reasonOf(f, profileOf({ [authorKey("citizen", 7)]: 10 }), "01", "Bu Siti A.")?.label, "Anda sering berinteraksi dengan Bu Siti A.");
    assert.equal(reasonOf(f, profileOf({ "cat:usaha": 10 }), "09", "Bu Siti A.")?.label, "Anda sering membuka usaha warga");
    assert.equal(reasonOf(post({ tags: ["panen"] }), profileOf({ "tag:panen": 10 }), "09", "X")?.label, "Anda tertarik dengan #panen");
  });
});

describe("rankForYou: pagar", () => {
  const many = (n: number, mk: (i: number) => Partial<Candidate> & { ageH?: number }) => Array.from({ length: n }, (_, i) => post({ id: 1000 + i, ...mk(i) }));

  it("semua postingan muncul tepat sekali (tidak ada yang hilang atau ganda)", () => {
    const cands = [...many(60, (i) => ({ ageH: 1 + i })), ...many(40, (i) => ({ id: 2000 + i, ageH: 100 + i * 5 }))];
    const r = rankForYou(cands, profileOf({ "cat:info": 5 }), ctx);
    assert.equal(r.length, 100);
    assert.equal(new Set(ids(r)).size, 100);
  });

  it("postingan yang disembunyikan warga tidak tampil", () => {
    const c = [post({ id: 1, hidden: true }), post({ id: 2 })];
    assert.deepEqual(ids(rankForYou(c, new Map(), ctx)), [2]);
  });

  it("tanpa profil minat, urutannya sama dengan urut waktu", () => {
    const c = many(20, (i) => ({ ageH: 1 + i * 2, authorId: 1 + i }));
    assert.deepEqual(ids(rankForYou(c, new Map(), ctx)), ids([...c].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())));
  });

  it("penulis yang sama maksimal dua berturut-turut", () => {
    const mine = many(8, (i) => ({ authorId: 7, ageH: 1 + i * 0.5 }));
    const rest = many(8, (i) => ({ id: 3000 + i, authorId: 20 + i, ageH: 6 + i }));
    const r = rankForYou([...mine, ...rest], profileOf({ [authorKey("citizen", 7)]: 40 }), ctx);
    const byId = new Map([...mine, ...rest].map((c) => [c.id, c.authorId]));
    for (let i = 2; i < 10; i++) {
      assert.ok(!(byId.get(r[i]!.id) === byId.get(r[i - 1]!.id) && byId.get(r[i]!.id) === byId.get(r[i - 2]!.id)), `urutan ${i}`);
    }
  });

  it("satu dari lima slot adalah penjelajahan: postingan baru di luar minat, dengan alasan yang jujur", () => {
    const liked = many(30, (i) => ({ authorId: 10 + (i % 10), category: "kegiatan", ageH: 8 + i * 0.3 }));
    const fresh = many(6, (i) => ({ id: 5000 + i, authorId: 80 + i, category: "usaha", ageH: 0.5 + i * 0.2 }));
    const prof = profileOf({ "cat:kegiatan": 30, ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [authorKey("citizen", 10 + i), 20])) });
    const r = rankForYou([...liked, ...fresh], prof, ctx);
    const freshIds = new Set(fresh.map((c) => c.id));
    for (const slot of [4, 9, 14, 19]) {
      assert.ok(freshIds.has(r[slot]!.id), `slot ${slot} harus postingan baru di luar minat`);
      assert.equal(r[slot]!.why?.kind, "explore");
    }
  });

  it("postingan baru dari penulis asing dijamin muncul di halaman pertama walau profil kuat ke arah lain", () => {
    const liked = many(40, (i) => ({ authorId: 10 + (i % 8), category: "kegiatan", ageH: 10 + i * 0.5 }));
    const newcomer = post({ id: 9001, authorId: 99, category: "usaha", ageH: 0.2 });
    const prof = profileOf({ "cat:kegiatan": 40, ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [authorKey("citizen", 10 + i), 30])) });
    const r = rankForYou([...liked, newcomer], prof, ctx);
    assert.ok(ids(r).slice(0, RANKING.pageSize).includes(9001));
  });

  it("postingan milik sendiri yang baru dibuat disematkan di atas", () => {
    const mine = post({ id: 7777, mine: true, ageH: 0.1, authorId: 1 });
    const others = many(20, (i) => ({ ageH: 0.2 + i * 0.1, authorId: 30 + i, likes: 30, commenters: 8 }));
    assert.equal(rankForYou([...others, mine], new Map(), ctx)[0]!.id, 7777);
    // sesudah beberapa jam tidak lagi disematkan
    const old = post({ id: 7778, mine: true, ageH: RANKING.pinOwnHours + 5, authorId: 1 });
    assert.notEqual(rankForYou([...others, old], new Map(), ctx)[0]!.id, 7778);
  });

  it("aturan variasi penulis juga berlaku di ekor urut waktu (di luar jendela)", () => {
    const head = many(RANKING.minWindowPosts, (i) => ({ ageH: 1 + i, authorId: 10 + (i % 9) }));
    const tail = many(6, (i) => ({ id: 6000 + i, authorId: 77, ageH: 200 + i })).concat(many(3, (i) => ({ id: 6100 + i, authorId: 78, ageH: 300 + i })));
    const r = rankForYou([...head, ...tail], new Map(), ctx);
    const who = new Map([...head, ...tail].map((c) => [c.id, c.authorId]));
    for (let i = 2; i < r.length; i++) assert.ok(!(who.get(r[i]!.id) === who.get(r[i - 1]!.id) && who.get(r[i]!.id) === who.get(r[i - 2]!.id)), `urutan ${i}`);
    assert.equal(r.length, head.length + tail.length);
  });

  it("postingan lebih lama dari jendela menyusul urut waktu setelah yang diperingkat", () => {
    const inW = many(RANKING.minWindowPosts, (i) => ({ ageH: 1 + i }));
    const outW = [post({ id: 8001, ageH: 200 }), post({ id: 8002, ageH: 300 })];
    const r = ids(rankForYou([...outW, ...inW], new Map(), ctx));
    assert.deepEqual(r.slice(-2), [8001, 8002]);
  });

  it("desa sepi: jendela dilebarkan agar postingan beberapa hari lalu tetap ikut diperingkat", () => {
    const quiet = [post({ id: 1, ageH: 100, authorId: 7 }), post({ id: 2, ageH: 5, authorId: 8 })];
    // Tidak cukup 30 postingan dalam 72 jam, jadi yang berumur 100 jam ikut diperingkat. Minat kuat pada penulis 7 mengangkatnya.
    const r = rankForYou(quiet, profileOf({ [authorKey("citizen", 7)]: 100 }), ctx);
    assert.equal(r.length, 2);
    assert.equal(r[0]!.id, 2); // tetap lebih segar menang bila selisih kesegaran besar
  });

  it("deterministik: masukan sama menghasilkan urutan sama", () => {
    const c = many(50, (i) => ({ ageH: 1 + i * 0.7, authorId: 10 + (i % 7), likes: i % 5 }));
    const prof = profileOf({ "cat:info": 6 });
    assert.deepEqual(rankForYou(c, prof, ctx), rankForYou([...c].reverse(), prof, ctx));
  });
});

describe("cursor dan pengaturan", () => {
  it("cursor Untuk Anda bolak-balik; cursor angka biasa bukan cursor peringkat", () => {
    assert.deepEqual(parseRankCursor(encodeRankCursor(NOW, 30)), { asOf: NOW, offset: 30 });
    assert.equal(parseRankCursor("12345"), null);
    assert.equal(parseRankCursor("r1.2"), null);
    assert.equal(parseRankCursor(null), null);
  });
  it("pengaturan feed desa: default otomatis", () => {
    assert.equal(readFeedSetting(undefined), "auto");
    assert.equal(readFeedSetting({ mobile: { social: { feed: "off" } } }), "off");
    assert.equal(readFeedSetting({ mobile: { social: { feed: "on" } } }), "on");
    assert.equal(readFeedSetting({ mobile: { social: { feed: "apa saja" } } }), "auto");
  });
  it("ketersediaan 'Untuk Anda': mati bila dimatikan atau akun pembanding; otomatis menurut keramaian", () => {
    assert.equal(forYouAvailable("off", 999, false), false);
    assert.equal(forYouAvailable("on", 0, false), true);
    assert.equal(forYouAvailable("on", 999, true), false);
    assert.equal(forYouAvailable("auto", RANKING.forYouMinWeeklyPosts - 1, false), false);
    assert.equal(forYouAvailable("auto", RANKING.forYouMinWeeklyPosts, false), true);
  });
  it("akun pembanding: stabil dan sekitar persentase yang ditetapkan", () => {
    assert.equal(isHoldout("citizen", 42), isHoldout("citizen", 42));
    const n = Array.from({ length: 2000 }, (_, i) => isHoldout("citizen", i)).filter(Boolean).length;
    assert.ok(n > 120 && n < 280, `terlalu jauh dari 10%: ${n}/2000`);
    assert.equal(isHoldout("citizen", 5, 0), false);
  });
});

describe("kejadian dari aplikasi", () => {
  const ev = (type: string, extra: Record<string, unknown> = {}) => ({ postId: 5, type, src: "forYou", ms: 0, ...extra });

  it("menolak struktur salah dan paket terlalu besar; membuang kejadian tidak valid", () => {
    assert.equal(parseSignalEvents(null), null);
    assert.equal(parseSignalEvents({ events: "x" }), null);
    assert.equal(parseSignalEvents({ events: Array.from({ length: MAX_SIGNAL_EVENTS + 1 }, () => ev("seen")) }), null);
    const r = parseSignalEvents({ events: [ev("seen", { ms: 4000 }), ev("terbang"), ev("open", { postId: -1 }), ev("open", { src: "x" }), ev("open", { postId: 1.5 }), "bukan objek", ev("share", { postId: 9 })] });
    assert.deepEqual(r?.map((e) => [e.postId, e.type]), [[5, "seen"], [9, "share"]]);
  });
  it("durasi dibatasi supaya klien nakal tidak menggembungkan profil", () => {
    assert.equal(parseSignalEvents({ events: [ev("seen", { ms: 9e12 })] })![0]!.ms, 60_000);
    assert.equal(parseSignalEvents({ events: [ev("seen", { ms: -5 })] })![0]!.ms, 0);
    assert.equal(parseSignalEvents({ events: [ev("seen", { ms: "banyak" })] })![0]!.ms, 0);
  });
  it("bobot minat: sekadar lewat tidak berarti, tertahan lama sedikit, dibuka dan dibagikan lebih kuat", () => {
    const e = (type: string, ms = 0) => ({ postId: 5, type, src: "forYou" as const, ms }) as never;
    assert.equal(signalWeight([e("seen", 800)]), 0);
    assert.equal(signalWeight([e("seen", 5000)]), EVENT_WEIGHT.dwell);
    assert.equal(signalWeight([e("seen", 5000), e("seen", 9000)]), EVENT_WEIGHT.dwell); // tertahan dihitung sekali
    assert.equal(signalWeight([e("open"), e("open"), e("open")]), 2 * EVENT_WEIGHT.open); // buka maksimal dua kali
    assert.ok(signalWeight([e("seen", 5000), e("open"), e("share")]) > signalWeight([e("seen", 5000), e("open")]));
  });
  it("'kurangi' dan 'batal' dalam satu paket: yang terakhir menentukan", () => {
    const e = (type: string) => ({ postId: 5, type, src: "forYou" as const, ms: 0 }) as never;
    assert.equal(signalWeight([e("hide")]), EVENT_WEIGHT.hide);
    assert.equal(signalWeight([e("hide"), e("unhide")]), -EVENT_WEIGHT.hide);
    assert.equal(signalWeight([e("unhide"), e("hide")]), EVENT_WEIGHT.hide);
  });
});
