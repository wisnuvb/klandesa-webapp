import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { resolvePublicEnrollmentSummary } from "@/lib/social-benefit-public-label";
import { SOCIAL_PROGRAM_NATIONAL_RESOURCES, SOCIAL_PROGRAM_PUBLIC_DISCLAIMERS } from "@/lib/social-benefit-national-links";

/** Program bantuan yang tercatat di desa ini atas NIK akun yang sedang login. Tidak pernah menerima NIK dari klien. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const rows = await prisma.socialBenefitBeneficiary.findMany({
    where: { nik: me.nik.toUpperCase(), program: { villageId: loaded.ctx.villageId, isActive: true } },
    select: { id: true, status: true, publicNote: true, program: { select: { name: true, periodLabel: true } } },
    orderBy: [{ program: { sortOrder: "asc" } }, { id: "asc" }],
    take: 50,
  });

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      programName: r.program.name,
      periodLabel: r.program.periodLabel,
      status: r.status,
      summary: resolvePublicEnrollmentSummary({ status: r.status, publicNote: r.publicNote }),
    })),
    disclaimers: SOCIAL_PROGRAM_PUBLIC_DISCLAIMERS,
    nationalResources: SOCIAL_PROGRAM_NATIONAL_RESOURCES.map(({ title, description, href }) => ({ title, description, href })),
  });
}
