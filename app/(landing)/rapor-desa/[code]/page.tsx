import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive } from "@/lib/subscription";
import { loadAccountability } from "@/lib/mobile/accountability-data";
import { readVillageInfoSettings } from "@/lib/mobile/village-info-logic";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Rapor Layanan Desa — Klandesa",
  description: "Seberapa cepat desa melayani warga: surat, pengaduan, dan penggunaan aplikasi.",
  robots: { index: false, follow: false },
};

const hrs = (v: number) => (v < 48 ? `${v} jam` : `${Math.round((v / 24) * 10) / 10} hari`);

function Stat({ label, value, hint }: { label: string; value: string | null; hint: string }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value ?? "—"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{value ? hint : "Belum cukup data untuk ditampilkan."}</p>
    </div>
  );
}

export default async function RaporDesaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const village = /^[A-Za-z0-9_-]{1,20}$/.test(code)
    ? await prisma.village.findUnique({
        where: { code },
        select: { id: true, name: true, district: true, regency: true, settings: true, isActive: true, subscriptionStatus: true, subscriptionExpiry: true },
      })
    : null;
  // Opt-in: desa harus menyalakan sendiri. Semua kegagalan memakai satu pesan agar tidak membuka daftar desa.
  const open = !!village && village.isActive && isVillageSubscriptionActive(village, "GET") && readVillageInfoSettings(village.settings).scorecardPublic;
  if (!open || !village) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col gap-3 px-4 py-16">
        <h1 className="text-2xl font-bold">Rapor layanan tidak tersedia</h1>
        <p className="text-sm text-muted-foreground">Desa ini belum membuka rapor layanannya, atau alamat yang Anda buka tidak tepat.</p>
      </main>
    );
  }

  const { items } = await loadAccountability([village.id], { withPrevious: false });
  const a = items[0]!.current;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center gap-3 text-emerald-700">
        <Gauge className="h-9 w-9" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Rapor Layanan Desa {village.name}</h1>
          <p className="text-sm text-muted-foreground">Kec. {village.district}, {village.regency} · 90 hari terakhir</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Surat selesai ≤ 48 jam" value={a.mail.withinSlaPercent === null ? null : `${a.mail.withinSlaPercent}%`} hint="dari surat yang sudah diputuskan desa" />
        <Stat label="Waktu tengah penyelesaian surat" value={a.mail.medianHours === null ? null : hrs(a.mail.medianHours)} hint="separuh surat selesai lebih cepat dari ini" />
        <Stat label="Pengaduan ditanggapi ≤ 3 hari" value={a.reports.respondedInTimePercent === null ? null : `${a.reports.respondedInTimePercent}%`} hint="dari pengaduan yang sudah lewat 3 hari atau sudah ditanggapi" />
        <Stat label="Pengaduan yang pelapornya bilang sudah beres" value={a.reports.resolvedPercent === null ? null : `${a.reports.resolvedPercent}%`} hint="dari pelapor yang memberi jawaban" />
      </div>
      <p className="text-xs text-muted-foreground">
        Angka dihitung otomatis dari aplikasi Klandesa dan hanya mencakup layanan yang diproses lewat sistem. Tidak memuat data pribadi warga.
        Angka disembunyikan bila datanya belum cukup agar tidak menyesatkan.
      </p>
    </main>
  );
}
