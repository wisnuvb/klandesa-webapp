import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { parseUkmCursor } from "@/lib/mobile/ukm-logic";
import { countOpenForSeller, listAsBuyer, listAsSeller } from "@/lib/ukm-order/service";

/** Pesanan UKM saya: ?peran=beli (yang saya pesan, bawaan) atau jual (pesanan masuk ke produk saya), ?status=, ?cursor=. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);
  const sp = req.nextUrl.searchParams;
  const base = { villageId: ctx.villageId, villageName: ctx.village.name, residentId: me.id, status: sp.get("status") ?? undefined, cursor: parseUkmCursor(sp.get("cursor")) };
  const seller = sp.get("peran") === "jual";
  const list = seller ? await listAsSeller(prisma, base) : await listAsBuyer(prisma, base);
  return NextResponse.json({ peran: seller ? "jual" : "beli", ...list, pendingForMe: await countOpenForSeller(prisma, ctx.villageId, me.id) });
}
