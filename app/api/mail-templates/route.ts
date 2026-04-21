import { getApiSession } from "@/lib/api-session";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

async function resolveVillage(req: NextRequest, session?: any) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }

  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const village = await prisma.village.findUnique({ where: { code: sub } });
    if (village) return village;
  }

  return await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage(req, session);

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const templates = await prisma.mailTemplate.findMany({
      where: {
        OR: [{ villageId: village.id }, { isGlobal: true }],
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (err) {
    console.error("GET /api/mail-templates error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage(req, session);

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const { name, description, category, templateStructure, contentTemplate, isGlobal } = body;

    if (!name?.trim() || !category?.trim() || templateStructure == null) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, or templateStructure" },
        { status: 400 }
      );
    }

    const template = await prisma.mailTemplate.create({
      data: {
        villageId: village.id,
        name,
        description: description || "",
        category,
        templateStructure,
        contentTemplate: contentTemplate ?? "",
        isGlobal: isGlobal || false,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("POST /api/mail-templates error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage(req, session);

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const {
      id,
      name,
      description,
      category,
      templateStructure,
      contentTemplate,
      isGlobal,
      isActive,
    } = body;

    if (!id || !name?.trim() || !category?.trim() || templateStructure == null) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, category, or templateStructure" },
        { status: 400 }
      );
    }

    const existing = await prisma.mailTemplate.findFirst({
      where: {
        id: Number(id),
        OR: [{ villageId: village.id }, { isGlobal: true }],
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updated = await prisma.mailTemplate.update({
      where: { id: Number(id) },
      data: {
        name,
        description: description || "",
        category,
        templateStructure,
        contentTemplate: contentTemplate ?? "",
        isGlobal: isGlobal ?? false,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/mail-templates error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
