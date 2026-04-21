import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { getResolvedAuthSecret } from "@/lib/auth-secret";

export async function GET() {
  return NextResponse.json({
    message: "Test endpoint - no session required",
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[TEST] Request body:", body);

    const cookies = req.cookies.getAll();
    console.log("[TEST] Cookies:", {
      count: cookies.length,
      names: cookies.map(c => c.name),
      sessionToken: cookies.find(c => c.name.includes('next-auth.session-token'))?.value?.substring(0, 50) + '...'
    });

    return NextResponse.json({
      success: true,
      received: body,
      cookies: {
        count: cookies.length,
        hasSessionToken: cookies.some(c => c.name.includes('next-auth.session-token'))
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// Endpoint untuk test session langsung
export async function PATCH(req: NextRequest) {
  try {
    // Import getApiSession untuk test
    const { getApiSession } = await import("@/lib/api-session");

    console.log("[TEST PATCH] Testing getApiSession directly");

    const session = await getApiSession(req);
    console.log("[TEST PATCH] Session result:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userVillageCode: session?.user?.villageCode
    });

    const cookies = req.cookies.getAll();
    console.log("[TEST PATCH] Cookies in request:", {
      count: cookies.length,
      names: cookies.map(c => c.name),
      sessionToken: cookies.find(c => c.name.includes('next-auth.session-token'))?.value?.substring(0, 50) + '...'
    });

    return NextResponse.json({
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          villageCode: session.user.villageCode
        } : null
      },
      cookies: {
        count: cookies.length,
        hasSessionToken: cookies.some(c => c.name.includes('next-auth.session-token'))
      }
    });
  } catch (error) {
    console.error("[TEST PATCH] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// Endpoint untuk test billing checkout dengan session manual
export async function DELETE(req: NextRequest) {
  try {
    console.log("[TEST DELETE] Testing with mock session approach");

    // Buat mock session object
    const mockSession = {
      user: {
        id: "test-user-123",
        email: "test@example.com",
        name: "Test User",
        role: "admin",
        villageId: 1,
        villageCode: "test-village"
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    // Test resolve village langsung
    const { resolveVillage } = await import("@/lib/village");

    console.log("[TEST DELETE] Testing village resolution with mock session");

    const village = await resolveVillage({
      req,
      session: mockSession
    });

    console.log("[TEST DELETE] Village resolved:", {
      hasVillage: !!village,
      village: village ? {
        id: village.id,
        code: village.code,
        name: village.name
      } : null
    });

    return NextResponse.json({
      success: true,
      mockSession: {
        user: mockSession.user
      },
      village: village ? {
        id: village.id,
        code: village.code,
        name: village.name
      } : null,
      message: "Mock session test completed"
    });
  } catch (error) {
    console.error("[TEST DELETE] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}