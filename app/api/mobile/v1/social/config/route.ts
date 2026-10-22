import { NextRequest, NextResponse } from "next/server";
import { requireSocial } from "@/lib/mobile/social";
import { COMMUNITY_RULES, MAX_COMMENT_CHARS, MAX_POST_CHARS, MAX_POST_PHOTOS, POST_CATEGORIES, REPORT_REASONS } from "@/lib/mobile/social-logic";

export async function GET(req: NextRequest) {
  const g = await requireSocial(req, { allowWithoutTerms: true });
  if (!g.ok) return g.response;
  const { s } = g;
  return NextResponse.json({
    mode: s.mode, termsAccepted: !!s.account.termsAt, muted: s.muted, mutedUntil: s.muted ? s.account.mutedUntil : null,
    me: { name: s.account.name, rt: s.account.rt },
    rules: COMMUNITY_RULES,
    limits: { postChars: MAX_POST_CHARS, commentChars: MAX_COMMENT_CHARS, photos: MAX_POST_PHOTOS },
    categories: POST_CATEGORIES, reportReasons: REPORT_REASONS,
  });
}
