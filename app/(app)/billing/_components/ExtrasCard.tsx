"use client";

import Link from "next/link";
import { ArrowRight, Bot, Globe, HardDrive, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BILLING_CATALOG, formatIdr } from "@/lib/billing/catalog";
import { isLengkapPlan } from "@/lib/billing/lengkap";
import { AI_CREDIT_PACKAGES } from "@/lib/ai/credit-packages";
import { arsipBaseGbForPlan } from "@/lib/digitalArchive/storage-limit";
import type { BillingStatusResponse } from "../_lib/types";
import type { ModuleActivatePayload } from "../_hooks/useModuleAddonCheckout";

type ExtrasCardProps = {
  plan: string | null | undefined;
  arsipAddon: BillingStatusResponse["arsipAddon"];
  onActivate: (payload: ModuleActivatePayload) => void;
  checkoutLoading: boolean;
};

const FIRST_AI_PACKAGE = AI_CREDIT_PACKAGES[0];
const ARSIP_TIERS = Object.entries(BILLING_CATALOG.arsip.tiers) as Array<
  [string, { name: string; monthlyFee: number; storageGb: number }]
>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Kapasitas & layanan tambahan berbayar: hanya yang berbiaya dan terukur. Harga dari katalog yang sama dengan /harga. */
export function ExtrasCard({ plan, arsipAddon, onActivate, checkoutLoading }: ExtrasCardProps) {
  const lengkap = isLengkapPlan(plan);
  const baseGb = arsipBaseGbForPlan(plan);
  const tiers = ARSIP_TIERS.filter(([, t]) => t.storageGb > baseGb).sort((a, b) => a[1].storageGb - b[1].storageGb);

  const links = [
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
      desc: `Website resmi desa yang dibangun khusus untuk desa Anda. Mulai ${formatIdr(BILLING_CATALOG.website_custom.setupFee)}, sudah termasuk 12 bulan pertama.`,
    },
  ];

  return (
    <Card id="kapasitas">
      <CardHeader>
        <CardTitle>Kapasitas & layanan tambahan</CardTitle>
        <CardDescription>
          {lengkap
            ? "Semua fitur sudah termasuk di Paket Lengkap. Yang berbayar hanya tambahan berikut, dan semuanya opsional."
            : "Tambahan opsional untuk kebutuhan desa Anda."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {tiers.length > 0 && (
          <section aria-labelledby="arsip-heading" className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 id="arsip-heading" className="font-medium">
                  Penyimpanan arsip
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {baseGb} GB sudah termasuk. Tambahan berlangganan per bulan: kapasitas berlaku selama langganan aktif,
                  dan file Anda tidak dihapus bila langganan berakhir.
                </p>
                {arsipAddon && (
                  <p className="mt-2 text-sm font-medium text-emerald-700">
                    Aktif: {arsipAddon.storageGb} GB hingga {formatDate(arsipAddon.expiry)}
                  </p>
                )}
              </div>
            </div>
            <ul className="mt-3 divide-y text-sm">
              {tiers.map(([code, t]) => {
                const activeGb = arsipAddon?.storageGb ?? 0;
                const isCurrent = arsipAddon?.planCode === code;
                const lower = activeGb > 0 && t.storageGb < activeGb;
                return (
                  <li key={code} className="flex flex-wrap items-center justify-between gap-3 py-2">
                    <span className="tabular-nums">
                      {t.storageGb} GB
                      <span className="ml-2 text-muted-foreground">{formatIdr(t.monthlyFee)}/bulan</span>
                    </span>
                    <Button
                      size="sm"
                      variant={isCurrent ? "default" : "outline"}
                      disabled={checkoutLoading || lower}
                      title={lower ? "Perpanjang kapasitas yang sama atau pilih yang lebih besar" : undefined}
                      onClick={() =>
                        onActivate({
                          moduleId: "arsip",
                          planCode: code,
                          label: `Penyimpanan arsip ${t.storageGb} GB`,
                          monthlyFee: t.monthlyFee,
                          productType: "arsip",
                        })
                      }
                    >
                      {isCurrent ? "Perpanjang 1 bulan" : activeGb > 0 ? "Upgrade" : "Berlangganan"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <ul className="grid gap-3 sm:grid-cols-2">
          {links.map(({ href, icon: Icon, title, desc }) => (
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
