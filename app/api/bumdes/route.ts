import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import {
  isVillageBumdesElevated,
  requireBumdesManageResponse,
} from "@/lib/bumdes/access";
import { loadBumdesApiContext, sumTransactions } from "@/lib/bumdes/api-context";
import { parseOptionalString, parseRequiredString } from "@/lib/bumdes/schemas";

export async function GET(req: NextRequest) {
  const loaded = await loadBumdesApiContext(req);
  if (!loaded.ok) return loaded.response;

  if ("needsBootstrap" in loaded && loaded.needsBootstrap) {
    const villageRole = loaded.ctx.session.user?.role;
    if (!isVillageBumdesElevated(villageRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({
      success: true,
      data: {
        bumdes: null,
        stats: null,
        canManage: loaded.ctx.canManage,
        canRead: false,
        needsBootstrap: true,
      },
    });
  }

  const { bumdes, canManage } = loaded.ctx;
  const stats = await sumTransactions(bumdes!.id);

  return NextResponse.json({
    success: true,
    data: {
      bumdes: toJSONSafe(bumdes),
      stats,
      canManage,
      canRead: true,
      needsBootstrap: false,
    },
  });
}

export async function POST(req: NextRequest) {
  const loaded = await loadBumdesApiContext(req);
  if (!loaded.ok) return loaded.response;

  const manageErr = requireBumdesManageResponse(loaded.ctx.session);
  if (manageErr) return manageErr;

  const { village } = loaded.ctx;

  const existing = await prisma.bumdes.findUnique({ where: { villageId: village.id } });
  if (existing) {
    return NextResponse.json(
      { error: "BUMDes untuk desa ini sudah ada", data: toJSONSafe(existing) },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  let name = `BUMDes ${village.name}`;
  const parsedName = parseRequiredString(body?.name, 255);
  if (parsedName) name = parsedName;

  const bumdes = await prisma.bumdes.create({
    data: {
      villageId: village.id,
      name,
      address: village.address,
      phone: village.phone ?? undefined,
      email: village.email ?? undefined,
    },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(bumdes),
    message: "BUMDes berhasil dibuat",
  });
}

export async function PATCH(req: NextRequest) {
  const loaded = await loadBumdesApiContext(req, { requireExisting: true });
  if (!loaded.ok) return loaded.response;
  if ("needsBootstrap" in loaded && loaded.needsBootstrap) {
    return NextResponse.json({ error: "BUMDes belum dibuat" }, { status: 404 });
  }

  const manageErr = requireBumdesManageResponse(loaded.ctx.session);
  if (manageErr) return manageErr;

  const body = await req.json().catch(() => ({}));
  const name = parseOptionalString(body?.name, 255);
  const address = parseOptionalString(body?.address, 5000);
  const phone = parseOptionalString(body?.phone, 50);
  const email = parseOptionalString(body?.email, 255);
  const legalNotes = parseOptionalString(body?.legalNotes, 5000);

  if (
    name === undefined &&
    address === undefined &&
    phone === undefined &&
    email === undefined &&
    legalNotes === undefined
  ) {
    return NextResponse.json({ error: "Tidak ada field yang diperbarui" }, { status: 400 });
  }

  const bumdes = await prisma.bumdes.update({
    where: { id: loaded.ctx.bumdes!.id },
    data: {
      ...(name !== undefined && { name: name ?? loaded.ctx.bumdes!.name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(legalNotes !== undefined && { legalNotes }),
    },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(bumdes),
    message: "Profil BUMDes diperbarui",
  });
}
