import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { checkSplit, splitFamily } from "@/lib/kependudukan/split-service";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { resolveKkKey } from "@/lib/kependudukan/kk-list-service";

/**
 * Pecah KK: sebagian anggota aktif satu KK pindah ke nomor KK BARU.
 * Body: { newKk, effectiveDate, moves: [{ residentId, familyRole }], newSourceHeadId?, address?: { enabled, address, rt, rw, hamlet } }.
 * `?periksa=1` hanya memeriksa (tanpa menulis) dan mengembalikan `issues`.
 * Izin: residents:update (peta izin API). Atomik: gagal sebagian = tidak ada yang berubah. Bekerja di semua desa;
 * Buku Mutasi dan sinkronisasi rumah tangga ikut hanya bila Kependudukan v2 aktif.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ kk: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!isVillageSubscriptionActive(ctx.village)) return subscriptionBlockedResponse(ctx.village);

    // `[kk]` boleh berupa `ref` (id salah satu anggota; halaman /data-kk tidak menerima nomor KK utuh) atau nomor KK.
    const { kk: key } = await params;
    const kk = await resolveKkKey(prisma, ctx.village.id, key);
    if (!kk) return NextResponse.json({ error: "KK tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);

    if (req.nextUrl.searchParams.get("periksa") === "1") {
      const c = await checkSplit(prisma, ctx.village.id, kk, body);
      if (c === "not_found") return NextResponse.json({ error: "KK tidak ditemukan." }, { status: 404 });
      if (!c) return NextResponse.json({ error: "Data pecah KK tidak valid." }, { status: 400 });
      return NextResponse.json({ issues: c.issues, blocking: c.blocking });
    }

    const r = await splitFamily(prisma, { village: ctx.village, userId: ctx.userId ?? null, sourceKk: kk, body });
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.issues ? { issues: r.issues } : {}) }, { status: r.status });

    // Tanpa NIK, nama, atau alamat: hanya jumlah dan 4 digit akhir KK.
    await auditWeb(req, ctx, "split", "residents", `kk-${r.data.sourceKk.slice(-4)}`, {
      fromKkLast4: r.data.sourceKk.slice(-4),
      toKkLast4: r.data.newKk.slice(-4),
      moved: r.data.moved.length,
      newSourceHead: r.data.newSourceHeadId != null,
    });
    return NextResponse.json({ success: true, newKk: r.data.newKk, moved: r.data.moved, mutations: r.data.mutations });
  } catch (e) {
    console.error("POST /api/kk/[kk]/pecah error:", e);
    return NextResponse.json({ error: "Gagal memecah KK" }, { status: 500 });
  }
}
