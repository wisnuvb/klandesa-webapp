import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

function getOrigin(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  return "http://localhost:3000";
}

/**
 * URL lama di QR: pindai → redirect ke halaman check-in (bukan JSON mentah).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET ?? "your-secret-key";
  try {
    const payload = jwt.verify(token, secret) as { type?: string };
    if (payload.type !== "ATTENDANCE_QR") {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Token tidak valid/expired" }, { status: 400 });
  }

  const origin = getOrigin(req);
  const dest = `${origin}/absensi/check-in?token=${encodeURIComponent(token)}`;
  return NextResponse.redirect(dest);
}
