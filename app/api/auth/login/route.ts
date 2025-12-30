import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateTokens } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Login attempt:", {
      email: body.email,
      timestamp: new Date().toISOString(),
    });

    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      console.log("Missing credentials");
      return NextResponse.json(
        { error: "Email dan password harus diisi" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { village: true },
    });

    if (!user) {
      console.log(`User not found: ${email}`);
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      );
    }

    console.log(`User found: ${user.email}, active: ${user.isActive}`);

    // Check if user is active
    if (!user.isActive) {
      console.log(`User inactive: ${email}`);
      return NextResponse.json(
        { error: "Akun Anda telah dinonaktifkan" },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    console.log(`Password verification for ${email}: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log(`Invalid password for: ${email}`);
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      villageId: user.villageId,
    });

    // Return user data and tokens
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        village: {
          id: user.village.id,
          code: user.village.code,
          name: user.village.name,
          district: user.village.district,
          regency: user.village.regency,
          province: user.village.province,
          address: user.village.address,
          postalCode: user.village.postalCode,
          phone: user.village.phone,
          email: user.village.email,
          website: user.village.website,
          logoUrl: user.village.logoUrl,
        },
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
