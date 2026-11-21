import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RATE } from "@/lib/aspirasi/catalog";
import { failJson, ipHashOf, limitOrNull } from "@/lib/aspirasi/http";
import { isAspirationCode } from "@/lib/aspirasi/slug";
import { reporterStatus } from "@/lib/aspirasi/service";

/** Cek status laporan oleh pelapor: nomor laporan + kontak yang dipakai saat mengirim (nomor WhatsApp atau email). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { code?: unknown; contact?: unknown } | null;
  const limited = await limitOrNull("aspirasi-status", ipHashOf(req), RATE.statusCheck);
  if (limited) return limited;
  const code = String(body?.code ?? "").trim().toLowerCase();
  if (!isAspirationCode(code) || typeof body?.contact !== "string") {
    return NextResponse.json({ error: "Isi nomor laporan dan kontak dengan benar." }, { status: 400 });
  }
  // Kode laporan tampil di alamat publik; tanpa batas per kode, rute ini bisa dipakai menebak kontak pelapor.
  const byCode = await limitOrNull("aspirasi-status-code", code, RATE.statusPerCode);
  if (byCode) return byCode;
  const r = await reporterStatus(prisma, code, body.contact);
  if (!r.ok) return failJson(r);
  return NextResponse.json({ ...r.data, createdAt: r.data.createdAt.toISOString(), publishedAt: r.data.publishedAt?.toISOString() ?? null });
}
