import { getApiSession } from "@/lib/api-session";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

async function resolveVillage(
  req: NextRequest,
  queryVillageCode?: string,
  session?: any
) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }

  if (queryVillageCode) {
    const village = await prisma.village.findUnique({
      where: { code: queryVillageCode },
    });
    if (village) return village;
  }

  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const village = await prisma.village.findUnique({ where: { code: sub } });
    if (village) return village;
  }

  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const village = await prisma.village.findUnique({
      where: { code: defaultCode },
    });
    if (village) return village;
  }

  const firstVillage = await prisma.village.findFirst();
  return firstVillage;
}

// DELETE - Delete a village potential
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage(req, undefined, session);

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const potentialId = parseInt(id);

    // Check if potential exists and belongs to this village
    const villagePotential = await prisma.villagePotential.findUnique({
      where: { id: potentialId },
    });

    if (!villagePotential) {
      return NextResponse.json(
        { error: "Village potential not found" },
        { status: 404 }
      );
    }

    if (villagePotential.villageId !== village.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the village potential
    await prisma.villagePotential.delete({
      where: { id: potentialId },
    });

    return NextResponse.json({
      message: "Village potential deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting village potential:", error);
    return NextResponse.json(
      { error: "Failed to delete village potential" },
      { status: 500 }
    );
  }
}
