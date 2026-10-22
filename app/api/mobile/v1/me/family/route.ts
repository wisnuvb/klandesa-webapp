import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { canActForMember, maskNik } from "@/lib/mobile/mail-logic";

/** Anggota KK. NIK disamarkan; `canActFor` menandai siapa yang boleh dibuatkan surat. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const members = me.kk
    ? await prisma.resident.findMany({
        where: { villageId: loaded.ctx.villageId, kk: me.kk, isAlive: true },
        select: { id: true, nik: true, name: true, familyRole: true, birthDate: true },
        orderBy: { birthDate: "asc" },
      })
    : [];
  const head = canActForMember(me.familyRole);
  const list = members.length ? members : [{ id: me.id, nik: me.nik, name: me.name, familyRole: me.familyRole, birthDate: me.birthDate }];
  return NextResponse.json({
    me: me.id,
    members: list.map((m) => ({
      id: m.id, name: m.name, relation: m.familyRole, nikMasked: maskNik(m.nik), birthDate: m.birthDate,
      canActFor: m.id === me.id || head,
    })),
  });
}
