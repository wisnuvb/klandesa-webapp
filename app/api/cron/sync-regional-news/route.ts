import { NextRequest, NextResponse } from "next/server";
import { getCronSecret, isRegionalNewsEnabled } from "@/lib/regional-news/config";
import { syncAllActiveRegions } from "@/lib/regional-news/service";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization")?.trim();
  if (auth !== `Bearer ${secret}`) return unauthorized();

  if (!isRegionalNewsEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Regional news disabled" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const result = await syncAllActiveRegions({ force });
  return NextResponse.json({ ok: true, ...result });
}
