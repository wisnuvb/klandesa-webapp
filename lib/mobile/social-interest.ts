import { prisma } from "@/lib/prisma";
import type { MobileAccountType } from "./tokens";
import {
  EVENT_WEIGHT, NO_LEARN_KEY, RANKING, SEEN_MIN_MS, authorKey, decayed, featuresOf, signalWeight, weightedDeltas,
  type InterestEvent, type PostFeatures, type Profile, type SignalEvent,
} from "./social-ranking";

/** Siapa yang dipelajari: akun warga. Perangkat desa tidak diprofil (mereka memoderasi dan melihat semuanya). */
type Me = { type: MobileAccountType; id: number };

const MAX_SCORE = 60;
const MIN_SCORE = -30;

/** Profil minat dengan nilai efektif saat ini, dan apakah akun ini mengizinkan dipelajari. */
export async function loadProfile(me: Me, now = Date.now()): Promise<{ profile: Profile; learning: boolean }> {
  const rows = await prisma.socialInterest.findMany({
    where: { accountType: me.type, accountId: me.id }, orderBy: { score: "desc" }, take: RANKING.maxInterestRows + 50,
  });
  if (rows.some((r) => r.key === NO_LEARN_KEY)) return { profile: new Map(), learning: false };
  const profile: Profile = new Map();
  for (const r of rows) profile.set(r.key, decayed(r.score, r.touchedAt, now));
  return { profile, learning: true };
}

/** Apakah akun ini mengizinkan dipelajari. Satu pencarian indeks, murah. */
export async function isLearning(me: Me): Promise<boolean> {
  const off = await prisma.socialInterest.findUnique({ where: { accountType_accountId_key: { accountType: me.type, accountId: me.id, key: NO_LEARN_KEY } }, select: { id: true } });
  return !off;
}

/** Terapkan perubahan nilai ke profil. Mengembalikan false bila akun menolak dipelajari. */
async function applyDeltas(me: Me, deltas: { key: string; delta: number }[], now: number): Promise<boolean> {
  if (!deltas.length || me.type !== "citizen") return false;
  const rows = await prisma.socialInterest.findMany({
    where: { accountType: me.type, accountId: me.id, key: { in: [...deltas.map((d) => d.key), NO_LEARN_KEY] } },
  });
  if (rows.some((r) => r.key === NO_LEARN_KEY)) return false;
  const current = new Map(rows.map((r) => [r.key, decayed(r.score, r.touchedAt, now)]));
  const at = new Date(now);
  await prisma.$transaction(deltas.map((d) => {
    const next = Math.max(MIN_SCORE, Math.min(MAX_SCORE, (current.get(d.key) ?? 0) + d.delta));
    return prisma.socialInterest.upsert({
      where: { accountType_accountId_key: { accountType: me.type, accountId: me.id, key: d.key } },
      create: { accountType: me.type, accountId: me.id, key: d.key, score: next, touchedAt: at },
      update: { score: next, touchedAt: at },
    });
  }));
  void pruneProfile(me, now).catch(() => {});
  return true;
}

/** Jaga profil tetap kecil: buang yang paling lemah bila melebihi batas. */
async function pruneProfile(me: Me, now: number) {
  const count = await prisma.socialInterest.count({ where: { accountType: me.type, accountId: me.id } });
  if (count <= RANKING.maxInterestRows + 30) return;
  const rows = await prisma.socialInterest.findMany({ where: { accountType: me.type, accountId: me.id }, select: { id: true, key: true, score: true, touchedAt: true } });
  const weakest = rows
    .filter((r) => r.key !== NO_LEARN_KEY)
    .sort((a, b) => Math.abs(decayed(b.score, b.touchedAt, now)) - Math.abs(decayed(a.score, a.touchedAt, now)))
    .slice(RANKING.maxInterestRows);
  if (weakest.length) await prisma.socialInterest.deleteMany({ where: { id: { in: weakest.map((r) => r.id) } } });
}

const POST_SELECT = {
  id: true, authorType: true, authorId: true, authorRt: true, category: true, content: true, linkUrl: true, youtubeId: true,
  media: { select: { id: true }, take: 1 },
} as const;

const featuresFromRow = (p: { id: bigint; authorType: string; authorId: number; authorRt: string | null; category: string; content: string; linkUrl: string | null; youtubeId: string | null; media: unknown[] }): PostFeatures =>
  featuresOf({ id: p.id, authorType: p.authorType, authorId: p.authorId, authorRt: p.authorRt, category: p.category, content: p.content, photos: p.media.length, hasLink: !!(p.linkUrl || p.youtubeId) });

/**
 * Pelajari satu kejadian (suka, komentar, simpan, laporan, …) dari sebuah postingan. Tidak pernah melempar galat dan
 * tidak memperlambat jalur utama: pemanggil cukup `void learnFromPost(...)`. Postingan milik sendiri dan akun
 * perangkat desa dilewati.
 */
export async function learnFromPost(me: Me, postId: bigint | number, event: InterestEvent, now = Date.now()): Promise<void> {
  try {
    if (me.type !== "citizen") return;
    const p = await prisma.socialPost.findUnique({ where: { id: BigInt(postId) }, select: POST_SELECT });
    if (!p || (p.authorType === me.type && p.authorId === me.id)) return;
    await applyDeltas(me, weightedDeltas(featuresFromRow(p), EVENT_WEIGHT[event]), now);
  } catch {
    // Pembelajaran bersifat tambahan; kegagalannya tidak boleh mengganggu suka/komentar warga.
  }
}

/**
 * Catat paket kejadian dari aplikasi: jejak per postingan (untuk pengukuran dan agar tidak menampilkan terus yang
 * diabaikan) dan profil minat. Akun yang menolak dipelajari tidak dicatat sama sekali. Mengembalikan jumlah postingan yang dicatat.
 */
export async function recordSignals(me: Me, villageId: number, events: SignalEvent[], now = Date.now()): Promise<number> {
  if (!events.length || me.type !== "citizen" || !(await isLearning(me))) return 0;
  const byPost = new Map<number, SignalEvent[]>();
  for (const e of events) byPost.set(e.postId, [...(byPost.get(e.postId) ?? []), e]);

  const posts = await prisma.socialPost.findMany({
    where: { id: { in: [...byPost.keys()].map(BigInt) }, villageId, status: "PUBLISHED" }, select: POST_SELECT,
  });
  const at = new Date(now);
  const deltas = new Map<string, number>();
  let wrote = 0;

  for (const p of posts) {
    if (p.authorType === me.type && p.authorId === me.id) continue;
    const evs = byPost.get(Number(p.id)) ?? [];
    const n = (type: SignalEvent["type"], src: SignalEvent["src"]) => evs.filter((e) => e.type === type && e.src === src && (type !== "seen" || e.ms >= SEEN_MIN_MS)).length;
    const inc = { seenForYou: n("seen", "forYou"), seenLatest: n("seen", "latest"), openForYou: n("open", "forYou"), openLatest: n("open", "latest"), shares: evs.filter((e) => e.type === "share").length };
    const lastHide = [...evs].reverse().find((e) => e.type === "hide" || e.type === "unhide");
    const hidden = lastHide ? lastHide.type === "hide" : undefined;
    if (!Object.values(inc).some((v) => v > 0) && hidden === undefined) continue;

    await prisma.socialPostSignal.upsert({
      where: { postId_accountType_accountId: { postId: p.id, accountType: me.type, accountId: me.id } },
      create: { villageId, postId: p.id, accountType: me.type, accountId: me.id, ...inc, hidden: hidden ?? false, firstSeenAt: at, lastSeenAt: at },
      update: {
        seenForYou: { increment: inc.seenForYou }, seenLatest: { increment: inc.seenLatest }, openForYou: { increment: inc.openForYou },
        openLatest: { increment: inc.openLatest }, shares: { increment: inc.shares }, lastSeenAt: at, ...(hidden === undefined ? {} : { hidden }),
      },
    });
    wrote++;
    const w = signalWeight(evs);
    if (w !== 0) for (const d of weightedDeltas(featuresFromRow(p), w)) deltas.set(d.key, (deltas.get(d.key) ?? 0) + d.delta);
  }
  if (deltas.size) await applyDeltas(me, [...deltas].map(([key, delta]) => ({ key, delta })), now);
  return wrote;
}

/** Tandai postingan "kurangi yang seperti ini" setelah dilaporkan agar tidak pernah tampil lagi di "Untuk Anda" pelapor. */
export async function hidePostFor(me: Me, villageId: number, postId: bigint): Promise<void> {
  if (me.type !== "citizen") return;
  const at = new Date();
  await prisma.socialPostSignal.upsert({
    where: { postId_accountType_accountId: { postId, accountType: me.type, accountId: me.id } },
    create: { villageId, postId, accountType: me.type, accountId: me.id, hidden: true, firstSeenAt: at, lastSeenAt: at },
    update: { hidden: true },
  }).catch(() => {});
}

/** Hapus semua yang sudah dipelajari tentang akun ini, termasuk postingan yang pernah disembunyikan. Pilihan "jangan pelajari" dipertahankan. */
export async function resetProfile(me: Me): Promise<void> {
  await prisma.$transaction([
    prisma.socialInterest.deleteMany({ where: { accountType: me.type, accountId: me.id, key: { not: NO_LEARN_KEY } } }),
    prisma.socialPostSignal.updateMany({ where: { accountType: me.type, accountId: me.id, hidden: true }, data: { hidden: false } }),
  ]);
}

/** Izinkan atau tolak dipelajari. Menolak menghapus profil dan menghentikan pencatatan minat. */
export async function setLearning(me: Me, learn: boolean): Promise<void> {
  if (learn) {
    await prisma.socialInterest.deleteMany({ where: { accountType: me.type, accountId: me.id, key: NO_LEARN_KEY } });
    return;
  }
  await prisma.$transaction([
    prisma.socialInterest.deleteMany({ where: { accountType: me.type, accountId: me.id } }),
    prisma.socialInterest.create({ data: { accountType: me.type, accountId: me.id, key: NO_LEARN_KEY, score: 1 } }),
  ]);
}

const CATEGORY_LABEL: Record<string, string> = { kegiatan: "Kegiatan desa", usaha: "Usaha warga", info: "Info", lainnya: "Kabar lainnya" };
const KIND_LABEL: Record<string, string> = { foto: "Postingan foto", video: "Tautan video", teks: "Tulisan" };

export type InterestItem = { label: string; kind: "category" | "author" | "tag" | "rt" | "format"; strength: 1 | 2 | 3 };

/** Minat terkuat dalam bahasa awam, untuk layar "Atur minat saya". Nilai di bawah ambang tidak ditampilkan. */
export async function describeInterests(profile: Profile, limit = 8): Promise<InterestItem[]> {
  const top = [...profile].filter(([k, v]) => k !== NO_LEARN_KEY && v >= 1.5).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const authorIds = top.flatMap(([k]) => { const m = /^author:(citizen|staff):(\d+)$/.exec(k); return m ? [{ authorType: m[1]!, authorId: Number(m[2]) }] : []; });
  const names = authorIds.length
    ? await prisma.socialPost.findMany({ where: { OR: authorIds }, select: { authorType: true, authorId: true, authorName: true }, orderBy: { id: "desc" }, take: 200 })
    : [];
  const nameOf = new Map<string, string>();
  for (const n of names) if (!nameOf.has(authorKey(n.authorType, n.authorId))) nameOf.set(authorKey(n.authorType, n.authorId), n.authorName);

  const out: InterestItem[] = [];
  for (const [key, v] of top) {
    const strength: 1 | 2 | 3 = v >= 8 ? 3 : v >= 4 ? 2 : 1;
    const [kind, ...rest] = key.split(":");
    const val = rest.join(":");
    if (kind === "cat") out.push({ label: CATEGORY_LABEL[val] ?? val, kind: "category", strength });
    else if (kind === "tag") out.push({ label: `#${val}`, kind: "tag", strength });
    else if (kind === "rt") out.push({ label: `Warga RT ${val}`, kind: "rt", strength });
    else if (kind === "kind") out.push({ label: KIND_LABEL[val] ?? val, kind: "format", strength });
    else if (kind === "author") { const n = nameOf.get(key); if (n) out.push({ label: n, kind: "author", strength }); }
  }
  return out;
}
