import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext, type MobileContext } from "./context";
import { displayName, readCustomBannedWords, readSocialMode, youtubeThumb, youtubeWatchUrl, type SocialMode } from "./social-logic";
import { forYouAvailable, isHoldout, readFeedSetting, type FeedSetting } from "./social-ranking";
import type { MobileAccountType } from "./tokens";

export type SocialAccess = {
  ctx: MobileContext;
  mode: SocialMode;
  /** Pengaturan desa untuk urutan feed: auto | on | off (lihat social-ranking.ts). */
  feedSetting: FeedSetting;
  bannedWords: string[];
  /** Siapa yang membuka Warga: warga (CitizenAccount) atau perangkat desa (User). `account.id` selalu sama dengan `me.id`. */
  me: { type: MobileAccountType; id: number };
  account: { id: number; createdAt: Date; termsAt: Date | null; status: string; mutedUntil: Date | null; name: string; rt: string | null };
  muted: boolean;
};

export const asAccountType = (t: string): MobileAccountType => (t === "staff" ? "staff" : "citizen");
export const isMe = (s: Pick<SocialAccess, "me">, type: string, id: number) => type === s.me.type && id === s.me.id;

/**
 * Guard semua endpoint /social untuk warga dan perangkat desa: desa harus mengaktifkan fitur. Warga juga harus tidak
 * diblokir dan (kecuali `allowWithoutTerms`) sudah menyetujui syarat komunitas. Perangkat desa tidak terkena sanksi
 * warga (bisu/blokir) dan tidak perlu menyetujui syarat; mereka tampil sebagai "Perangkat Desa".
 */
export async function requireSocial(
  req: NextRequest,
  opts: { write?: boolean; allowWithoutTerms?: boolean } = {},
): Promise<{ ok: true; s: SocialAccess } | { ok: false; response: NextResponse }> {
  const loaded = await requireMobileContext(req, { allow: ["citizen", "staff"] });
  if (!loaded.ok) return loaded;
  const { ctx } = loaded;

  if (ctx.accountType === "staff") {
    const [village, user] = await Promise.all([
      prisma.village.findUnique({ where: { id: ctx.villageId }, select: { settings: true } }),
      prisma.user.findUnique({ where: { id: ctx.accountId }, select: { id: true, name: true, createdAt: true } }),
    ]);
    const staffMode = readSocialMode(village?.settings);
    if (staffMode === "off" || !user) {
      return { ok: false, response: mobileError("FORBIDDEN", "Fitur Warga belum diaktifkan di desa Anda.", 403, { reason: "SOCIAL_OFF" }) };
    }
    return {
      ok: true,
      s: {
        ctx, mode: staffMode, feedSetting: readFeedSetting(village?.settings), bannedWords: readCustomBannedWords(village?.settings), muted: false, me: { type: "staff", id: user.id },
        account: { id: user.id, createdAt: user.createdAt, termsAt: user.createdAt, status: "OK", mutedUntil: null, name: user.name.trim().slice(0, 60), rt: null },
      },
    };
  }

  const [village, acc] = await Promise.all([
    prisma.village.findUnique({ where: { id: ctx.villageId }, select: { settings: true } }),
    prisma.citizenAccount.findUnique({
      where: { id: ctx.accountId },
      select: { id: true, createdAt: true, socialTermsAt: true, socialStatus: true, socialMutedUntil: true, resident: { select: { name: true, rt: true } } },
    }),
  ]);
  const mode = readSocialMode(village?.settings);
  if (mode === "off" || !acc) {
    return { ok: false, response: mobileError("FORBIDDEN", "Fitur Warga belum diaktifkan di desa Anda.", 403, { reason: "SOCIAL_OFF" }) };
  }
  if (acc.socialStatus === "BANNED") {
    return { ok: false, response: mobileError("FORBIDDEN", "Akun Anda diblokir dari fitur Warga karena melanggar aturan komunitas. Hubungi kantor desa.", 403, { reason: "SOCIAL_BANNED" }) };
  }
  if (!opts.allowWithoutTerms && !acc.socialTermsAt) {
    return { ok: false, response: mobileError("FORBIDDEN", "Setujui aturan komunitas dulu.", 403, { reason: "TERMS_REQUIRED" }) };
  }
  const muted = acc.socialStatus === "MUTED" && !!acc.socialMutedUntil && acc.socialMutedUntil.getTime() > Date.now();
  if (opts.write && muted) {
    return { ok: false, response: mobileError("FORBIDDEN", `Akun Anda sedang dibisukan sampai ${acc.socialMutedUntil!.toLocaleDateString("id-ID")}. Anda masih bisa membaca.`, 403, { reason: "SOCIAL_MUTED" }) };
  }
  return {
    ok: true,
    s: {
      ctx, mode, feedSetting: readFeedSetting(village?.settings), bannedWords: readCustomBannedWords(village?.settings), muted, me: { type: "citizen", id: acc.id },
      account: { id: acc.id, createdAt: acc.createdAt, termsAt: acc.socialTermsAt, status: acc.socialStatus, mutedUntil: acc.socialMutedUntil, name: displayName(acc.resident.name), rt: acc.resident.rt },
    },
  };
}

/**
 * Apakah tab "Untuk Anda" tersedia untuk akun ini. Hanya warga (perangkat desa selalu melihat urut waktu agar bisa
 * memoderasi semuanya), dan hanya bila desa tidak mematikannya, cukup ramai (mode otomatis), dan bukan akun pembanding.
 */
export async function forYouFor(s: Pick<SocialAccess, "me" | "feedSetting" | "ctx">, now = Date.now()): Promise<boolean> {
  if (s.me.type !== "citizen") return false;
  const holdout = isHoldout(s.me.type, s.me.id);
  if (s.feedSetting === "off" || holdout) return false;
  const weekly = s.feedSetting === "auto"
    ? await prisma.socialPost.count({ where: { villageId: s.ctx.villageId, status: "PUBLISHED", createdAt: { gte: new Date(now - 7 * 86_400_000) } } })
    : 0;
  return forYouAvailable(s.feedSetting, weekly, holdout);
}

type PostRow = {
  id: bigint; authorType: string; authorId: number; authorName: string; authorRt: string | null; content: string; category: string;
  youtubeId: string | null; youtubeTitle: string | null; linkProvider: string | null; linkUrl: string | null; linkTitle: string | null; status: string; likesCount: number; commentsCount: number; editedAt: Date | null; createdAt: Date;
  media: { url: string; sortOrder: number }[];
};

/** Tautan sematan untuk klien. Baris lama yang hanya punya `youtubeId` dipetakan ke YouTube. */
function serializeLink(p: Pick<PostRow, "youtubeId" | "youtubeTitle" | "linkProvider" | "linkUrl" | "linkTitle">) {
  if (p.linkProvider && p.linkUrl) {
    return { provider: p.linkProvider, url: p.linkUrl, title: p.linkTitle, thumb: p.linkProvider === "youtube" && p.youtubeId ? youtubeThumb(p.youtubeId) : null };
  }
  if (p.youtubeId) return { provider: "youtube", url: youtubeWatchUrl(p.youtubeId), title: p.youtubeTitle, thumb: youtubeThumb(p.youtubeId) };
  return null;
}

export function serializePost(p: PostRow, viewer: { type: string; id: number; liked: Set<bigint>; saved: Set<bigint> }, canEdit: (d: Date) => boolean) {
  const mine = p.authorType === viewer.type && p.authorId === viewer.id;
  return {
    id: Number(p.id),
    author: { type: p.authorType, id: p.authorId, name: p.authorName, rt: p.authorRt, mine },
    content: p.content, category: p.category,
    photos: [...p.media].sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.url),
    // `youtube` dipertahankan untuk build aplikasi lama; aplikasi baru memakai `link`.
    youtube: p.youtubeId ? { id: p.youtubeId, title: p.youtubeTitle, thumb: youtubeThumb(p.youtubeId), url: youtubeWatchUrl(p.youtubeId) } : null,
    link: serializeLink(p),
    likes: p.likesCount, comments: p.commentsCount,
    liked: viewer.liked.has(p.id), saved: viewer.saved.has(p.id),
    mine, canEdit: mine && p.status === "PUBLISHED" && canEdit(p.createdAt),
    pending: p.status === "PENDING", createdAt: p.createdAt, editedAt: p.editedAt,
  };
}

/** Pasangan (tipe,id) akun yang tidak boleh saling melihat (blokir dua arah). */
export async function blockedPairs(accountType: MobileAccountType, accountId: number) {
  const rows = await prisma.socialBlock.findMany({
    where: { OR: [{ blockerType: accountType, blockerId: accountId }, { blockedType: accountType, blockedId: accountId }] },
    select: { blockerType: true, blockerId: true, blockedType: true, blockedId: true },
    take: 500,
  });
  const set = new Map<string, { authorType: string; authorId: number }>();
  for (const b of rows) {
    const other = b.blockerType === accountType && b.blockerId === accountId ? { authorType: b.blockedType, authorId: b.blockedId } : { authorType: b.blockerType, authorId: b.blockerId };
    set.set(`${other.authorType}:${other.authorId}`, other);
  }
  return [...set.values()];
}
