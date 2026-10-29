/**
 * Pengukuran Warga (Fase 2). Fungsi murni: DB hanya menyuplai baris mentah (lihat route /staff/social/metrics).
 * Tujuannya menjawab: apakah "Untuk Anda" membuat warga lebih sering membaca dan bereaksi, tanpa mengorbankan
 * pemerataan jangkauan? Cara membaca dan menyetel: docs/SOCIAL_FEED_RANKING.md.
 */
import { isHoldout } from "./social-ranking";

export type SignalRow = {
  accountType: string; accountId: number; postId: number;
  seenForYou: number; seenLatest: number; openForYou: number; openLatest: number; shares: number; hidden: boolean;
};
export type PostRow = { id: number; authorType: string; authorId: number; likes: number; comments: number; reports: number; createdAt: Date };

export type CohortStats = {
  readers: number; seenPerReader: number; openRate: number; reactionsPerReader: number; sharesPerReader: number; hideRate: number;
};
export type FeedMetrics = {
  days: number;
  readers: number;
  /** Warga dengan tab "Untuk Anda" (eligible) dibanding akun pembanding (holdout, tanpa tab itu). */
  cohorts: { forYou: CohortStats; holdout: CohortStats };
  tabs: { forYou: { seen: number; openRate: number }; latest: { seen: number; openRate: number } };
  /** Pemerataan: apakah postingan sampai ke pembaca, bukan hanya milik beberapa orang. */
  fairness: { posts: number; authors: number; postsWithReaction: number; postsNeverSeen: number; top3AuthorShare: number };
  reportRate: number;
  notes: string[];
};

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

function cohortStats(rows: SignalRow[], reactions: Map<string, number>): CohortStats {
  const accounts = new Set(rows.map((r) => `${r.accountType}:${r.accountId}`));
  const seen = rows.reduce((n, r) => n + r.seenForYou + r.seenLatest, 0);
  const opens = rows.reduce((n, r) => n + r.openForYou + r.openLatest, 0);
  const shares = rows.reduce((n, r) => n + r.shares, 0);
  const hidden = rows.filter((r) => r.hidden).length;
  const react = [...accounts].reduce((n, a) => n + (reactions.get(a) ?? 0), 0);
  const readers = accounts.size;
  return {
    readers, seenPerReader: round(ratio(seen, readers), 1), openRate: round(ratio(opens, seen), 3),
    reactionsPerReader: round(ratio(react, readers)), sharesPerReader: round(ratio(shares, readers)), hideRate: round(ratio(hidden, seen), 3),
  };
}

/**
 * @param reactions peta "tipe:id" → jumlah suka + komentar yang dibuat akun itu dalam periode.
 * Catatan: penghitung di baris sinyal bersifat kumulatif; baris dipilih menurut `lastSeenAt` dalam periode, jadi untuk
 * periode pendek angkanya hampir seluruhnya berasal dari periode itu.
 */
export function summarizeFeed(input: { days: number; signals: SignalRow[]; posts: PostRow[]; reactions: Map<string, number>; reports: number; now?: number }): FeedMetrics {
  const { days, signals, posts, reactions, reports } = input;
  const now = input.now ?? Date.now();
  const citizens = signals.filter((r) => r.accountType === "citizen");
  const forYouRows = citizens.filter((r) => !isHoldout(r.accountType, r.accountId));
  const holdoutRows = citizens.filter((r) => isHoldout(r.accountType, r.accountId));

  const seenFy = signals.reduce((n, r) => n + r.seenForYou, 0);
  const seenLt = signals.reduce((n, r) => n + r.seenLatest, 0);
  const openFy = signals.reduce((n, r) => n + r.openForYou, 0);
  const openLt = signals.reduce((n, r) => n + r.openLatest, 0);

  // Pemerataan hanya menilai postingan yang cukup lama (>= 6 jam) untuk sempat dibaca.
  const mature = posts.filter((p) => now - p.createdAt.getTime() >= 6 * 3_600_000);
  const viewersOf = new Map<number, number>();
  for (const r of signals) if (r.seenForYou + r.seenLatest > 0) viewersOf.set(r.postId, (viewersOf.get(r.postId) ?? 0) + 1);
  const seenByAuthor = new Map<string, number>();
  const authorOf = new Map(posts.map((p) => [p.id, `${p.authorType}:${p.authorId}`]));
  for (const r of signals) {
    const a = authorOf.get(r.postId);
    if (a) seenByAuthor.set(a, (seenByAuthor.get(a) ?? 0) + r.seenForYou + r.seenLatest);
  }
  const totalSeen = [...seenByAuthor.values()].reduce((a, b) => a + b, 0);
  const top3 = [...seenByAuthor.values()].sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0);

  const m: FeedMetrics = {
    days,
    readers: new Set(signals.map((r) => `${r.accountType}:${r.accountId}`)).size,
    cohorts: { forYou: cohortStats(forYouRows, reactions), holdout: cohortStats(holdoutRows, reactions) },
    tabs: { forYou: { seen: seenFy, openRate: round(ratio(openFy, seenFy), 3) }, latest: { seen: seenLt, openRate: round(ratio(openLt, seenLt), 3) } },
    fairness: {
      posts: posts.length, authors: new Set(posts.map((p) => `${p.authorType}:${p.authorId}`)).size,
      postsWithReaction: mature.length ? round(ratio(mature.filter((p) => p.likes + p.comments > 0).length, mature.length), 2) : 0,
      postsNeverSeen: mature.length ? round(ratio(mature.filter((p) => !viewersOf.has(p.id)).length, mature.length), 2) : 0,
      top3AuthorShare: round(ratio(top3, totalSeen), 2),
    },
    reportRate: round(ratio(reports, posts.length), 3),
    notes: [],
  };

  // Catatan pembacaan. Ambang mengikuti target di spec (§14.5) dan pagar anti-gelembung; bersifat petunjuk, bukan vonis.
  if (m.fairness.posts >= 10 && m.fairness.postsNeverSeen > 0.2) m.notes.push("Lebih dari 20% postingan belum dibaca siapa pun. Jangkauan belum merata; periksa slot penjelajahan dan jendela waktu.");
  if (m.fairness.authors >= 5 && m.fairness.top3AuthorShare > 0.6) m.notes.push("Tiga penulis menguasai lebih dari 60% bacaan. Ada tanda gelembung; kecilkan bobot kedekatan penulis.");
  if (m.reportRate > 0.02) m.notes.push("Rasio laporan di atas 2% dari postingan (target spec: di bawah 2%). Tinjau moderasi sebelum menambah jangkauan.");
  const a = m.cohorts.forYou, b = m.cohorts.holdout;
  if (a.readers >= 10 && b.readers >= 10 && b.openRate > 0) {
    const lift = round((a.openRate - b.openRate) / b.openRate, 2);
    m.notes.push(`Warga dengan "Untuk Anda" membuka postingan ${lift >= 0 ? `${Math.round(lift * 100)}% lebih sering` : `${Math.round(-lift * 100)}% lebih jarang`} daripada akun pembanding. Indikatif; butuh minggu-minggu berikutnya untuk dipercaya.`);
  } else if (m.readers > 0) {
    m.notes.push("Pembaca belum cukup (minimal 10 per kelompok) untuk membandingkan \"Untuk Anda\" dengan akun pembanding. Pantau lagi nanti.");
  }
  return m;
}
