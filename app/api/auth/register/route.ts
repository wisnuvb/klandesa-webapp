import "@/env";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

function slugifyVillageCode(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  const compact = s.replace(/-/g, "");
  return compact.slice(0, 20) || "desa";
}

async function uniqueVillageCode(base: string): Promise<string> {
  let code = base;
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.village.findUnique({ where: { code } });
    if (!exists) return code;
    const suffix = Math.random().toString(36).slice(2, 6);
    code = `${base.slice(0, Math.max(0, 20 - 1 - suffix.length))}-${suffix}`;
  }
  throw new Error("Gagal membuat kode desa unik");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          namaKabupaten?: string;
          namaKecamatan?: string;
          namaDesa?: string;
          provinsi?: string;
          namaKepala?: string;
          nomorTelepon?: string;
          emailDesa?: string;
          password?: string;
          confirmPassword?: string;
          agreeTerms?: boolean;
          agreePrivacy?: boolean;
        }
      | null;

    const namaDesa = String(body?.namaDesa ?? "").trim();
    const namaKecamatan = String(body?.namaKecamatan ?? "").trim();
    const namaKabupaten = String(body?.namaKabupaten ?? "").trim();
    const provinsi = String(body?.provinsi ?? "").trim();

    const namaKepala = String(body?.namaKepala ?? "").trim();
    const nomorTelepon = String(body?.nomorTelepon ?? "").trim();
    const emailDesa = String(body?.emailDesa ?? "").trim();

    const password = String(body?.password ?? "");
    const confirmPassword = String(body?.confirmPassword ?? "");

    if (!namaDesa || !namaKecamatan || !namaKabupaten || !provinsi) {
      return NextResponse.json(
        { error: "Informasi desa belum lengkap" },
        { status: 400 }
      );
    }
    if (!namaKepala || !emailDesa) {
      return NextResponse.json(
        { error: "Kontak penanggung jawab belum lengkap" },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter" },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Konfirmasi password tidak sama" },
        { status: 400 }
      );
    }
    if (body?.agreeTerms !== true || body?.agreePrivacy !== true) {
      return NextResponse.json(
        { error: "Anda harus menyetujui syarat dan kebijakan privasi" },
        { status: 400 }
      );
    }

    const emailExists = await prisma.user.findUnique({
      where: { email: emailDesa },
      select: { id: true },
    });
    if (emailExists) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    const baseCode = slugifyVillageCode(namaDesa);
    const code = await uniqueVillageCode(baseCode);

    const address = `Desa ${namaDesa}, Kecamatan ${namaKecamatan}, Kabupaten ${namaKabupaten}, Provinsi ${provinsi}`;

    const passwordHash = await hashPassword(password);

    const created = await prisma.$transaction(async (tx) => {
      const village = await tx.village.create({
        data: {
          code,
          name: namaDesa,
          district: namaKecamatan,
          regency: namaKabupaten,
          province: provinsi,
          address,
          phone: nomorTelepon || null,
          email: emailDesa,
          subscriptionPlan: "starter",
          subscriptionStatus: "inactive",
        },
        select: { id: true, code: true, name: true },
      });

      const user = await tx.user.create({
        data: {
          villageId: village.id,
          email: emailDesa,
          password: passwordHash,
          name: namaKepala,
          phone: nomorTelepon || null,
          role: "admin",
          isActive: true,
        },
        select: { id: true, email: true },
      });

      return { village, user };
    });

    return NextResponse.json(
      {
        ok: true,
        village: created.village,
        user: created.user,
        next: { loginUrl: "/auth/signin", billingUrl: "/billing" },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

