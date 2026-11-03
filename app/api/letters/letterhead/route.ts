import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { diffRecord } from "@/lib/audit/diff";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { mergeMailSectionIntoVillageSettings, type VillageMailSettingsFields } from "@/lib/mail/letterFormSnapshot";
import { isSafeSrc } from "@/lib/letters/document/schema";
import { mergeLetterheadStyleIntoSettings, normalizeLetterheadStyle } from "@/lib/letters/letterhead";
import { buildLetterContext } from "@/lib/letters/server/context";
import { KOP_MESSAGES, KOP_PATTERNS } from "@/lib/letters/letterhead-draft";

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const CONTROL = /[\u0000-\u001F\u007F]/g;
const clean = (v: unknown) => (typeof v === "string" ? v.replace(CONTROL, " ").trim() : null);

type Bad = { error: string };
const bad = (error: string): Bad => ({ error });

/**
 * PATCH — ubah data kop & tanda tangan langsung dari editor jenis surat, tanpa membuka Pengaturan Desa.
 * Hanya kunci yang dikirim yang diubah. Nama desa/kecamatan/kabupaten sengaja TIDAK bisa diubah di sini
 * (diturunkan dari kode wilayah resmi di Pengaturan Desa).
 *
 * Body: { logoUrl?, address?, postalCode?, phone?, email?, officials?: { kepalaDesaNama?, kepalaDesaNip?,
 *         sekretarisNama?, camatNama? }, style?: { layout?, rule?, logoSize? } }
 */
export async function PATCH(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const body: unknown = await req.json().catch(() => null);
    if (!isObj(body)) return NextResponse.json(bad("Data tidak valid"), { status: 400 });

    const data: Prisma.VillageUpdateInput = {};
    let settings: Record<string, unknown> | null = null;
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    if (has("logoUrl")) {
      const v = clean(body.logoUrl);
      if (v === null) return NextResponse.json(bad("Logo tidak valid"), { status: 400 });
      if (v && !isSafeSrc(v)) {
        return NextResponse.json(bad(KOP_MESSAGES.logo), { status: 400 });
      }
      data.logoUrl = v || null;
    }
    if (has("address")) {
      const v = clean(body.address);
      if (!v) return NextResponse.json(bad(KOP_MESSAGES.address), { status: 400 });
      if (v.length > 500) return NextResponse.json(bad("Alamat terlalu panjang (maksimal 500 karakter)."), { status: 400 });
      data.address = v;
    }
    if (has("postalCode")) {
      const v = clean(body.postalCode);
      if (v === null || (v && !KOP_PATTERNS.postalCode.test(v))) return NextResponse.json(bad(KOP_MESSAGES.postalCode), { status: 400 });
      data.postalCode = v || null;
    }
    if (has("phone")) {
      const v = clean(body.phone);
      if (v === null || (v && !KOP_PATTERNS.phone.test(v))) {
        return NextResponse.json(bad(KOP_MESSAGES.phone), { status: 400 });
      }
      data.phone = v || null;
    }
    if (has("email")) {
      const v = clean(body.email);
      if (v === null || (v && (v.length > 255 || !KOP_PATTERNS.email.test(v)))) {
        return NextResponse.json(bad(KOP_MESSAGES.email), { status: 400 });
      }
      data.email = v || null;
    }

    if (has("officials")) {
      if (!isObj(body.officials)) return NextResponse.json(bad("Data pejabat tidak valid"), { status: 400 });
      const o = body.officials;
      const patch: Partial<VillageMailSettingsFields> = {};
      for (const [key, max] of [
        ["kepalaDesaNama", 120],
        ["kepalaDesaNip", 40],
        ["sekretarisNama", 120],
        ["camatNama", 120],
      ] as const) {
        if (!Object.prototype.hasOwnProperty.call(o, key)) continue;
        const v = clean(o[key]);
        if (v === null || v.length > max) return NextResponse.json(bad("Data pejabat tidak valid"), { status: 400 });
        patch[key] = v;
      }
      settings = mergeMailSectionIntoVillageSettings(settings ?? village.settings, patch);
    }

    if (has("style")) {
      if (!isObj(body.style)) return NextResponse.json(bad("Tata letak kop tidak valid"), { status: 400 });
      const style = normalizeLetterheadStyle(body.style);
      settings = mergeLetterheadStyleIntoSettings(settings ?? village.settings, style);
    }
    if (settings) data.settings = settings as Prisma.InputJsonValue;

    if (Object.keys(data).length === 0) return NextResponse.json(bad("Tidak ada yang diubah"), { status: 400 });

    const updated = await prisma.village.update({ where: { id: village.id }, data });

    const profileKeys = new Set(["address", "postalCode", "phone", "email", "logoUrl"]);
    const profileDiff = Object.fromEntries(
      Object.entries(diffRecord(village, updated)).filter(([k]) => profileKeys.has(k)),
    );
    await auditWeb(req, loaded.ctx, "update", "village_profile", village.id, {
      ...profileDiff,
      ...(settings ? { settingsKeysChanged: ["letterhead/mail"] } : {}),
      source: "letter_editor",
    });

    const { desa, pejabat, logoUrl, kop } = await buildLetterContext(updated);
    return NextResponse.json({ ok: true, desa, pejabat, logoUrl: logoUrl ?? null, kop });
  } catch (err) {
    console.error("PATCH /api/letters/letterhead error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
