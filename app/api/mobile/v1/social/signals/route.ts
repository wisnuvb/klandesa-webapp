import { NextRequest, NextResponse } from "next/server";
import { mobileError } from "@/lib/mobile/context";
import { requireSocial } from "@/lib/mobile/social";
import { recordSignals } from "@/lib/mobile/social-interest";
import { parseSignalEvents } from "@/lib/mobile/social-ranking";

/**
 * Paket kejadian dari aplikasi: postingan yang tampil (dengan lama tertahan), dibuka, dibagikan, atau "kurangi yang
 * seperti ini". Bersifat tambahan dan boleh hilang di jalan, jadi klien tidak mengulang bila gagal. Perangkat desa dan
 * akun yang menolak dipelajari (Atur minat saya) tidak dicatat sama sekali.
 */
export async function POST(req: NextRequest) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const events = parseSignalEvents(await req.json().catch(() => null));
  if (!events) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  await recordSignals(s.me, s.ctx.villageId, events);
  return new NextResponse(null, { status: 204 });
}
