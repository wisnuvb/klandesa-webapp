/**
 * Pemeringkatan "Untuk Anda" di Warga (logika murni, tanpa DB). Dokumentasi dan cara menyetel: docs/SOCIAL_FEED_RANKING.md.
 *
 * Prinsip: urutan waktu tetap dasar (kesegaran), minat hanya menggeser urutan. Ada pagar supaya tidak jadi "gelembung":
 * sebagian slot sengaja di luar minat, penulis yang sama tidak beruntun, postingan baru dijamin tampil, dan konten yang
 * dilaporkan tidak pernah didorong. Tab "Terbaru" (urut waktu murni) selalu ada sebagai pembanding.
 */
import { FEED_PAGE_SIZE, extractHashtags } from "./social-logic";

/** Semua angka yang boleh disetel. Ubah di sini, jalankan tes, lalu pantau metrik (lib/mobile/social-metrics.ts). */
export const RANKING = {
  /** Postingan kehilangan separuh nilai kesegarannya tiap sekian jam. */
  freshHalfLifeHours: 36,
  /** Minat warga meluruh separuh tiap sekian hari (selera berubah, jangan terpaku). */
  interestHalfLifeDays: 14,
  /** Hanya postingan dalam jendela ini yang diperingkat; yang lebih lama menyusul urut waktu. */
  windowHours: 72,
  /** Bila postingan dalam jendela kurang dari ini (desa sepi), jendela dilebarkan agar tetap ada bahan. */
  minWindowPosts: 30,
  widenedWindowDays: 14,
  /** Jumlah kandidat terbaru yang dinilai per permintaan. */
  candidateMax: 300,
  pageSize: FEED_PAGE_SIZE,
  /** Seberapa kuat kedekatan/minat mendorong skor (1 + bobot × kedekatan). */
  affinityWeight: 2.0,
  /** Seberapa kuat bukti sosial (suka + komentar dari orang berbeda) mendorong skor. Sengaja kecil. */
  proofWeight: 0.4,
  /** Dorongan kecil untuk akun resmi perangkat desa. */
  staffBoost: 1.15,
  /** Satu dari sekian slot adalah "penjelajahan": postingan baru di luar minat warga. */
  exploreEvery: 5,
  /** Kedekatan di bawah ini dianggap "di luar minat". */
  exploreAffinityMax: 0.15,
  /** Penulis yang sama maksimal sekian berturut-turut. */
  maxConsecutiveAuthor: 2,
  /** Postingan milik sendiri yang baru dibuat disematkan di atas selama sekian jam (agar tidak terasa "hilang"). */
  pinOwnHours: 3,
  /** Nilai minat sebesar ini setara kedekatan 50% (kurva jenuh x / (x + k)). */
  interestSaturation: 4,
  /** Pengali bila sudah tampil tapi tidak pernah dibuka. */
  seenIgnoredTwice: 0.5,
  seenIgnoredThrice: 0.3,
  /** Pengali bila sudah dibuka (sudah dibaca). */
  alreadyOpened: 0.8,
  /** Batas baris profil minat per akun. */
  maxInterestRows: 150,
  /** Desa dengan postingan 7 hari terakhir di bawah ini tetap urut waktu pada mode "otomatis". */
  forYouMinWeeklyPosts: 40,
  /** Persentase akun yang sengaja tidak diberi tab "Untuk Anda", sebagai pembanding pengukuran (Fase 2). */
  holdoutPercent: 10,
} as const;

/** Bobot tiap kejadian terhadap profil minat. Negatif = "kurangi". */
export const EVENT_WEIGHT = {
  like: 1, unlike: -1, comment: 3, save: 4, unsave: -4, share: 3, open: 1.5, dwell: 0.5, hide: -5, report: -10,
} as const;
export type InterestEvent = keyof typeof EVENT_WEIGHT;

/** Tahan sekian milidetik di layar dihitung "tampil" dan "tertarik". */
export const SEEN_MIN_MS = 1000;
export const DWELL_MS = 3000;
export const SEEN_MAX_MS = 60_000;

export const NO_LEARN_KEY = "pref:no-learn";

const HOUR = 3_600_000;
const DAY = 86_400_000;

export type PostKind = "foto" | "video" | "teks";
export type PostFeatures = {
  id: number; authorType: string; authorId: number; authorRt: string | null; category: string; tags: string[]; kind: PostKind;
};

export function featuresOf(p: {
  id: number | bigint; authorType: string; authorId: number; authorRt: string | null; category: string; content: string;
  photos: number; hasLink: boolean;
}): PostFeatures {
  return {
    id: Number(p.id), authorType: p.authorType, authorId: p.authorId, authorRt: p.authorRt, category: p.category,
    tags: extractHashtags(p.content, 3), kind: p.photos > 0 ? "foto" : p.hasLink ? "video" : "teks",
  };
}

export const authorKey = (type: string, id: number) => `author:${type}:${id}`;

/** Kunci minat sebuah postingan beserta porsi bobotnya. Penulis dan kategori paling penting. */
export function interestKeys(f: PostFeatures): { key: string; share: number }[] {
  const out = [{ key: authorKey(f.authorType, f.authorId), share: 1 }, { key: `cat:${f.category}`, share: 1 }, { key: `kind:${f.kind}`, share: 0.5 }];
  if (f.authorRt) out.push({ key: `rt:${f.authorRt}`, share: 0.5 });
  for (const t of f.tags) out.push({ key: `tag:${t}`, share: 0.5 });
  return out;
}

/** Perubahan nilai minat bila sebuah postingan mendapat bobot `weight` (negatif = dikurangi). */
export const weightedDeltas = (f: PostFeatures, weight: number) => interestKeys(f).map((k) => ({ key: k.key, delta: k.share * weight }));

/** Perubahan nilai minat akibat satu kejadian. */
export const interestDeltas = (f: PostFeatures, event: InterestEvent) => weightedDeltas(f, EVENT_WEIGHT[event]);

// ── Kejadian dari aplikasi (Fase 0: pencatatan sinyal) ──────────────────────

export type SignalType = "seen" | "open" | "share" | "hide" | "unhide";
export type FeedSrc = "forYou" | "latest";
export type SignalEvent = { postId: number; type: SignalType; src: FeedSrc; ms: number };
export const MAX_SIGNAL_EVENTS = 40;

const SIGNAL_TYPES: readonly string[] = ["seen", "open", "share", "hide", "unhide"];

/**
 * Paket kejadian dari aplikasi. Struktur salah → null. Kejadian yang tidak valid dibuang diam-diam; durasi dibatasi
 * agar klien yang rusak atau nakal tidak bisa menggembungkan profil.
 */
export function parseSignalEvents(body: unknown): SignalEvent[] | null {
  const list = body && typeof body === "object" ? (body as { events?: unknown }).events : null;
  if (!Array.isArray(list) || list.length > MAX_SIGNAL_EVENTS) return null;
  const out: SignalEvent[] = [];
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    const { postId, type, src, ms } = e as Record<string, unknown>;
    if (typeof postId !== "number" || !Number.isSafeInteger(postId) || postId <= 0) continue;
    if (typeof type !== "string" || !SIGNAL_TYPES.includes(type)) continue;
    if (src !== "forYou" && src !== "latest") continue;
    const dur = typeof ms === "number" && Number.isFinite(ms) ? Math.max(0, Math.min(SEEN_MAX_MS, Math.round(ms))) : 0;
    out.push({ postId, type: type as SignalType, src, ms: dur });
  }
  return out;
}

/** Bobot minat dari kumpulan kejadian satu postingan dalam satu paket. Tertahan lama dihitung sekali, buka maksimal dua kali. */
export function signalWeight(events: SignalEvent[]): number {
  let w = 0;
  if (events.some((e) => e.type === "seen" && e.ms >= DWELL_MS)) w += EVENT_WEIGHT.dwell;
  w += Math.min(2, events.filter((e) => e.type === "open").length) * EVENT_WEIGHT.open;
  if (events.some((e) => e.type === "share")) w += EVENT_WEIGHT.share;
  // "Kurangi" lalu "batal" dalam satu paket saling menghapus; urutan terakhir yang menentukan.
  const last = [...events].reverse().find((e) => e.type === "hide" || e.type === "unhide");
  if (last) w += last.type === "hide" ? EVENT_WEIGHT.hide : -EVENT_WEIGHT.hide;
  return w;
}

/** Nilai efektif setelah peluruhan sejak `touchedAt`. */
export function decayed(score: number, touchedAt: Date | number, now: number): number {
  const age = Math.max(0, now - (typeof touchedAt === "number" ? touchedAt : touchedAt.getTime()));
  return score * Math.pow(0.5, age / (RANKING.interestHalfLifeDays * DAY));
}

/** Profil minat: kunci → nilai efektif saat ini. */
export type Profile = Map<string, number>;

const sat = (x: number) => (x === 0 ? 0 : Math.sign(x) * (Math.abs(x) / (Math.abs(x) + RANKING.interestSaturation)));

/** Penyumbang kedekatan; dipakai untuk menghitung skor sekaligus menjelaskan alasannya. */
function parts(f: PostFeatures, profile: Profile, viewerRt: string | null) {
  const tag = f.tags.reduce((m, t) => Math.max(m, sat(profile.get(`tag:${t}`) ?? 0)), 0);
  const ownRt = viewerRt && f.authorRt === viewerRt ? 0.6 : 0;
  return {
    author: sat(profile.get(authorKey(f.authorType, f.authorId)) ?? 0),
    category: sat(profile.get(`cat:${f.category}`) ?? 0),
    tag,
    rt: Math.max(ownRt, sat(f.authorRt ? profile.get(`rt:${f.authorRt}`) ?? 0 : 0)),
    kind: sat(profile.get(`kind:${f.kind}`) ?? 0),
  };
}

/** Kedekatan warga dengan postingan ini, -1 sampai 1. */
export function affinity(f: PostFeatures, profile: Profile, viewerRt: string | null): number {
  const p = parts(f, profile, viewerRt);
  return Math.max(-1, Math.min(1, 0.45 * p.author + 0.25 * p.category + 0.15 * p.tag + 0.1 * p.rt + 0.05 * p.kind));
}

export type Why = { kind: "author" | "category" | "tag" | "rt" | "explore"; label: string };

const CATEGORY_WORD: Record<string, string> = { kegiatan: "kegiatan", usaha: "usaha warga", info: "info desa", lainnya: "kabar lainnya" };

/** Alasan singkat dalam bahasa awam, atau null bila tidak ada alasan yang cukup kuat (jangan mengarang). */
export function reasonOf(f: PostFeatures, profile: Profile, viewerRt: string | null, authorName: string): Why | null {
  const p = parts(f, profile, viewerRt);
  const best = (
    [["author", p.author], ["tag", p.tag], ["category", p.category], ["rt", p.rt]] as const
  ).reduce<[string, number]>((m, c) => (c[1] > m[1] ? [c[0], c[1]] : m), ["", 0.25]);
  switch (best[0]) {
    case "author": return { kind: "author", label: `Anda sering berinteraksi dengan ${authorName}` };
    case "tag": { const t = f.tags.find((x) => sat(profile.get(`tag:${x}`) ?? 0) >= 0.25); return t ? { kind: "tag", label: `Anda tertarik dengan #${t}` } : null; }
    case "category": return { kind: "category", label: `Anda sering membuka ${CATEGORY_WORD[f.category] ?? f.category}` };
    case "rt": return { kind: "rt", label: f.authorRt && viewerRt === f.authorRt ? "Dari RT Anda" : `Dari RT ${f.authorRt}` };
    default: return null;
  }
}

export type Candidate = PostFeatures & {
  authorName: string; createdAt: Date; likes: number;
  /** Jumlah penulis komentar yang berbeda (bukan jumlah komentar), agar adu argumen dua orang tidak dianggap ramai. */
  commenters: number; reports: number;
  /** Berapa kali postingan ini sudah tampil / dibuka oleh warga yang sama. */
  seen: number; opens: number; hidden: boolean;
  mine: boolean; authorIsStaff: boolean;
};

export type Ranked = { id: number; why: Why | null };

/** Skor satu postingan. Kesegaran × (1 + kedekatan + bukti sosial kecil) × penalti "sudah dilihat". */
export function scoreOf(c: Candidate, profile: Profile, viewerRt: string | null, now: number): { score: number; aff: number } {
  const ageH = Math.max(0, now - c.createdAt.getTime()) / HOUR;
  const fresh = Math.pow(0.5, ageH / RANKING.freshHalfLifeHours);
  let aff = affinity(c, profile, viewerRt);
  const flagged = c.reports > 0;
  if (flagged && aff > 0) aff = 0; // konten yang dilaporkan tidak pernah didorong
  const proof = flagged ? 0 : Math.min(1, Math.log1p(c.likes + 2 * c.commenters) / Math.log(21));
  let mult = Math.max(0.2, 1 + RANKING.affinityWeight * aff + RANKING.proofWeight * proof);
  if (c.authorIsStaff) mult *= RANKING.staffBoost;
  if (c.opens > 0) mult *= RANKING.alreadyOpened;
  else if (c.seen >= 3) mult *= RANKING.seenIgnoredThrice;
  else if (c.seen >= 2) mult *= RANKING.seenIgnoredTwice;
  return { score: fresh * mult, aff };
}

/**
 * Urutan "Untuk Anda". Kandidat dalam jendela waktu diperingkat; sisanya menyusul urut waktu. Hasilnya deterministik
 * untuk `now` yang sama, sehingga halaman berikutnya (cursor memuat `now`) konsisten.
 */
export function rankForYou(cands: Candidate[], profile: Profile, ctx: { now: number; viewerRt: string | null }): Ranked[] {
  const { now, viewerRt } = ctx;
  const eligible = cands.filter((c) => !c.hidden);
  const byNew = (a: Candidate, b: Candidate) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id;

  let windowMs = RANKING.windowHours * HOUR;
  if (eligible.filter((c) => now - c.createdAt.getTime() <= windowMs).length < RANKING.minWindowPosts) windowMs = RANKING.widenedWindowDays * DAY;
  const inWindow = eligible.filter((c) => now - c.createdAt.getTime() <= windowMs);
  const older = eligible.filter((c) => now - c.createdAt.getTime() > windowMs).sort(byNew);

  type Entry = { c: Candidate; score: number; aff: number; pinned: boolean };
  const pool: Entry[] = inWindow.map((c) => {
    const { score, aff } = scoreOf(c, profile, viewerRt, now);
    const pinned = c.mine && now - c.createdAt.getTime() <= RANKING.pinOwnHours * HOUR;
    return { c, score, aff, pinned };
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.score - a.score || b.c.id - a.c.id);

  const out: Ranked[] = [];
  const authors: string[] = [];
  const key = (c: Candidate) => authorKey(c.authorType, c.authorId);
  const allowed = (c: Candidate) => {
    const n = RANKING.maxConsecutiveAuthor;
    return !(authors.length >= n && authors.slice(-n).every((a) => a === key(c)));
  };
  const take = (rest: Entry[], e: Entry, why: Why | null) => {
    rest.splice(rest.indexOf(e), 1);
    authors.push(key(e.c));
    out.push({ id: e.c.id, why });
  };

  while (pool.length) {
    const slot = out.length;
    const explore = slot % RANKING.exploreEvery === RANKING.exploreEvery - 1;
    if (explore) {
      // Slot penjelajahan: postingan terbaru yang netral (tidak disukai, tidak jelas diminati) dari penulis berbeda.
      const pick = pool
        .filter((e) => !e.pinned && e.aff >= 0 && e.aff <= RANKING.exploreAffinityMax && allowed(e.c))
        .sort((a, b) => byNew(a.c, b.c))[0];
      if (pick) { take(pool, pick, { kind: "explore", label: "Kabar baru dari warga lain" }); continue; }
    }
    const pick = pool.find((e) => allowed(e.c)) ?? pool[0]!;
    take(pool, pick, pick.pinned ? null : reasonOf(pick.c, profile, viewerRt, pick.c.authorName));
  }

  // Ekor di luar jendela tetap urut waktu, tetapi aturan variasi penulis berlaku di seluruh feed.
  const tail: Entry[] = older.map((c) => ({ c, score: 0, aff: 0, pinned: false }));
  while (tail.length) take(tail, tail.find((e) => allowed(e.c)) ?? tail[0]!, null);
  return out;
}

/** Cursor "Untuk Anda": waktu acuan (agar skor konsisten antarhalaman) dan posisi. Cursor angka biasa = urut waktu. */
export const encodeRankCursor = (asOf: number, offset: number) => `r${asOf}.${offset}`;
export function parseRankCursor(raw: unknown): { asOf: number; offset: number } | null {
  const m = typeof raw === "string" ? /^r(\d{12,14})\.(\d{1,4})$/.exec(raw) : null;
  return m ? { asOf: Number(m[1]), offset: Number(m[2]) } : null;
}

// ── Pengaturan desa & pembanding ────────────────────────────────────────────

export type FeedSetting = "auto" | "on" | "off";

/** Village.settings.mobile.social.feed — "auto" (default): "Untuk Anda" aktif bila desa cukup ramai; "on": selalu; "off": hanya urut waktu. */
export function readFeedSetting(settings: unknown): FeedSetting {
  const root = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : {};
  const mobile = root.mobile && typeof root.mobile === "object" ? (root.mobile as Record<string, unknown>) : {};
  const social = mobile.social && typeof mobile.social === "object" ? (mobile.social as Record<string, unknown>) : {};
  return social.feed === "on" || social.feed === "off" ? social.feed : "auto";
}

/** Akun pembanding (holdout): deterministik menurut akun, tidak berubah antar sesi. */
export function isHoldout(accountType: string, accountId: number, percent: number = RANKING.holdoutPercent): boolean {
  let h = 2166136261;
  for (const ch of `${accountType}:${accountId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 100 < percent;
}

/** Apakah tab "Untuk Anda" tersedia untuk akun ini. */
export function forYouAvailable(setting: FeedSetting, weeklyPosts: number, holdout: boolean): boolean {
  if (setting === "off" || holdout) return false;
  return setting === "on" || weeklyPosts >= RANKING.forYouMinWeeklyPosts;
}
