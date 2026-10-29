import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { listActiveRts } from "@/lib/mobile/rt";
import { notifyAccount, notifyVillageStaff } from "@/lib/mobile/notify";
import { withStatus } from "@/lib/mobile/fees";
import { isOwnReportPhotoUrl } from "@/lib/mobile/report-logic";
import { validatePayment } from "@/lib/mobile/fees-logic";
import { normalizeRtCode } from "@/lib/mobile/rt-logic";
import { getSpacesConfig } from "@/lib/spaces";

const MAX_PENDING_PER_CHARGE = 3;

/** Warga melapor "sudah bayar". Belum dihitung lunas sampai bendahara mengonfirmasi. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  const id = Number((await params).id);
  if (!me || !me.kk || !Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const charge = await prisma.feeCharge.findFirst({ where: { id, villageId: ctx.villageId, kk: me.kk } });
  const schedule = charge ? await prisma.feeSchedule.findFirst({ where: { id: charge.scheduleId, villageId: ctx.villageId } }) : null;
  if (!charge || !schedule) return mobileError("INVALID_REQUEST", "Tagihan tidak ditemukan.", 404);
  if (charge.waivedAt) return mobileError("INVALID_REQUEST", "Tagihan ini dibebaskan, tidak perlu dibayar.", 409);

  const [st] = await withStatus([charge], new Map([[schedule.id, schedule.dueDay]]));
  const room = st!.outstanding - st!.pending; // sisa yang belum dilaporkan
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const v = validatePayment(body, room);
  if (!v.ok) return mobileError("INVALID_REQUEST", room <= 0 ? "Pembayaran untuk tagihan ini sudah dilaporkan dan menunggu dicek." : v.message, room <= 0 ? 409 : 400);
  const proof = body?.proofUrl;
  if (proof != null && proof !== "" && !isOwnReportPhotoUrl(proof, getSpacesConfig().cdnBaseUrl, ctx.village.code, "mobile-fees")) {
    return mobileError("INVALID_REQUEST", "Foto bukti tidak valid. Unggah ulang dari aplikasi.", 400);
  }
  const pendingCount = await prisma.feePayment.count({ where: { chargeId: charge.id, status: "pending" } });
  if (pendingCount >= MAX_PENDING_PER_CHARGE) return mobileError("RATE_LIMITED", "Masih ada laporan yang menunggu dicek. Tunggu bendahara memeriksanya.", 429);

  const p = await prisma.feePayment.create({
    data: {
      villageId: ctx.villageId, chargeId: charge.id, amount: v.amount, method: v.method, note: v.note,
      proofUrl: typeof proof === "string" && proof ? proof : null, status: "pending", source: "warga",
      paidAt: new Date(), recordedByType: "warga", recordedById: me.id,
    },
    select: { id: true },
  });

  // Beri tahu pengelola: Ketua RT pemilik jadwal, atau perangkat desa.
  const text = { type: "system" as const, title: "Laporan pembayaran baru", body: `${charge.headName}: ${schedule.name}`, deepLink: schedule.scope === "rt" ? "/iuran?scope=rt" : "/iuran?scope=desa" };
  if (schedule.scope === "rt") {
    const officers = (await listActiveRts(ctx.villageId)).filter((o) => o.rt === normalizeRtCode(schedule.rt) && (schedule.rw == null || o.rw === normalizeRtCode(schedule.rw)));
    const accs = await prisma.citizenAccount.findMany({ where: { residentId: { in: officers.map((o) => o.residentId) }, status: "ACTIVE" }, select: { id: true } });
    await Promise.all(accs.map((a) => notifyAccount("citizen", a.id, ctx.villageId, text)));
  } else {
    void notifyVillageStaff(ctx.villageId, "finance", text);
  }
  return NextResponse.json({ id: p.id }, { status: 201 });
}
