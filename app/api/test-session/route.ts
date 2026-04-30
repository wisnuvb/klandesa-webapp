import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { getResolvedAuthSecret } from "@/lib/auth-secret";

export async function GET() {
  return NextResponse.json({
    message: "Test endpoint - no session required",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await req.json();
    console.log("[TEST] Request body:", body);

    const cookies = req.cookies.getAll();
    console.log("[TEST] Cookies:", {
      count: cookies.length,
      names: cookies.map((c) => c.name),
      sessionToken:
        cookies
          .find((c) => c.name.includes("next-auth.session-token"))
          ?.value?.substring(0, 50) + "...",
    });

    return NextResponse.json({
      success: true,
      received: body,
      cookies: {
        count: cookies.length,
        hasSessionToken: cookies.some((c) =>
          c.name.includes("next-auth.session-token"),
        ),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { getApiSession } = await import("@/lib/api-session");

    console.log("[TEST PATCH] Testing getApiSession directly");

    const session = await getApiSession(req);
    console.log("[TEST PATCH] Session result:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userVillageCode: session?.user?.villageCode,
    });

    const cookies = req.cookies.getAll();
    console.log("[TEST PATCH] Cookies in request:", {
      count: cookies.length,
      names: cookies.map((c) => c.name),
      sessionToken:
        cookies
          .find((c) => c.name.includes("next-auth.session-token"))
          ?.value?.substring(0, 50) + "...",
    });

    return NextResponse.json({
      session: {
        exists: !!session,
        user: session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              villageCode: session.user.villageCode,
            }
          : null,
      },
      cookies: {
        count: cookies.length,
        hasSessionToken: cookies.some((c) =>
          c.name.includes("next-auth.session-token"),
        ),
      },
    });
  } catch (error) {
    console.error("[TEST PATCH] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    success: false,
    message:
      "Alur mock resolveVillage dihapus; gunakan sesi nyata dan endpoint desa yang resmi.",
  });
}
