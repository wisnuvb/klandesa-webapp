import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { resolveWilayahCodesForVillage } from "@/lib/village/wilayah-settings";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, delta: number): string {
  const base = new Date(date);
  base.setDate(base.getDate() + delta);
  return isoDate(base);
}

function extractHargaRows(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { data?: unknown };
  const d = p.data as { data?: unknown } | undefined;
  const arr = (d?.data ?? p.data) as unknown;
  return Array.isArray(arr) ? (arr as Array<Record<string, unknown>>) : [];
}

const AGRI_KEYWORDS = [
  "beras",
  "cabai",
  "bawang",
  "jagung",
  "kedelai",
  "gula",
  "minyak",
  "telur",
  "daging",
  "ikan",
  "padi",
];

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const resolved = await resolveWilayahCodesForVillage(village, {
      kode_provinsi: req.nextUrl.searchParams.get("kode_provinsi") ?? undefined,
      kode_kab_kota: req.nextUrl.searchParams.get("kode_kab_kota") ?? undefined,
    });

    if (!resolved) {
      return NextResponse.json(
        {
          error:
            "Kode wilayah belum lengkap. Pilih provinsi dan kabupaten/kota di Pengaturan Desa (menu Identitas & wilayah).",
          village: { province: village.province, regency: village.regency },
        },
        { status: 400 },
      );
    }

    const kodeProvinsi = resolved.kode_provinsi;
    const kodeKabKota = resolved.kode_kab_kota;

    const tanggal =
      req.nextUrl.searchParams.get("tanggal") ??
      isoDate(new Date(Date.now() - 86400000));
    const tanggalPembanding =
      req.nextUrl.searchParams.get("tanggal_pembanding") ?? addDays(tanggal, -7);

    const form = new FormData();
    form.append("tanggal", tanggal);
    form.append("tanggal_pembanding", tanggalPembanding);
    form.append("kode_provinsi", kodeProvinsi);
    form.append("kode_kab_kota", kodeKabKota);

    const upstream = await fetch(
      "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga",
      { method: "POST", body: form },
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Gagal mengambil harga dari Kemendag" },
        { status: 502 },
      );
    }

    const raw = await upstream.json();
    const allRows = extractHargaRows(raw);
    const rows = allRows.filter((r) => {
      const name = String(r.variant_nama ?? "").toLowerCase();
      return AGRI_KEYWORDS.some((k) => name.includes(k));
    });

    return NextResponse.json({
      wilayah: {
        kode_provinsi: kodeProvinsi,
        kode_kab_kota: kodeKabKota,
        province: village.province,
        regency: village.regency,
      },
      tanggal,
      tanggal_pembanding: tanggalPembanding,
      rows: rows.map((r) => ({
        nama: String(r.variant_nama ?? ""),
        satuan: String(r.satuan_display ?? ""),
        harga: Number(r.harga ?? 0),
        hargaPembanding: Number(r.harga_pembanding ?? 0),
        delta: Number(r.delta_harga ?? 0),
        persen: Number(r.persen_perubahan ?? 0),
        status: String(r.status_perubahan ?? ""),
      })),
    });
  } catch (e) {
    console.error("GET /api/pertanian/harga", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
