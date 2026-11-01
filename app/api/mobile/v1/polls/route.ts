import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { pollsForResident } from "@/lib/polls/service";

/** Polling desa untuk warga yang login: berjalan, terjadwal, dan yang ditutup 30 hari terakhir. Hasil hanya jumlah. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);
  const items = await pollsForResident(prisma, { villageId: loaded.ctx.villageId, residentId: me.id, birthDate: me.birthDate });
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
