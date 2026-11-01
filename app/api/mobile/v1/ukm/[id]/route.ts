import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { checkMobileRateLimit } from "@/lib/mobile/rate-limit";
import { auditAs } from "@/lib/mobile/audit-actor";
import { notifyVillageStaff } from "@/lib/mobile/notify";
import { displayName } from "@/lib/mobile/social-logic";
import { getSpacesConfig } from "@/lib/spaces";
import { UKM_SELECT, ukmCategoryNames, ukmScope } from "@/lib/mobile/ukm-data";
import {
  imageUrls,
  normalizeUkmStatus,
  parseUkmInput,
  resolveUkmContact,
  toUkmDetail,
  ukmPhotoAllowed,
  ukmStatusAfterEdit,
  ukmStatusForVisibility,
  type UkmRow,
} from "@/lib/mobile/ukm-logic";

type Ctx = { params: Promise<{ id: string }> };

/** Produk tayang, atau milik warga yang login (semua status). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const loaded = await requireMobileContext(req, { allow: ["citizen", "staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const row = await prisma.potential.findFirst({
    where: { ...ukmScope(ctx.villageId), id, OR: [{ status: "active" }, ...(me ? [{ residentId: me.id }] : [])] },
    select: UKM_SELECT,
  });
  if (!row) return mobileError("INVALID_REQUEST", "Produk tidak ditemukan.", 404);
  return NextResponse.json(toUkmDetail(row as UkmRow, me?.id ?? null));
}

/** Pemilik memperbaiki produknya (sebagian bidang) atau menayangkan/menyembunyikannya. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  const id = Number((await params).id);
  if (!me || !Number.isInteger(id) || id <= 0) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const rl = checkMobileRateLimit(`ukm-write:${ctx.accountId}`, { max: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak permintaan. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  // Hanya produk milik sendiri: produk warga lain atau milik desa tampil sebagai "tidak ditemukan".
  const existing = await prisma.potential.findFirst({
    where: { ...ukmScope(ctx.villageId), id, residentId: me.id },
    select: UKM_SELECT,
  });
  if (!existing) return mobileError("INVALID_REQUEST", "Produk tidak ditemukan.", 404);
  const status = normalizeUkmStatus(existing.status);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const cdn = getSpacesConfig().cdnBaseUrl;
  const parsed = parseUkmInput(
    body,
    {
      categories: await ukmCategoryNames(ctx.villageId),
      photoAllowed: (u) => ukmPhotoAllowed(u, cdn, ctx.village.code, imageUrls(existing.images)),
    },
    "update",
  );
  if (!parsed.ok) return mobileError("INVALID_REQUEST", parsed.message, 400);
  const v = parsed.value;

  const contact = resolveUkmContact({ phone: existing.contactPhone, visible: existing.contactVisible }, v);
  if (!contact.ok) return mobileError("INVALID_REQUEST", contact.message, 400);

  const data: Prisma.PotentialUpdateInput = {};
  if (v.name !== undefined) data.name = v.name;
  if (v.description !== undefined) data.description = v.description;
  if (v.category !== undefined) data.subCategory = v.category;
  if (v.unit !== undefined) data.productionUnit = v.unit;
  if (v.stock !== undefined) data.stockQuantity = v.stock;
  if (v.photos !== undefined) data.images = v.photos;
  if (v.price !== undefined) data.productionValue = v.price != null ? new Prisma.Decimal(v.price) : null;

  // Kontak hanya info penjual: mengubahnya tidak mengajukan ulang produk yang ditutup desa.
  const contactChanged = contact.changed;
  if (contactChanged) {
    data.contactPhone = contact.phone;
    data.contactVisible = contact.visible;
  }
  const edited = Object.keys(data).some((k) => k !== "contactPhone" && k !== "contactVisible");
  let next = status;
  if (edited) next = ukmStatusAfterEdit(status);
  if (typeof body?.visible === "boolean") {
    const r = ukmStatusForVisibility(next, body.visible);
    if (!r.ok) return mobileError("INVALID_REQUEST", r.message, 400);
    next = r.status;
  } else if (body && "visible" in body) {
    return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  if (!edited && !contactChanged && next === status) return mobileError("INVALID_REQUEST", "Tidak ada yang diubah.", 400);
  if (next !== status) data.status = next;

  const updated = await prisma.potential.update({ where: { id }, data, select: { id: true, status: true } });

  void auditAs(req, ctx.villageId, { type: "citizen", residentId: me.id }, "update", "ukm_products", id, {
    // Deskripsi dan foto hanya ditandai berubah (sama dengan jejak audit web).
    fields: Object.keys(data).filter((k) => k !== "status" && k !== "contactPhone"),
    ...(next !== status ? { status: { from: status, to: next } } : {}),
  });
  if (status === "inactive" && next === "pending") {
    void notifyVillageStaff(ctx.villageId, "ukm", {
      type: "system",
      title: "Produk UKM diajukan ulang",
      body: `${displayName(me.name)}: ${v.name ?? existing.name}`,
    });
  }
  return NextResponse.json({ id: updated.id, status: normalizeUkmStatus(updated.status) });
}
