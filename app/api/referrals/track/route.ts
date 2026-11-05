import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { trackReferralEvent } from "@/lib/referrals/tracking";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { clientIpOf } from "@/lib/rbac/client-ip";

/** `metadata` dari klien anonim: batasi ukuran serialisasi agar tidak jadi jalur menimbun data. */
const MAX_METADATA_CHARS = 4000;

export async function POST(req: NextRequest) {
  try {
    // Endpoint publik tanpa login yang menulis ke DB (peristiwa + prospek mitra): batasi per IP (dibagi antar worker).
    const rl = await checkRateLimitDb(limiterKey("referral-track", clientIpOf(req)), { max: 60, windowMs: 10 * 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    const body = (await req.json().catch(() => null)) as
      | {
          refCode?: string;
          action?: string;
          sourcePath?: string;
          name?: string;
          email?: string;
          phone?: string;
          villageName?: string;
          subject?: string;
          metadata?: Record<string, unknown>;
        }
      | null;

    const action = String(body?.action ?? "").trim();
    if (!action) {
      return NextResponse.json({ error: "action wajib diisi" }, { status: 400 });
    }

    let metadata: Prisma.InputJsonValue | null = null;
    if (body?.metadata) {
      const json = JSON.stringify(body.metadata);
      if (json.length > MAX_METADATA_CHARS) {
        return NextResponse.json({ error: "metadata terlalu besar" }, { status: 413 });
      }
      metadata = JSON.parse(json) as Prisma.InputJsonValue;
    }

    const created = await trackReferralEvent(req, {
      code: body?.refCode,
      action,
      sourcePath: body?.sourcePath,
      name: body?.name,
      email: body?.email,
      phone: body?.phone,
      villageName: body?.villageName,
      subject: body?.subject,
      metadata,
    });

    return NextResponse.json(
      { ok: true, tracked: Boolean(created), id: created ? String(created.id) : null },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/referrals/track error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
