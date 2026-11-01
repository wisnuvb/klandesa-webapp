import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { localToday } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { registrationPack } from "@/lib/bumdes/service";

/** Lembar data pendaftaran BUM Desa untuk dicetak (Permendesa PDTT 3/2021 Pasal 9-10): identitas, legalitas, pengurus, unit usaha. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bumdes/pendaftaran", "Gagal menyiapkan lembar pendaftaran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx);
    if (!s.ok) return s.response;
    const r = await registrationPack(prisma, { villageId: s.ctx.village.id, bumdesId: s.bumdes.id, today: localToday() });
    if (!r.ok) return failResponse(r);
    return NextResponse.json(r.data);
  });
}
