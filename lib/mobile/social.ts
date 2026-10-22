import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext, type MobileContext } from "./context";
import { displayName, readCustomBannedWords, readSocialMode, youtubeThumb, youtubeWatchUrl, type SocialMode } from "./social-logic";

export type SocialAccess = {
  ctx: MobileContext;
  mode: SocialMode;
  bannedWords: string[];
  account: { id: number; createdAt: Date; termsAt: Date | null; status: string; mutedUntil: Date | null; name: string; rt: string | null };
  muted: boolean;
};

/**
 * Guard semua endpoint /social untuk warga: desa harus mengaktifkan fitur, akun tidak diblokir,
 * dan (kecuali `allowWithoutTerms`) syarat komunitas sudah disetujui.
 */
export async function requireSocial(
  req: NextRequest,
  opts: { write?: boolean; allowWithoutTerms?: boolean } = {},
): Promise<{ ok: true; s: SocialAccess } | { ok: false; response: NextResponse }> {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded;
  const { ctx } = loaded;

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
      ctx, mode, bannedWords: readCustomBannedWords(village?.settings), muted,
      account: { id: acc.id, createdAt: acc.createdAt, termsAt: acc.socialTermsAt, status: acc.socialStatus, mutedUntil: acc.socialMutedUntil, name: displayName(acc.resident.name), rt: acc.resident.rt },
    },
  };
}

type PostRow = {
  id: bigint; authorType: string; authorId: number; authorName: string; authorRt: string | null; content: string; category: string;
  youtubeId: string | null; youtubeTitle: string | null; status: string; likesCount: number; commentsCount: number; editedAt: Date | null; createdAt: Date;
  media: { url: string; sortOrder: number }[];
};

export function serializePost(p: PostRow, viewer: { id: number; liked: Set<bigint>; saved: Set<bigint> }, canEdit: (d: Date) => boolean) {
  const mine = p.authorType === "citizen" && p.authorId === viewer.id;
  return {
    id: Number(p.id),
    author: { type: p.authorType, id: p.authorId, name: p.authorName, rt: p.authorRt, mine },
    content: p.content, category: p.category,
    photos: [...p.media].sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.url),
    youtube: p.youtubeId ? { id: p.youtubeId, title: p.youtubeTitle, thumb: youtubeThumb(p.youtubeId), url: youtubeWatchUrl(p.youtubeId) } : null,
    likes: p.likesCount, comments: p.commentsCount,
    liked: viewer.liked.has(p.id), saved: viewer.saved.has(p.id),
    mine, canEdit: mine && p.status === "PUBLISHED" && canEdit(p.createdAt),
    pending: p.status === "PENDING", createdAt: p.createdAt, editedAt: p.editedAt,
  };
}

/** Pasangan (tipe,id) akun yang tidak boleh saling melihat (blokir dua arah). */
export async function blockedPairs(accountType: "citizen", accountId: number) {
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
