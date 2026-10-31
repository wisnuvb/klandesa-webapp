import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiOk, badRequest, notFound } from "@/lib/api-v1/http";
import { SLUG_PATTERN } from "@/lib/custom-data/schema";
import { listOwnProposals, submitProposal } from "@/lib/proposals/service";
import { emitWebhookEvent } from "@/lib/webhooks/deliver";

/** Usulan milik kunci ini pada tabel tersebut, terbaru dulu (status: PENDING, APPLIED, REJECTED, EXPIRED). */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireApiKey(req, "data-kustom:propose");
  if (!auth.ok) return auth.response;
  const slug = (await params).slug;
  if (!SLUG_PATTERN.test(slug)) return badRequest(auth, "slug tabel tidak valid.");
  const items = await listOwnProposals(prisma, { villageId: auth.ctx.village.id, keyId: auth.ctx.key.id, slug });
  if (!items) return notFound(auth, "Tabel");
  return apiOk(auth, { data: items });
}

/**
 * Ajukan usulan menambah atau mengubah satu baris. Data TIDAK berubah sampai admin atau sekretaris desa menyetujui.
 * Tubuh: { operation: "create" | "update", recordId? (untuk update), data: { kunciKolom: nilai }, note? }.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await requireApiKey(req, "data-kustom:propose");
  if (!auth.ok) return auth.response;
  const slug = (await params).slug;
  if (!SLUG_PATTERN.test(slug)) return badRequest(auth, "slug tabel tidak valid.");
  const body = await req.json().catch(() => null);

  const r = await submitProposal(prisma, { villageId: auth.ctx.village.id, key: { id: auth.ctx.key.id, prefix: auth.ctx.key.prefix, name: auth.ctx.key.name }, slug, body, source: req.headers.get("x-klandesa-via") === "mcp" ? "mcp" : "api_key" });
  if (!r.ok) {
    const code = r.status === 404 ? "not_found" : r.status === 429 ? "too_many_proposals" : r.status === 409 ? "conflict" : "invalid_request";
    return apiError(auth, r.status, code, r.errors.join(" "));
  }
  emitWebhookEvent(auth.ctx.village.id, "usulan.baru", { proposalId: r.data.id, tableId: r.data.tableId, tableSlug: slug, operation: r.data.operation });
  return auth.respond(NextResponse.json({ data: { id: r.data.id, status: r.data.status, expiresAt: r.data.expiresAt } }, { status: 202 }));
}
