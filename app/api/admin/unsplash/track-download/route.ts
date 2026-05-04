import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";

export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim() || "";
  if (!accessKey) {
    return NextResponse.json(
      { error: "UNSPLASH_ACCESS_KEY belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { downloadLocation?: unknown }
    | null;
  const dl = body?.downloadLocation;
  const downloadLocation = typeof dl === "string" ? dl.trim() : "";
  if (!downloadLocation) {
    return NextResponse.json(
      { error: "downloadLocation wajib diisi" },
      { status: 400 },
    );
  }

  const url = new URL(downloadLocation);
  url.searchParams.set("client_id", accessKey);

  const res = await fetch(url.toString(), {
    headers: { "Accept-Version": "v1" },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Gagal tracking download" }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
