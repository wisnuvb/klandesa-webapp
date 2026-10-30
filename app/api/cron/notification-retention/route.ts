import { NextRequest, NextResponse } from "next/server";
import { getCronSecret } from "@/lib/regional-news/config";
import { isValidCronAuth } from "@/lib/regional-news/cron-auth";
import { purgeExpiredNotifications } from "@/lib/notifications/retention";

export const dynamic = "force-dynamic";

/** Job harian: hapus permanen notifikasi web & mobile yang melewati batas simpan. Dijalankan dengan `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  if (!isValidCronAuth(req.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await purgeExpiredNotifications();
  return NextResponse.json({ ok: true, ...result });
}
