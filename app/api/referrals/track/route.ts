import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { trackReferralEvent } from "@/lib/referrals/tracking";

export async function POST(req: NextRequest) {
  try {
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

    const metadata = body?.metadata
      ? (JSON.parse(JSON.stringify(body.metadata)) as Prisma.InputJsonValue)
      : null;

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
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
