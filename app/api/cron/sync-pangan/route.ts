import { NextRequest, NextResponse } from "next/server";
import { getCronSecret } from "@/lib/regional-news/config";
import { isValidCronAuth } from "@/lib/regional-news/cron-auth";
import { mirror } from "@/lib/pangan/service";
import { syncPangan, type SyncScope } from "@/lib/pangan/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES: SyncScope[] = ["all", "wilayah", "harga"];

/**
 * Job berkala cermin data pangan SP2KP (disarankan 3×/hari: 06:00, 12:00, 18:00 WIB).
 * `Authorization: Bearer $CRON_SECRET`. Query opsional: `scope=all|wilayah|harga`, `force=1` (wilayah),
 * `deadline=<detik>` (default 45, maks 240; di bawah batas waktu proxy). Idempoten dan bisa dilanjutkan.
 */
export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  if (!isValidCronAuth(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams;
  const scopeParam = q.get("scope") ?? "all";
  if (!SCOPES.includes(scopeParam as SyncScope)) {
    return NextResponse.json({ error: "scope harus all, wilayah, atau harga" }, { status: 400 });
  }
  const deadlineSec = Math.min(240, Math.max(5, Number(q.get("deadline")) || 45));

  const report = await syncPangan(
    { scope: scopeParam as SyncScope, force: q.get("force") === "1", deadlineMs: deadlineSec * 1000 },
    { mirror },
  );
  console.log("[pangan-sync]", JSON.stringify(report));
  return NextResponse.json({ ok: true, ...report });
}
