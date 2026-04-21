import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { buildFolderPath, slugFolderSegment } from "@/lib/digitalArchive/folderPath";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

async function nextUniquePath(
  villageId: number,
  parentPath: string | null,
  displayName: string,
) {
  const baseSeg = slugFolderSegment(displayName);
  let candidate = buildFolderPath(parentPath, baseSeg);
  let n = 2;
  while (
    await prisma.digitalArchiveFolder.findFirst({
      where: { villageId, path: candidate },
      select: { id: true },
    })
  ) {
    candidate = buildFolderPath(parentPath, `${baseSeg}-${n}`);
    n += 1;
  }
  return candidate;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const rows = await prisma.digitalArchiveFolder.findMany({
      where: { villageId: village.id },
      orderBy: { path: "asc" },
      select: {
        id: true,
        parentId: true,
        name: true,
        path: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      folders: rows.map((r) => ({
        id: Number(r.id),
        parentId: r.parentId ? Number(r.parentId) : null,
        name: r.name,
        path: r.path,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/digital-archives/folders error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = (await req.json()) as {
      name?: string;
      parentId?: number | null;
    };

    const name = (body.name || "").toString().trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let parentPath: string | null = null;
    let parentId: bigint | null = null;

    if (body.parentId != null) {
      const pid = Number(body.parentId);
      if (!Number.isFinite(pid) || pid <= 0) {
        return NextResponse.json({ error: "parentId invalid" }, { status: 400 });
      }
      const parent = await prisma.digitalArchiveFolder.findFirst({
        where: { id: BigInt(pid), villageId: village.id },
        select: { id: true, path: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      }
      parentId = parent.id;
      parentPath = parent.path;
    }

    const path = await nextUniquePath(village.id, parentPath, name);

    const created = await prisma.digitalArchiveFolder.create({
      data: {
        villageId: village.id,
        parentId,
        name: name.slice(0, 255),
        path,
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        path: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: Number(created.id),
      parentId: created.parentId ? Number(created.parentId) : null,
      name: created.name,
      path: created.path,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/digital-archives/folders error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
