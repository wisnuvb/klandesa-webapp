import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { castVote } from "@/lib/polls/service";

type Ctx = { params: Promise<{ id: string }> };

/** { optionIndex }: memberikan suara satu kali. Identitas diambil dari sesi, bukan dari isian klien. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);
  const raw = (await params).id;
  if (!/^\d{1,10}$/.test(raw)) return mobileError("INVALID_REQUEST", "Polling tidak ditemukan.", 404, { reason: "NOT_FOUND" });
  const body = (await req.json().catch(() => null)) as { optionIndex?: unknown } | null;
  const r = await castVote(prisma, { villageId: loaded.ctx.villageId, residentId: me.id, pollId: Number(raw), optionIndex: body?.optionIndex });
  // `reason` memberi tahu aplikasi penyebab pastinya (NOT_FOUND, NOT_OPEN, ALREADY_VOTED, ...).
  if (!r.ok) return mobileError(r.code === "NOT_ELIGIBLE" ? "FORBIDDEN" : "INVALID_REQUEST", r.message, r.status, { reason: r.code });
  return NextResponse.json({ ok: true });
}
