/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const body = (await req.json()) as { from?: unknown; to?: unknown };
    const from = typeof body.from === "string" ? body.from.trim() : "";
    const to = typeof body.to === "string" ? body.to.trim() : "";

    if (!from) {
      return NextResponse.json(
        { error: "Kategori asal wajib diisi" },
        { status: 400 },
      );
    }
    if (!to) {
      return NextResponse.json(
        { error: "Nama kategori baru wajib diisi" },
        { status: 400 },
      );
    }

    const result = await prisma.potential.updateMany({
      where: {
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
        subCategory: from,
      },
      data: { subCategory: to },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Error renaming UKM category:", error);
    return NextResponse.json(
      { error: "Failed to rename category" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const body = (await req.json()) as { name?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi" },
        { status: 400 },
      );
    }

    const result = await prisma.potential.updateMany({
      where: {
        villageId: village.id,
        category: { in: ["UMKM", "UKM"] },
        subCategory: name,
      },
      data: { subCategory: null },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Error deleting UKM category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
