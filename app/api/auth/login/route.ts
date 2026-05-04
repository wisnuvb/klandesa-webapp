import "@/env";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateTokens } from "@/lib/auth";
import {
  REGIONAL_ROLE_KABUPATEN,
  REGIONAL_ROLE_KECAMATAN,
  normalizeLocationKey,
} from "@/lib/regional-policy";
import type { RegionalScope } from "@/lib/regional-session";

function buildRegionalScopeFromUser(user: {
  role: string;
  scopeRegency: string;
  scopeDistrict: string | null;
}): RegionalScope | null {
  const regency = normalizeLocationKey(user.scopeRegency);
  if (!regency) return null;
  if (user.role === REGIONAL_ROLE_KABUPATEN) {
    return { level: "REGENCY", regency };
  }
  if (user.role === REGIONAL_ROLE_KECAMATAN) {
    const district = user.scopeDistrict
      ? normalizeLocationKey(user.scopeDistrict)
      : "";
    if (!district) return null;
    return { level: "DISTRICT", regency, district };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Login attempt:", {
      email: body.email,
      timestamp: new Date().toISOString(),
    });

    const { email, password } = body;

    if (!email || !password) {
      console.log("Missing credentials");
      return NextResponse.json(
        { error: "Email dan password harus diisi" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { village: true },
    });

    if (user) {
      if (!user.isActive) {
        console.log(`User inactive: ${email}`);
        return NextResponse.json(
          { error: "Akun Anda telah dinonaktifkan" },
          { status: 403 },
        );
      }

      const isPasswordValid = await verifyPassword(password, user.password);
      console.log(`Password verification for ${email}: ${isPasswordValid}`);

      if (!isPasswordValid) {
        console.log(`Invalid password for: ${email}`);
        return NextResponse.json(
          { error: "Email atau password salah" },
          { status: 401 },
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
        villageId: user.villageId,
        accountType: "village",
      });

      return NextResponse.json({
        accountType: "village",
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
    }

    const platformUser = await prisma.platformUser.findUnique({
      where: { email },
    });

    if (platformUser) {
      if (!platformUser.isActive) {
        return NextResponse.json(
          { error: "Akun Anda telah dinonaktifkan" },
          { status: 403 },
        );
      }

      const isPlatformPasswordValid = await verifyPassword(
        password,
        platformUser.password,
      );
      if (!isPlatformPasswordValid) {
        return NextResponse.json(
          { error: "Email atau password salah" },
          { status: 401 },
        );
      }

      await prisma.platformUser.update({
        where: { id: platformUser.id },
        data: { lastLogin: new Date() },
      });

      const { accessToken, refreshToken } = generateTokens({
        id: platformUser.id,
        email: platformUser.email,
        role: platformUser.role,
        accountType: "platform",
      });

      return NextResponse.json({
        accountType: "platform",
        user: {
          platformUserId: platformUser.id,
          email: platformUser.email,
          name: platformUser.name,
          role: platformUser.role,
        },
        accessToken,
        refreshToken,
      });
    }

    const regionalUser = await prisma.regionalUser.findUnique({
      where: { email },
    });

    if (regionalUser) {
      if (!regionalUser.isActive) {
        return NextResponse.json(
          { error: "Akun Anda telah dinonaktifkan" },
          { status: 403 },
        );
      }

      const isRegionalPasswordValid = await verifyPassword(
        password,
        regionalUser.password,
      );
      if (!isRegionalPasswordValid) {
        return NextResponse.json(
          { error: "Email atau password salah" },
          { status: 401 },
        );
      }

      const regionalScope = buildRegionalScopeFromUser(regionalUser);
      if (!regionalScope) {
        return NextResponse.json(
          { error: "Akun wilayah tidak valid. Hubungi administrator." },
          { status: 403 },
        );
      }

      await prisma.regionalUser.update({
        where: { id: regionalUser.id },
        data: { lastLogin: new Date() },
      });

      const { accessToken, refreshToken } = generateTokens({
        id: regionalUser.id,
        email: regionalUser.email,
        role: regionalUser.role,
        accountType: "regional",
      });

      return NextResponse.json({
        accountType: "regional",
        user: {
          regionalUserId: regionalUser.id,
          email: regionalUser.email,
          name: regionalUser.name,
          role: regionalUser.role,
          regionalScope,
        },
        accessToken,
        refreshToken,
      });
    }

    const partner = await prisma.partner.findUnique({
      where: { email },
    });

    if (!partner) {
      console.log(`User not found: ${email}`);
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 },
      );
    }

    if (partner.status !== "active") {
      return NextResponse.json(
        { error: "Akun Anda belum aktif. Hubungi administrator." },
        { status: 403 },
      );
    }

    const isPartnerPasswordValid = await verifyPassword(password, partner.password);
    if (!isPartnerPasswordValid) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 },
      );
    }

    await prisma.partner.update({
      where: { id: partner.id },
      data: { lastLogin: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens({
      id: partner.id,
      email: partner.email,
      role: "partner",
      accountType: "partner",
    });

    return NextResponse.json({
      accountType: "partner",
      user: {
        partnerId: partner.id,
        email: partner.email,
        name: partner.name,
        role: "partner",
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
