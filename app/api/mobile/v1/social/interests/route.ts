import { NextRequest, NextResponse } from "next/server";
import { mobileError } from "@/lib/mobile/context";
import { forYouFor, requireSocial } from "@/lib/mobile/social";
import { describeInterests, loadProfile, resetProfile, setLearning } from "@/lib/mobile/social-interest";

/** Yang sudah dipelajari tentang warga ini, dalam bahasa awam. Dasar layar "Atur minat saya". */
export async function GET(req: NextRequest) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const { profile, learning } = await loadProfile(s.me);
  return NextResponse.json({
    learning, forYou: await forYouFor(s),
    items: learning ? await describeInterests(profile) : [],
  });
}

/** `{ learn: boolean }`: izinkan atau tolak dipelajari. Menolak langsung menghapus profil minat. */
export async function PATCH(req: NextRequest) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const body = (await req.json().catch(() => null)) as { learn?: unknown } | null;
  if (typeof body?.learn !== "boolean") return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  await setLearning(g.s.me, body.learn);
  return new NextResponse(null, { status: 204 });
}

/** Atur ulang: hapus semua minat yang sudah dipelajari dan kembalikan postingan yang pernah dikurangi. */
export async function DELETE(req: NextRequest) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  await resetProfile(g.s.me);
  return new NextResponse(null, { status: 204 });
}
