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

  // Anti-SSRF & kebocoran kunci: hanya endpoint unduhan resmi Unsplash (https://api.unsplash.com/photos/{id}/download).
  // Tanpa ini admin (atau sesi admin yang dicuri) bisa menyuruh server memanggil alamat internal sambil mengirim UNSPLASH_ACCESS_KEY.
  let url: URL;
  try {
    url = new URL(downloadLocation);
  } catch {
    return NextResponse.json({ error: "downloadLocation tidak valid" }, { status: 400 });
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "api.unsplash.com" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    !/^\/photos\/[A-Za-z0-9_-]{1,64}\/download\/?$/.test(url.pathname)
  ) {
    return NextResponse.json({ error: "downloadLocation harus berupa tautan unduhan Unsplash" }, { status: 400 });
  }
  url.searchParams.set("client_id", accessKey);

  const res = await fetch(url.toString(), {
    headers: { "Accept-Version": "v1" },
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res) return NextResponse.json({ error: "Gagal tracking download" }, { status: 502 });

  if (!res.ok) {
    return NextResponse.json({ error: "Gagal tracking download" }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
