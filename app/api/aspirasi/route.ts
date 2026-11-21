import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTurnstile } from "@/lib/turnstile";
import { RATE } from "@/lib/aspirasi/catalog";
import { submitAspiration } from "@/lib/aspirasi/service";
import { failJson, ipHashOf, limitOrNull } from "@/lib/aspirasi/http";
import { notifyOwnerAspirasi } from "@/lib/aspirasi/notify";
import { normalizeWaNumber } from "@/lib/contacts/lead";

/**
 * Kirim aspirasi warga (publik). Berlapis: Turnstile, batas laju per IP dan per kontak, kolom jebakan bot, validasi,
 * dan SELALU masuk antrean moderasi (tidak pernah langsung tayang).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const turnstile = await requireTurnstile(req, typeof body?.turnstileToken === "string" ? body.turnstileToken : null);
    if (!turnstile.ok) return turnstile.response;

    const ipHash = ipHashOf(req);
    const byIp = await limitOrNull("aspirasi-submit-ip", ipHash, RATE.submitPerIp, "Terlalu banyak laporan dari perangkat ini hari ini. Coba lagi besok.");
    if (byIp) return byIp;
    // Batas per kontak menghitung laporan yang BENAR-BENAR tersimpan (bukan percobaan), agar pihak lain tak bisa
    // "membakar" kuota nomor orang lain; pesannya sama dengan batas perangkat supaya tidak membocorkan apa pun.
    const phone = normalizeWaNumber(String(body?.reporterPhone ?? ""));
    const email = String(body?.reporterEmail ?? "").trim().toLowerCase();
    const contactOr = [...(phone ? [{ reporterPhone: phone }] : []), ...(email ? [{ reporterEmail: email }] : [])];
    if (contactOr.length) {
      const recent = await prisma.aspiration.count({ where: { OR: contactOr, createdAt: { gte: new Date(Date.now() - RATE.submitPerContact.windowMs) } } });
      if (recent >= RATE.submitPerContact.max) {
        return NextResponse.json({ error: "Terlalu banyak laporan dari perangkat ini hari ini. Coba lagi besok." }, { status: 429 });
      }
    }

    const r = await submitAspiration(prisma, body, { ipHash });
    if (!r.ok) return failJson(r);

    // Antrean moderasi: kabari pemilik (tanpa kontak pelapor). Tidak menunggu, tidak menggagalkan kiriman.
    if (r.data.id !== "0") {
      const row = await prisma.aspiration.findUnique({
        where: { code: r.data.code },
        select: { title: true, category: true, area: { select: { name: true, district: true, regency: true, wilayahCode: true } } },
      });
      if (row) {
        void notifyOwnerAspirasi({
          kind: "queued",
          code: r.data.code,
          title: row.title,
          category: row.category,
          area: `${row.area.name}, Kec. ${row.area.district}, ${row.area.regency}`,
          manualArea: row.area.wilayahCode == null,
        });
      }
    }
    return NextResponse.json({ ok: true, code: r.data.code }, { status: 201 });
  } catch (e) {
    console.error("POST /api/aspirasi error:", e);
    return NextResponse.json({ error: "Gagal mengirim laporan. Coba lagi sebentar." }, { status: 500 });
  }
}
