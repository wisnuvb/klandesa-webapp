import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { small: string; regular: string; full: string };
  links: { html: string; download_location: string };
  user: { name: string; username: string; links: { html: string } };
};

function isUnsplashPhotoArray(value: unknown): value is UnsplashPhoto[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const o = item as Record<string, unknown>;
    const urls = o.urls as Record<string, unknown> | undefined;
    const links = o.links as Record<string, unknown> | undefined;
    const user = o.user as Record<string, unknown> | undefined;
    const userLinks = user?.links as Record<string, unknown> | undefined;
    return (
      typeof o.id === "string" &&
      urls != null &&
      typeof urls.small === "string" &&
      typeof urls.regular === "string" &&
      typeof urls.full === "string" &&
      links != null &&
      typeof links.html === "string" &&
      typeof links.download_location === "string" &&
      user != null &&
      typeof user.name === "string" &&
      typeof user.username === "string" &&
      userLinks != null &&
      typeof userLinks.html === "string"
    );
  });
}

function readLimit(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("limit");
  const n = raw ? Number(raw) : 12;
  if (!Number.isFinite(n)) return 12;
  return Math.max(1, Math.min(30, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim() || "";
  if (!accessKey) {
    return NextResponse.json(
      { error: "UNSPLASH_ACCESS_KEY belum dikonfigurasi" },
      { status: 503 },
    );
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q)
    return NextResponse.json({ error: "Query q wajib diisi" }, { status: 400 });

  const limit = readLimit(req);
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", q);
  url.searchParams.set("per_page", String(limit));
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as
    | {
        results?: Array<{
          id: string;
          alt_description: string | null;
          urls: { small: string; regular: string; full: string };
          links: { html: string; download_location: string };
          user: { name: string; username: string; links: { html: string } };
        }>;
        total?: number;
      }
    | { errors?: string[] }
    | null;

  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "errors" in data &&
      Array.isArray(data.errors)
        ? data.errors.join("; ")
        : "Gagal mengambil gambar";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const resultsRaw =
    data && typeof data === "object"
      ? (data as Record<string, unknown>).results
      : undefined;
  const results = isUnsplashPhotoArray(resultsRaw) ? resultsRaw : [];

  return NextResponse.json(
    {
      results: results.map((p) => ({
        id: p.id,
        alt: p.alt_description,
        urls: p.urls,
        links: {
          html: p.links.html,
          downloadLocation: p.links.download_location,
        },
        attribution: {
          authorName: p.user.name,
          authorUsername: p.user.username,
          authorUrl: p.user.links.html,
          source: "Unsplash",
        },
      })),
    },
    { status: 200 },
  );
}
