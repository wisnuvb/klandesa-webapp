import { NextResponse } from "next/server";
import { auth } from "@/auth";
import pkg from "@/package.json";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { version: pkg.version },
    { headers: { "Cache-Control": "no-store" } },
  );
}
