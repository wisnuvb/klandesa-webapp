"use client";

import Link from "next/link";
import { ArrowRight, Bot, Globe, HardDrive, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BILLING_CATALOG, formatIdr } from "@/lib/billing/catalog";
import { isLengkapPlan } from "@/lib/billing/lengkap";
import { AI_CREDIT_PACKAGES } from "@/lib/ai/credit-packages";

type ExtrasCardProps = {
  plan: string | null | undefined;
};

const ARSIP = BILLING_CATALOG.arsip.tiers;
const FIRST_AI_PACKAGE = AI_CREDIT_PACKAGES[0];

/** Tambahan berbayar Paket Lengkap: hanya yang berbiaya dan terukur. Sumber harga sama dengan halaman /harga. */
export function ExtrasCard({ plan }: ExtrasCardProps) {
  if (!isLengkapPlan(plan)) return null;

  const items = [
    {
      href: "/arsip",
      icon: HardDrive,
      title: "Penyimpanan arsip",
      desc: `${ARSIP.starter.storageGb} GB sudah termasuk. Tambah kapasitas mulai ${ARSIP.professional.storageGb} GB, ${formatIdr(ARSIP.professional.monthlyFee)}/bulan.`,
    },
    {
      href: "/asisten-ai",
      icon: Bot,
      title: "Kredit Asisten Desa AI",
      desc: `1 kredit = 1 pertanyaan. Isi ulang mulai ${formatIdr(FIRST_AI_PACKAGE.price)} untuk ${FIRST_AI_PACKAGE.credits} kredit.`,
    },
    {
      href: "/absensi",
      icon: MapPin,
      title: "Absensi GPS radius",
      desc: `Batasi absen dalam radius kantor desa, ${formatIdr(BILLING_CATALOG.absensi_gps_addon.monthlyFee)}/bulan. Absensi QR sudah termasuk.`,
    },
    {
      href: "/website",
      icon: Globe,
      title: "Website Desa",
      desc: "Pilih template dan domain di menu Website. Harga mengikuti template yang dipilih.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kapasitas & layanan tambahan</CardTitle>
        <CardDescription>
          Semua fitur sudah termasuk di Paket Lengkap. Yang berbayar hanya tambahan berikut, dan semuanya opsional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map(({ href, icon: Icon, title, desc }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full gap-3 rounded-lg border p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-medium">
                    {title}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
