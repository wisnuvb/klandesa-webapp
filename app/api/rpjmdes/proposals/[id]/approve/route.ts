import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village, session } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const role = session.user.role ?? "staff";
    if (role !== "admin" && role !== "village_head") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const proposalId = Number(id);
    if (!Number.isFinite(proposalId) || proposalId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const targetYear =
      body && typeof body === "object" && "year" in body
        ? Number((body as { year?: unknown }).year)
        : new Date().getFullYear();

    const proposal = await prisma.musdesProposal.findFirst({
      where: { id: proposalId, villageId: village.id },
    });
    if (!proposal) {
      return NextResponse.json({ error: "Usulan tidak ditemukan" }, { status: 404 });
    }
    if (proposal.status === "approved") {
      return NextResponse.json({ error: "Usulan sudah disetujui" }, { status: 409 });
    }

    let planId = proposal.planId;
    if (!planId) {
      const activePlan = await prisma.rpjmdesPlan.findFirst({
        where: { villageId: village.id, status: { in: ["active", "draft"] } },
        orderBy: { periodStart: "desc" },
      });
      if (!activePlan) {
        return NextResponse.json(
          { error: "Buat rencana RPJMDes terlebih dahulu" },
          { status: 400 },
        );
      }
      planId = activePlan.id;
    }

    const sdgGoalIds = parseSdgGoalIds(proposal.sdgGoalIds);

    const result = await prisma.$transaction(async (tx) => {
      const activity = await tx.rkpdesActivity.create({
        data: {
          planId,
          title: proposal.title,
          description: proposal.description,
          year: Number.isFinite(targetYear) ? Math.trunc(targetYear) : new Date().getFullYear(),
          location: proposal.rt && proposal.rw ? `RT ${proposal.rt}/RW ${proposal.rw}` : null,
          sdgGoalIds,
          priorityScore: proposal.priorityScore,
          status: "planned",
          source: "musdes_proposal",
        },
      });

      const updated = await tx.musdesProposal.update({
        where: { id: proposal.id },
        data: {
          status: "approved",
          planId,
          mergedActivityId: activity.id,
        },
      });

      return { activity, proposal: updated };
    });

    return NextResponse.json({
      ok: true,
      activityId: result.activity.id,
      proposal: {
        id: result.proposal.id,
        status: result.proposal.status,
        mergedActivityId: result.proposal.mergedActivityId,
      },
    });
  } catch (e) {
    console.error("POST /api/rpjmdes/proposals/[id]/approve", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
