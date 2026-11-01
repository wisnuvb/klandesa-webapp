import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { loadCoopApiContextWithCooperative, requireManage } from "@/lib/coop/api-context";
import { getFormation, saveFormation } from "@/lib/coop/formation";

/** Pelacak pembentukan Kopdes Merah Putih: isian dan langkah yang sudah selesai. */
export async function GET(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const { cooperative, access } = loaded.ctx;
  return NextResponse.json({ formation: await getFormation(prisma, cooperative.id), canManage: access.manage }, { headers: { "Cache-Control": "no-store" } });
}

/** Simpan seluruh isian (kolom kosong = dikosongkan). Hanya pengelola koperasi. */
export async function PUT(req: NextRequest) {
  const loaded = await loadCoopApiContextWithCooperative(req);
  if (!loaded.ok) return loaded.response;
  const deny = requireManage(loaded.ctx);
  if (deny) return deny;
  const { cooperative, village, userId } = loaded.ctx;
  const r = await saveFormation(prisma, { cooperativeId: cooperative.id, userId, input: await req.json().catch(() => null) });
  if (!r.ok) return NextResponse.json({ error: r.errors[0], errors: r.errors, fieldErrors: r.fieldErrors }, { status: 400 });
  await auditWeb(req, { userId, village }, "update", "cooperative_formations", cooperative.id, { steps: r.data.steps.filter((s) => s.done).length });
  return NextResponse.json({ success: true, formation: r.data });
}
