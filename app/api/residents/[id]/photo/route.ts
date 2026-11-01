import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { setResidentPhoto } from "@/lib/residents/photo-server";

/**
 * PUT /api/residents/[id]/photo: simpan foto profil warga yang sudah diunggah lewat /api/residents/photo-upload.
 * Body `{ photo, photoThumb }`; keduanya null = hapus foto.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const r = await setResidentPhoto(ctx.village, id, body);
  if (!r.ok) return NextResponse.json({ error: r.message }, { status: r.status });

  await auditWeb(req, ctx, r.photo ? "update_photo" : "remove_photo", "residents", id, { photo: { from: r.previous.photo, to: r.photo } });
  return NextResponse.json({ success: true, data: { photo: r.photo, photoThumb: r.photoThumb } });
}
