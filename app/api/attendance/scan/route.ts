import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 400 });
    }

    const secret = process.env.AUTH_SECRET ?? "your-secret-key";
    const payload = jwt.verify(token, secret) as JwtPayload;

    if (payload.type !== "ATTENDANCE_QR") {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      type: payload.type,
      villageId: payload.villageId,
      villageCode: payload.villageCode,
      exp: payload.exp,
      iat: payload.iat,
    });
  } catch {
    return NextResponse.json({ error: "Token tidak valid/expired" }, { status: 400 });
  }
}

