import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { pickSummary } from "@/lib/audit/diff";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const potentialId = parseInt(id);

    const villagePotential = await prisma.villagePotential.findUnique({
      where: { id: potentialId },
    });

    if (!villagePotential) {
      return NextResponse.json(
        { error: "Village potential not found" },
        { status: 404 },
      );
    }

    if (villagePotential.villageId !== village.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.villagePotential.delete({
      where: { id: potentialId },
    });

    await auditWeb(req, loaded.ctx, "delete", "village_potentials", potentialId, pickSummary(villagePotential, ["year", "population", "households"]));

    return NextResponse.json({ message: "Village potential deleted successfully" });
  } catch (error) {
    console.error("Error deleting village potential:", error);
    return NextResponse.json(
      { error: "Failed to delete village potential" },
      { status: 500 },
    );
  }
}
